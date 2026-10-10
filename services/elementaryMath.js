const digitWords = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function normalizeVietnamese(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');
}

function readTwoDigits(value, hasHundreds) {
  const tens = Math.floor(value / 10);
  const units = value % 10;
  if (!tens) return units ? `${hasHundreds ? 'linh ' : ''}${digitWords[units]}` : '';
  if (tens === 1) return `mười${units ? ` ${units === 5 ? 'lăm' : digitWords[units]}` : ''}`;
  return `${digitWords[tens]} mươi${units ? ` ${units === 1 ? 'mốt' : units === 4 ? 'tư' : units === 5 ? 'lăm' : digitWords[units]}` : ''}`;
}

function readNumberGroup(value, forceHundreds = false) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const words = [];
  if (hundreds || forceHundreds) words.push(`${digitWords[hundreds]} trăm`);
  if (remainder) words.push(readTwoDigits(remainder, hundreds > 0 || forceHundreds));
  return words.filter(Boolean).join(' ');
}

function readVietnameseNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99999) return null;
  if (value < 1000) return readNumberGroup(value) || 'không';
  const thousands = Math.floor(value / 1000);
  const remainder = value % 1000;
  const words = `${readNumberGroup(thousands)} nghìn`;
  return remainder
    ? `${words} ${readNumberGroup(remainder, remainder < 100)}`
    : words;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

function answerFractionAddition(question, normalizedQuestion) {
  if (!(/\bcong\b/.test(normalizedQuestion) && normalizedQuestion.includes('phan so')) && !/^\s*(?:tinh\s+)?\d+\s*\/\s*\d+\s*\+\s*\d+\s*\/\s*\d+\s*[=?!.]*\s*$/.test(normalizedQuestion)) return null;
  if (/[−-]|\b(?:tru|nhan|chia)\b/.test(normalizedQuestion)) return null;
  const fractions = [...question.matchAll(/(\d+)\s*\/\s*(\d+)/g)];

  if (fractions.length > 2) return null;
  if (fractions.length === 2) {
    const [, leftNumeratorText, leftDenominatorText] = fractions[0];
    const [, rightNumeratorText, rightDenominatorText] = fractions[1];
    const leftNumerator = Number(leftNumeratorText);
    const leftDenominator = Number(leftDenominatorText);
    const rightNumerator = Number(rightNumeratorText);
    const rightDenominator = Number(rightDenominatorText);
    if (!leftDenominator || !rightDenominator) return { message: 'Mẫu số phải khác 0. Con kiểm tra lại phân số nhé.', suggestionId: null };
    if (![leftNumerator, leftDenominator, rightNumerator, rightDenominator, leftNumerator * rightDenominator + rightNumerator * leftDenominator, leftDenominator * rightDenominator].every(Number.isSafeInteger)) return null;

    let numerator = leftNumerator * rightDenominator + rightNumerator * leftDenominator;
    let denominator = leftDenominator * rightDenominator;
    const divisor = greatestCommonDivisor(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
    const result = denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
    return {
      message: `Quy đồng rồi cộng tử số: ${leftNumerator}/${leftDenominator} + ${rightNumerator}/${rightDenominator} = ${result}.`,
      suggestionId: null
    };
  }

  const sameDenominator = /cung mau so/.test(normalizedQuestion);
  return {
    message: sameDenominator
      ? 'Nếu hai phân số cùng mẫu số, con cộng hai tử số và giữ nguyên mẫu số; nếu cần thì rút gọn kết quả. Ví dụ: 1/5 + 2/5 = (1 + 2)/5 = 3/5.'
      : 'Nếu hai phân số cùng mẫu số, con cộng hai tử số và giữ nguyên mẫu số. Nếu khác mẫu số, con quy đồng trước, rồi cộng tử số và rút gọn kết quả. Ví dụ: 1/2 + 1/3 = 3/6 + 2/6 = 5/6.',
    suggestionId: null
  };
}

function answerElementaryMath(question) {
  const normalizedQuestion = normalizeVietnamese(question);
  if (normalizedQuestion.includes('doc so') || normalizedQuestion.includes('cach doc so')) {
    if (/\b(?:5|nam)\s+chu\s+so\b/.test(normalizedQuestion)) {
      return {
        message: 'Đọc theo thứ tự hàng chục nghìn, hàng nghìn, hàng trăm, hàng chục rồi hàng đơn vị. Ví dụ: 54 108 đọc là năm mươi tư nghìn một trăm linh tám.',
        suggestionId: null
      };
    }
    const compactQuestion = normalizedQuestion.replace(/(\d{1,3})[ .](?=\d{3}\b)/g, '$1');
    const numberMatch = compactQuestion.match(/\bdoc so\s+(\d+)\s*(?:doc|la|nhu|the|nao|[?!.]|$)/);
    if (numberMatch) {
      const words = readVietnameseNumber(Number(numberMatch[1]));
      if (words) return { message: `Số ${numberMatch[1]} đọc là ${words}.`, suggestionId: null };
    }
  }

  return answerFractionAddition(question, normalizedQuestion);
}

module.exports = { answerElementaryMath, readVietnameseNumber };
