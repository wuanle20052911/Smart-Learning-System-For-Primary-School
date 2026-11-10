import React, { useEffect, useState } from 'react';

function formatPercent(value) {
  return value === null || value === undefined ? '—' : `${value}%`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—';
}

function trendLabel(trend) {
  if (!trend) return 'Chưa đủ dữ liệu để xác định xu hướng';
  if (trend.direction === 'improving') return `Đang tiến bộ (+${trend.change} điểm phần trăm)`;
  if (trend.direction === 'declining') return `Cần quan tâm thêm (${trend.change} điểm phần trăm)`;
  return 'Kết quả đang ổn định';
}

const assignmentStatus = {
  submitted: 'Đã nộp',
  pending: 'Chưa hoàn thành',
  overdue: 'Quá hạn'
};

export default function ParentDashboardPage({ api, readSession, Header, Brand, go, logout }) {
  const session = readSession();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [requestBusy, setRequestBusy] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const dashboardLoad = api('/api/parents/dashboard')
      .then((data) => { if (active) setChildren(data.children || []); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Không thể tải tiến độ học tập của con.'); });
    const requestLoad = api('/api/parents/requests/incoming')
      .then((data) => {
        if (!active) return;
        setRequests(data.requests || []);
        setRequestError('');
      })
      .catch((loadError) => { if (active) setRequestError(loadError.message || 'Không thể tải yêu cầu liên kết.'); });
    Promise.all([dashboardLoad, requestLoad])
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, refresh]);

  const respondToRequest = async (requestId, action) => {
    setRequestBusy(requestId);
    setRequestError('');
    try {
      await api(`/api/parents/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
      });
      setRefresh((value) => value + 1);
    } catch (responseError) {
      setRequestError(responseError.message || 'Không thể cập nhật yêu cầu liên kết.');
    } finally {
      setRequestBusy('');
    }
  };

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout} />
    <main className="parent-dashboard">
      <div className="parent-dashboard-heading">
        <div>
          <span className="parent-eyebrow">GÓC GIA ĐÌNH MATHJOY</span>
          <h1>Cùng con lớn lên mỗi ngày!</h1>
          <p>Xin chào {session?.profile?.full_name || 'phụ huynh'}! Hãy cùng khám phá hành trình và những tiến bộ của con nhé.</p>
        </div>
        <div className="parent-heading-actions">
          <span className="parent-hero-mascot" aria-hidden="true">👨‍👩‍👧‍👦</span>
          <button type="button" className="parent-refresh" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>↻ Làm mới</button>
        </div>
      </div>

      {error && <div className="parent-alert" role="alert">{error}</div>}
      {!session?.profile?.phone_number && <div className="parent-alert parent-phone-reminder">Hãy thêm số điện thoại trong <a href="/profile" onClick={(event) => { event.preventDefault(); go('/profile'); }}>Thông tin cá nhân</a> để học sinh có thể gửi yêu cầu liên kết.</div>}
      {requestError && <div className="parent-alert" role="alert">{requestError}</div>}
      {!loading && requests.length > 0 && <section className="parent-request-card">
        <div className="parent-section-heading"><div><span className="parent-eyebrow">CẦN XÁC NHẬN</span><h2>Yêu cầu liên kết từ học sinh</h2></div><span className="parent-request-count">{requests.length}</span></div>
        <p>Chỉ chấp nhận nếu bạn nhận ra học sinh này. Khi xác nhận, tài khoản sẽ được liên kết và tiến độ học tập sẽ hiển thị trong dashboard.</p>
        <div className="parent-request-list">{requests.map((request) => <article key={request.id}>
          <div><strong>{request.student?.full_name || 'Học sinh'}</strong><small>Gửi ngày {formatDate(request.created_at)}</small></div>
          <div className="parent-request-actions">
            <button type="button" className="parent-request-accept" onClick={() => respondToRequest(request.id, 'accept')} disabled={Boolean(requestBusy)}>{requestBusy === request.id ? 'ĐANG XỬ LÝ...' : 'Xác nhận'}</button>
            <button type="button" className="parent-request-reject" onClick={() => respondToRequest(request.id, 'reject')} disabled={Boolean(requestBusy)}>Từ chối</button>
          </div>
        </article>)}</div>
      </section>}
      {loading ? <section className="parent-empty">Đang tải tiến độ học tập...</section>
        : children.length === 0 ? <section className="parent-empty">
          <div className="parent-empty-art" aria-hidden="true"><span>🏫</span><i>✨</i></div>
          <span className="parent-eyebrow">BẮT ĐẦU HÀNH TRÌNH CÙNG CON</span>
          <h2>Chờ kết nối với con nhé!</h2>
          <p>Thêm số điện thoại trong hồ sơ để học sinh gửi yêu cầu cho bạn, hoặc nhờ nhà trường tạo liên kết. Sau khi xác nhận, tiến bộ của con sẽ được cập nhật tại đây.</p>
          <div className="parent-onboarding">
            <article><span>1</span><div><strong>Tạo tài khoản phụ huynh</strong><small>Bạn đã hoàn thành bước này.</small></div><b>✓</b></article>
            <article><span>2</span><div><strong>Cập nhật số điện thoại</strong><small>Con gửi yêu cầu để bạn xác nhận, hoặc nhà trường có thể kết nối giúp.</small></div><b>📱</b></article>
            <article><span>3</span><div><strong>Cùng theo dõi hành trình học tập</strong><small>Xem tiến độ, điểm mạnh và gợi ý ôn tập.</small></div><b>⭐</b></article>
          </div>
        </section>
          : <div className="parent-children">
            {children.map((child) => <article className="parent-child-card" key={child.student.id}>
              <header className="parent-child-heading">
                <div>
                  <span className="parent-eyebrow">HỒ SƠ HỌC TẬP</span>
                  <h2>{child.student.full_name || 'Học sinh'}</h2>
                  <p>{child.student.classes.length
                    ? child.student.classes.map((classItem) => `${classItem.name} · ${classItem.grade}`).join(' / ')
                    : 'Chưa được xếp lớp'}</p>
                </div>
                <span className="parent-child-icon" aria-hidden="true">🎒</span>
              </header>

              <section className="parent-metrics" aria-label={`Tổng quan học tập của ${child.student.full_name}`}>
                <article><span>📚</span><strong>{child.summary.assigned_count ? `${child.summary.completion_rate}%` : '—'}</strong><small>Hoàn thành bài tập</small><em>{child.summary.submitted_count}/{child.summary.assigned_count} bài đã nộp</em></article>
                <article><span>🎯</span><strong>{formatPercent(child.summary.accuracy)}</strong><small>Độ chính xác luyện tập</small><em>{child.summary.correct_answers}/{child.summary.total_answers} câu đúng</em></article>
                <article><span>✏️</span><strong>{child.summary.attempt_count}</strong><small>Lượt luyện tập</small><em>{trendLabel(child.trend)}</em></article>
              </section>

              <section className="parent-section">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">PHÂN TÍCH TỪ KẾT QUẢ ĐÃ LƯU</span><h3>Điểm mạnh và nội dung nên ôn</h3></div></div>
                {child.competencies.length ? <div className="parent-competencies">
                  {child.competencies.map((item) => <article className="parent-competency" key={`${item.chapter}-${item.title}`}>
                    <div className="parent-competency-title"><div><small>{item.chapter}</small><strong>{item.title}</strong></div><b>{formatPercent(item.accuracy)}</b></div>
                    <div className="parent-progress" role="progressbar" aria-label={`Độ chính xác ${item.title}`} aria-valuenow={item.accuracy || 0} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${item.accuracy || 0}%` }} /></div>
                    <small>{item.correct}/{item.total} câu đúng · {item.attempts} lượt làm · cập nhật {formatDate(item.latest_at)}</small>
                  </article>)}
                </div> : <p className="parent-muted">Chưa có kết quả luyện tập để tổng hợp năng lực.</p>}
                <div className="parent-insight-columns">
                  <div><h4>Điểm mạnh</h4>{child.strengths.length
                    ? child.strengths.map((item) => <p key={`${item.chapter}-${item.title}`}>✓ {item.title} · {item.accuracy}%</p>)
                    : <p className="parent-muted">Chưa có đủ kết quả nổi bật để xác định điểm mạnh.</p>}</div>
                  <div><h4>Có thể ôn thêm</h4>{child.needs_practice.length
                    ? child.needs_practice.map((item) => <p key={`${item.chapter}-${item.title}`}>↗ {item.title} · {item.accuracy}%</p>)
                    : <p className="parent-muted">Chưa có nội dung nào cần ưu tiên ôn thêm.</p>}</div>
                </div>
              </section>

              <section className="parent-section">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">GỢI Ý ĐỒNG HÀNH</span><h3>Khuyến nghị học tập</h3></div></div>
                {child.recommendations.length
                  ? <ul className="parent-recommendations">{child.recommendations.map((item, index) => <li key={`${item.type}-${index}`}>{item.text}</li>)}</ul>
                  : <p className="parent-muted">Chưa có khuyến nghị ưu tiên lúc này. Hãy tiếp tục động viên con duy trì việc học.</p>}
                <p className="parent-disclaimer">Gợi ý được tổng hợp từ bài tập và lượt luyện tập đã lưu, không thay thế đánh giá của giáo viên.</p>
              </section>

              <section className="parent-section">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">THEO DÕI BÀI TẬP</span><h3>Bài được giao</h3></div></div>
                {child.assignments.length ? <div className="parent-assignment-list">{child.assignments.map((assignment) => <article key={assignment.id}>
                  <div><strong>{assignment.title}</strong><small>{assignment.due_at ? `Hạn nộp ${formatDate(assignment.due_at)}` : 'Không có hạn nộp'}</small></div>
                  <span className={`parent-status ${assignment.status}`}>{assignmentStatus[assignment.status]}</span>
                  {assignment.score !== null && <b>{Math.round(assignment.score)}%</b>}
                </article>)}</div> : <p className="parent-muted">Chưa có bài tập được giao trong các lớp của con.</p>}
              </section>

              <section className="parent-section">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span><h3>Lượt luyện tập</h3></div></div>
                {child.recent_attempts.length ? <div className="parent-attempt-list">{child.recent_attempts.map((attempt, index) => <article key={`${attempt.created_at}-${index}`}>
                  <div><strong>{attempt.title}</strong><small>{attempt.chapter} · {formatDate(attempt.created_at)}</small></div>
                  <b>{attempt.score}/{attempt.total}</b>
                </article>)}</div> : <p className="parent-muted">Chưa có lượt luyện tập được lưu.</p>}
              </section>
            </article>)}
          </div>}
    </main>
  </>;
}
