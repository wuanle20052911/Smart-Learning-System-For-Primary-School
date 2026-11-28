import React, { useCallback, useEffect, useState } from 'react';
import { authHeaders, readSession } from '../services/api.js';
import AdminAccountManagement from '../features/teacher/AdminAccountManagement.jsx';

export default function AdminPage({ Brand, api, logout, go, settingsView = false }) {
  const [data, setData] = useState({ classes: [], teachers: [] });
  const [managementLoading, setManagementLoading] = useState(true);
  const [managementError, setManagementError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [rosterClassId, setRosterClassId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [removingStudentId, setRemovingStudentId] = useState('');
  const [aiUsage, setAIUsage] = useState(null);
  const [aiUsageError, setAIUsageError] = useState('');
  const [aiUsageConnected, setAIUsageConnected] = useState(false);
  const [aiEnabled, setAIEnabled] = useState(null);
  const [aiSettingsLoading, setAISettingsLoading] = useState(true);
  const [aiSettingsSaving, setAISettingsSaving] = useState(false);
  const [aiSettingsMessage, setAISettingsMessage] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('admin-theme') || 'light');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const session = readSession();

  const addNotification = useCallback((title, text) => {
    setNotifications((current) => [{
      id: `${Date.now()}-${Math.random()}`,
      title,
      text: text || 'Đã xảy ra lỗi không xác định.',
      time: new Date()
    }, ...current].slice(0, 20));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
  }, [theme]);

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('admin-theme', nextTheme);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await api('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword
        })
      });
      formElement.reset();
      setPasswordMessage(result.message);
      setToast(result.message);
    } catch (error) {
      const text = error.message || 'Không thể đổi mật khẩu.';
      setPasswordMessage(text);
      addNotification('Không thể đổi mật khẩu', text);
    } finally {
      setPasswordBusy(false);
    }
  };


  useEffect(() => {
    const onAdminApiError = (event) => {
      const { title, text } = event.detail || {};
      if (title && text) addNotification(title, text);
    };
    window.addEventListener('admin-api-error', onAdminApiError);
    return () => window.removeEventListener('admin-api-error', onAdminApiError);
  }, [addNotification]);

  const load = async () => {
    setManagementLoading(true);
    setManagementError('');
    try {
      const result = await api('/api/catalog/management/options');
      setData({ classes: result.classes || [], teachers: result.teachers || [] });
    } catch (error) {
      setManagementError(error.message);
      addNotification('Không thể tải dữ liệu quản lý', error.message);
    } finally {
      setManagementLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsView) load();
  }, [settingsView]);

  useEffect(() => {
    let active = true;
    if (settingsView) return () => { active = false; };
    api('/api/admin/ai-settings')
      .then((settings) => { if (active) setAIEnabled(settings.enabled); })
      .catch((error) => {
        if (active) {
          const text = error.message || 'Không thể tải cài đặt AI.';
          setAISettingsMessage(text);
          addNotification('Không thể tải cài đặt AI', text);
        }
      })
      .finally(() => { if (active) setAISettingsLoading(false); });
    return () => { active = false; };
  }, [api, settingsView]);

  useEffect(() => {
    if (settingsView) return undefined;
    if (!data.classes.length) {
      setRosterClassId('');
      setClassStudents([]);
      return;
    }
    if (!data.classes.some((item) => item.id === rosterClassId)) {
      setRosterClassId(data.classes[0].id);
    }
  }, [data.classes, rosterClassId, settingsView]);

  useEffect(() => {
    if (settingsView) return undefined;
    if (!rosterClassId) {
      setClassStudents([]);
      return undefined;
    }
    let active = true;
    setRosterLoading(true);
    setRosterError('');
    api(`/api/catalog/management/classes/${rosterClassId}/students`)
      .then((result) => {
        if (active) setClassStudents(result.students || []);
      })
      .catch((error) => {
        if (active) {
          const text = error.message || 'Không thể tải danh sách học sinh trong lớp.';
          setRosterError(text);
          addNotification('Không thể tải danh sách học sinh', text);
        }
      })
      .finally(() => {
        if (active) setRosterLoading(false);
      });
    return () => { active = false; };
  }, [api, rosterClassId, settingsView]);

  useEffect(() => {
    if (settingsView) return undefined;
    let cancelled = false;
    let retryTimer;
    let controller;

    const connect = async () => {
      controller = new AbortController();
      try {
        const response = await fetch('/api/admin/ai-usage/stream', {
          headers: authHeaders(),
          signal: controller.signal
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Không thể kết nối thống kê AI realtime.');
        }
        if (!response.body) throw new Error('Trình duyệt không hỗ trợ nhận luồng thống kê AI.');

        setAIUsageConnected(true);
        setAIUsageError('');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (!cancelled) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            for (const eventText of events) {
              const eventName = eventText.match(/^event:\s*(.+)$/m)?.[1];
              const dataLine = eventText.match(/^data:\s*(.+)$/m)?.[1];
              if (!dataLine) continue;
              const payload = JSON.parse(dataLine);
              if (eventName === 'usage') setAIUsage(payload.summary);
              if (eventName === 'error') throw new Error(payload.error || 'Không thể cập nhật thống kê AI.');
            }
            if (done) break;
          }
        } finally {
          reader.releaseLock();
        }
        if (!cancelled) throw new Error('Luồng thống kê AI đã ngắt kết nối.');
      } catch (error) {
        if (cancelled || error.name === 'AbortError') return;
        const text = error.message || 'Không thể kết nối thống kê AI realtime.';
        setAIUsageConnected(false);
        setAIUsageError(text);
        addNotification('Lỗi kết nối thống kê AI', text);
        retryTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      controller?.abort();
    };
  }, []);

  const createTeacher = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api('/api/auth/teachers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.get('fullName'),
          email: form.get('email'),
          password: form.get('password')
        })
      });
      formElement.reset();
      setMessage('');
      setToast('Tài khoản giáo viên đã được tạo và có thể đăng nhập.');
      await load();
    } catch (error) {
      setMessage(error.message);
      addNotification('Không thể tạo tài khoản giáo viên', error.message);
    }
  };

  const createClass = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api('/api/catalog/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          grade: form.get('grade'),
          teacher_id: form.get('teacher_id') || null
        })
      });
      formElement.reset();
      setMessage('');
      setToast('Đã tạo lớp.');
      await load();
    } catch (error) {
      setMessage(error.message);
      addNotification('Không thể tạo lớp học', error.message);
    }
  };

  const updateClass = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/catalog/classes/${editingClass.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.get('name'),
          grade: form.get('grade'),
          teacher_id: form.get('teacher_id') || null
        })
      });
      setEditingClass(null);
      setMessage('');
      setToast('Đã cập nhật lớp và giáo viên phụ trách.');
      await load();
    } catch (error) {
      setMessage(error.message);
      addNotification('Không thể cập nhật lớp học', error.message);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api('/api/catalog/classes/members', {
        method: 'POST',
        body: JSON.stringify({
          class_id: form.get('class_id'),
          email: form.get('email')
        })
      });
      formElement.reset();
      setMessage('');
      setToast('Đã thêm học sinh vào lớp.');
      if (form.get('class_id') === rosterClassId) {
        const result = await api(`/api/catalog/management/classes/${rosterClassId}/students`);
        setClassStudents(result.students || []);
      }
    } catch (error) {
      setMessage(error.message);
      addNotification('Không thể thêm học sinh vào lớp', error.message);
    }
  };

  const removeStudent = async (student) => {
    const classItem = data.classes.find((item) => item.id === rosterClassId);
    const studentName = student.full_name || student.email || 'học sinh này';
    if (!window.confirm(`Gỡ ${studentName} khỏi lớp ${classItem?.name || ''}? Tài khoản học sinh sẽ không bị xóa.`)) return;
    setRemovingStudentId(student.id);
    setRosterError('');
    try {
      await api(`/api/catalog/management/classes/${rosterClassId}/students/${student.id}`, { method: 'DELETE' });
      setClassStudents((items) => items.filter((item) => item.id !== student.id));
      setToast(`Đã gỡ ${studentName} khỏi lớp.`);
    } catch (error) {
      setRosterError(error.message || 'Không thể gỡ học sinh khỏi lớp.');
      addNotification('Không thể gỡ học sinh khỏi lớp', error.message);
    } finally {
      setRemovingStudentId('');
    }
  };

  const updateAIEnabled = async (event) => {
    const enabled = event.target.checked;
    setAISettingsSaving(true);
    setAISettingsMessage('');
    try {
      const result = await api('/api/admin/ai-settings', {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      });
      setAIEnabled(result.enabled);
      setAISettingsMessage(result.message);
    } catch (error) {
      const text = error.message || 'Không thể cập nhật cài đặt AI.';
      setAISettingsMessage(text);
      addNotification('Không thể cập nhật cài đặt AI', text);
    } finally {
      setAISettingsSaving(false);
    }
  };

  const formatLatency = (value) => `${(Number(value || 0) / 1000).toFixed(2)} giây`;
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  if (settingsView) return <main className="admin-dashboard">
    <aside className="admin-sidebar">
      <Brand href="/admin" go={go} />
      <div className="sidebar-school">CỔNG QUẢN LÝ NHÀ TRƯỜNG</div>
      <button className="sidebar-item" type="button" onClick={() => go('/admin')}>▦ <span>Tổng quan</span></button>
      <button className="sidebar-item" type="button" onClick={() => go('/admin')}>♙ <span>Tài khoản</span></button>
      <button className="sidebar-item" type="button" onClick={() => go('/admin')}>▱ <span>Lớp học</span></button>
      <button className="sidebar-item" type="button" onClick={() => go('/admin')}>✧ <span>Quan sát AI</span></button>
      <button className="sidebar-item active" type="button" onClick={() => scrollTo('admin-settings')}>⚙ <span>Cài đặt</span></button>
      <button className="sidebar-logout" type="button" onClick={logout}>↪ <span>Đăng xuất</span></button>
    </aside>
    <section className="admin-main admin-settings-page">
      <header className="dashboard-header">
        <div><span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span><h1>Cài đặt</h1><p>Quản lý giao diện và bảo mật tài khoản quản trị.</p></div>
        <div className="dashboard-actions">
          <button type="button" onClick={() => go('/admin')}>← Quay lại tổng quan</button>
          <div className="admin-notification">
            <button className="admin-notification-button" type="button" aria-label="Thông báo quản trị" aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}>
              🔔
              {notifications.length > 0 && <span>{notifications.length > 99 ? '99+' : notifications.length}</span>}
            </button>
            {notificationOpen && <div className="admin-notification-panel" role="dialog" aria-label="Thông báo lỗi">
              <div className="admin-notification-head"><strong>Thông báo lỗi</strong>{notifications.length > 0 && <button type="button" onClick={() => setNotifications([])}>Xóa tất cả</button>}</div>
              {notifications.length ? <div className="admin-notification-list">{notifications.map((item) => <article key={item.id}><span>!</span><div><strong>{item.title}</strong><p>{item.text}</p><small>{item.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></div></article>)}</div> : <p className="admin-notification-empty">Chưa có lỗi nào.</p>}
            </div>}
          </div>
        </div>
      </header>
      <section className="dashboard-card admin-settings-card" id="admin-settings">
        <div className="card-heading"><div><h2>Cài đặt tài khoản</h2><small>Giao diện và bảo mật tài khoản quản trị</small></div></div>
        <div className="admin-settings-grid">
          <div className="admin-theme-settings">
            <strong>Giao diện</strong>
            <p>Chọn chế độ sáng hoặc tối cho trang quản trị.</p>
            <div className="admin-theme-options" role="group" aria-label="Chọn giao diện">
              <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => changeTheme('light')}><span className="theme-preview light" aria-hidden="true"><i /><i /><i /></span><b>Chế độ sáng</b></button>
              <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => changeTheme('dark')}><span className="theme-preview dark" aria-hidden="true"><i /><i /><i /></span><b>Chế độ tối</b></button>
            </div>
          </div>
          <form className="admin-password-form" onSubmit={changePassword}>
            <strong>Đổi mật khẩu</strong>
            <p>Dùng mật khẩu mới có ít nhất 6 ký tự.</p>
            <label>Mật khẩu hiện tại<input name="currentPassword" type="password" required autoComplete="current-password" /></label>
            <label>Mật khẩu mới<input name="newPassword" type="password" required minLength="6" autoComplete="new-password" /></label>
            <label>Xác nhận mật khẩu mới<input name="confirmPassword" type="password" required minLength="6" autoComplete="new-password" /></label>
            <button className="primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
            {passwordMessage && <p className={passwordMessage.includes('thành công') ? 'admin-password-success' : 'ai-usage-error'} role="alert">{passwordMessage}</p>}
          </form>
        </div>
      </section>
    </section>
  </main>;

  return <main className="admin-dashboard">
    <aside className="admin-sidebar">
      <Brand href="/admin" go={go} />
      <div className="sidebar-school">CỔNG QUẢN LÝ NHÀ TRƯỜNG</div>
      <button className="sidebar-item active" type="button" onClick={() => scrollTo('admin-overview')}>▦ <span>Tổng quan</span></button>
      <button className="sidebar-item" type="button" onClick={() => scrollTo('admin-accounts')}>♙ <span>Tài khoản</span></button>
      <button className="sidebar-item" type="button" onClick={() => scrollTo('quick-management')}>▱ <span>Lớp học</span></button>
      <button className="sidebar-item" type="button" onClick={() => scrollTo('admin-ai-usage')}>✧ <span>Quan sát AI</span></button>
      <button className="sidebar-item" type="button" onClick={() => go('/admin/settings')}>⚙ <span>Cài đặt</span></button>
      <button className="sidebar-logout" type="button" onClick={logout}>↪ <span>Đăng xuất</span></button>
    </aside>
    <section className="admin-main">
      <header className="dashboard-header">
        <div><span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span><h1>Tổng quan</h1><p>Quản lý tài khoản, lớp học và theo dõi hoạt động AI.</p></div>
        <div className="dashboard-actions">
          <label className="admin-search"><span>⌕</span><input type="search" placeholder="Tìm tài khoản, lớp học..." aria-label="Tìm kiếm" /></label>
          <div className="admin-notification">
            <button
              className="admin-notification-button"
              type="button"
              aria-label="Thông báo quản trị"
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((open) => !open)}
            >
              🔔
              {notifications.length > 0 && <span>{notifications.length > 99 ? '99+' : notifications.length}</span>}
            </button>
            {notificationOpen && <div className="admin-notification-panel" role="dialog" aria-label="Thông báo lỗi">
              <div className="admin-notification-head">
                <strong>Thông báo lỗi</strong>
                {notifications.length > 0 && <button type="button" onClick={() => setNotifications([])}>Xóa tất cả</button>}
              </div>
              {notifications.length ? <div className="admin-notification-list">
                {notifications.map((item) => <article key={item.id}>
                  <span aria-hidden="true">!</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                    <small>{item.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                </article>)}
              </div> : <p className="admin-notification-empty">Chưa có lỗi nào.</p>}
            </div>}
          </div>
          <button className="dashboard-primary" type="button" onClick={() => scrollTo('quick-management')}>＋ Quản lý tài khoản và lớp</button>
        </div>
      </header>

      {message && <p className="message error" role="alert">{message}</p>}

      <div id="admin-overview" />
      {!managementLoading && !managementError && <div className="dashboard-stats">
        <article className="dashboard-stat"><span className="stat-icon violet">♙</span><div><small>Tổng học sinh</small><strong>—</strong><em>Đang theo dõi</em></div></article>
        <article className="dashboard-stat"><span className="stat-icon purple">▱</span><div><small>Tổng lớp học</small><strong>{data.classes.length}</strong><em>Dữ liệu hệ thống</em></div></article>
        <article className="dashboard-stat"><span className="stat-icon yellow">🎓</span><div><small>Giáo viên</small><strong>{data.teachers.length}</strong><em>Đang hoạt động</em></div></article>
        <article className="dashboard-stat"><span className="stat-icon teal">✧</span><div><small>Yêu cầu AI</small><strong>{aiUsage?.requestCount || 0}</strong><em>30 ngày gần nhất</em></div></article>
      </div>}

      <div className="admin-dashboard-grid">
        <section className="dashboard-card ai-usage-card" id="admin-ai-usage">
        <div className="card-heading">
          <div><h2>Quan sát AI · 30 ngày gần nhất</h2><small>Dữ liệu ghi nhận từ các yêu cầu AI thực tế · {aiUsageConnected ? 'Đang cập nhật realtime' : 'Đang kết nối lại...'}</small></div>
          <span>{aiUsage ? `${aiUsage.requestCount} yêu cầu` : 'Đang tải...'}</span>
        </div>
        <div className="ai-feature-control">
          <div>
            <strong>Chức năng AI</strong>
            <small>{aiEnabled === false ? 'Đang tắt chatbot, tạo câu hỏi AI và phân loại bằng mô hình.' : 'Bật chatbot học tập và tạo câu hỏi bằng AI.'}</small>
          </div>
          <label className="ai-feature-switch">
            <span>{aiSettingsLoading ? 'Đang tải...' : aiEnabled ? 'Đang bật' : 'Đang tắt'}</span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Bật hoặc tắt các chức năng AI toàn hệ thống"
              checked={Boolean(aiEnabled)}
              disabled={aiSettingsLoading || aiSettingsSaving || aiEnabled === null}
              onChange={updateAIEnabled}
            />
          </label>
        </div>
        {aiSettingsMessage && <p className={aiSettingsMessage.startsWith('Không thể') ? 'ai-usage-error' : 'ai-settings-message'} role="status">{aiSettingsMessage}</p>}
        {aiUsageError && <p className="ai-usage-error" role="alert">{aiUsageError} Đang thử kết nối lại.</p>}
        {aiUsage && <>
          <div className="ai-usage-metrics">
            <article><small>Yêu cầu thành công</small><strong>{aiUsage.successfulRequestCount}</strong><span>{aiUsage.failedRequestCount} lỗi</span></article>
            <article><small>Thời gian phản hồi trung bình</small><strong>{formatLatency(aiUsage.averageLatencyMs)}</strong><span>Trong 30 ngày</span></article>
            <article><small>Token vào / ra</small><strong>{Number(aiUsage.promptTokens || 0).toLocaleString()} / {Number(aiUsage.completionTokens || 0).toLocaleString()}</strong><span>Đã ghi nhận</span></article>
          </div>
          {aiUsage.recentRequests?.length > 0 ? <div className="ai-usage-recent">
            <h3>Yêu cầu AI gần đây</h3>
            {aiUsage.recentRequests.map((request, index) => <div className="ai-usage-row" key={`${request.created_at}-${index}`}>
              <span>{request.feature === 'ai-chat' ? 'Trợ lý học tập' : request.feature === 'study-plan' ? 'Diễn đạt gợi ý học' : 'Tạo câu hỏi'}</span>
              <span>{request.model} · {request.prompt_version}</span>
              <span>{Number(request.prompt_tokens + request.completion_tokens).toLocaleString()} token</span>
              <span>{formatLatency(request.latency_ms)}</span>
              <span>{request.tools?.length ? request.tools.join(', ') : 'Không dùng tool'}</span>
              <span className={request.status_code < 400 ? 'ai-usage-ok' : 'ai-usage-failed'}>{request.status_code}</span>
            </div>)}
          </div> : <p className="ai-usage-empty">Chưa có yêu cầu AI nào được ghi nhận trong khoảng thời gian này.</p>}
        </>}
      </section>
      </div>

      <div className="admin-secondary-grid">
        <div id="admin-accounts">
          <AdminAccountManagement api={api} onError={(title, text) => addNotification(title, text)} />
        </div>
        <section className="dashboard-card admin-status-card">
          <div className="card-heading"><div><h2>Trạng thái hệ thống</h2><small>Tổng quan kết nối và dữ liệu</small></div></div>
          <div className="admin-status-ring">
            <div className="admin-status-donut"><strong>{aiUsageConnected ? '98%' : '—'}</strong><small>Hoạt động</small></div>
          </div>
          <div className="admin-status-list">
            <span><i className="green" />Cơ sở dữ liệu</span>
            <span><i className="blue" />Dịch vụ AI</span>
            <span><i className="yellow" />Thông báo</span>
          </div>
        </section>
      </div>

      <section className="dashboard-card quick-management" id="quick-management">
        <div className="card-heading"><div><h2>Quản lý tài khoản và lớp học</h2></div></div>
        {managementLoading && <p>Đang tải dữ liệu quản lý...</p>}
        {managementError && <p className="message error" role="alert">Không thể tải dữ liệu giáo viên và lớp học: {managementError}</p>}
        <div className="grid">
          <section className="card"><h2>+ Tạo tài khoản giáo viên</h2><form onSubmit={createTeacher}>
            <label>Họ tên giáo viên<input name="fullName" required minLength="2" /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Mật khẩu tạm thời<input name="password" type="password" required minLength="6" /></label>
            <button className="primary" type="submit">Tạo tài khoản</button>
          </form></section>
          <section className="card"><h2>+ Tạo lớp học</h2><form onSubmit={createClass}>
            <label>Tên lớp<input name="name" required /></label>
            <label>Khối<input name="grade" required /></label>
            <label>Giáo viên<select name="teacher_id"><option value="">Chưa chỉ định</option>{data.teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.full_name} · {teacher.email}</option>)}</select></label>
            <button className="primary" type="submit">Tạo lớp</button>
          </form></section>
          <section className="card"><h2>+ Thêm học sinh</h2><form onSubmit={addMember}>
            <label>Lớp học<select name="class_id" required disabled={managementLoading || Boolean(managementError) || !data.classes.length}><option value="">Chọn lớp học</option>{data.classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></label>
            <label>Email học sinh<input name="email" type="email" required /></label>
            <button className="primary" type="submit">Thêm vào lớp</button>
          </form></section>
        </div>
        <div className="managed-classes">
          <div className="card-heading"><h2>Danh sách lớp</h2>{!managementLoading && !managementError && <span>{data.classes.length} lớp</span>}</div>
          {!managementLoading && !managementError && data.classes.length ? data.classes.map((item) => <article className="managed-class-row" key={item.id}>
            <div><strong>{item.name} · {item.grade}</strong><small>Giáo viên: {item.assigned_teacher_name || 'Chưa chỉ định'}</small></div>
            <button className="secondary-action" type="button" onClick={() => setEditingClass(item)}>Chỉnh sửa</button>
          </article>) : !managementLoading && !managementError && <p>Chưa có lớp học.</p>}
          {!managementLoading && !managementError && data.classes.length > 0 && <section className="managed-class-members">
            <div className="card-heading"><div><h2>Học sinh trong lớp</h2><small>Gỡ học sinh khỏi lớp sẽ không xóa tài khoản của các em.</small></div>
              <select aria-label="Chọn lớp để xem học sinh" value={rosterClassId} onChange={(event) => setRosterClassId(event.target.value)}>
                {data.classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}
              </select>
            </div>
            {rosterError && <p className="message error" role="alert">{rosterError}</p>}
            {rosterLoading ? <p>Đang tải danh sách học sinh...</p> : classStudents.length
              ? classStudents.map((student) => <article className="managed-class-row" key={student.id}>
                <div><strong>{student.full_name || 'Chưa cập nhật tên'}</strong><small>{student.email}</small></div>
                <button className="remove-class-member" type="button" disabled={removingStudentId === student.id} onClick={() => removeStudent(student)}>
                  {removingStudentId === student.id ? 'Đang gỡ...' : 'Gỡ khỏi lớp'}
                </button>
              </article>)
              : !rosterError && <p>Lớp này chưa có học sinh.</p>}
          </section>}
        </div>
        {editingClass && <div className="edit-class-panel">
          <div className="card-heading"><h2>Chỉnh sửa lớp học</h2><button className="secondary-action" type="button" onClick={() => setEditingClass(null)}>Đóng</button></div>
          <form onSubmit={updateClass} className="edit-class-form">
            <label>Tên lớp<input name="name" defaultValue={editingClass.name} required /></label>
            <label>Khối<input name="grade" defaultValue={editingClass.grade} required /></label>
            <label>Giáo viên phụ trách<select name="teacher_id" defaultValue={editingClass.assigned_teacher_id || ''}><option value="">Chưa chỉ định</option>{data.teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.full_name} · {teacher.email}</option>)}</select></label>
            <button className="primary" type="submit">Lưu thay đổi</button>
          </form>
        </div>}
      </section>
      {toast && <div className="success-modal-backdrop" role="status" onClick={() => setToast('')}><div className="success-modal" role="alert" onClick={(event) => event.stopPropagation()}><div className="success-check">✓</div><h2>Thành công</h2><p>{toast}</p><button type="button" onClick={() => setToast('')}>Đã hiểu</button></div></div>}
    </section>
  </main>;
}
