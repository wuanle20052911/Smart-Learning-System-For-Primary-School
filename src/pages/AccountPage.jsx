import React, { useEffect, useState } from 'react';

export default function AccountPage({ history = false, api, readSession, sessionKey, Header, Brand, go, logout }) {
  const session = readSession(); const [profile, setProfile] = useState(session?.profile || {}); const [studentClass, setStudentClass] = useState(null); const [avatars, setAvatars] = useState([]); const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_url || ''); const [showAvatarPicker, setShowAvatarPicker] = useState(false); const [message, setMessage] = useState(''); const [attempts, setAttempts] = useState([]); const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  useEffect(() => { if (!session?.access_token) return go('/'); Promise.all([api('/api/profile-avatars'), api('/api/auth/profile')]).then(([a, p]) => { setAvatars(a.avatars || []); setStudentClass(p.class); }).catch((e) => setMessage(e.message)); if (history) api('/api/attempts/mine').then((data) => setAttempts(data.attempts || [])).catch((e) => setMessage(e.message)); }, []);
  const save = async (e) => { e.preventDefault(); try { const data = await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName: profile.full_name, gender: profile.gender || '', birthDate: profile.birth_date || '', avatarUrl: selectedAvatar }) }); const next = { ...session, profile: data.profile }; localStorage.setItem(sessionKey, JSON.stringify(next)); setProfile(data.profile); setMessage('Đã lưu thông tin thành công.'); } catch (e) { setMessage(e.message); } };
  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout} />
    <main className="account-page">
      <a className="back-link" href="/learn" onClick={(e) => { e.preventDefault(); go('/learn'); }}>← Về trang học tập</a>
      <h1>{history ? 'Lịch sử làm bài' : 'Thông tin cá nhân'}</h1>
      {history ? <section className="account-card history-list">
        {selectedAttemptId ? (() => {
          const item = attempts.find((attempt) => attempt.id === selectedAttemptId);
          if (!item) return null;
          const correctCount = Number(item.score) || 0;
          const totalQuestions = Number(item.total) || 0;
          const score = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
          return <div className="history-selected" key={item.id}>
            <button className="history-back" type="button" onClick={() => setSelectedAttemptId(null)}>← Quay lại danh sách bài làm</button>
            <article className="history-item">
              <header className="history-item-heading">
              <div><strong>{item.title}</strong><small>{item.grade} · {item.chapter} · {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></div>
              <b>{correctCount}/{totalQuestions}</b>
              </header>
            <section className="ai-card assignment-result history-result">
              <div className="ai-result">✅</div>
              <h2>Con đã hoàn thành lượt làm bài!</h2>
              <strong className="ai-score">{correctCount}/{totalQuestions}</strong>
              <p>Điểm: {score}/100 · Nộp lúc {new Date(item.created_at).toLocaleString('vi-VN')}</p>
              {Array.isArray(item.questions) && <div className="assignment-review">
                <h3>📖 Xem lại bài làm</h3>
                {item.questions.map((question, index) => <article className={question.isCorrect ? 'correct' : 'wrong'} key={`${item.id}-${index}`}>
                  <strong>Câu {index + 1}: {question.isCorrect ? '✓ Đúng' : '✗ Chưa đúng'}</strong>
                  <p>{question.question}</p>
                  {question.chosenAnswer && <small>Con trả lời: <b>{question.chosenAnswer}</b></small>}
                  <small>Đáp án đúng: <b>{question.correctAnswer || question.answer || '—'}</b></small>
                  {question.explanation && <small>Giải thích: {question.explanation}</small>}
                </article>)}
              </div>}
            </section>
            </article>
          </div>;
        })() : attempts.length ? attempts.map((item) => {
          const correctCount = Number(item.score) || 0;
          const totalQuestions = Number(item.total) || 0;
          return <button className="history-item history-entry" type="button" key={item.id} onClick={() => setSelectedAttemptId(item.id)}>
            <span className="history-item-heading">
              <span><strong>{item.title}</strong><small>{item.grade} · {item.chapter} · {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></span>
              <b>{correctCount}/{totalQuestions}</b>
            </span>
          </button>;
        }) : <p>Chưa có lần làm bài nào.</p>}
      </section> : <section className="account-card">
        <div className="profile-avatar-wrap"><button className="avatar-edit-trigger" type="button" onClick={() => setShowAvatarPicker((value) => !value)} aria-label="Chỉnh sửa avatar" aria-expanded={showAvatarPicker}><img className="profile-avatar-image" src={selectedAvatar || '/public/img/avt/0ccb37e913a1419dc0063d7251243783.jpg'} alt="Avatar" /><span className="avatar-edit-hint">Bạn muốn<br />chỉnh sửa avatar?</span></button></div>
        {showAvatarPicker && <div className="avatar-picker"><span>Chọn avatar:</span><div className="avatar-options">{avatars.map((avatar) => <button type="button" className={avatar === selectedAvatar ? 'active' : ''} onClick={() => setSelectedAvatar(avatar)} key={avatar} aria-label="Chọn avatar"><img src={avatar} alt="" /></button>)}</div></div>}
        <form className="profile-form" onSubmit={save}><label>Họ tên<input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required /></label><label>Email<input value={profile.email || session?.user?.email || ''} readOnly /></label><label>Giới tính<select value={profile.gender || ''} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label><label>Ngày sinh<input type="date" value={profile.birth_date || ''} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} /></label><label>Lớp<input value={studentClass ? `${studentClass.name} (${studentClass.grade})` : 'Chưa được xếp lớp'} readOnly /></label><button className="save-profile">Lưu thông tin</button><p className="profile-message">{message}</p></form>
      </section>}
    </main>
  </>;
}
