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
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/auth/users');
      setUsers(data.users || []);
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

  return <section className="dashboard-card quick-management">
    <div className="card-heading"><h2>Danh sách tài khoản học sinh và giáo viên</h2><button className="secondary-action" type="button" onClick={load} disabled={loading}>Làm mới</button></div>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="grid">
      <AccountTable title="Học sinh" role="student" users={users} loading={loading} updatingId={updatingId} onToggle={toggleAccount} />
      <AccountTable title="Giáo viên" role="teacher" users={users} loading={loading} updatingId={updatingId} onToggle={toggleAccount} />
    </div>
  </section>;
}
