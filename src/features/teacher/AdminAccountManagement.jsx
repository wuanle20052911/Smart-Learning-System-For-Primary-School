import React, { useEffect, useState } from 'react';

function AccountTable({ title, role, users, loading, updatingId, onToggle }) {
  const accounts = users.filter((user) => user.role === role);
  return <section className="card">
    <h2>{title} ({accounts.length})</h2>
    {loading ? <p>Đang tải danh sách...</p> : accounts.length ? <div className="managed-classes">
      {accounts.map((user) => <article className="managed-class-row" key={user.id}>
        <div>
          <strong>{user.full_name || 'Chưa cập nhật tên'}</strong>
          <small>{user.email}</small>
          <small>Trạng thái: {user.disabled ? 'Đã khóa' : 'Đang hoạt động'}</small>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled={updatingId === user.id}
          onClick={() => onToggle(user)}
        >
          {updatingId === user.id ? 'Đang cập nhật...' : user.disabled ? 'Mở tài khoản' : 'Khóa tài khoản'}
        </button>
      </article>)}
    </div> : <p>Chưa có tài khoản nào.</p>}
  </section>;
}

export default function AdminAccountManagement({ api }) {
  const [users, setUsers] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, linkData] = await Promise.all([
        api('/api/auth/users'),
        api('/api/parents/links')
      ]);
      setUsers(userData.users || []);
      setLinks(linkData.links || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAccount = async (user) => {
    const action = user.disabled ? 'mở khóa' : 'khóa';
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.full_name || user.email}?`)) return;
    setUpdatingId(user.id);
    setError('');
    try {
      const result = await api(`/api/auth/users/${encodeURIComponent(user.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: !user.disabled })
      });
      setUsers((current) => current.map((item) => item.id === result.user.id ? result.user : item));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId('');
    }
  };

  const createLink = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingLink(true);
    setError('');
    try {
      await api('/api/parents/links', {
        method: 'POST',
        body: JSON.stringify({ parent_id: form.get('parentId'), student_id: form.get('studentId') })
      });
      formElement.reset();
      await load();
    } catch (linkError) {
      setError(linkError.message);
    } finally {
      setSavingLink(false);
    }
  };

  const removeLink = async (link) => {
    const childName = link.student?.full_name || link.student?.email || 'học sinh';
    const parentName = link.parent?.full_name || link.parent?.email || 'phụ huynh';
    if (!window.confirm(`Gỡ liên kết giữa ${parentName} và ${childName}?`)) return;
    setError('');
    try {
      await api(`/api/parents/links/${encodeURIComponent(link.parent_id)}/${encodeURIComponent(link.student_id)}`, { method: 'DELETE' });
      setLinks((current) => current.filter((item) => item.parent_id !== link.parent_id || item.student_id !== link.student_id));
    } catch (linkError) {
      setError(linkError.message);
    }
  };

  const parents = users.filter((user) => user.role === 'parent');
  const students = users.filter((user) => user.role === 'student');

  return <section className="dashboard-card quick-management">
    <div className="card-heading"><h2>Danh sách tài khoản</h2><button className="secondary-action" type="button" onClick={load} disabled={loading}>Làm mới</button></div>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="grid">
      <AccountTable title="Học sinh" role="student" users={users} loading={loading} updatingId={updatingId} onToggle={toggleAccount} />
      <AccountTable title="Phụ huynh" role="parent" users={users} loading={loading} updatingId={updatingId} onToggle={toggleAccount} />
      <AccountTable title="Giáo viên" role="teacher" users={users} loading={loading} updatingId={updatingId} onToggle={toggleAccount} />
    </div>
    <section className="card parent-link-management">
      <h2>Liên kết phụ huynh với học sinh</h2>
      <p>Chỉ quản trị viên mới có thể tạo hoặc gỡ liên kết. Phụ huynh chỉ xem được học sinh được liên kết tại đây.</p>
      <form className="parent-link-form" onSubmit={createLink}>
        <label>Phụ huynh<select name="parentId" required disabled={loading || !parents.length}><option value="">Chọn phụ huynh</option>{parents.map((parent) => <option value={parent.id} key={parent.id}>{parent.full_name} · {parent.email}</option>)}</select></label>
        <label>Học sinh<select name="studentId" required disabled={loading || !students.length}><option value="">Chọn học sinh</option>{students.map((student) => <option value={student.id} key={student.id}>{student.full_name} · {student.email}</option>)}</select></label>
        <button className="primary" type="submit" disabled={savingLink || loading || !parents.length || !students.length}>{savingLink ? 'Đang liên kết...' : 'Tạo liên kết'}</button>
      </form>
      {links.length ? <div className="managed-classes">{links.map((link) => <article className="managed-class-row" key={`${link.parent_id}-${link.student_id}`}>
        <div><strong>{link.parent?.full_name || 'Phụ huynh'}</strong><small>{link.parent?.email || '—'} ↔ {link.student?.full_name || 'Học sinh'} · {link.student?.email || '—'}</small><small>Liên kết ngày {new Date(link.linked_at).toLocaleDateString('vi-VN')}</small></div>
        <button className="secondary-action" type="button" onClick={() => removeLink(link)}>Gỡ liên kết</button>
      </article>)}</div> : !loading && <p>Chưa có liên kết phụ huynh–học sinh.</p>}
    </section>
  </section>;
}
