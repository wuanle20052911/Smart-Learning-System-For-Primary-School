(() => {
  try {
    const session = JSON.parse(localStorage.getItem('learnhub-session') || 'null');
    if (!session?.access_token) window.location.replace('/');
  } catch {
    localStorage.removeItem('learnhub-session');
    window.location.replace('/');
  }
})();
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const state = {
  fileName: '',
  extractedText: '',
  difficulty: 'dễ',
  questionType: 'multiple-choice',
  qCount: 5,
  quiz: [],
  currentIndex: 0,
  score: 0,
  answers: [] // {questionIndex, chosen, correct}
};

// ---------- Elements ----------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileChipWrap = document.getElementById('fileChipWrap');
const previewBox = document.getElementById('previewBox');
const uploadError = document.getElementById('uploadError');
const settingsCard = document.getElementById('settingsCard');
const difficultyGroup = document.getElementById('difficultyGroup');
const questionTypeGroup = document.getElementById('questionTypeGroup');
const qCountLabel = document.getElementById('qCountLabel');
const decBtn = document.getElementById('decBtn');
const incBtn = document.getElementById('incBtn');
const hintInput = document.getElementById('hintInput');
const generateBtn = document.getElementById('generateBtn');
const genError = document.getElementById('genError');
const loadingCard = document.getElementById('loadingCard');
const loadingText = document.getElementById('loadingText');
const quizCard = document.getElementById('quizCard');
const qCounter = document.getElementById('qCounter');
const progressFill = document.getElementById('progressFill');
const scoreTag = document.getElementById('scoreTag');
const qText = document.getElementById('qText');
const optionsWrap = document.getElementById('optionsWrap');
const feedbackWrap = document.getElementById('feedbackWrap');
const nextBtn = document.getElementById('nextBtn');
const resultsCard = document.getElementById('resultsCard');
const resultEmoji = document.getElementById('resultEmoji');
const resultTitle = document.getElementById('resultTitle');
const resultScore = document.getElementById('resultScore');
const resultMsg = document.getElementById('resultMsg');
const retryBtn = document.getElementById('retryBtn');

function isValidQuestion(q){
  if(!q || typeof q.question !== 'string' || !q.question.trim()) return false;
  const type = q.type || 'multiple-choice';
  if(type === 'multiple-choice'){
    return Array.isArray(q.options) && q.options.length >= 2
      && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length;
  }
  if(type === 'true-false'){
    return Array.isArray(q.options) && q.options.length === 2
      && Number.isInteger(q.correctIndex) && (q.correctIndex === 0 || q.correctIndex === 1);
  }
  if(type === 'fill-blank' || type === 'short-answer'){
    return typeof q.answer === 'string' && q.answer.trim().length > 0;
  }
  if(type === 'matching'){
    return Array.isArray(q.pairs) && q.pairs.length > 0
      && Array.isArray(q.correctMatches) && q.correctMatches.length === q.pairs.length
      && q.correctMatches.every(index => Number.isInteger(index) && index >= 0 && index < q.pairs.length);
  }
  return false;
}
const reviewToggle = document.getElementById('reviewToggle');
const reviewList = document.getElementById('reviewList');
const uploadCard = document.getElementById('uploadCard');
const practiceLabel = document.getElementById('practiceLabel');
const lessonGrid = document.getElementById('lessonGrid');
const dailyProgress = document.getElementById('dailyProgress');
const dailyLabel = document.getElementById('dailyLabel');
const xpValue = document.getElementById('xpValue');
const lessonValue = document.getElementById('lessonValue');
const streakChip = document.getElementById('streakChip');

const progressState = JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0,"streak":0}');
function saveProgress(){ localStorage.setItem('mathjoy-progress', JSON.stringify(progressState)); }
function updateProgress(){
  xpValue.textContent = progressState.xp;
  lessonValue.textContent = progressState.lessons;
  streakChip.textContent = `🔥 ${progressState.streak} ngày`;
  dailyProgress.style.width = `${Math.min(100, (progressState.answered / 5) * 100)}%`;
  dailyLabel.textContent = `${Math.min(5, progressState.answered)}/5 câu hỏi`;
}
updateProgress();

function getSessionToken(){
  try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null')?.access_token || ''; }
  catch { return ''; }
}

async function loadPublishedLessons(){
  const token = getSessionToken();
  if(!token) return;
  const response = await fetch('/api/lessons/published', { headers: { Authorization: `Bearer ${token}` } });
  if(response.status === 401){ localStorage.removeItem('learnhub-session'); window.location.replace('/'); return; }
  if(!response.ok) throw new Error('Không thể tải bài học.');
  const { lessons } = await response.json();
  lessonGrid.innerHTML = '';
  if(!lessons.length){
    lessonGrid.innerHTML = '<p class="lesson-empty">Chưa có bài học được xuất bản.</p>';
    return;
  }
  lessons.forEach((lesson) => {
    const button = document.createElement('button');
    button.className = `lesson ${lesson.color}`;
    button.dataset.topic = lesson.topic || lesson.title;
    button.dataset.lessonId = lesson.id;
    button.innerHTML = `<small>${escapeHtml(lesson.subject)} · ${escapeHtml(lesson.grade)}</small><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description)}</p><span class="lesson-art">${escapeHtml(lesson.icon)}</span>`;
    button.addEventListener('click', () => openPractice(button.dataset.topic, lesson));
    lessonGrid.appendChild(button);
  });
}

const session = (() => {
  try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null'); } catch { return null; }
})();
if(['teacher', 'admin'].includes(session?.profile?.role || session?.user?.user_metadata?.role)){
  document.getElementById('teacherLink').classList.remove('hidden');
}
loadPublishedLessons().catch((error) => {
  console.error(error);
  lessonGrid.innerHTML = '<p class="lesson-empty">Không thể tải bài học lúc này.</p>';
});

function openPractice(topic = 'Phép cộng và trừ', lesson = null){
  practiceLabel.classList.remove('hidden');
  hintInput.value = `Toán tiểu học - ${topic}`;
  if(lesson?.content){
    state.fileName = lesson.source_filename || lesson.title;
    state.extractedText = lesson.content;
    previewBox.textContent = lesson.content.slice(0, 1200) + (lesson.content.length > 1200 ? ' ...' : '');
    previewBox.style.display = 'block';
    uploadCard.classList.add('hidden');
    settingsCard.classList.remove('hidden');
    settingsCard.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }
  uploadCard.classList.remove('hidden');
  uploadCard.scrollIntoView({behavior:'smooth', block:'start'});
}
document.getElementById('showUploadBtn').addEventListener('click', () => openPractice());
document.getElementById('showAllLessons').addEventListener('click', () => openPractice('Toán tiểu học tổng hợp'));
document.getElementById('dailyPracticeBtn').addEventListener('click', () => openPractice('Phép cộng và trừ'));
document.getElementById('quickPracticeBtn').addEventListener('click', () => openPractice('Toán mẹo mỗi ngày'));
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('learnhub-session');
  window.location.replace('/');
});

// ---------- Upload handling ----------
dropzone.addEventListener('click', () => fileInput.click());
['dragover','dragenter'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.add('drag'); });
});
['dragleave','drop'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.remove('drag'); });
});
dropzone.addEventListener('drop', e=>{
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});
fileInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(f) handleFile(f);
});

function showUploadError(msg){
  uploadError.textContent = msg;
  uploadError.classList.remove('hidden');
}
function clearUploadError(){ uploadError.classList.add('hidden'); }

async function handleFile(file){
  clearUploadError();
  const ext = file.name.split('.').pop().toLowerCase();
  if(!['docx','pdf'].includes(ext)){
    showUploadError('Chỉ hỗ trợ file .docx hoặc .pdf nhé!');
    return;
  }
  state.fileName = file.name;
  fileChipWrap.innerHTML = `<div class="file-chip">📎 ${escapeHtml(file.name)} <button id="clearFileBtn" type="button">✕</button></div>`;
  document.getElementById('clearFileBtn').addEventListener('click', resetUpload);

  try{
    const arrayBuffer = await file.arrayBuffer();
    let text = '';
    if(ext === 'docx'){
      const result = await mammoth.extractRawText({arrayBuffer});
      text = result.value;
    } else {
      text = await extractPdfText(arrayBuffer);
    }
    text = text.replace(/\s+\n/g,'\n').trim();
    if(!text || text.length < 30){
      showUploadError('Không đọc được nội dung chữ trong file này. Hãy thử file khác (file PDF ảnh/scan có thể không đọc được).');
      return;
    }
    state.extractedText = text.slice(0, 18000); // cap length
    previewBox.textContent = text.slice(0, 1200) + (text.length > 1200 ? ' ...' : '');
    previewBox.style.display = 'block';
    settingsCard.classList.remove('hidden');
    settingsCard.scrollIntoView({behavior:'smooth', block:'nearest'});
  }catch(err){
    console.error(err);
    showUploadError('Có lỗi khi đọc file. Vui lòng thử lại hoặc dùng file khác.');
  }
}

async function extractPdfText(arrayBuffer){
  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  let full = '';
  const maxPages = Math.min(pdf.numPages, 40);
  for(let i=1; i<=maxPages; i++){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str);
    full += strings.join(' ') + '\n';
  }
  return full;
}

function resetUpload(){
  state.fileName=''; state.extractedText='';
  fileInput.value='';
  fileChipWrap.innerHTML='';
  previewBox.style.display='none'; previewBox.textContent='';
  settingsCard.classList.add('hidden');
  clearUploadError();
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- Settings ----------
difficultyGroup.addEventListener('click', e=>{
  const btn = e.target.closest('.pill');
  if(!btn) return;
  [...difficultyGroup.children].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  state.difficulty = btn.dataset.val;
});
questionTypeGroup.addEventListener('click', e=>{
  const btn = e.target.closest('.pill');
  if(!btn) return;
  [...questionTypeGroup.children].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  state.questionType = btn.dataset.val;
});
decBtn.addEventListener('click', ()=>{
  state.qCount = Math.max(3, state.qCount - 1);
  qCountLabel.textContent = state.qCount;
});
incBtn.addEventListener('click', ()=>{
  state.qCount = Math.min(12, state.qCount + 1);
  qCountLabel.textContent = state.qCount;
});

// ---------- Generate quiz via Claude API ----------
generateBtn.addEventListener('click', generateQuiz);

async function generateQuiz(){
  genError.classList.add('hidden');
  generateBtn.disabled = true;
  settingsCard.classList.add('hidden');
  loadingCard.classList.remove('hidden');
  loadingText.textContent = 'AI đang đọc tài liệu và soạn câu hỏi...';

  const hint = hintInput.value.trim();
  const typeInstructions = {
    'multiple-choice': '"type": "multiple-choice", "options": ["A", "B", "C", "D"], "correctIndex": 0',
    'true-false': '"type": "true-false", "options": ["Đúng", "Sai"], "correctIndex": 0',
    'fill-blank': '"type": "fill-blank", "answer": "đáp án ngắn", "acceptableAnswers": ["các cách trả lời được chấp nhận"]',
    'matching': '"type": "matching", "pairs": [{"left": "vế trái", "right": "vế phải"}], "correctMatches": [0]',
    'short-answer': '"type": "short-answer", "answer": "ý trả lời đúng", "keywords": ["từ khóa bắt buộc"]'
  }[state.questionType];
  const systemPrompt = `Bạn là một AI soạn đề ôn tập chất lượng cao cho học sinh tiểu học tại Việt Nam.

YÊU CẦU CHẶT CHẼ - PHẢI TUÂN THỬ 100%:
1. CHỈ trả lời bằng JSON hợp lệ - không thêm chữ, markdown hay giải thích nào khác
2. Trả về một MẢNG bắt đầu bằng "[" kết thúc bằng "]"
3. ĐIỀU CỰC KỲ QUAN TRỌNG:
   - Đáp án PHẢI đúng 100% với nội dung tài liệu
   - CHỈ dùng thông tin từ tài liệu - KHÔNG bịa đặt thông tin mới
   - Kiểm kỹ đáp án trước khi trả về correctIndex hoặc answer
   - Nếu không chắc chắn 100%, hãy tạo câu hỏi khác
4. Format bắt buộc (thay đổi theo dạng bài):
   {
     ${typeInstructions},
     "question": "câu hỏi đơn giản, tiếng Việt, phù hợp tiểu học",
     "explanation": "giải thích tại sao đáp án đó đúng dựa trên tài liệu"
   }
5. Chỉ tạo đúng dạng "${state.questionType}", không trộn dạng khác.
6. Với matching, số phần tử trong pairs và correctMatches phải bằng nhau; right phải được xáo trộn.
7. Với fill-blank và short-answer, câu trả lời phải ngắn, rõ ràng và bám sát tài liệu.
8. Các lựa chọn sai phải hợp lý, không hoàn toàn sai
9. Tiếng Việt đơn giản, phù hợp học sinh tiểu học
10. NGUYÊN TẮC VÀNG: Đáp án = sự thật trong tài liệu, KHÔNG phải thông tin bịa đặt`;

  const userPrompt = `CHỈ dùng nội dung từ tài liệu dưới đây. KHÔNG tạo thông tin mới. KHÔNG bịa đặt.

Tài liệu:
"""
${state.extractedText}
"""

YÊU CẦU:
- Tạo ${state.qCount} câu hỏi
- Độ khó: ${state.difficulty}
- Dạng bài: ${state.questionType}
${hint ? '- Ghi chú: ' + hint : ''}

KIỂM SOÁT CHẤT LƯỢNG:
1. Mỗi đáp án phải ĐÚNG 100% - kiểm kỹ từng câu
2. Đáp án phải đúng schema của dạng "${state.questionType}"
3. Không bao giờ tạo câu hỏi có logic lỗi
4. Nếu câu hỏi có vấn đề, bỏ qua - không trả về

OUTPUT: CHỈ mảng JSON bắt đầu "[" kết thúc "]" - không có chữ nào khác`;

  try{
    const session = JSON.parse(localStorage.getItem('learnhub-session') || 'null');
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({ systemPrompt, userPrompt })
    });

    const payload = await response.json().catch(() => ({}));

    if(response.status === 401){
      localStorage.removeItem('learnhub-session');
      window.location.replace('/');
      return;
    }
    if(!response.ok){
      const errorMessage = payload?.error || 'API lỗi: ' + response.status;
      throw new Error(errorMessage);
    }
    const data = payload;
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    let raw = textBlocks.join('\n').trim();
    raw = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();

    console.log('Raw response from API:', raw);
    console.log('Data payload:', JSON.stringify(data, null, 2));

    let quiz;
    try{
      quiz = JSON.parse(raw);
    }catch(parseErr){
      console.log('Parse error, trying to extract JSON array:', parseErr);
      const match = raw.match(/\[[\s\S]*\]/);
      if(match){
        quiz = JSON.parse(match[0]);
      } else {
        // Try to extract object with questions key
        const objMatch = raw.match(/\{[\s\S]*\}/);
        if(objMatch){
          quiz = JSON.parse(objMatch[0]);
        } else {
          throw parseErr;
        }
      }
    }

    console.log('Parsed quiz (before transformation):', JSON.stringify(quiz, null, 2));

    // Transform to array if needed
    if(typeof quiz === 'object' && !Array.isArray(quiz)){
      // If it has a questions key with array, use that
      if(quiz.questions && Array.isArray(quiz.questions)){
        quiz = quiz.questions;
      }
      // If it's a single object with question property, wrap it in array
      else if(quiz.question && !Array.isArray(quiz)){
        quiz = [quiz];
      }
    }

    console.log('Quiz after transformation:', JSON.stringify(quiz, null, 2));
    
    if(!Array.isArray(quiz)){
      console.log('Quiz type:', typeof quiz, 'isArray:', Array.isArray(quiz), 'keys:', Object.keys(quiz || {}));
      throw new Error('Quiz is not an array');
    }

    quiz = quiz.filter(isValidQuestion);
    
    console.log('Final quiz after filter:', JSON.stringify(quiz, null, 2));

    if(!quiz.length){
      throw new Error('empty');
    }

    state.quiz = quiz;
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    loadingCard.classList.add('hidden');
    startQuiz();
  }catch(err){
    console.error(err);
    loadingCard.classList.add('hidden');
    settingsCard.classList.remove('hidden');
    genError.textContent = 'Không tạo được đề lúc này. Vui lòng thử lại (có thể tài liệu quá dài hoặc có lỗi kết nối).';
    genError.classList.remove('hidden');
  }finally{
    generateBtn.disabled = false;
  }
}

// ---------- Quiz flow ----------
function startQuiz(){
  quizCard.classList.remove('hidden');
  resultsCard.classList.add('hidden');
  renderQuestion();
  quizCard.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderQuestion(){
  const q = state.quiz[state.currentIndex];
  qCounter.textContent = `Câu ${state.currentIndex+1}/${state.quiz.length}`;
  progressFill.style.width = `${(state.currentIndex/state.quiz.length)*100}%`;
  scoreTag.textContent = `⭐ ${state.score} điểm`;
  qText.textContent = q.question;
  feedbackWrap.innerHTML = '';
  nextBtn.classList.add('hidden');

  optionsWrap.innerHTML = '';
  const type = q.type || 'multiple-choice';
  if(type === 'fill-blank' || type === 'short-answer'){
    optionsWrap.innerHTML = `<input class="answer-input" id="textAnswer" type="text" placeholder="${type === 'fill-blank' ? 'Nhập từ hoặc cụm từ còn thiếu' : 'Nhập câu trả lời ngắn'}">`;
    const input = document.getElementById('textAnswer');
    input.addEventListener('keydown', e => { if(e.key === 'Enter') selectTextAnswer(input.value); });
    const submit = document.createElement('button');
    submit.className = 'btn';
    submit.type = 'button';
    submit.textContent = 'Kiểm tra đáp án';
    submit.addEventListener('click', () => selectTextAnswer(input.value));
    optionsWrap.appendChild(submit);
  } else if(type === 'matching'){
    const rights = q.pairs.map(pair => pair.right);
    q.pairs.forEach((pair, idx) => {
      const row = document.createElement('div');
      row.className = 'matching-row';
      row.innerHTML = `<span>${idx + 1}. ${escapeHtml(pair.left)}</span>`;
      const select = document.createElement('select');
      select.dataset.index = idx;
      select.innerHTML = `<option value="">-- Chọn --</option>${rights.map((right, rightIdx) => `<option value="${rightIdx}">${escapeHtml(right)}</option>`).join('')}`;
      row.appendChild(select);
      optionsWrap.appendChild(row);
    });
    const submit = document.createElement('button');
    submit.className = 'btn';
    submit.type = 'button';
    submit.textContent = 'Kiểm tra đáp án';
    submit.addEventListener('click', () => selectMatchingAnswer());
    optionsWrap.appendChild(submit);
  } else {
    const letters = ['A','B','C','D','E','F'];
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.innerHTML = `<span class="badge">${letters[idx]}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => selectAnswer(idx));
      optionsWrap.appendChild(btn);
    });
  }
}

function selectAnswer(idx){
  const q = state.quiz[state.currentIndex];
  const options = [...optionsWrap.children];
  options.forEach(o => o.classList.add('locked'));

  const isCorrect = idx === q.correctIndex;
  options[idx].classList.add(isCorrect ? 'correct' : 'wrong');
  if(!isCorrect){
    options[q.correctIndex].classList.add('correct');
  }

  function normalizeAnswer(value){
    return String(value || '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
  }

  function finishAnswer(isCorrect, chosenText, correctText){
    const q = state.quiz[state.currentIndex];
    if(isCorrect) state.score++;
    state.answers.push({ q, chosenText, correctText, correct: isCorrect });
    scoreTag.textContent = `⭐ ${state.score} điểm`;
    feedbackWrap.innerHTML = `<div class="feedback ${isCorrect ? 'good' : 'bad'}">
      ${isCorrect ? '🎉 Chính xác!' : '💡 Chưa đúng rồi.'} ${escapeHtml(q.explanation || '')}
    </div>`;
    optionsWrap.querySelectorAll('input, select, button').forEach(el => { el.disabled = true; });
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = state.currentIndex < state.quiz.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🎊';
  }

  function selectTextAnswer(value){
    const q = state.quiz[state.currentIndex];
    const accepted = [q.answer, ...(q.acceptableAnswers || []), ...(q.keywords || [])].filter(Boolean).map(normalizeAnswer);
    const normalized = normalizeAnswer(value);
    const isCorrect = normalized.length > 0 && (q.type === 'short-answer'
      ? accepted.some(answer => normalized.includes(answer))
      : accepted.includes(normalized));
    finishAnswer(isCorrect, value, q.answer);
  }

  function selectMatchingAnswer(){
    const q = state.quiz[state.currentIndex];
    const chosen = [...optionsWrap.querySelectorAll('select')].map(select => Number(select.value));
    const isCorrect = chosen.length === q.correctMatches.length
      && chosen.every((value, idx) => value === q.correctMatches[idx]);
    finishAnswer(isCorrect, chosen.map((value) => q.pairs[value]?.right || 'Chưa chọn').join(', '),
      q.correctMatches.map(value => q.pairs[value]?.right || '').join(', '));
  }

  if(isCorrect) state.score++;
  state.answers.push({ q, chosenIndex: idx, correct: isCorrect });
  scoreTag.textContent = `⭐ ${state.score} điểm`;

  feedbackWrap.innerHTML = `<div class="feedback ${isCorrect ? 'good' : 'bad'}">
    ${isCorrect ? '🎉 Chính xác!' : '💡 Chưa đúng rồi.'} ${escapeHtml(q.explanation || '')}
  </div>`;

  nextBtn.classList.remove('hidden');
  nextBtn.textContent = state.currentIndex < state.quiz.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🎊';
}

nextBtn.addEventListener('click', () => {
  if(state.currentIndex < state.quiz.length - 1){
    state.currentIndex++;
    renderQuestion();
  } else {
    showResults();
  }
});

function showResults(){
  progressFill.style.width = '100%';
  quizCard.classList.add('hidden');
  resultsCard.classList.remove('hidden');

  const total = state.quiz.length;
  const pct = Math.round((state.score/total)*100);
  progressState.xp += state.score * 10;
  progressState.lessons += 1;
  progressState.answered += total;
  progressState.streak = Math.max(1, progressState.streak);
  saveProgress();
  updateProgress();
  resultScore.textContent = `${state.score}/${total}`;

  if(pct >= 80){ resultEmoji.textContent='🏆'; resultTitle.textContent='Xuất sắc!'; resultMsg.textContent='Bé nắm bài rất chắc rồi đó!'; }
  else if(pct >= 50){ resultEmoji.textContent='😊'; resultTitle.textContent='Làm tốt lắm!'; resultMsg.textContent='Chỉ cần ôn thêm một chút là giỏi hẳn luôn!'; }
  else { resultEmoji.textContent='💪'; resultTitle.textContent='Cố lên nào!'; resultMsg.textContent='Xem lại đáp án bên dưới để hiểu bài hơn nhé!'; }

  reviewList.innerHTML = state.answers.map((a, i) => `
    <div class="review-item ${a.correct ? '' : 'wrong-item'}">
      <div class="rq">${i+1}. ${escapeHtml(a.q.question)}</div>
      <div class="ra">
        ${a.correct ? '✅' : '❌'} Bé chọn: ${escapeHtml(a.chosenText || a.q.options?.[a.chosenIndex] || '')}<br>
        ${!a.correct ? '✔️ Đáp án đúng: ' + escapeHtml(a.correctText || a.q.options?.[a.q.correctIndex] || a.q.answer || '') + '<br>' : ''}
        💡 ${escapeHtml(a.q.explanation || '')}
      </div>
    </div>
  `).join('');
  reviewList.classList.add('hidden');
  reviewToggle.textContent = '📖 Xem lại đáp án';
  resultsCard.scrollIntoView({behavior:'smooth', block:'nearest'});
}

reviewToggle.addEventListener('click', () => {
  const isHidden = reviewList.classList.contains('hidden');
  reviewList.classList.toggle('hidden');
  reviewToggle.textContent = isHidden ? '🙈 Ẩn đáp án' : '📖 Xem lại đáp án';
});

retryBtn.addEventListener('click', () => {
  resultsCard.classList.add('hidden');
  resetUpload();
  document.getElementById('uploadCard').scrollIntoView({behavior:'smooth'});
});
