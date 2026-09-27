import React, { useEffect, useState } from 'react';

export default function TeacherPage({ api, logout, AssignmentStudio, TeacherClassManagement, TeacherStudents, TeacherOverview, TeacherAnalytics, TeacherSubmissions, LessonStudio }) {
  const [activeView, setActiveView] = useState('overview');
  const [message, setMessage] = useState('');
  const [lessons, setLessons] = useState([]);
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const students = [['Trần Minh Khang', 'Phân số', '4.8/10', 'Cao'], ['Lê Bảo Ngọc', 'Phân số, Hình học', '5.2/10', 'Cao'], ['Nguyễn Hải Nam', 'Phép nhân, chia', '5.6/10', 'Trung bình'], ['Phạm Gia Hân', 'Đo lường', '6.1/10', 'Trung bình']];
  const assignments = [['Luyện tập Phân số (P1)', 'Phân số', '72%', '21/29', 'blue'], ['Phép nhân số tự nhiên', 'Phép nhân, chia', '93%', '27/29', 'green'], ['Hình thoi và hình chữ nhật', 'Hình học', '86%', '25/29', 'yellow'], ['Ôn tập đo lường', 'Đo lường', '100%', '29/29', 'purple']];
  const loadTeacherData = () => {
    Promise.all([api('/api/lessons/mine'), api('/api/catalog/classes')])
      .then(([lessonData, classData]) => { setLessons(lessonData.lessons || []); setClasses(classData.classes || []); })
      .catch((error) => setMessage(`Không thể tải dữ liệu giáo viên: ${error.message}`));
  };
  useEffect(() => { loadTeacherData(); }, []);
  const loadAnalytics = () => api('/api/attempts/analytics').then(setAnalytics).catch((error) => setMessage(`Không thể tải phân tích: ${error.message}`));
  useEffect(() => { loadAnalytics(); }, []);
  const navItems = [['overview', '⌂', 'Tổng quan'], ['classes', '♧', 'Lớp học'], ['lessons', '▤', 'Bài học'], ['assignments', '▣', 'Bài tập'], ['students', '♙', 'Học sinh'], ['submissions', '✓', 'Bài nộp & nhận xét'], ['analytics', '▥', 'Phân tích học tập'], ['ai', '✦', 'Đề xuất AI']];
  const openAction = (text, view = 'assignments') => { setActiveView(view); setMessage(text); };
  const primaryAction = activeView === 'students'
      ? { label: '＋ Thêm học sinh', target: 'students' }
      : activeView === 'assignments'
        ? { label: '＋ Tạo bài tập', target: 'assignments' }
        : { label: '＋ Tạo bài học', target: 'lessons' };
  return <main className="teacher-dashboard">
    <aside className="teacher-sidebar"><div className="teacher-logo">▰</div><div className="teacher-brand">MathJoy<small>Teacher</small></div><nav>{navItems.map(([value, icon, label]) => <button key={value} className={activeView === value ? 'active' : ''} onClick={() => setActiveView(value)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-help"><b>▣</b><strong>Mẹo hay cho giáo viên</strong><small>Đọc bài tập ngắn, đều đặn sẽ giúp học sinh tiến bộ hơn!</small><button onClick={() => setMessage('Khu vực hướng dẫn đang được chuẩn bị.')}>Xem thêm</button></div><button className="sidebar-bottom" onClick={() => setMessage('Cài đặt đang được chuẩn bị.')}>⚙ Cài đặt <span>›</span></button><button className="sidebar-bottom" onClick={() => setMessage('Trung tâm trợ giúp đang được chuẩn bị.')}>? Trợ giúp <span>›</span></button></aside>
    <section className="teacher-main"><header className="teacher-topbar"><div><h1>Dashboard giáo viên</h1><p>Tổng quan tình hình học tập của lớp</p></div><div className="teacher-filters"><button className="teacher-create" onClick={() => setActiveView(primaryAction.target)}>{primaryAction.label}</button><button className="teacher-logout" onClick={logout}>↪</button></div></header>{message && <div className="teacher-toast">{message}<button onClick={() => setMessage('')}>×</button></div>}{activeView === 'lessons' ? <LessonStudio api={api} onMessage={setMessage} onRefresh={loadTeacherData} /> : activeView === 'assignments' ? <AssignmentStudio api={api} onMessage={setMessage} /> : activeView === 'classes' ? <TeacherClassManagement classes={classes} onMessage={setMessage} onRefresh={loadTeacherData} /> : activeView === 'students' ? <TeacherStudents api={api} classes={classes} onMessage={setMessage} /> : activeView === 'submissions' ? <TeacherSubmissions api={api} onMessage={setMessage} /> : activeView === 'overview' ? <TeacherOverview students={students} assignments={assignments} onOpenAssignments={() => setActiveView('assignments')} onOpenStudents={() => setActiveView('students')} /> : activeView === 'analytics' ? <TeacherAnalytics analytics={analytics} onRetry={loadAnalytics} /> : <section className="teacher-placeholder teacher-card"><span>✦</span><h2>{navItems.find(([value]) => value === activeView)?.[2]}</h2><p>Khu vực này đang dùng dữ liệu mẫu để bạn xem trước giao diện.</p><button className="teacher-create" onClick={() => setActiveView('overview')}>Về tổng quan</button></section>}</section>
  </main>;
}
