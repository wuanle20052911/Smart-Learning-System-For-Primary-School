import React, { useEffect, useState } from 'react';

export default function TeacherPage({ api, logout, AssignmentStudio, TeacherClassManagement, TeacherStudents, TeacherOverview, TeacherAnalytics, TeacherSubmissions, LessonStudio, TeacherQuestionBank }) {
  const [activeView, setActiveView] = useState('overview');
  const [message, setMessage] = useState('');
  const [lessons, setLessons] = useState([]);
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const loadTeacherData = async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const [lessonData, classData, analyticsData, assignmentData, submissionData] = await Promise.all([
        api('/api/lessons/mine'),
        api('/api/catalog/classes'),
        api('/api/attempts/analytics'),
        api('/api/assignments/mine'),
        api('/api/submissions/teacher')
      ]);
      const assignments = assignmentData.assignments || [];
      const assignedClassIds = [...new Set(assignments
        .filter((assignment) => assignment.published && assignment.class_id)
        .map((assignment) => assignment.class_id))];
      const rosters = await Promise.all(assignedClassIds.map(async (classId) => {
        const rosterData = await api(`/api/catalog/classes/${classId}/students`);
        return [classId, rosterData.students || []];
      }));
      setLessons(lessonData.lessons || []);
      setClasses(classData.classes || []);
      setAnalytics(analyticsData);
      setDashboardData({
        analytics: analyticsData,
        assignments,
        submissions: submissionData.submissions || [],
        classRosters: Object.fromEntries(rosters)
      });
    } catch (error) {
      setOverviewError(error.message || 'Không thể tải dữ liệu tổng quan.');
      setMessage(`Không thể tải dữ liệu giáo viên: ${error.message}`);
    } finally {
      setOverviewLoading(false);
    }
  };
  useEffect(() => { loadTeacherData(); }, []);
  const loadAnalytics = () => api('/api/attempts/analytics').then(setAnalytics).catch((error) => setMessage(`Không thể tải phân tích: ${error.message}`));
  const navItems = [['overview', '⌂', 'Tổng quan'], ['classes', '♧', 'Lớp học'], ['lessons', '▤', 'Bài học'], ['assignments', '▣', 'Bài tập'], ['question-bank', '☷', 'Ngân hàng câu hỏi'], ['students', '♙', 'Học sinh'], ['submissions', '✓', 'Bài nộp & nhận xét'], ['analytics', '▥', 'Phân tích học tập']];
  const openAction = (text, view = 'assignments') => { setActiveView(view); setMessage(text); };
  const primaryAction = activeView === 'students'
      ? { label: '＋ Thêm học sinh', target: 'students' }
      : activeView === 'assignments'
        ? { label: '＋ Tạo bài tập', target: 'assignments' }
        : { label: '＋ Tạo bài học', target: 'lessons' };
  return <main className="teacher-dashboard">
    <aside className="teacher-sidebar"><div className="teacher-logo">▰</div><div className="teacher-brand">MathJoy<small>Teacher</small></div><nav>{navItems.map(([value, icon, label]) => <button key={value} className={activeView === value ? 'active' : ''} onClick={() => setActiveView(value)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-help"><b>▣</b><strong>Mẹo hay cho giáo viên</strong><small>Đọc bài tập ngắn, đều đặn sẽ giúp học sinh tiến bộ hơn!</small><button onClick={() => setMessage('Khu vực hướng dẫn đang được chuẩn bị.')}>Xem thêm</button></div></aside>
    <section className="teacher-main"><header className="teacher-topbar"><div><h1>Dashboard giáo viên</h1><p>Tổng quan tình hình học tập của lớp</p></div><div className="teacher-filters"><button className="teacher-create" onClick={() => setActiveView(primaryAction.target)}>{primaryAction.label}</button><button className="teacher-logout" onClick={logout}>↪</button></div></header>{message && <div className="teacher-toast">{message}<button onClick={() => setMessage('')}>×</button></div>}{activeView === 'lessons' ? <LessonStudio api={api} onMessage={setMessage} onRefresh={loadTeacherData} /> : activeView === 'assignments' ? <AssignmentStudio api={api} onMessage={setMessage} /> : activeView === 'question-bank' ? <TeacherQuestionBank api={api} onMessage={setMessage} /> : activeView === 'classes' ? <TeacherClassManagement classes={classes} onMessage={setMessage} onRefresh={loadTeacherData} /> : activeView === 'students' ? <TeacherStudents api={api} classes={classes} onMessage={setMessage} /> : activeView === 'submissions' ? <TeacherSubmissions api={api} onMessage={setMessage} /> : activeView === 'overview' ? <TeacherOverview data={dashboardData} loading={overviewLoading} error={overviewError} onRetry={loadTeacherData} onOpenAssignments={() => setActiveView('assignments')} onOpenStudents={() => setActiveView('students')} /> : activeView === 'analytics' ? <TeacherAnalytics analytics={analytics} onRetry={loadAnalytics} /> : <section className="teacher-placeholder teacher-card"><span>✦</span><h2>{navItems.find(([value]) => value === activeView)?.[2]}</h2><p>Khu vực này đang dùng dữ liệu mẫu để bạn xem trước giao diện.</p><button className="teacher-create" onClick={() => setActiveView('overview')}>Về tổng quan</button></section>}</section>
  </main>;
}
