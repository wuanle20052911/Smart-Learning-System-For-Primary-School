const token = (() => {
  try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null')?.access_token || ''; } catch { return ''; }
})();
const form = document.getElementById('lessonForm');
const list = document.getElementById('lessonList');
const message = document.getElementById('message');
const fields = ['title', 'description', 'subject', 'grade', 'topic', 'icon', 'color', 'published', 'content', 'source_filename'];
let lessons = [];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function authHeaders(json = false){ return { Authorization: `Bearer ${token}`, ...(json ? {'Content-Type':'application/json'} : {}) }; }
function escapeHtml(value){ return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showMessage(text, type = ''){ message.textContent = text; message.className = `message ${type}`; }
function resetForm(){ form.reset(); document.getElementById('lessonId').value = ''; document.getElementById('subject').value = 'Toán'; document.getElementById('grade').value = 'Tiểu học'; document.getElementById('icon').value = '📚'; document.getElementById('content').value = ''; document.getElementById('source_filename').value = ''; document.getElementById('fileStatus').textContent = 'Chưa có tài liệu'; document.getElementById('contentPreview').classList.add('hidden'); document.getElementById('formTitle').textContent = 'Thêm bài học'; form.classList.add('hidden'); }
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
  list.innerHTML = lessons.length ? lessons.map((lesson) => `<article class="lesson-item"><div><h3>${escapeHtml(lesson.icon)} ${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description || 'Chưa có mô tả')}</p><span class="lesson-meta">${escapeHtml(lesson.subject)} · ${escapeHtml(lesson.grade)} · <b class="${lesson.published ? 'published' : 'draft'}">${lesson.published ? 'Đã xuất bản' : 'Bản nháp'}</b></span></div><div class="lesson-actions"><button data-edit="${lesson.id}">Sửa</button><button class="delete" data-delete="${lesson.id}">Xoá</button></div></article>`).join('') : '<p>Chưa có bài học. Hãy tạo bài đầu tiên.</p>';
}
async function loadLessons(){
  if(!token){ window.location.replace('/'); return; }
  const response = await fetch('/api/lessons/mine', {headers: authHeaders()});
  if(response.status === 401 || response.status === 403){ window.location.replace('/'); return; }
  if(!response.ok) throw new Error('Không thể tải bài học.');
  lessons = (await response.json()).lessons; renderLessons();
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
document.getElementById('newLessonBtn').addEventListener('click', () => { resetForm(); form.classList.remove('hidden'); });
document.getElementById('cancelBtn').addEventListener('click', resetForm);
document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('learnhub-session'); window.location.replace('/'); });
loadLessons().catch((error) => showMessage(error.message, 'error'));
