import React, { useEffect, useState } from 'react';

export default function TeacherStudents({ classes, onMessage, api }) {
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [profileStudentId, setProfileStudentId] = useState('');
  const [competencyProfile, setCompetencyProfile] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  useEffect(() => {
    if (!classId && classes[0]?.id) setClassId(classes[0].id);
  }, [classId, classes]);
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    setBusy(true);
    api(`/api/catalog/classes/${classId}/students`)
      .then((data) => setStudents(data.students || []))
      .catch((error) => onMessage(`Không thể tải danh sách học sinh: ${error.message}`))
      .finally(() => setBusy(false));
  }, [classId, onMessage]);
  const selectedClass = classes.find((item) => item.id === classId);
  const addStudent = async (event) => {
    event.preventDefault();
    if (!classId || !email.trim()) {
      onMessage('Vui lòng chọn lớp và nhập email học sinh.');
      return;
    }
    try {
      await api('/api/catalog/classes/members', {
        method: 'POST',
        body: JSON.stringify({ class_id: classId, email: email.trim() })
      });
      setEmail('');
      onMessage('Đã thêm học sinh vào lớp.');
      const data = await api(`/api/catalog/classes/${classId}/students`);
      setStudents(data.students || []);
    } catch (error) {
      onMessage(error.message);
    }
  };
  const toggleCompetencyProfile = async (student) => {
    if (profileStudentId === student.id) {
      setProfileStudentId('');
      setCompetencyProfile(null);
      return;
    }
    setProfileStudentId(student.id);
    setCompetencyProfile(null);
    setProfileBusy(true);
    try {
      const data = await api(`/api/attempts/teacher/students/${encodeURIComponent(student.id)}`);
      setCompetencyProfile(data.attempts || []);
    } catch (error) {
      onMessage(`Không thể tải hồ sơ năng lực: ${error.message}`);
    } finally {
      setProfileBusy(false);
    }
  };
  const competencyByTitle = (competencyProfile || []).reduce((groups, attempt) => {
    const title = attempt.lesson_title?.trim() || attempt.title?.trim() || 'Bài luyện tập chưa có tiêu đề';
    const current = groups.get(title) || {
      title,
      chapter: attempt.chapter || 'Chưa phân chương',
      attempts: 0,
      correct: 0,
      total: 0
    };
    current.attempts += 1;
    current.correct += Number(attempt.score || 0);
    current.total += Number(attempt.total || 0);
    groups.set(title, current);
    return groups;
  }, new Map());
  const competencyItems = [...competencyByTitle.values()].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  return <section className="teacher-card student-list-panel">
    <div className="student-list-head">
      <div><span className="panel-kicker">QUẢN LÝ LỚP HỌC</span><h2>Danh sách học sinh</h2><p>{selectedClass ? `${selectedClass.name} · Khối ${selectedClass.grade}` : 'Chọn lớp để xem học sinh'}</p></div>
      <select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select>
    </div>
    <form onSubmit={addStudent} className="profile-form" style={{ marginTop: 18 }}>
      <label>Email học sinh<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required /></label>
      <button className="teacher-create" type="submit">＋ Thêm học sinh</button>
    </form>
    {busy ? <p className="student-list-empty">Đang tải danh sách...</p> : !classId ? <p className="student-list-empty">Bạn chưa có lớp để xem.</p> : students.length ? <div className="student-list-table">
      <div className="student-list-summary"><b>{students.length}</b><span>học sinh trong lớp</span></div>
      {students.map((student, index) => <React.Fragment key={student.id}>
        <article className="student-list-row">
          <span className="student-number">{index + 1}</span>
          <span className="student-list-avatar">{student.avatar_url ? <img src={student.avatar_url} alt="" /> : '👧'}</span>
          <div><strong>{student.full_name || 'Chưa cập nhật tên'}</strong><small>{student.email}</small></div>
          <time>Tham gia {new Date(student.joined_at).toLocaleDateString('vi-VN')}</time>
          <button className="student-profile-button" type="button" onClick={() => toggleCompetencyProfile(student)}>{profileStudentId === student.id ? 'Đóng hồ sơ' : 'Hồ sơ năng lực'}</button>
        </article>
        {profileStudentId === student.id && <section className="student-competency-profile" aria-label={`Hồ sơ năng lực ${student.full_name || 'học sinh'}`}>
          <div className="student-competency-heading">
            <div><span className="panel-kicker">KẾT QUẢ THEO TITLE BÀI HỌC</span><h3>{student.full_name || 'Học sinh'}</h3></div>
            {competencyProfile && <span>{competencyProfile.length} lượt làm</span>}
          </div>
          {profileBusy ? <p className="student-list-empty">Đang tải hồ sơ năng lực...</p> : competencyItems.length ? <div className="student-competency-list">
            {competencyItems.map((item) => {
              const accuracy = item.total ? Math.round(item.correct / item.total * 100) : 0;
              return <article className="student-competency-item" key={item.title}>
                <div className="student-competency-item-heading"><div><strong>{item.title}</strong><small>{item.chapter} · {item.attempts} lượt làm</small></div><b>{accuracy}%</b></div>
                <div className="student-competency-progress" role="progressbar" aria-label={`Độ chính xác ${item.title}`} aria-valuenow={accuracy} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${accuracy}%` }} /></div>
                <small>{item.correct}/{item.total} câu đúng</small>
              </article>;
            })}
          </div> : <p className="student-list-empty">Chưa có kết quả luyện tập cho các bài học của giáo viên.</p>}
        </section>}
      </React.Fragment>)}
    </div> : <p className="student-list-empty">Lớp này chưa có học sinh.</p>}
  </section>;
}
