const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GAME_TYPES,
  getGameType,
  chooseStoryModel,
  validateLessonInput,
  normalizeAdventure,
  validateTitleRelevance,
  generateStoryAdventure
} = require('../services/storyAdventure');

const lesson = {
  id: 'lesson-1',
  title: 'Số chẵn và số lẻ',
  grade: 'Lớp 4',
  content: 'Số chẵn là số chia hết cho 2. Số lẻ là số không chia hết cho 2. Có thể nhận biết số chẵn lẻ qua chữ số tận cùng.'
};

function findLessonId(type) {
  for (let index = 0; index < 100; index += 1) {
    const id = `lesson-${index}`;
    if (getGameType(id).id === type) return id;
  }
  throw new Error(`No lesson ID found for ${type}`);
}

function generatedPayload(type) {
  const panels = Array.from({ length: 4 }, (_, index) => ({
    caption: `Khung ${index + 1}`,
    narration: `Các bạn cùng tìm hiểu số chẵn và số lẻ trong bài học ở chặng ${index + 1}.`,
    boardText: 'Số chẵn chia hết cho 2.',
    dialogue: [
      { role: 'curious', speaker: 'Lan', text: 'Số chẵn là số như thế nào vậy?' },
      { role: 'explainer', speaker: 'Minh', text: 'Số chẵn là số chia hết cho 2 nhé!' }
    ]
  }));
  const challenges = type === 'multiple-choice'
    ? Array.from({ length: 4 }, (_, index) => ({
      question: `Số ${index * 2} có chia hết cho 2 không?`,
      options: ['Có', 'Không', 'Chưa biết', 'Không liên quan'],
      correctIndex: 0,
      explanation: 'Số chẵn chia hết cho 2 theo định nghĩa.'
    }))
    : type === 'true-false'
      ? Array.from({ length: 4 }, (_, index) => ({
        statement: `Số ${index * 2} là số chẵn.`,
        correct: true,
        explanation: 'Số chẵn chia hết cho 2 theo định nghĩa.'
      }))
      : [{
        prompt: 'Sắp xếp các bước để xác định một số có phải số chẵn không.',
        items: ['Nhìn chữ số tận cùng', 'Chọn một số cần xét', 'Kết luận chẵn hoặc lẻ', 'Kiểm tra chữ số có chia hết cho 2'],
        correctOrder: ['Chọn một số cần xét', 'Nhìn chữ số tận cùng', 'Kiểm tra chữ số có chia hết cho 2', 'Kết luận chẵn hoặc lẻ'],
        explanation: 'Xét số, nhìn chữ số cuối, kiểm tra tính chia hết rồi kết luận.'
      }];
  return {
    storyTitle: 'Hành trình tìm con số bí ẩn',
    panels,
    gameTitle: 'Thử thách con số',
    gamePreview: 'Giúp nhóm bạn vượt qua thử thách bằng kiến thức vừa học.',
    challenges
  };
}

test('lesson content is validated and bounded before generation', () => {
  assert.deepEqual(validateLessonInput(lesson), {
    lessonId: lesson.id,
    title: lesson.title,
    grade: lesson.grade,
    material: lesson.content
  });
  assert.throws(() => validateLessonInput({ ...lesson, content: 'Quá ngắn' }), /chưa có đủ nội dung/);
  assert.throws(() => validateLessonInput({ ...lesson, grade: 'Lớp 6' }), /Khối lớp/);
  assert.equal(validateLessonInput({ ...lesson, content: '', description: lesson.content }).material, lesson.content);
  assert.equal(validateLessonInput({ ...lesson, content: 'x'.repeat(13000) }).material.length, 12000);
});

test('different lessons receive stable mini-game types', () => {
  const ids = Array.from({ length: 100 }, (_, index) => `lesson-${index}`);
  assert.deepEqual(new Set(ids.map((id) => getGameType(id).id)), new Set(Object.values(GAME_TYPES).map((game) => game.id)));
  assert.equal(getGameType(lesson.id).id, getGameType(lesson.id).id);
});

test('story generation prefers a smaller installed model unless explicitly configured', () => {
  const installed = ['nomic-embed-text:latest', 'qwen3:8b', 'llama3.2:3b', 'qwen2.5:3b'];
  assert.equal(chooseStoryModel(installed), 'qwen2.5:3b');
  assert.equal(chooseStoryModel(installed, 'qwen3:8b'), 'qwen3:8b');
  assert.equal(chooseStoryModel(['nomic-embed-text:latest', 'qwen3:8b']), 'qwen3:8b');
});

test('generated output is validated for each game mechanic', () => {
  for (const type of Object.values(GAME_TYPES).map((game) => game.id)) {
    const adventure = normalizeAdventure(generatedPayload(type), type);
    assert.equal(adventure.story.panels.length, 4);
    assert.equal(adventure.game.type, type);
    assert.equal(adventure.game.challenges.length, type === 'sequence' ? 1 : 4);
    if (type === 'sequence') assert.deepEqual(adventure.game.challenges[0].correctOrder, [1, 0, 3, 2]);
  }
  const legacySequence = generatedPayload('sequence');
  legacySequence.challenges[0].correctOrder = [1, 0, 3, 2];
  assert.deepEqual(normalizeAdventure(legacySequence, 'sequence').game.challenges[0].correctOrder, [1, 0, 3, 2]);
  const malformed = generatedPayload('multiple-choice');
  malformed.challenges[0].correctIndex = 5;
  assert.throws(() => normalizeAdventure(malformed, 'multiple-choice'), /trắc nghiệm/);
  const invalidOrder = generatedPayload('sequence');
  invalidOrder.challenges[0].correctOrder = [0, 0, 1, 2];
  assert.throws(() => normalizeAdventure(invalidOrder, 'sequence'), /sắp xếp/);
  assert.throws(() => normalizeAdventure(null, 'sequence'), /hợp lệ/);
});

test('story panels require two recurring characters, dialogue, and a lesson board', () => {
  const type = getGameType(lesson.id).id;
  const payload = generatedPayload(type);
  const normalized = normalizeAdventure(payload, type);
  assert.equal(normalized.story.panels[0].dialogue[1].speaker, 'Minh');
  assert.match(normalized.story.panels[0].boardText, /Số chẵn/);
  const missingDialogue = generatedPayload(type);
  missingDialogue.panels[0].dialogue = [{ role: 'explainer', speaker: 'Minh', text: 'Số chẵn chia hết cho hai.' }];
  assert.throws(() => normalizeAdventure(missingDialogue, type), /hội thoại hỏi đáp/);
  const changingCast = generatedPayload(type);
  changingCast.panels[3].dialogue[1].speaker = 'Huy';
  assert.throws(() => normalizeAdventure(changingCast, type), /Tên hai nhân vật phải thống nhất/);
  const reversedRoles = generatedPayload(type);
  reversedRoles.panels[0].dialogue.reverse();
  assert.throws(() => normalizeAdventure(reversedRoles, type), /nhân vật tò mò hỏi trước/);
});

test('story and mini-game must use the actual lesson title keywords', () => {
  const type = getGameType(lesson.id).id;
  const adventure = normalizeAdventure(generatedPayload(type), type);
  assert.doesNotThrow(() => validateTitleRelevance(adventure, lesson.title));
  const unrelated = generatedPayload(type);
  unrelated.panels.forEach((panel) => {
    panel.narration = 'Các bạn cùng khám phá phép nhân và chia trong chuyến phiêu lưu.';
    panel.boardText = 'Phép nhân và phép chia.';
    panel.dialogue.forEach((line) => { line.text = 'Phép nhân giúp chúng ta tính nhanh!'; });
  });
  unrelated.challenges.forEach((challenge) => {
    if (challenge.question) challenge.question = 'Phép nhân nào có kết quả bằng 12?';
    if (challenge.statement) challenge.statement = 'Phép nhân là phép tính cần dùng trong bài này.';
    if (challenge.prompt) challenge.prompt = 'Sắp xếp các bước thực hiện phép nhân.';
    if (challenge.items) {
      challenge.items = ['Bắt đầu phép nhân', 'Nhân số thứ nhất', 'Nhân số tiếp theo', 'Viết kết quả phép nhân'];
      challenge.correctOrder = [...challenge.items];
    }
    challenge.explanation = 'Phép nhân là kiến thức chính cần áp dụng.';
  });
  assert.throws(
    () => validateTitleRelevance(normalizeAdventure(unrelated, type), lesson.title),
    /chưa bám sát tiêu đề bài/
  );
});

test('AI generation uses constrained JSON and returns a normalized adventure', async () => {
  const type = getGameType(lesson.id).id;
  const payload = generatedPayload(type);
  const requests = [];
  const usage = { promptTokens: 0, completionTokens: 0 };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:7b' }] }) };
    const requestBody = JSON.parse(options.body);
    const isReview = requestBody.format.properties?.approved;
    return {
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify(isReview ? { approved: true, reason: 'Đã kiểm tra kiến thức và đáp án.' } : payload) },
        prompt_eval_count: isReview ? 8 : 21,
        eval_count: isReview ? 3 : 34
      })
    };
  };
  const result = await generateStoryAdventure(validateLessonInput(lesson), {
    fetchImpl,
    onUsage: (event) => {
      usage.promptTokens += event.promptTokens;
      usage.completionTokens += event.completionTokens;
    }
  });
  assert.equal(requests.length, 3);
  assert.equal(requests[1].url, 'http://localhost:11434/api/chat');
  assert.equal(JSON.parse(requests[1].options.body).format.type, 'object');
  assert.match(JSON.parse(requests[1].options.body).messages[0].content, /Tiêu đề bài học là chủ đề bắt buộc/);
  assert.equal(JSON.parse(requests[2].options.body).format.required.includes('approved'), true);
  assert.equal(JSON.parse(requests[2].options.body).messages[1].content.includes(lesson.title), true);
  assert.equal(result.game.type, type);
  assert.equal(result.story.panels.length, 4);
  assert.equal(result.promptVersion, 'story-adventure-v2');
  assert.equal(usage.promptTokens, 29);
  assert.equal(usage.completionTokens, 37);
});

test('invalid panel text is repaired once before independent content review', async () => {
  const type = getGameType(lesson.id).id;
  const payload = generatedPayload(type);
  const invalidPayload = generatedPayload(type);
  invalidPayload.panels[0].narration = 'x'.repeat(241);
  const requests = [];
  let generationCount = 0;
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:3b' }] }) };
    const body = JSON.parse(options.body);
    if (body.format.properties?.approved) {
      return { ok: true, json: async () => ({ message: { content: JSON.stringify({ approved: true, reason: 'Đã kiểm tra kiến thức và đáp án.' }) } }) };
    }
    generationCount += 1;
    return {
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(generationCount === 1 ? invalidPayload : payload) } })
    };
  };
  const result = await generateStoryAdventure(validateLessonInput(lesson), { fetchImpl });
  assert.equal(generationCount, 2);
  assert.equal(requests.length, 4);
  assert.match(JSON.parse(requests[2].options.body).messages[1].content, /nội dung khung 1/);
  assert.equal(result.story.panels[0].narration.length <= 240, true);
});

test('content that drifts from the lesson title is regenerated before review', async () => {
  const type = getGameType(lesson.id).id;
  const offTopic = generatedPayload(type);
  offTopic.panels.forEach((panel) => {
    panel.narration = 'Các bạn cùng khám phá phép nhân và chia trong chuyến phiêu lưu.';
    panel.boardText = 'Phép nhân và phép chia.';
    panel.dialogue.forEach((line) => { line.text = 'Phép nhân giúp chúng ta tính nhanh!'; });
  });
  offTopic.challenges.forEach((challenge) => {
    if (challenge.question) challenge.question = 'Phép nhân nào có kết quả bằng 12?';
    if (challenge.statement) challenge.statement = 'Phép nhân là phép tính cần dùng trong bài này.';
    if (challenge.prompt) challenge.prompt = 'Sắp xếp các bước thực hiện phép nhân.';
    if (challenge.items) {
      challenge.items = ['Bắt đầu phép nhân', 'Nhân số thứ nhất', 'Nhân số tiếp theo', 'Viết kết quả phép nhân'];
      challenge.correctOrder = [...challenge.items];
    }
    challenge.explanation = 'Phép nhân là kiến thức chính cần áp dụng.';
  });
  const onTopic = generatedPayload(type);
  let generationCount = 0;
  let repairPrompt = '';
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:3b' }] }) };
    const body = JSON.parse(options.body);
    if (body.format.properties?.approved) {
      return { ok: true, json: async () => ({ message: { content: JSON.stringify({ approved: true, reason: 'Đã kiểm tra tiêu đề và nội dung.' }) } }) };
    }
    generationCount += 1;
    if (generationCount === 2) repairPrompt = body.messages[1].content;
    return {
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(generationCount === 1 ? offTopic : onTopic) } })
    };
  };
  const result = await generateStoryAdventure(validateLessonInput(lesson), { fetchImpl });
  assert.equal(generationCount, 2);
  assert.match(repairPrompt, /chưa bám sát tiêu đề bài/);
  assert.equal(result.story.title, onTopic.storyTitle);
});

test('AI-generated content is rejected when its independent review fails', async () => {
  const payload = generatedPayload(getGameType(lesson.id).id);
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:7b' }] }) };
    const isReview = JSON.parse(options.body).format.properties?.approved;
    return {
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify(isReview ? { approved: false, reason: 'Đáp án chưa đúng.' } : payload) }
      })
    };
  };
  await assert.rejects(
    generateStoryAdventure(validateLessonInput(lesson), { fetchImpl }),
    /chưa vượt qua bước kiểm tra/
  );
});

test('generation has a total timeout and explains how to adjust a slow local model', async () => {
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/api/tags')) return { ok: true, json: async () => ({ models: [{ name: 'qwen2.5:3b' }] }) };
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  };
  await assert.rejects(
    generateStoryAdventure(validateLessonInput(lesson), { fetchImpl, timeoutMs: 20 }),
    (error) => error.code === 'STORY_TIMEOUT' && /OLLAMA_STORY_TIMEOUT_MS/.test(error.message)
  );
});
