import React, { useEffect, useState } from 'react';
import AdminPage from './pages/AdminPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import StudentHomePage from './pages/StudentHomePage.jsx';
import TeacherPage from './pages/TeacherPage.jsx';
import Brand from './components/Brand.jsx';
import Header from './components/Header.jsx';
import AccessDenied from './components/AccessDenied.jsx';
import AIQuizGenerator from './features/assignments/AIQuizGenerator.jsx';
import AssignedWorkView from './features/assignments/AssignedWorkView.jsx';
import { AssignmentStudio, TeacherClassManagement, TeacherStudents, TeacherOverview, TeacherAnalytics } from './features/assignments/AssignmentStudio.jsx';
import LessonView from './features/lessons/LessonView.jsx';
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
    const styles = path === '/' || path === '/auth'
      ? ['/public/css/auth.css']
      : path === '/admin'
        ? ['/public/css/admin.css']
        : path === '/teacher'
          ? ['/public/css/teacher.css']
          : path === '/profile' || path === '/history'
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
  const isPublicPath = path === '/' || path === '/auth';
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
    />;
  }
  if (path === '/profile') return <AccountPage api={api} readSession={readSession} sessionKey={sessionKey} Header={Header} Brand={Brand} go={go} logout={logout} />;
  if (path === '/history') return <AccountPage history api={api} readSession={readSession} sessionKey={sessionKey} Header={Header} Brand={Brand} go={go} logout={logout} />;
  return <StudentHomePage api={api} readSession={readSession} Header={Header} Brand={Brand} LessonView={LessonView} AIQuizGenerator={AIQuizGenerator} AssignedWorkView={AssignedWorkView} go={go} logout={logout} />;
}

export default App;
