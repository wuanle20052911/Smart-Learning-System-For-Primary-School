(() => {
  const session = (() => { try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null'); } catch { return null; } })();
  if (!session?.access_token || session.profile?.role !== 'admin') {
    window.location.replace('/');
    return;
  }
  const token = session.access_token;
  const classForm = document.getElementById('classForm');
  const memberForm = document.getElementById('memberForm');
  const teacherSelect = document.getElementById('classTeacher');
  const memberClass = document.getElementById('memberClass');
  const classList = document.getElementById('classList');
  const message = document.getElementById('message');
  let classes = [];
  const headers = (json = false) => ({ Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) });
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const showMessage = (text, type) => { message.textContent = text; message.className = `message ${type || ''}`; };

  async function loadOptions() {
    const response = await fetch('/api/catalog/management/options', { headers: headers() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu quản lý.');
    classes = data.classes || [];
    teacherSelect.innerHTML = '<option value="">Chưa chỉ định</option>' +
      (data.teachers || []).map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacher.full_name)} · ${escapeHtml(teacher.email)}</option>`).join('');
    memberClass.innerHTML = '<option value="">Chọn lớp học</option>' +
      classes.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.grade)}</option>`).join('');
    document.getElementById('classCount').textContent = `${classes.length} lớp`;
    classList.innerHTML = classes.length ? classes.map((item) => `
      <article class="class-row"><div><strong>${escapeHtml(item.name)} · ${escapeHtml(item.grade)}</strong>
      <small>Giáo viên: ${escapeHtml(item.assigned_teacher_name || 'Chưa chỉ định')} ${item.assigned_teacher_email ? `· ${escapeHtml(item.assigned_teacher_email)}` : ''}</small></div>
      <small>${new Date(item.created_at).toLocaleDateString('vi-VN')}</small></article>`).join('') : '<p class="empty">Chưa có lớp học nào.</p>';
  }

  classForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('/api/catalog/classes', { method: 'POST', headers: headers(true), body: JSON.stringify({
      name: document.getElementById('className').value, grade: document.getElementById('classGrade').value, teacher_id: teacherSelect.value || null
    }) });
    const data = await response.json();
    if (!response.ok) { showMessage(data.error || 'Không thể tạo lớp.', 'error'); return; }
    classForm.reset(); showMessage('Đã tạo lớp và chỉ định giáo viên.', 'success'); await loadOptions();
  });
  memberForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('/api/catalog/classes/members', { method: 'POST', headers: headers(true), body: JSON.stringify({
      class_id: memberClass.value, email: document.getElementById('memberEmail').value
    }) });
    const data = await response.json();
    if (!response.ok) { showMessage(data.error || 'Không thể thêm học sinh.', 'error'); return; }
    memberForm.reset(); showMessage('Đã thêm học sinh vào lớp.', 'success');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('learnhub-session'); window.location.replace('/'); });
  loadOptions().catch((error) => showMessage(error.message, 'error'));
})();
