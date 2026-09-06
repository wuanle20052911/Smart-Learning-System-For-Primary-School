(() => {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('learnhub-session') || 'null'); }
    catch { return null; }
  })();
  if (!session?.access_token) {
    window.location.replace('/');
    return;
  }

  const profile = session.profile || {};
  const isHistoryPage = window.location.pathname === '/history';
  document.title = isHistoryPage ? 'MathJoy | Lịch sử làm bài' : 'MathJoy | Thông tin cá nhân';
  document.getElementById('pageTitle').textContent = isHistoryPage ? 'Lịch sử làm bài' : 'Thông tin cá nhân';
  document.getElementById('profilePanel').classList.toggle('hidden', isHistoryPage);
  document.getElementById('historyPanel').classList.toggle('hidden', !isHistoryPage);

  document.getElementById('profileFullName').value = profile.full_name || '';
  document.getElementById('profileEmail').value = profile.email || session.user?.email || '';
  document.getElementById('profileGender').value = profile.gender || '';
  document.getElementById('profileBirthDate').value = profile.birth_date || '';
  document.getElementById('profileRole').value = profile.role === 'student' ? 'Học sinh' : (profile.role || 'Chưa cập nhật');
  let selectedAvatar = profile.avatar_url || '';
  const profileAvatarImage = document.getElementById('profileAvatarImage');
  const avatarEditTrigger = document.getElementById('avatarEditTrigger');
  const avatarPicker = document.getElementById('avatarPicker');
  const avatarOptions = document.getElementById('avatarOptions');
  avatarEditTrigger.addEventListener('click', () => {
    const isOpen = avatarPicker.classList.toggle('hidden');
    avatarEditTrigger.setAttribute('aria-expanded', String(!isOpen));
  });
  fetch('/api/profile-avatars')
    .then(async (response) => {
      if (!response.ok) throw new Error('Không thể tải danh sách avatar.');
      return response.json();
    })
    .then(({ avatars = [] }) => {
      if (!selectedAvatar || !avatars.includes(selectedAvatar)) selectedAvatar = avatars[0] || '';
      profileAvatarImage.src = selectedAvatar || '/public/img/avt/0ccb37e913a1419dc0063d7251243783.jpg';
      avatarOptions.innerHTML = avatars.map((avatar, index) => `
        <button class="avatar-option ${avatar === selectedAvatar ? 'active' : ''}" type="button" data-avatar="${escapeHtml(avatar)}" aria-label="Chọn avatar ${index + 1}">
          <img src="${escapeHtml(avatar)}" alt="">
        </button>
      `).join('');
      avatarOptions.querySelectorAll('.avatar-option').forEach((option) => option.addEventListener('click', () => {
        selectedAvatar = option.dataset.avatar;
        profileAvatarImage.src = selectedAvatar;
        avatarOptions.querySelectorAll('.avatar-option').forEach((item) => item.classList.toggle('active', item === option));
        avatarPicker.classList.add('hidden');
        avatarEditTrigger.setAttribute('aria-expanded', 'false');
      }));
    })
    .catch((error) => {
      console.error('Could not load profile avatars:', error);
      avatarOptions.textContent = 'Không thể tải avatar.';
    });
  document.getElementById('profileClass').value = 'Đang tải...';

  fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
    .then(async (response) => {
      if (!response.ok) throw new Error('Không thể tải lớp học.');
      return response.json();
    })
    .then(({ class: studentClass }) => {
      document.getElementById('profileClass').value = studentClass
        ? `${studentClass.name} (${studentClass.grade})`
        : 'Chưa được xếp lớp';
    })
    .catch((error) => {
      console.error('Could not load class:', error);
      document.getElementById('profileClass').value = 'Không thể tải lớp';
    });

  const profileForm = document.getElementById('profileForm');
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('profileMessage');
    const button = profileForm.querySelector('button');
    button.disabled = true;
    message.textContent = '';
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          fullName: document.getElementById('profileFullName').value,
          gender: document.getElementById('profileGender').value,
          birthDate: document.getElementById('profileBirthDate').value,
          avatarUrl: selectedAvatar
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể cập nhật thông tin.');
      session.profile = data.profile;
      localStorage.setItem('learnhub-session', JSON.stringify(session));
      message.textContent = 'Đã lưu thông tin thành công.';
      message.className = 'profile-message success';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'profile-message error';
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('learnhub-session');
    window.location.replace('/');
  });

  if (isHistoryPage) {
    fetch('/api/attempts/mine', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không thể tải lịch sử làm bài.');
        return response.json();
      })
      .then(({ attempts = [] }) => {
        document.getElementById('historyList').innerHTML = attempts.length
          ? attempts.map(renderAttempt).join('')
          : '<p>Chưa có lần làm bài nào.</p>';
      })
      .catch((error) => {
        console.error('Could not load quiz history:', error);
        document.getElementById('historyList').innerHTML = '<p>Không thể tải lịch sử lúc này.</p>';
      });
  }

  function renderAttempt(item) {
    const questions = Array.isArray(item.questions) ? item.questions : [];
    const incorrect = Array.isArray(item.incorrect_answers) ? item.incorrect_answers : [];
    const details = questions.length
      ? `<div class="attempt-details">${questions.map((question, index) => `
          <div class="question-review ${question.isCorrect ? '' : 'incorrect'}">
            <b>${index + 1}. ${escapeHtml(question.question)}</b>
            <span>${question.isCorrect ? '✅ Đúng' : `❌ Sai · Bạn chọn: ${escapeHtml(question.chosenAnswer || 'Chưa trả lời')} · Đáp án đúng: ${escapeHtml(question.correctAnswer || 'Chưa có')}`}</span>
            ${question.explanation ? `<small>💡 ${escapeHtml(question.explanation)}</small>` : ''}
          </div>
        `).join('')}</div>`
      : '<p class="attempt-empty">Chưa có dữ liệu chi tiết cho bài làm cũ.</p>';
    return `<details class="history-item">
      <summary><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.grade)} · ${escapeHtml(item.chapter)} · ${new Date(item.created_at).toLocaleDateString('vi-VN')} · ${incorrect.length} câu sai</small></span><b>${item.score}/${item.total}</b></summary>
      ${details}
    </details>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }
})();
