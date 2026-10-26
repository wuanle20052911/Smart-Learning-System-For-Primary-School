import React, { useEffect, useState } from 'react';
import AdminPage from './pages/AdminPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import StudentHomePage from './pages/StudentHomePage.jsx';
import StudentLeaderboardPage from './pages/StudentLeaderboardPage.jsx';
import StudentCompetencyPage from './pages/StudentCompetencyPage.jsx';
import MeteorGamePage from './pages/MeteorGamePage.jsx';
import TeacherPage from './pages/TeacherPage.jsx';
import Brand from './components/Brand.jsx';
import Header from './components/Header.jsx';
import AccessDenied from './components/AccessDenied.jsx';
import AssignedWorkView from './features/assignments/AssignedWorkView.jsx';
import TeacherSubmissions from './features/assignments/TeacherSubmissions.jsx';
import { AssignmentStudio } from './features/assignments/AssignmentStudio.jsx';
import TeacherQuestionBank from './features/assignments/TeacherQuestionBank.jsx';
import TeacherClassManagement from './features/teacher/TeacherClassManagement.jsx';
import TeacherStudents from './features/teacher/TeacherStudents.jsx';
import TeacherOverview from './features/teacher/TeacherOverview.jsx';
import TeacherAnalytics from './features/teacher/TeacherAnalytics.jsx';
import LessonView from './features/lessons/LessonView.jsx';
import LessonStudio from './features/lessons/LessonStudio.jsx';
import { api, readSession, sessionKey } from './services/api.js';
import { go, logout } from './services/auth.js';
import './styles.css';

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  useEffect(() => {
    const styles = path === '/' || path === '/auth' || path === '/auth/callback'
      ? ['/public/css/auth.css']
      : path === '/admin'
        ? ['/public/css/admin.css', '/public/css/admin-dashboard.css']
        : path === '/teacher'
          ? ['/public/css/teacher.css']
          : path === '/profile' || path === '/history' || path === '/competency'
            ? ['/public/css/quiz-generator.css', '/public/css/account.css']
            : ['/public/css/quiz-generator.css'];
    document.querySelectorAll('link[data-page-style]').forEach((link) => link.remove());
    styles.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.pageStyle = 'true';
      document.head.appendChild(link);
    });
  }, [path]);
  const session = readSession();
  const isPublicPath = path === '/' || path === '/auth' || path === '/auth/callback';
  useEffect(() => {
    if (!session?.access_token && !isPublicPath) go('/');
  }, [isPublicPath, session?.access_token]);
  if (isPublicPath || !session?.access_token)   return <AuthPage api={api} Brand={Brand} go={go} sessionKey={sessionKey} />;
  const role = session.profile?.role;
  if (path === '/admin') {
    if (role !== 'admin') return <AccessDenied destination={role === 'teacher' ? '/teacher' : '/learn'} go={go} />;
    return <AdminPage Brand={Brand} api={api} logout={logout} go={go} />;
  }
  if (path === '/teacher') {
    if (!['teacher', 'admin'].includes(role)) return <AccessDenied destination="/learn" go={go} />;
    return <TeacherPage
      api={api}
      logout={logout}
      AssignmentStudio={AssignmentStudio}
      TeacherClassManagement={TeacherClassManagement}
      TeacherStudents={TeacherStudents}
      TeacherOverview={TeacherOverview}
      TeacherAnalytics={TeacherAnalytics}
      TeacherQuestionBank={TeacherQuestionBank}
      TeacherSubmissions={TeacherSubmissions}
      LessonStudio={LessonStudio}
    />;
  }
  if (path === '/profile') return <AccountPage api={api} readSession={readSession} sessionKey={sessionKey} Header={Header} Brand={Brand} go={go} logout={logout} />;
  if (path === '/history') return <AccountPage history api={api} readSession={readSession} sessionKey={sessionKey} Header={Header} Brand={Brand} go={go} logout={logout} />;
  if (path === '/competency') {
    if (role !== 'student') return <AccessDenied destination={role === 'teacher' || role === 'admin' ? '/teacher' : '/learn'} go={go} />;
    return <StudentCompetencyPage api={api} readSession={readSession} Header={Header} Brand={Brand} go={go} logout={logout} />;
  }
  if (path === '/leaderboard') {
    if (role !== 'student') return <AccessDenied destination={role === 'teacher' || role === 'admin' ? '/teacher' : '/learn'} go={go} />;
    return <StudentLeaderboardPage api={api} readSession={readSession} Header={Header} Brand={Brand} go={go} logout={logout} />;
  }
  if (path === '/meteor-game') {
    if (role !== 'student') return <AccessDenied destination={role === 'teacher' || role === 'admin' ? '/teacher' : '/learn'} go={go} />;
    return <MeteorGamePage api={api} Header={Header} Brand={Brand} readSession={readSession} go={go} logout={logout} />;
  }
  return <StudentHomePage api={api} readSession={readSession} Header={Header} Brand={Brand} LessonView={LessonView} AssignedWorkView={AssignedWorkView} go={go} logout={logout} />;
}

export default App;
