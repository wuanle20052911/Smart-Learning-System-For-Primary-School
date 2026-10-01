require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateQuizHTML, generateQuizTXT } = require('./quiz-generator');
const authRoutes = require('./routes/authRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_MODEL = 'deepseek-r1:8b';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:3b';

async function getInstalledModels(signal) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data?.models)) {
      return [];
    }

    return data.models
      .map((model) => model.name || model.model)
      .filter(Boolean);
  } catch (error) {
    console.warn('Could not fetch installed Ollama models:', error.message);
    return [];
  }
}

async function resolveModelName() {
  const installedModels = await getInstalledModels();

  if (installedModels.includes(OLLAMA_MODEL)) {
    return OLLAMA_MODEL;
  }

  if (installedModels.includes(DEFAULT_MODEL)) {
    return DEFAULT_MODEL;
  }

  if (installedModels.length > 0) {
    return installedModels[0];
  }

  return OLLAMA_MODEL;
}

async function resolveQuizModelName() {
  const installedModels = await getInstalledModels();
  const preferredModels = [OLLAMA_CHAT_MODEL, 'llama3.2:3b', 'qwen2.5:3b', 'qwen2.5:7b', OLLAMA_MODEL, DEFAULT_MODEL];
  const preferredModel = preferredModels.find((model) => installedModels.includes(model));
  if (preferredModel) return preferredModel;
  return installedModels[0] || OLLAMA_MODEL;
}

function isValidQuestion(q) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) return false;
  const type = q.type || 'multiple-choice';

  if (type === 'multiple-choice' || type === 'true-false') {
    return Array.isArray(q.options)
      && q.options.length >= 2
      && Number.isInteger(q.correctIndex)
      && q.correctIndex >= 0
      && q.correctIndex < q.options.length
      && (type !== 'true-false' || q.options.length === 2);
  }

  if (type === 'fill-blank' || type === 'short-answer') {
    return typeof q.answer === 'string' && q.answer.trim().length > 0;
  }

  if (type === 'matching') {
    return Array.isArray(q.pairs)
      && q.pairs.length > 0
      && q.pairs.every(pair => pair && typeof pair.left === 'string' && typeof pair.right === 'string')
      && Array.isArray(q.correctMatches)
      && q.correctMatches.length === q.pairs.length
      && q.correctMatches.every(index => Number.isInteger(index) && index >= 0 && index < q.pairs.length);
  }

  return false;
}

function normalizeGeneratedQuestion(question, expectedType) {
  if (!question || typeof question !== 'object') return null;
  const normalized = { ...question };
  const typeAliases = {
    'multiple choice': 'multiple-choice',
    'true false': 'true-false',
    'fill in the blank': 'fill-blank',
    'fill-in-the-blank': 'fill-blank',
    'short answer': 'short-answer',
    'matching pairs': 'matching'
  };
  const reportedType = typeof normalized.type === 'string'
    ? normalized.type.trim().toLowerCase().replace(/_/g, '-')
    : '';
  normalized.type = expectedType || typeAliases[reportedType] || reportedType || 'multiple-choice';
  const type = normalized.type;
  if (type === 'multiple-choice' || type === 'true-false') {
    const candidate = Number.isInteger(normalized.correctIndex)
      ? normalized.correctIndex
      : Number.isInteger(normalized.answer)
        ? normalized.answer
        : Number(normalized.answer);
    if (Number.isInteger(candidate)) {
      normalized.correctIndex = candidate;
      normalized.answer = candidate;
    }
  } else if (type === 'fill-blank' || type === 'short-answer') {
    const answer = normalized.answer ?? normalized.correctAnswer;
    if (typeof answer === 'string' || typeof answer === 'number') normalized.answer = String(answer);
  } else if (type === 'matching') {
    normalized.pairs = normalized.pairs || normalized.options;
    const matches = normalized.correctMatches || normalized.answer;
    if (Array.isArray(matches)) {
      normalized.correctMatches = matches.map((match, index) => {
        if (Number.isInteger(match) || (typeof match === 'string' && /^\d+$/.test(match))) return Number(match);
        if (typeof match === 'string' && Array.isArray(normalized.pairs)) {
          return normalized.pairs.findIndex((pair) => typeof pair?.right === 'string'
            && pair.right.trim().toLocaleLowerCase() === match.trim().toLocaleLowerCase());
        }
        return null;
      });
    }
  }
  return isValidQuestion(normalized) ? normalized : null;
}

async function readOllamaStream(response) {
  if (!response.body) throw new Error('Ollama không trả về luồng nội dung.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let generatedText = '';

  const readLine = (line) => {
    if (!line.trim()) return;
    const item = JSON.parse(line);
    if (item.error) throw new Error(item.error);
    if (typeof item.response === 'string') generatedText += item.response;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(readLine);
      if (done) break;
    }
    readLine(buffer);
  } finally {
    reader.releaseLock();
  }

  return generatedText;
}

app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.get('/api/profile-avatars', async (req, res) => {
  try {
    const avatarDirectory = path.join(__dirname, 'public', 'img', 'avt');
    const files = await fs.promises.readdir(avatarDirectory);
    const avatars = files
      .filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file))
      .sort()
      .map((file) => `/public/img/avt/${file}`);
    return res.json({ avatars });
  } catch (error) {
    console.error('Could not list profile avatars:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách avatar.' });
  }
});
app.use('/api/lessons', lessonRoutes);
app.use('/api/attempts', quizAttemptRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/questions', questionBankRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', ollama: OLLAMA_BASE_URL, model: OLLAMA_MODEL });
});

app.post('/api/generate-quiz', requireAuth, async (req, res) => {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền tạo câu hỏi bằng AI.' });
  }
  const { systemPrompt, userPrompt } = req.body || {};
  const questionTypes = new Set(['multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer']);
  const expectedType = typeof req.body?.questionType === 'string' ? req.body.questionType : '';
  if (expectedType && !questionTypes.has(expectedType)) {
    return res.status(400).json({ error: 'Dạng câu hỏi không được hỗ trợ.' });
  }

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({
      error: 'Missing required fields: systemPrompt and userPrompt.'
    });
  }

  try {
    const activeModel = expectedType ? await resolveQuizModelName() : await resolveModelName();
    const qCountMatch = userPrompt.match(/Tạo\s+(?:đúng\s+)?(\d+)\s+câu hỏi/i);
    const requestedCount = Math.min(qCountMatch ? parseInt(qCountMatch[1]) : 5, 10);

    if (!activeModel || activeModel === OLLAMA_MODEL) {
      const installedModels = await getInstalledModels();
      if (installedModels.length === 0) {
        return res.status(500).json({
          error: 'Ollama chưa có model nào được cài đặt. Hãy chạy: `ollama pull ' + DEFAULT_MODEL + '`',
          details: 'Model hiện tại: ' + OLLAMA_MODEL
        });
      }
    }

    let allQuestions = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (allQuestions.length < requestedCount && attempts < maxAttempts) {
      attempts++;
      const remainingCount = requestedCount - allQuestions.length;
      const attemptPrompt = attempts === 1
        ? userPrompt
        : `${userPrompt.replace(/Tạo\s+(?:đúng\s+)?\d+\s+câu hỏi/i, `Tạo đúng ${remainingCount} câu hỏi`)}\n\nĐây là lượt bổ sung: chỉ tạo thêm ${remainingCount} câu hỏi mới, không lặp lại các câu sau:\n${JSON.stringify(allQuestions.map((question) => question.question))}`;

      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: activeModel,
          prompt: `${systemPrompt}\n\n${attemptPrompt}`,
          format: 'json',
          stream: true,
          keep_alive: '10m',
          options: {
            temperature: 0.2 + (attempts * 0.1),
            top_p: 0.9,
            num_ctx: 4096,
            num_predict: 2048
          }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(500).json({
          error: 'Ollama request failed.',
          details: text
        });
      }

      let text;
      try {
        text = await readOllamaStream(response);
      } catch (error) {
        console.error(`Could not read Ollama quiz stream (attempt ${attempts}):`, error);
        continue;
      }
      
      // Try to parse the response to ensure it's valid JSON
      let parsedJSON;
      try {
        parsedJSON = JSON.parse(text);
        
        // If it's a single object (not array), wrap it in array
        if (parsedJSON && typeof parsedJSON === 'object' && !Array.isArray(parsedJSON)) {
          // If it has a questions key with array, extract that
          if (Array.isArray(parsedJSON.questions)) {
            parsedJSON = parsedJSON.questions;
          } 
          // Otherwise wrap the single object in an array
          else if (parsedJSON.question) {
            parsedJSON = [parsedJSON];
          }
        }
        
        if (Array.isArray(parsedJSON)) {
          const validQuestions = parsedJSON.map((question) => normalizeGeneratedQuestion(question, expectedType)).filter(Boolean);
          const seenQuestions = new Set(allQuestions.map((question) => question.question.trim().toLocaleLowerCase()));
          allQuestions.push(...validQuestions.filter((question) => {
            const key = question.question.trim().toLocaleLowerCase();
            if (seenQuestions.has(key)) return false;
            seenQuestions.add(key);
            return true;
          }));
        }
      } catch (parseErr) {
        // If JSON parsing fails, try to extract JSON from text
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedJSON = JSON.parse(jsonMatch[0]);
            if (parsedJSON && !Array.isArray(parsedJSON) && parsedJSON.question) {
              parsedJSON = [parsedJSON];
            }
            
            if (Array.isArray(parsedJSON)) {
              const validQuestions = parsedJSON.map((question) => normalizeGeneratedQuestion(question, expectedType)).filter(Boolean);
              const seenQuestions = new Set(allQuestions.map((question) => question.question.trim().toLocaleLowerCase()));
              allQuestions.push(...validQuestions.filter((question) => {
                const key = question.question.trim().toLocaleLowerCase();
                if (seenQuestions.has(key)) return false;
                seenQuestions.add(key);
                return true;
              }));
            }
          } catch (innerErr) {
            console.error('Failed to parse retry JSON:', innerErr);
          }
        }
      }
    }

    // Return at least the requested count or what we got
    const finalQuestions = allQuestions.slice(0, requestedCount);
    
    if (finalQuestions.length === 0) {
      return res.status(500).json({
        error: expectedType
          ? `AI chưa tạo được câu hỏi hợp lệ ở dạng "${expectedType}". Thử tạo lại hoặc chọn dạng khác.`
          : 'AI chưa tạo được câu hỏi hợp lệ. Thử tạo lại.'
      });
    }

    return res.json({
      content: [{ type: 'text', text: JSON.stringify(finalQuestions) }],
      raw: { questionsGenerated: finalQuestions.length, requestedCount, model: activeModel }
    });
  } catch (error) {
    console.error('Ollama call failed:', error);
    if (error.cause?.code === 'UND_ERR_HEADERS_TIMEOUT' || error.code === 'UND_ERR_HEADERS_TIMEOUT') {
      return res.status(504).json({
        error: 'Ollama đang mất quá nhiều thời gian để bắt đầu trả lời. Kiểm tra Ollama, đợi model tải xong rồi thử lại.',
        details: error.cause?.code || error.code
      });
    }
    return res.status(500).json({
      error: 'Không thể kết nối tới Ollama. Hãy kiểm tra Ollama đang chạy và model đã được tải.',
      details: error.message
    });
  }
});

app.post('/api/ai-chat', requireAuth, async (req, res) => {
  const { systemPrompt, userPrompt } = req.body || {};
  if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string' || !systemPrompt.trim() || !userPrompt.trim()) {
    return res.status(400).json({ error: 'Thiếu nội dung trò chuyện.' });
  }
  if (systemPrompt.length > 1000 || userPrompt.length > 8000) {
    return res.status(413).json({ error: 'Nội dung quá dài. Hãy gửi câu hỏi ngắn hơn nhé.' });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const installedModels = await getInstalledModels(controller.signal);
    if (!installedModels.length) return res.status(503).json({ error: `Ollama chưa có model. Hãy chạy: ollama pull ${OLLAMA_MODEL}` });
    const activeModel = installedModels.includes(OLLAMA_CHAT_MODEL)
      ? OLLAMA_CHAT_MODEL
      : installedModels.includes(OLLAMA_MODEL)
        ? OLLAMA_MODEL
      : installedModels.includes(DEFAULT_MODEL)
        ? DEFAULT_MODEL
        : installedModels[0];
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: activeModel,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        format: 'json',
        stream: false,
        keep_alive: '10m',
        options: { temperature: 0.2, top_p: 0.8, num_predict: 120, num_ctx: 2048 }
      })
    });
    if (!response.ok) return res.status(500).json({ error: 'Không thể kết nối với trợ lý AI.' });
    const data = await response.json();
    return res.json({ content: [{ type: 'text', text: data?.response || '{}' }] });
  } catch (error) {
    if (controller.signal.aborted) {
      return res.status(504).json({ error: 'AI phản hồi quá 18 giây. Con hãy thử hỏi ngắn hơn nhé.' });
    }
    console.error('AI chat failed:', error);
    return res.status(500).json({ error: 'Không thể kết nối tới Ollama. Hãy chạy `ollama serve` trước.', details: error.message });
  } finally {
    clearTimeout(timeout);
  }
});

// New endpoint to download quiz as file
app.post('/api/download-quiz', requireAuth, (req, res) => {
  const { quiz, format = 'html', filename = 'de-on-tap' } = req.body;

  if (!quiz || !Array.isArray(quiz)) {
    return res.status(400).json({ error: 'Invalid quiz data' });
  }

  try {
    let content, contentType, fileExtension;

    if (format === 'txt') {
      content = generateQuizTXT(quiz);
      contentType = 'text/plain; charset=utf-8';
      fileExtension = '.txt';
    } else {
      content = generateQuizHTML(quiz);
      contentType = 'text/html; charset=utf-8';
      fileExtension = '.html';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}${fileExtension}"`);
    res.send(content);
  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({ error: 'Failed to generate file', details: error.message });
  }
});

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/auth', (req, res) => {
  res.redirect('/');
});

app.get('/learn', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get(['/profile', '/history'], (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`SmartLearning server running at http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_BASE_URL}`);
  console.log(`Model: ${OLLAMA_MODEL}`);
});
