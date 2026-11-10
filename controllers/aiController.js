const {
  AI_CHAT_PROMPT_VERSION,
  AI_CHAT_SYSTEM_PROMPT,
  getRefusalReason,
  validateAIChatInput
} = require('../services/aiPolicy');
const { recordAIUsage } = require('../services/aiUsage');
const { getAIFeaturesEnabled } = require('../services/aiFeatureSettings');
const { VERSION: QUIZ_PROMPT_VERSION, validateInput: validateQuizInput, generateQuiz } = require('../services/quizGeneration');
const {
  extractProcedureSteps,
  extractDefinitionAnswer,
  getEmbeddingModel,
  getMinimumSimilarity,
  hasLexicalEvidence,
  retrieveKnowledge,
  sourceLabel
} = require('../services/knowledgeBase');

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_MODEL = 'deepseek-r1:8b';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.2:3b';

async function getInstalledModels(signal) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data?.models)) return [];
    return data.models.map((model) => model.name || model.model).filter(Boolean);
  } catch (error) {
    console.warn('Could not fetch installed Ollama models:', error.message);
    return [];
  }
}

async function generateQuizRequest(req, res) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền tạo câu hỏi bằng AI.' });
  }
  try {
    if (!await getAIFeaturesEnabled()) {
      return res.status(503).json({ error: 'Các chức năng AI hiện đang được quản trị viên tắt.' });
    }
  } catch (error) {
    console.error('Could not check AI feature settings:', error);
    return res.status(503).json({ error: 'Không thể xác nhận trạng thái AI. Vui lòng thử lại sau.' });
  }

  let input;
  try { input = validateQuizInput(req.body); }
  catch (error) { return res.status(400).json({ error: error.message }); }

  const startedAt = Date.now();
  const telemetry = { model: null, promptTokens: 0, completionTokens: 0 };
  try {
    const result = await generateQuiz(input, { onUsage(event) {
      telemetry.model = event.model;
      telemetry.promptTokens += event.promptTokens;
      telemetry.completionTokens += event.completionTokens;
    } });
    return res.json({
      content: [{ type: 'text', text: JSON.stringify(result.questions) }],
      raw: {
        questionsGenerated: result.questions.length,
        requestedCount: result.requestedCount,
        model: result.model,
        partial: result.partial,
        reviewed: true,
        promptVersion: result.promptVersion
      }
    });
  } catch (error) {
    console.error('Quiz generation/review failed:', error);
    const timeout = /thời gian chờ/.test(error.message);
    return res.status(timeout ? 504 : 502).json({
      error: error.message === 'fetch failed'
        ? 'Không thể kết nối tới Ollama. Kiểm tra dịch vụ và model, rồi thử lại.'
        : error.message
    });
  } finally {
    await recordAIUsage({
      userId: req.user.id,
      feature: 'quiz-generation',
      promptVersion: QUIZ_PROMPT_VERSION,
      model: telemetry.model,
      promptTokens: telemetry.promptTokens,
      completionTokens: telemetry.completionTokens,
      latencyMs: Date.now() - startedAt,
      tools: ['quiz-generation', 'quiz-review'],
      statusCode: res.statusCode
    });
  }
}

async function chat(req, res) {
  try {
    if (!await getAIFeaturesEnabled()) {
      return res.status(503).json({ error: 'Các chức năng AI hiện đang được quản trị viên tắt.' });
    }
  } catch (error) {
    console.error('Could not check AI feature settings:', error);
    return res.status(503).json({ error: 'Không thể xác nhận trạng thái AI. Vui lòng thử lại sau.' });
  }

  const { question, includeChunks = false } = req.body || {};
  const inputError = validateAIChatInput(question, includeChunks);
  if (inputError === 'missing_question') return res.status(400).json({ error: 'Thiếu câu hỏi.' });
  if (inputError === 'question_too_long') return res.status(413).json({ error: 'Câu hỏi quá dài.' });
  if (inputError) return res.status(400).json({ error: 'Tùy chọn xem đoạn tài liệu không hợp lệ.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const startedAt = Date.now();
  const telemetry = {
    model: null,
    promptTokens: 0,
    completionTokens: 0,
    tools: new Set()
  };

  try {
    const sendAnswer = (message, sources, chunks, abstained) => res.json({
      message,
      sources,
      chunks: includeChunks ? chunks : [],
      abstained
    });

    const refusalReason = getRefusalReason(question.trim());
    if (refusalReason) {
      const message = refusalReason === 'out_of_scope'
        ? 'Mình là trợ lý học tập, chỉ hỗ trợ câu hỏi học tập dựa trên tài liệu của ứng dụng nhé.'
        : 'Mình không thể làm theo yêu cầu này. Mình chỉ hỗ trợ học tập an toàn dựa trên tài liệu của ứng dụng.';
      return sendAnswer(message, [], [], true);
    }

    telemetry.tools.add('knowledge_retrieval');
    telemetry.model = getEmbeddingModel();
    const retrievedChunks = await retrieveKnowledge(question.trim(), {
      signal: controller.signal,
      accessToken: req.accessToken,
      onUsage: (usage) => {
        telemetry.promptTokens += usage.promptTokens || 0;
      }
    });
    const debugChunks = retrievedChunks.map((chunk) => ({
      id: chunk.id,
      label: sourceLabel(chunk.source),
      excerpt: chunk.text,
      similarity: Number(chunk.similarity.toFixed(4))
    }));
    const definitionCandidates = retrievedChunks.filter((chunk) => hasLexicalEvidence(question.trim(), [chunk]));
    const definitionAnswer = extractDefinitionAnswer(question.trim(), definitionCandidates);
    if (definitionAnswer) {
      telemetry.tools.add('definition_answer');
      return sendAnswer(definitionAnswer.message, [
        {
          id: definitionAnswer.chunk.id,
          label: sourceLabel(definitionAnswer.chunk.source),
          excerpt: definitionAnswer.chunk.text
        }
      ], debugChunks, false);
    }

    const chunks = retrievedChunks.filter((chunk) =>
      chunk.similarity >= getMinimumSimilarity()
      && hasLexicalEvidence(question.trim(), [chunk])
    );
    if (!chunks.length) {
      return sendAnswer(
        'Mình chưa tìm thấy thông tin này trong tài liệu học tập nên không thể trả lời chắc chắn.',
        [],
        debugChunks,
        true
      );
    }

    const installedModels = await getInstalledModels(controller.signal);
    const chatModels = installedModels.filter((model) => !/embed/i.test(model));
    const activeModel = [OLLAMA_CHAT_MODEL, 'qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b', OLLAMA_MODEL, DEFAULT_MODEL]
      .find((model) => chatModels.includes(model)) || chatModels[0];
    if (!activeModel) {
      return res.status(503).json({ error: 'Chưa cài model chat hoặc Ollama chưa chạy. Hãy kiểm tra Ollama và model trong OLLAMA_CHAT_MODEL.' });
    }
    telemetry.model = activeModel;

    const procedureAnswer = extractProcedureSteps(question.trim(), chunks);
    if (procedureAnswer) telemetry.tools.add('procedure_answer');
    const answerChunks = procedureAnswer ? [procedureAnswer.chunk] : chunks;
    const evidence = answerChunks.map((chunk) => ({
      id: chunk.id,
      source: sourceLabel(chunk.source),
      text: chunk.text
    }));
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: 'system', content: AI_CHAT_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ question: question.trim(), evidence }) }
        ],
        format: {
          type: 'object',
          properties: {
            answerable: { type: 'boolean' },
            message: { type: 'string' },
            sourceIds: { type: 'array', items: { type: 'string' } }
          },
          required: ['answerable', 'message', 'sourceIds'],
          additionalProperties: false
        },
        stream: false,
        keep_alive: '10m',
        options: { temperature: 0, top_p: 0.2, num_predict: 700, num_ctx: 4096 }
      })
    });
    if (!response.ok) return res.status(502).json({ error: 'Model AI chưa phản hồi được. Con thử lại nhé.' });

    let reply;
    try {
      const data = await response.json();
      telemetry.promptTokens += data?.prompt_eval_count || 0;
      telemetry.completionTokens += data?.eval_count || 0;
      reply = JSON.parse(data?.message?.content || '{}');
    } catch (error) {
      console.error('Invalid grounded chat output:', error);
      if (procedureAnswer) {
        const chunk = procedureAnswer.chunk;
        telemetry.tools.add('procedure_answer');
        return sendAnswer(procedureAnswer.message, [
          { id: chunk.id, label: sourceLabel(chunk.source), excerpt: chunk.text }
        ], debugChunks, false);
      }
      return res.status(502).json({ error: 'AI chưa tạo được câu trả lời có nguồn hợp lệ. Con thử lại nhé.' });
    }

    const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const sources = [...new Set(reply.sourceIds)]
      .filter((id) => typeof id === 'string' && chunksById.has(id))
      .map((id) => {
        const chunk = chunksById.get(id);
        return { id: chunk.id, label: sourceLabel(chunk.source), excerpt: chunk.text };
      });
    if (!reply.answerable || !reply.message.trim() || !sources.length) {
      if (procedureAnswer) {
        const chunk = procedureAnswer.chunk;
        telemetry.tools.add('procedure_answer');
        return sendAnswer(procedureAnswer.message, [
          { id: chunk.id, label: sourceLabel(chunk.source), excerpt: chunk.text }
        ], debugChunks, false);
      }
      return sendAnswer(
        'Mình chưa tìm thấy thông tin này trong tài liệu học tập nên không thể trả lời chắc chắn.',
        [],
        debugChunks,
        true
      );
    }
    return sendAnswer(reply.message.trim(), sources, debugChunks, false);
  } catch (error) {
    if (controller.signal.aborted) return res.status(504).json({ error: 'AI phản hồi quá lâu. Con hãy thử lại nhé.' });
    console.error('Grounded AI chat failed:', error);
    const knowledgeBaseSetupError = error.message.startsWith('Chưa có tài liệu học tập được lập chỉ mục.');
    return res.status(503).json({
      error: knowledgeBaseSetupError
        ? error.message
        : 'Chưa thể tìm câu trả lời trong tài liệu. Kiểm tra Ollama và chạy npm run kb:ingest nếu vector index chưa được tạo.',
      details: error.message
    });
  } finally {
    clearTimeout(timeout);
    await recordAIUsage({
      userId: req.user.id,
      feature: 'ai-chat',
      promptVersion: AI_CHAT_PROMPT_VERSION,
      model: telemetry.model,
      promptTokens: telemetry.promptTokens,
      completionTokens: telemetry.completionTokens,
      latencyMs: Date.now() - startedAt,
      tools: [...telemetry.tools],
      statusCode: res.statusCode
    });
  }
}

module.exports = { chat, generateQuiz: generateQuizRequest };
