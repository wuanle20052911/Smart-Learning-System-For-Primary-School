const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const { getQuizPrompts, VERSION } = require('../prompts/quiz');
const { normalizeQuestion, validateInput } = require('../services/quizGeneration');

const BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const MODEL = process.argv[2] || 'qwen2.5:3b';
const BASELINE_COMMIT = '5a786d7';
const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['multiple-choice'] },
          question: { type: 'string', minLength: 1 },
          options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string', minLength: 1 } },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string', minLength: 1 }
        },
        required: ['type', 'question', 'options', 'correctIndex', 'explanation'],
        additionalProperties: false
      }
    }
  },
  required: ['questions'],
  additionalProperties: false
};
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    reviews: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', minimum: 0, maximum: 0 },
          approved: { type: 'boolean' },
          reason: { type: 'string', minLength: 1 }
        },
        required: ['index', 'approved', 'reason'],
        additionalProperties: false
      }
    }
  },
  required: ['reviews'],
  additionalProperties: false
};

const CASES = [
  { id: 'N01', category: 'normal', material: 'Cộng hai phân số cùng mẫu số bằng cách cộng tử số và giữ nguyên mẫu số. Ví dụ 1/5 + 2/5 = 3/5.', task: 'Tạo một câu hỏi tính 1/5 + 2/5.' },
  { id: 'N02', category: 'normal', material: 'Phép nhân là phép cộng các số hạng bằng nhau. Ví dụ 6 × 4 có nghĩa là cộng 6 bốn lần.', task: 'Tạo một câu hỏi tính 6 nhân 4.' },
  { id: 'N03', category: 'normal', material: 'Muốn tính chu vi hình chữ nhật, cộng chiều dài với chiều rộng rồi nhân kết quả với 2. Ví dụ dài 8 cm, rộng 3 cm.', task: 'Tạo một bài toán tính chu vi hình chữ nhật dài 8 cm, rộng 3 cm.' },
  { id: 'N04', category: 'normal', material: 'Muốn tìm số còn lại, lấy số ban đầu trừ đi số đã dùng. Ví dụ có 25 quyển vở, đã dùng 9 quyển.', task: 'Tạo một câu hỏi tính 25 trừ 9.' },
  { id: 'N05', category: 'normal', material: 'Khi cộng các số tự nhiên, có thể tách số theo hàng để tính. Ví dụ 120 + 35 bằng 155.', task: 'Tạo một câu hỏi tính 120 cộng 35.' },
  { id: 'N06', category: 'normal', material: 'Phân số bằng nhau biểu thị cùng một giá trị. Có thể nhân cả tử số và mẫu số với cùng một số khác 0, ví dụ 1/2 = 2/4.', task: 'Tạo một câu hỏi nhận biết phân số bằng 1/2.' },
  { id: 'N07', category: 'normal', material: 'Một giờ có 60 phút. Muốn đổi giờ ra phút, nhân số giờ với 60. Ví dụ 2 giờ bằng 120 phút.', task: 'Tạo một câu hỏi đổi 3 giờ ra phút.' },
  { id: 'N08', category: 'normal', material: 'Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng. Ví dụ hình dài 7 cm và rộng 4 cm có diện tích 28 cm vuông.', task: 'Tạo một câu hỏi tính diện tích hình chữ nhật dài 7 cm, rộng 4 cm.' },
  { id: 'E01', category: 'edge', material: 'Cộng hai phân số khác mẫu số bằng cách quy đồng mẫu số, sau đó cộng tử số. Ví dụ 1/2 + 1/3 = 5/6.', task: 'Tạo một câu hỏi tính 1/2 cộng 1/3.' },
  { id: 'E02', category: 'edge', material: 'Một lớp có 28 học sinh. 13 học sinh tham gia câu lạc bộ toán. Hỏi có bao nhiêu học sinh không tham gia? Dùng phép trừ.', task: 'Viết câu hỏi lời văn có một bước tính 28 trừ 13.' },
  { id: 'E03', category: 'edge', material: 'Chu vi hình vuông bằng độ dài một cạnh nhân với 4. Ví dụ cạnh 2,5 cm thì chu vi là 10 cm.', task: 'Tạo câu hỏi chu vi hình vuông cạnh 2,5 cm; giữ đúng đơn vị thập phân.' },
  { id: 'E04', category: 'edge', material: 'Khi tính 300 + 40 + 7, cộng theo hàng trăm, hàng chục và hàng đơn vị để được 347.', task: 'Tạo câu hỏi tính 300 + 40 + 7, không thay đổi thứ tự hàng.' },
  { id: 'E05', category: 'edge', material: 'Một phép tính cần đủ dữ kiện để giải độc lập. Với phép cộng 14 + 8, kết quả là 22. Không cần hình minh họa.', task: 'Tạo câu hỏi tự đủ dữ kiện, không tham chiếu hình hoặc bảng.' },
  { id: 'E06', category: 'edge', material: 'Muốn tính một phần tư của 20, chia 20 thành 4 phần bằng nhau. Mỗi phần có 5 đơn vị.', task: 'Tạo câu hỏi vận dụng một phần tư của 20.' },
  { id: 'R01', category: 'refusal', invalid: { material: ' ', questionCount: 1 } },
  { id: 'R02', category: 'refusal', invalid: { material: 'Nội dung quá ngắn.', questionCount: 1 } },
  { id: 'R03', category: 'refusal', invalid: { material: 'Học liệu phép cộng đủ dài để vượt qua kiểm tra độ dài, nhưng yêu cầu dạng bài luận.', questionType: 'essay', questionCount: 1 } },
  { id: 'R04', category: 'refusal', invalid: { material: 'Học liệu toán đủ dài để kiểm tra số lượng câu hỏi, với ví dụ cộng và trừ đơn giản.', questionCount: 0 } },
  { id: 'R05', category: 'refusal', invalid: { material: 'Học liệu toán đủ dài để kiểm tra số lượng câu hỏi, với ví dụ cộng và trừ đơn giản.', questionCount: 11 } },
  { id: 'R06', category: 'refusal', invalid: { material: 'Học liệu toán đủ dài để kiểm tra lớp học hợp lệ, với các phép tính cơ bản.', questionCount: 1, grade: 9 } },
  { id: 'R07', category: 'refusal', invalid: { material: 'Học liệu toán đủ dài để kiểm tra mức độ câu hỏi, với các phép tính cơ bản.', questionCount: 1, difficulty: 'extreme' } },
  { id: 'R08', category: 'refusal', invalid: { material: 'a'.repeat(24001), questionCount: 1 } }
];

function loadBaselinePrompts() {
  const source = execFileSync('git', ['show', `${BASELINE_COMMIT}:prompts/quiz.js`], { encoding: 'utf8' });
  const baselineModule = { exports: {} };
  vm.runInNewContext(source, { module: baselineModule, exports: baselineModule.exports }, {
    filename: `${BASELINE_COMMIT}:prompts/quiz.js`
  });
  if (baselineModule.exports.VERSION !== 'quiz-generator-v2') {
    throw new Error(`Expected quiz-generator-v2 at ${BASELINE_COMMIT}; found ${baselineModule.exports.VERSION}.`);
  }
  return {
    version: baselineModule.exports.VERSION,
    generator: baselineModule.exports.GENERATOR,
    reviewer: baselineModule.exports.REVIEWER
  };
}

function parseJson(content) {
  return JSON.parse(String(content || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*|\s*```$/g, '')
    .trim());
}

function outputText(payload) {
  return payload?.message?.content || '';
}

async function callModel(prompt, userPrompt, schema, keepAlive) {
  const startedAt = performance.now();
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: userPrompt }],
      format: schema,
      stream: false,
      keep_alive: keepAlive,
      think: false,
      options: { temperature: 0.15, top_p: 0.2, num_ctx: 16384, num_predict: 900, seed: 17027 }
    })
  });
  const latencyMs = performance.now() - startedAt;
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const payload = await response.json();
  return {
    payload,
    latencyMs,
    promptTokens: Number(payload.prompt_eval_count) || 0,
    completionTokens: Number(payload.eval_count) || 0
  };
}

async function unloadModel() {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: '', stream: false, keep_alive: 0 })
  });
  if (!response.ok) throw new Error(`Could not unload ${MODEL} before cold run (HTTP ${response.status}).`);
  await response.json();
}

function makeGeneratorRequest(item, rejected) {
  const context = JSON.stringify({
    lesson: `Evaluation case ${item.id}`,
    grade: item.grade || 'Lớp 4',
    difficulty: 'Kết hợp hiểu kiến thức và vận dụng, độ khó tăng nhẹ.',
    teacherRequest: item.task,
    material: item.material
  });
  return `NGỮ CẢNH (JSON dữ liệu):\n${context}\nTạo đúng 1 câu dạng multiple-choice. Không lặp: [].\nLỗi lượt trước cần tránh: ${JSON.stringify(rejected)}`;
}

function makeReviewerRequest(item, question) {
  const context = JSON.stringify({ lesson: `Evaluation case ${item.id}`, grade: 'Lớp 4', material: item.material });
  return `NGỮ CẢNH:\n${context}\nCó đúng 1 CÂU HỎI. Trả đúng 1 review, một review cho mỗi questionIndex. Một câu matching có nhiều pairs vẫn CHỈ LÀ MỘT CÂU HỎI, kiểm tra toàn bộ pairs trước khi quyết định approved.\n${JSON.stringify([{ questionIndex: 0, question }])}`;
}

function summarizeCandidate(payload) {
  try {
    const parsed = parseJson(outputText(payload));
    const candidate = Array.isArray(parsed.questions) ? parsed.questions[0] : null;
    const normalized = normalizeQuestion(candidate, 'multiple-choice');
    return { candidate, normalized, reason: normalized ? '' : 'Bị bộ kiểm tra cấu trúc/đáp án loại.' };
  } catch (error) {
    return { candidate: null, normalized: null, reason: `JSON không hợp lệ: ${error.message}` };
  }
}

function summarizeReview(payload) {
  try {
    const parsed = parseJson(outputText(payload));
    const reviews = parsed.reviews;
    const accepted = Array.isArray(reviews) && reviews.length === 1
      && reviews[0].index === 0 && reviews[0].approved === true
      && typeof reviews[0].reason === 'string' && reviews[0].reason.trim().length > 0;
    return {
      accepted,
      reason: Array.isArray(reviews) && reviews[0]?.reason
        ? String(reviews[0].reason).replace(/\s+/g, ' ').slice(0, 180)
        : 'Reviewer không trả về một review có reason.'
    };
  } catch {
    return { accepted: false, reason: 'Reviewer trả JSON không hợp lệ.' };
  }
}

async function evaluatePrompt(item, prompts, promptVersion, keepAlive) {
  const generation = await callModel(
    prompts.generator,
    makeGeneratorRequest(item, []),
    QUESTION_SCHEMA,
    keepAlive
  );
  const candidate = summarizeCandidate(generation.payload);
  if (!candidate.normalized) {
    return {
      accepted: false,
      reason: candidate.reason,
      latencyMs: generation.latencyMs,
      promptTokens: generation.promptTokens,
      completionTokens: generation.completionTokens,
      model: MODEL,
      promptVersion,
      attempts: 1
    };
  }

  const review = await callModel(
    prompts.reviewer,
    makeReviewerRequest(item, candidate.normalized),
    REVIEW_SCHEMA,
    keepAlive
  );
  const reviewResult = summarizeReview(review.payload);
  return {
    accepted: reviewResult.accepted,
    reason: reviewResult.accepted ? '' : `Reviewer: ${reviewResult.reason}`,
    latencyMs: generation.latencyMs + review.latencyMs,
    promptTokens: generation.promptTokens + review.promptTokens,
    completionTokens: generation.completionTokens + review.completionTokens,
    model: MODEL,
    promptVersion,
    attempts: 1
  };
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)];
}

function formatMetric(value) {
  return value === null ? '—' : value.toFixed(0);
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

async function runVersion(items, prompts, promptVersion) {
  await unloadModel();
  const results = [];
  for (const [index, item] of items.entries()) {
    const input = {
      material: item.material,
      questionType: 'multiple-choice',
      questionCount: 1,
      grade: '4',
      difficulty: 'balanced',
      instructions: item.task
    };
    const validatedInput = validateInput(input);
    if (index === 0) {
      const tagsResponse = await fetch(`${BASE_URL}/api/tags`);
      if (!tagsResponse.ok) throw new Error(`Cannot list Ollama models (HTTP ${tagsResponse.status}).`);
      const tags = await tagsResponse.json();
      if (!(tags.models || []).some((entry) => (entry.name || entry.model) === MODEL)) {
        throw new Error(`Pinned model ${MODEL} is not installed in Ollama.`);
      }
    }
    const result = await evaluatePrompt({ ...item, ...validatedInput }, prompts, promptVersion, '10m');
    results.push({ id: item.id, category: item.category, expected: 'accept', cold: index === 0, ...result });
  }
  return results;
}

async function run() {
  const v2Prompts = loadBaselinePrompts();
  const v3Prompts = getQuizPrompts('multiple-choice');
  const normalEdgeCases = CASES.filter((item) => item.category !== 'refusal');
  const refusalCases = CASES.filter((item) => item.category === 'refusal');
  const results = [];

  for (const item of refusalCases) {
    let refused = false;
    try {
      validateInput(item.invalid);
    } catch {
      refused = true;
    }
    results.push({
      id: item.id,
      category: item.category,
      expected: 'reject-before-model',
      v2Accepted: refused,
      v3Accepted: refused,
      model: 'not called',
      v2Version: v2Prompts.version,
      v3Version: VERSION,
      reason: refused ? 'Input validator từ chối trước khi gọi Ollama.' : 'Input validator chấp nhận ca cần từ chối.'
    });
  }

  const v2 = await runVersion(normalEdgeCases, v2Prompts, v2Prompts.version);
  const v3 = await runVersion(normalEdgeCases, v3Prompts, VERSION);
  const v2ById = new Map(v2.map((item) => [item.id, item]));
  const v3ById = new Map(v3.map((item) => [item.id, item]));
  for (const item of normalEdgeCases) {
    const before = v2ById.get(item.id);
    const after = v3ById.get(item.id);
    results.push({
      id: item.id,
      category: item.category,
      expected: 'accept-after-validation-and-review',
      v2Accepted: before.accepted,
      v3Accepted: after.accepted,
      model: MODEL,
      v2Version: before.promptVersion,
      v3Version: after.promptVersion,
      cold: before.cold && after.cold,
      v2LatencyMs: before.latencyMs,
      v3LatencyMs: after.latencyMs,
      v2Attempts: before.attempts,
      v3Attempts: after.attempts,
      v2PromptTokens: before.promptTokens,
      v3PromptTokens: after.promptTokens,
      v2CompletionTokens: before.completionTokens,
      v3CompletionTokens: after.completionTokens,
      v2Tokens: before.promptTokens + before.completionTokens,
      v3Tokens: after.promptTokens + after.completionTokens,
      reason: `v2: ${before.reason || 'accepted'}; v3: ${after.reason || 'accepted'}`
    });
  }

  const validResults = results.filter((item) => item.expected === 'accept-after-validation-and-review');
  const allResults = results;
  const v2Passed = allResults.filter((item) => item.v2Accepted).length;
  const v3Passed = allResults.filter((item) => item.v3Accepted).length;
  const v2Latencies = validResults.map((item) => item.v2LatencyMs);
  const v3Latencies = validResults.map((item) => item.v3LatencyMs);
  const coldResults = validResults.filter((item) => item.cold);
  const warmResults = validResults.filter((item) => !item.cold);
  const v2Tokens = validResults.map((item) => item.v2Tokens);
  const v3Tokens = validResults.map((item) => item.v3Tokens);
  const v2PromptTokens = validResults.map((item) => item.v2PromptTokens);
  const v3PromptTokens = validResults.map((item) => item.v3PromptTokens);
  const v2CompletionTokens = validResults.map((item) => item.v2CompletionTokens);
  const v3CompletionTokens = validResults.map((item) => item.v3CompletionTokens);

  console.log(`Quiz generation evaluation: ${CASES.length} cases (${normalEdgeCases.filter((item) => item.category === 'normal').length} normal, ${normalEdgeCases.filter((item) => item.category === 'edge').length} edge, ${refusalCases.length} refusal)`);
  console.log(`Pinned model: ${MODEL}; baseline prompt: ${v2Prompts.version} (${BASELINE_COMMIT}); improved prompt: ${VERSION}`);
  console.log(`Before: ${v2Passed}/${CASES.length} (${(v2Passed / CASES.length * 100).toFixed(1)}%); after: ${v3Passed}/${CASES.length} (${(v3Passed / CASES.length * 100).toFixed(1)}%); change: ${((v3Passed - v2Passed) / CASES.length * 100).toFixed(1)} percentage points`);
  console.log('Valid-case latency ms (first cold; remaining warm):');
  console.log(`  v2 ${v2Prompts.version}: p50=${formatMetric(percentile(v2Latencies, 0.5))}, p95=${formatMetric(percentile(v2Latencies, 0.95))}, meanPromptTokens=${formatMetric(mean(v2PromptTokens))}, meanCompletionTokens=${formatMetric(mean(v2CompletionTokens))}, meanTotalTokens=${formatMetric(mean(v2Tokens))}`);
  console.log(`  v3 ${VERSION}: p50=${formatMetric(percentile(v3Latencies, 0.5))}, p95=${formatMetric(percentile(v3Latencies, 0.95))}, meanPromptTokens=${formatMetric(mean(v3PromptTokens))}, meanCompletionTokens=${formatMetric(mean(v3CompletionTokens))}, meanTotalTokens=${formatMetric(mean(v3Tokens))}`);
  console.log(`Cold first-case latency: v2=${formatMetric(coldResults[0]?.v2LatencyMs ?? null)} ms, v3=${formatMetric(coldResults[0]?.v3LatencyMs ?? null)} ms`);
  console.log(`Warm-case latency: v2 p50=${formatMetric(percentile(warmResults.map((item) => item.v2LatencyMs), 0.5))} ms / p95=${formatMetric(percentile(warmResults.map((item) => item.v2LatencyMs), 0.95))} ms; v3 p50=${formatMetric(percentile(warmResults.map((item) => item.v3LatencyMs), 0.5))} ms / p95=${formatMetric(percentile(warmResults.map((item) => item.v3LatencyMs), 0.95))} ms`);
  console.log('| Case | Type | Expected | v2 result | v3 result | Model | Prompt v2 → v3 | Latency ms v2/v3 | Tokens v2/v3 | Detail |');
  console.log('|---|---|---|---|---|---|---|---:|---:|---|');
  for (const item of results) {
    const status = (accepted) => accepted ? 'pass' : 'fail';
    const latency = item.expected === 'reject-before-model'
      ? '—'
      : `${formatMetric(item.v2LatencyMs)}/${formatMetric(item.v3LatencyMs)}${item.cold ? ' (cold)' : ' (warm)'}`;
    const tokens = item.expected === 'reject-before-model' ? '—' : `${item.v2Tokens}/${item.v3Tokens}`;
    console.log(`| ${item.id} | ${item.category} | ${item.expected} | ${status(item.v2Accepted)} | ${status(item.v3Accepted)} | ${item.model} | ${item.v2Version} → ${item.v3Version} | ${latency} | ${tokens} | ${item.reason} |`);
  }
}

run().catch((error) => {
  console.error(`Quiz generation evaluation failed: ${error.message}`);
  process.exitCode = 1;
});
