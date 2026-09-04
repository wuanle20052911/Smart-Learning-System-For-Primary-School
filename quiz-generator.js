// Helper to create Word document from quiz data
const fs = require('fs');
const path = require('path');

// Simple text-based quiz generator (no external dependencies)
function generateQuizHTML(quizData, title = 'Bộ Câu Hỏi Ôn Tập') {
  let html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
  .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  h1 { color: #2E7D32; text-align: center; border-bottom: 3px solid #2E7D32; padding-bottom: 15px; }
  .question { margin: 25px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2E7D32; border-radius: 4px; }
  .question-text { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 16px; }
  .options { margin: 10px 0 15px 20px; }
  .option { margin: 8px 0; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; }
  .option input { margin-right: 8px; }
  .page-break { page-break-after: always; }
  .answer-key { margin-top: 40px; border-top: 2px solid #999; padding-top: 20px; background: #fffacd; }
  .answer-key h2 { color: #d9534f; }
  .answer-item { margin: 10px 0; padding: 10px; background: white; }
</style>
</head>
<body>
<div class="container">
<h1>${title}</h1>
`;

  // Add questions
  quizData.forEach((q, idx) => {
    const type = q.type || 'multiple-choice';
    html += `
<div class="question">
  <div class="question-text">Câu ${idx + 1}: ${q.question}</div>
  <div class="options">
`;
    if (type === 'matching') {
      q.pairs.forEach((pair, pairIdx) => {
        html += `    <div class="option">${pairIdx + 1}. ${pair.left} — ${pair.right}</div>\n`;
      });
    } else if (type === 'fill-blank' || type === 'short-answer') {
      html += '    <div class="option">................................................................</div>\n';
    } else {
      q.options.forEach((opt, optIdx) => {
        const optionLetter = String.fromCharCode(65 + optIdx);
        html += `    <div class="option"><input type="radio" name="q${idx}" value="${optionLetter}"> ${optionLetter}. ${opt}</div>\n`;
      });
    }
    html += `  </div>
</div>
`;
  });

  // Add answer key
  html += `
<div class="answer-key">
  <h2>ĐÁP ÁN</h2>
`;
  quizData.forEach((q, idx) => {
    const type = q.type || 'multiple-choice';
    let answer = type === 'matching'
      ? q.correctMatches.map(index => q.pairs[index].right).join(', ')
      : (type === 'fill-blank' || type === 'short-answer')
        ? q.answer
        : `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`;
    html += `  <div class="answer-item"><strong>Câu ${idx + 1}:</strong> ${answer}`;
    if (q.explanation) {
      html += `<br/><em>Giải thích: ${q.explanation}</em>`;
    }
    html += `</div>\n`;
  });

  html += `
</div>
</div>
</body>
</html>`;

  return html;
}

function generateQuizTXT(quizData, title = 'BỘ CÂU HỎI ÔN TẬP') {
  let txt = `${title}\n`;
  txt += `${'='.repeat(60)}\n\n`;

  quizData.forEach((q, idx) => {
    const type = q.type || 'multiple-choice';
    txt += `Câu ${idx + 1}: ${q.question}\n`;
    if (type === 'matching') {
      q.pairs.forEach((pair, pairIdx) => {
        txt += `  ${pairIdx + 1}. ${pair.left} — ${pair.right}\n`;
      });
    } else if (type === 'fill-blank' || type === 'short-answer') {
      txt += '  Trả lời: ........................................................\n';
    } else {
      q.options.forEach((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        txt += `  ${letter}. ${opt}\n`;
      });
    }
    txt += `\n`;
  });

  txt += `\n${'='.repeat(60)}\n`;
  txt += `ĐÁP ÁN\n`;
  txt += `${'='.repeat(60)}\n\n`;

  quizData.forEach((q, idx) => {
    const type = q.type || 'multiple-choice';
    const answer = type === 'matching'
      ? q.correctMatches.map(index => q.pairs[index].right).join(', ')
      : (type === 'fill-blank' || type === 'short-answer')
        ? q.answer
        : `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`;
    txt += `Câu ${idx + 1}: ${answer}\n`;
    if (q.explanation) {
      txt += `Giải thích: ${q.explanation}\n`;
    }
    txt += `\n`;
  });

  return txt;
}

module.exports = {
  generateQuizHTML,
  generateQuizTXT
};
