// Kiểm tra nội dung giáo viên soạn cho từng mẫu trò chơi bài tập.
// Mỗi mục hợp lệ trở thành một dòng assignment_questions và được chấm điểm riêng.

const GAME_TYPES = ['quiz', 'match-up', 'group-sort', 'ordering', 'cloze', 'find-match', 'open-box', 'gameshow', 'digit-arrange', 'flash-cards'];
const BLANK = '___';
const MAX_ITEMS = 40;
const FLASH_CARD_THEMES = ['garden', 'ocean', 'space'];

function text(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function fail(index, message) {
  throw new Error(`Mục ${index + 1}: ${message}`);
}

function distinct(values) {
  return new Set(values.map((value) => value.toLocaleLowerCase('vi-VN'))).size === values.length;
}

function choiceItem(item, index, { min, max }) {
  const question = text(item.question, 500);
  const options = (Array.isArray(item.options) ? item.options : []).map((option) => text(option, 200));
  if (!question) fail(index, 'cần nhập nội dung câu hỏi.');
  if (options.length < min || options.length > max || options.some((option) => !option)) {
    fail(index, `cần từ ${min} đến ${max} lựa chọn, không để trống.`);
  }
  if (!distinct(options)) fail(index, 'các lựa chọn không được trùng nhau.');
  if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= options.length) fail(index, 'hãy chọn đáp án đúng.');
  return { type: 'multiple-choice', question, options, answer: item.answer };
}

function pairItem(item, index) {
  const question = text(item.question, 200);
  const answer = text(item.answer, 200);
  if (!question || !answer) fail(index, 'cần nhập đủ hai vế.');
  return { type: 'fill-blank', question, options: [], answer };
}

function normalizeItem(gameType, item, index) {
  switch (gameType) {
    case 'quiz':
    case 'open-box':
    case 'gameshow':
    case 'group-sort':
      return choiceItem(item, index, { min: 2, max: 4 });
    case 'match-up':
    case 'find-match':
    case 'flash-cards':
      return pairItem(item, index);
    case 'digit-arrange': {
      const question = text(item.question, 300);
      const answer = text(item.answer, 12).replace(/\s+/g, '');
      if (!question) fail(index, 'cần nhập yêu cầu.');
      if (answer.length < 2) fail(index, 'đáp án cần ít nhất 2 kí tự.');
      return { type: 'fill-blank', question, options: [], answer };
    }
    case 'ordering': {
      const question = text(item.question, 300);
      const options = (Array.isArray(item.options) ? item.options : []).map((option) => text(option, 120));
      if (!question) fail(index, 'cần nhập yêu cầu sắp xếp.');
      if (options.length < 3 || options.length > 8 || options.some((option) => !option)) fail(index, 'cần từ 3 đến 8 thẻ, không để trống.');
      if (!distinct(options)) fail(index, 'các thẻ không được trùng nhau.');
      return { type: 'ordering', question, options, answer: options.map((_, position) => position) };
    }
    case 'cloze': {
      const question = text(item.question, 500);
      const answer = (Array.isArray(item.answer) ? item.answer : []).map((value) => text(value, 60));
      const distractors = (Array.isArray(item.options) ? item.options : []).map((value) => text(value, 60)).filter(Boolean).slice(0, 6);
      const blanks = question.split(BLANK).length - 1;
      if (!blanks) fail(index, 'cần ít nhất một chỗ trống.');
      if (blanks > 6) fail(index, 'tối đa 6 chỗ trống mỗi câu.');
      if (answer.length !== blanks || answer.some((value) => !value)) fail(index, 'mỗi chỗ trống cần một đáp án.');
      return { type: 'cloze', question, options: distractors, answer };
    }
    default:
      throw new Error('Mẫu trò chơi không hợp lệ.');
  }
}

function minimumItems(gameType) {
  if (['match-up', 'find-match'].includes(gameType)) return 3;
  if (gameType === 'flash-cards') return 2;
  if (gameType === 'group-sort') return 4;
  return 1;
}

function normalizeGameQuestions(gameType, questions) {
  if (!GAME_TYPES.includes(gameType)) throw new Error('Mẫu trò chơi không hợp lệ.');
  const items = Array.isArray(questions) ? questions.slice(0, MAX_ITEMS + 1) : [];
  if (items.length > MAX_ITEMS) throw new Error(`Mỗi trò chơi có tối đa ${MAX_ITEMS} mục.`);
  if (items.length < minimumItems(gameType)) throw new Error(`Trò chơi này cần ít nhất ${minimumItems(gameType)} mục.`);
  const normalized = items.map((item, index) => ({
    ...normalizeItem(gameType, item || {}, index),
    skill_id: null,
    explanation: text(item?.explanation, 500),
    points: 1
  }));
  if (gameType === 'group-sort') {
    const groups = JSON.stringify(normalized[0].options);
    if (normalized.some((item) => JSON.stringify(item.options) !== groups)) throw new Error('Các thẻ phải dùng chung một danh sách nhóm.');
  }
  if (['match-up', 'find-match'].includes(gameType) && !distinct(normalized.map((item) => item.answer))) {
    throw new Error('Các đáp án ghép cặp không được trùng nhau.');
  }
  return normalized;
}

function normalizeGameSettings(gameType, settings = {}) {
  if (gameType === 'gameshow') {
    const timeLimit = Number(settings?.time_limit);
    return { time_limit: Number.isInteger(timeLimit) && timeLimit >= 10 && timeLimit <= 120 ? timeLimit : 20 };
  }
  if (gameType === 'flash-cards') {
    const theme = settings?.theme || 'garden';
    if (!FLASH_CARD_THEMES.includes(theme)) throw new Error('Chủ đề thẻ ghi nhớ không hợp lệ.');
    return { theme };
  }
  return {};
}

module.exports = { GAME_TYPES, BLANK, normalizeGameQuestions, normalizeGameSettings };
