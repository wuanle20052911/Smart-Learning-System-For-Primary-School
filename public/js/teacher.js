const token = (() => {
  try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null')?.access_token || ''; } catch { return ''; }
})();
const form = document.getElementById('lessonForm');
const list = document.getElementById('lessonList');
const message = document.getElementById('message');
const attemptList = document.getElementById('attemptList');
const assignmentForm = document.getElementById('assignmentForm');
const classForm = document.getElementById('classForm');
const memberForm = document.getElementById('memberForm');
const questionList = document.getElementById('questionList');
let questionCount = 0;
const fields = ['title', 'description', 'subject', 'grade', 'topic', 'icon', 'color', 'published', 'content', 'source_filename'];
let lessons = [];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function authHeaders(json = false){ return { Authorization: `Bearer ${token}`, ...(json ? {'Content-Type':'application/json'} : {}) }; }
function escapeHtml(value){ return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showMessage(text, type = ''){ message.textContent = text; message.className = `message ${type}`; }
function questionTemplate(index){
  return `<article class="question-editor" data-question="${index}">
    <div class="question-editor-heading"><b>Câu hỏi ${index + 1}</b><button type="button" class="remove-question">Xoá</button></div>
    <label>Nội dung câu hỏi<input class="question-text" required placeholder="Ví dụ: 2 + 2 = ?"></label>
    <label>Loại câu hỏi<select class="question-type"><option value="multiple-choice">Trắc nghiệm</option><option value="true-false">Đúng / Sai</option><option value="fill-blank">Điền đáp án</option><option value="short-answer">Trả lời ngắn</option></select></label>
    <div class="question-options"></div>
    <label>Giải thích (không bắt buộc)<input class="question-explanation" placeholder="Giải thích đáp án cho học sinh"></label>
  </article>`;
}
function renderQuestionOptions(editor){
  const type = editor.querySelector('.question-type').value;
  const target = editor.querySelector('.question-options');
  if(type === 'multiple-choice'){
    target.innerHTML = `<div class="option-editor"><label>Đáp án A<input class="option-value" required></label><label>Đáp án B<input class="option-value" required></label><label>Đáp án C<input class="option-value"></label><label>Đáp án D<input class="option-value"></label></div><label>Đáp án đúng<select class="correct-option"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label>`;
  } else if(type === 'true-false'){
    target.innerHTML = '<label>Đáp án đúng<select class="correct-option"><option value="0">Đúng</option><option value="1">Sai</option></select></label>';
  } else {
    target.innerHTML = '<label>Đáp án đúng<input class="short-answer" required placeholder="Nhập đáp án đúng"></label>';
  }
}
function addQuestion(){
  const index = questionCount++;
  questionList.insertAdjacentHTML('beforeend', questionTemplate(index));
  const editor = questionList.lastElementChild;
  renderQuestionOptions(editor);
  editor.querySelector('.question-type').addEventListener('change', () => renderQuestionOptions(editor));
  editor.querySelector('.remove-question').addEventListener('click', () => { editor.remove(); renumberQuestions(); });
}
function renumberQuestions(){
  questionList.querySelectorAll('.question-editor-heading b').forEach((title, index) => { title.textContent = `Câu hỏi ${index + 1}`; });
}
function collectQuestions(){
  const questions = [...questionList.querySelectorAll('.question-editor')].map((editor) => {
    const type = editor.querySelector('.question-type').value;
    const question = editor.querySelector('.question-text').value.trim();
    const explanation = editor.querySelector('.question-explanation').value.trim();
    if(type === 'multiple-choice'){
      const options = [...editor.querySelectorAll('.option-value')].map((input) => input.value.trim()).filter(Boolean);
      const correctIndex = Number(editor.querySelector('.correct-option').value);
      if(options.length < 2 || correctIndex >= options.length) throw new Error('Mỗi câu trắc nghiệm cần ít nhất 2 đáp án.');
      return { type, question, options, answer: correctIndex, explanation };
    }
    if(type === 'true-false') return { type, question, options: ['Đúng', 'Sai'], answer: Number(editor.querySelector('.correct-option').value), explanation };
    return { type, question, answer: editor.querySelector('.short-answer').value.trim(), explanation };
  });
  if(!questions.length) throw new Error('Hãy thêm ít nhất một câu hỏi.');
  if(questions.some((question) => !question.question || !question.answer && question.answer !== 0)) throw new Error('Vui lòng nhập đủ nội dung và đáp án.');
  return questions;
}
function resetForm(){ form.reset(); document.getElementById('lessonId').value = ''; document.getElementById('subject').value = 'Toán'; document.getElementById('grade').value = 'Lớp 1'; document.getElementById('icon').value = '📚'; document.getElementById('content').value = ''; document.getElementById('source_filename').value = ''; document.getElementById('fileStatus').textContent = 'Chưa có tài liệu'; document.getElementById('contentPreview').classList.add('hidden'); document.getElementById('formTitle').textContent = 'Thêm bài học'; form.classList.add('hidden'); }
function editLesson(lesson){
  form.classList.remove('hidden'); document.getElementById('formTitle').textContent = 'Chỉnh sửa bài học';
  document.getElementById('lessonId').value = lesson.id;
  fields.forEach((field) => { const element = document.getElementById(field); if(field === 'published') element.checked = lesson[field]; else element.value = lesson[field] || ''; });
  document.getElementById('fileStatus').textContent = lesson.source_filename || (lesson.content ? 'Đã lưu nội dung tài liệu' : 'Chưa có tài liệu');
  const preview = document.getElementById('contentPreview');
  preview.textContent = lesson.content ? lesson.content.slice(0, 500) + (lesson.content.length > 500 ? ' ...' : '') : '';
  preview.classList.toggle('hidden', !lesson.content);
  window.scrollTo({top:0, behavior:'smooth'});
}
async function extractPdfText(arrayBuffer){
  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  let text = '';
  for(let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber++){
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text;
}
document.getElementById('lessonFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if(!file) return;
  try {
    const extension = file.name.split('.').pop().toLowerCase();
    const buffer = await file.arrayBuffer();
    const result = extension === 'docx'
      ? (await mammoth.extractRawText({arrayBuffer: buffer})).value
      : extension === 'pdf' ? await extractPdfText(buffer) : '';
    const text = result.replace(/\s+\n/g, '\n').trim();
    if(text.length < 30) throw new Error('Không đọc được đủ nội dung chữ từ tài liệu.');
    document.getElementById('content').value = text.slice(0, 18000);
    document.getElementById('source_filename').value = file.name;
    document.getElementById('fileStatus').textContent = `${file.name} (${text.length} ký tự)`;
    const preview = document.getElementById('contentPreview');
    preview.textContent = text.slice(0, 500) + (text.length > 500 ? ' ...' : '');
    preview.classList.remove('hidden');
  } catch(error) {
    showMessage(error.message, 'error');
    event.target.value = '';
  }
});
function renderLessons(){
  document.getElementById('lessonCount').textContent = `${lessons.length} bài`;
  if(!lessons.length){ list.innerHTML = '<p>Chưa có bài học. Hãy tạo bài đầu tiên.</p>'; return; }
  const grouped = new Map();
  lessons.forEach((lesson) => {
    const grade = lesson.grade || 'Chưa phân loại lớp';
    const chapter = lesson.topic || 'Chưa phân loại chương';
    if(!grouped.has(grade)) grouped.set(grade, new Map());
    if(!grouped.get(grade).has(chapter)) grouped.get(grade).set(chapter, []);
    grouped.get(grade).get(chapter).push(lesson);
  });
  list.innerHTML = [...grouped].map(([grade, chapters]) => `<section class="lesson-group"><h3 class="grade-heading">${escapeHtml(grade)}</h3>${[...chapters].map(([chapter, chapterLessons]) => `<div class="chapter-group"><h4>${escapeHtml(chapter)}</h4>${chapterLessons.map((lesson) => `<article class="lesson-item"><div><h3>${escapeHtml(lesson.icon)} ${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description || 'Chưa có mô tả')}</p><span class="lesson-meta">${escapeHtml(lesson.subject)} · <b class="${lesson.published ? 'published' : 'draft'}">${lesson.published ? 'Đã xuất bản' : 'Bản nháp'}</b></span></div><div class="lesson-actions"><button data-edit="${lesson.id}">Sửa</button><button class="delete" data-delete="${lesson.id}">Xoá</button></div></article>`).join('')}</div>`).join('')}</section>`).join('');
}
function renderAttempts(attempts){
  document.getElementById('attemptCount').textContent = `${attempts.length} lượt`;
  attemptList.innerHTML = attempts.length ? attempts.map((attempt) => `
    <article class="attempt-item">
      <div><h3>🧒 ${escapeHtml(attempt.student_name || 'Học sinh')}</h3>
        <p>${escapeHtml(attempt.student_email || '')}</p>
        <span class="lesson-meta">${escapeHtml(attempt.grade)} · ${escapeHtml(attempt.chapter)} · ${new Date(attempt.created_at).toLocaleString('vi-VN')}</span>
      </div>
      <div class="attempt-score"><strong>${attempt.score}/${attempt.total}</strong><small>${escapeHtml(attempt.title)}</small></div>
    </article>
  `).join('') : '<p>Chưa có học sinh nào hoàn thành bài.</p>';
}
async function loadClasses(){
  const response = await fetch('/api/catalog/classes', {headers: authHeaders()});
  if(!response.ok) throw new Error('Không thể tải lớp học.');
  const classes = (await response.json()).classes || [];
  const options = '<option value="">Chọn lớp học</option>' + classes.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.grade)}</option>`).join('');
  document.getElementById('assignmentClassId').innerHTML = options;
  document.getElementById('memberClassId').innerHTML = options;
}
async function loadLessons(){
  if(!token){ window.location.replace('/'); return; }
  const response = await fetch('/api/lessons/mine', {headers: authHeaders()});
  if(response.status === 401 || response.status === 403){ window.location.replace('/'); return; }
  if(!response.ok) throw new Error('Không thể tải bài học.');
  lessons = (await response.json()).lessons; renderLessons();
  const attemptsResponse = await fetch('/api/attempts/teacher', {headers: authHeaders()});
  if(!attemptsResponse.ok) throw new Error('Không thể tải kết quả học sinh.');
  renderAttempts((await attemptsResponse.json()).attempts || []);
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('lessonId').value;
  const payload = Object.fromEntries(fields.map((field) => [field, field === 'published' ? document.getElementById(field).checked : document.getElementById(field).value]));
  const response = await fetch(id ? `/api/lessons/${id}` : '/api/lessons', {method:id ? 'PATCH' : 'POST', headers:authHeaders(true), body:JSON.stringify(payload)});
  const data = await response.json().catch(() => ({}));
  if(!response.ok){
    const detail = [data.error, data.details, data.hint].filter(Boolean).join(' - ');
    console.error('Lesson save failed:', data);
    showMessage(detail || 'Không thể lưu bài học.', 'error');
    return;
  }
  showMessage('Đã lưu bài học.', 'success'); resetForm(); await loadLessons();
});
list.addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if(editId) editLesson(lessons.find((lesson) => lesson.id === editId));
  if(deleteId && confirm('Bạn có chắc muốn xoá bài học này không?')){
    const response = await fetch(`/api/lessons/${deleteId}`, {method:'DELETE', headers:authHeaders()});
    if(!response.ok){ showMessage('Không thể xoá bài học.', 'error'); return; }
    showMessage('Đã xoá bài học.', 'success'); await loadLessons();
  }
});
assignmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  let questions;
  try { questions = collectQuestions(); }
  catch (error) { showMessage(error.message, 'error'); return; }
  const response = await fetch('/api/assignments', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      title: document.getElementById('assignmentTitle').value,
      class_id: document.getElementById('assignmentClassId').value || null,
      difficulty: document.getElementById('assignmentDifficulty').value,
      due_at: document.getElementById('assignmentDueAt').value || null,
      published: document.getElementById('assignmentPublished').checked,
      questions
    })
  });
  const data = await response.json().catch(() => ({}));
  if(!response.ok){ showMessage(data.error || 'Không thể tạo bài tập.', 'error'); return; }
  showMessage('Đã tạo bài tập thành công.', 'success');
  assignmentForm.reset();
  questionList.innerHTML = '';
  questionCount = 0;
  addQuestion();
});
classForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/catalog/classes', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      name: document.getElementById('className').value,
      grade: document.getElementById('classGrade').value
    })
  });
  const data = await response.json().catch(() => ({}));
  if(!response.ok){ showMessage(data.error || 'Không thể tạo lớp.', 'error'); return; }
  showMessage('Đã tạo lớp học.', 'success');
  classForm.reset();
  await loadClasses();
});
memberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/catalog/classes/members', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      class_id: document.getElementById('memberClassId').value,
      email: document.getElementById('memberEmail').value
    })
  });
  const data = await response.json().catch(() => ({}));
  if(!response.ok){ showMessage(data.error || 'Không thể thêm học sinh vào lớp.', 'error'); return; }
  showMessage('Đã thêm học sinh vào lớp.', 'success');
  memberForm.reset();
});
document.getElementById('newLessonBtn').addEventListener('click', () => { resetForm(); form.classList.remove('hidden'); });
document.getElementById('cancelBtn').addEventListener('click', resetForm);
document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('learnhub-session'); window.location.replace('/'); });
document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
addQuestion();
loadClasses().catch((error) => showMessage(error.message, 'error'));
loadLessons().catch((error) => showMessage(error.message, 'error'));
