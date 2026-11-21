import React, { useCallback, useEffect, useRef, useState } from 'react';
import ParentIcon from '../components/ParentIcons.jsx';
import ParentActivity from '../components/ParentActivity.jsx';
import ChristmasTrim from '../components/ChristmasTrim.jsx';
import MessagePopup from '../features/messages/MessagePopup.jsx';

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

function AttentionBanner({ attention }) {
  if (!attention) return null;
  return <section className={`parent-attention ${attention.level}`} id="parent-sec-attention" role="status">
    <ParentIcon name="heart" size={34} />
    <div>
      <strong>{attention.level === 'high' ? 'Con đang cần được quan tâm thêm' : 'Giáo viên đang theo dõi thêm việc học của con'}</strong>
      {attention.reasons.map((reason) => <p key={reason}>{reason}</p>)}
      <small>Cập nhật {formatDate(attention.updated_at)} · Hãy trò chuyện nhẹ nhàng với con và liên hệ giáo viên nếu cần.</small>
    </div>
  </section>;
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ParentSidebar({ childrenList, selectedChild, onSelectChild, requestCount, unreadMessages, loading, onRefresh, onProfile, onOpenMessages }) {
  const unfinished = selectedChild?.assignments.filter((item) => item.status !== 'submitted').length || 0;
  const overdue = selectedChild?.assignments.some((item) => item.status === 'overdue');
  const items = [
    requestCount > 0 && { id: 'parent-sec-requests', icon: 'envelope', label: 'Yêu cầu liên kết', badge: requestCount, tone: 'alert' },
    selectedChild && { id: 'parent-sec-overview', icon: 'overview', label: 'Tổng quan' },
    selectedChild?.attention && { id: 'parent-sec-attention', icon: 'heart', label: 'Cần quan tâm', badge: '!', tone: 'alert' },
    selectedChild && { id: 'parent-sec-activity', icon: 'calendar', label: 'Tiến bộ & lịch học', badge: selectedChild.activity?.streak.current || null, tone: 'streak' },
    selectedChild && { id: 'parent-sec-competency', icon: 'target', label: 'Năng lực' },
    selectedChild && { id: 'parent-sec-recommendations', icon: 'bulb', label: 'Khuyến nghị' },
    selectedChild && { id: 'parent-sec-assignments', icon: 'books', label: 'Bài tập', badge: unfinished || null, tone: overdue ? 'alert' : 'info' },
    selectedChild && { id: 'parent-sec-attempts', icon: 'pencil', label: 'Luyện tập' },
    selectedChild && { id: 'parent-sec-lessons', icon: 'openBook', label: 'Bài học' },
    !loading && { id: 'parent-open-messages', icon: 'chat', label: 'Nhắn tin giáo viên', badge: unreadMessages || null, tone: 'alert', action: onOpenMessages },
    !loading && { id: 'parent-sec-links', icon: 'link', label: 'Quản lý liên kết' }
  ].filter(Boolean);
  const [activeId, setActiveId] = useState('');
  const itemKey = items.map((item) => item.id).join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const elements = itemKey.split('|').map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
      if (visible[0] && !atPageBottom()) setActiveId(visible[0].target.id);
    }, { rootMargin: '-15% 0px -65% 0px' });
    elements.forEach((element) => observer.observe(element));
    const atPageBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const onScroll = () => { if (atPageBottom()) setActiveId(elements[elements.length - 1].id); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [itemKey, selectedChild?.student.id]);

  return <aside className="parent-sidebar" aria-label="Điều hướng nhanh">
    <ChristmasTrim variant="sidebar" />
    <div className="parent-sidebar-scroll">
    {childrenList.length > 1 && <div className="parent-sidebar-group">
      <span className="parent-sidebar-label">CON CỦA BẠN</span>
      <div className="parent-child-switch">{childrenList.map((child) => <button
        type="button"
        key={child.student.id}
        className={child.student.id === selectedChild?.student.id ? 'active' : ''}
        aria-pressed={child.student.id === selectedChild?.student.id}
        onClick={() => onSelectChild(child.student.id)}
      ><span><ParentIcon name="backpack" /></span>{child.student.full_name || 'Học sinh'}{child.attention && <i aria-label="Cần quan tâm">!</i>}</button>)}</div>
    </div>}
    {childrenList.length === 1 && selectedChild && <div className="parent-sidebar-child"><ParentIcon name="backpack" size={36} /><div><small>Đang xem</small><strong>{selectedChild.student.full_name || 'Học sinh'}</strong></div></div>}
    <div className="parent-sidebar-links">
    {items.length > 0 && <nav className="parent-sidebar-group">
      <span className="parent-sidebar-label">ĐI NHANH ĐẾN</span>
      {items.map((item) => <button
        type="button"
        key={item.id}
        className={activeId === item.id ? 'active' : ''}
        aria-current={activeId === item.id ? 'true' : undefined}
        onClick={() => { if (item.action) { item.action(); return; } setActiveId(item.id); scrollToSection(item.id); }}
      ><span><ParentIcon name={item.icon} /></span>{item.label}{item.badge ? <b className={item.tone}>{item.badge}</b> : null}</button>)}
    </nav>}
    <div className="parent-sidebar-group parent-sidebar-actions">
      <button type="button" onClick={onRefresh} disabled={loading}><span><ParentIcon name="refresh" /></span>{loading ? 'Đang tải...' : 'Làm mới'}</button>
      <button type="button" onClick={onProfile}><span><ParentIcon name="profile" /></span>Thông tin cá nhân</button>
    </div>
    </div>
    </div>
  </aside>;
}

function ReviewPanel({ state, onClose }) {
  const [onlyWrong, setOnlyWrong] = useState(true);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const review = state.review;
  const questions = review ? review.questions.filter((item) => !onlyWrong || !item.is_correct) : [];
  return <div className="parent-review-backdrop" onClick={onClose}>
    <section className="parent-review" role="dialog" aria-modal="true" aria-label="Chi tiết bài làm" onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <span className="parent-eyebrow">{review?.kind === 'attempt' ? 'LƯỢT LUYỆN TẬP' : 'BÀI TẬP ĐÃ NỘP'}</span>
          <h3>{review?.title || state.title}</h3>
          {review && <small>{review.correct_count}/{review.total_questions} câu đúng · {formatDate(review.submitted_at)}</small>}
        </div>
        <button type="button" className="parent-review-close" onClick={onClose} aria-label="Đóng">✕</button>
      </header>
      {state.loading && <p className="parent-muted">Đang tải bài làm...</p>}
      {state.error && <div className="parent-alert" role="alert">{state.error}</div>}
      {review && <>
        {review.feedback.length > 0 && <div className="parent-feedback-list">
          {review.feedback.map((item) => <blockquote key={item.id}><b>Nhận xét của giáo viên · {formatDate(item.created_at)}</b>{item.comment}</blockquote>)}
        </div>}
        <label className="parent-review-toggle">
          <input type="checkbox" checked={onlyWrong} onChange={(event) => setOnlyWrong(event.target.checked)} /> Chỉ hiện câu con làm sai
        </label>
        {!review.questions.length ? <p className="parent-muted">Lượt làm bài này không lưu chi tiết câu hỏi.</p>
          : !questions.length ? <p className="parent-muted">🎉 Con đã trả lời đúng tất cả các câu.</p>
            : <ol className="parent-review-questions">{questions.map((item) => <li key={item.position} className={item.is_correct ? 'correct' : 'wrong'}>
              <strong>Câu {item.position}. {item.question}</strong>
              <p>Con trả lời: <b>{item.chosen_answer}</b> {item.is_correct ? '✓' : '✗'}</p>
              {!item.is_correct && item.correct_answer && <p>Đáp án đúng: <b>{item.correct_answer}</b></p>}
              {item.explanation && <small>💡 {item.explanation}</small>}
            </li>)}</ol>}
      </>}
    </section>
  </div>;
}

export default function ParentDashboardPage({ api, readSession, Header, Brand, go, logout }) {
  const session = readSession();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [requestBusy, setRequestBusy] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [reviewState, setReviewState] = useState(null);
  const [history, setHistory] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const chatButtonRef = useRef(null);
  const closeMessages = useCallback(() => setMessagesOpen(false), []);
  // Số tin chưa đọc cho nút trên header, kiểm tra lại mỗi 30 giây
  useEffect(() => {
    let active = true;
    const check = () => {
      if (document.hidden) return;
      api('/api/messages/unread').then((data) => { if (active) setUnreadMessages(data.unread || 0); }).catch(() => {});
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api]);
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const selectedChild = children.find((child) => child.student.id === selectedChildId) || children[0] || null;

  const openReview = async (studentId, kind, itemId, title) => {
    const request = `${kind}:${itemId}`;
    setReviewState({ request, title, loading: true, error: '', review: null });
    try {
      const data = await api(`/api/parents/children/${studentId}/${kind === 'attempt' ? 'attempts' : 'submissions'}/${itemId}`);
      setReviewState((current) => current?.request === request ? { ...current, loading: false, review: data.review } : current);
    } catch (loadError) {
      setReviewState((current) => current?.request === request
        ? { ...current, loading: false, error: loadError.message || 'Không thể tải chi tiết bài làm của con.' }
        : current);
    }
  };
  const closeReview = React.useCallback(() => setReviewState(null), []);

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
    const historyLoad = api('/api/parents/requests/history')
      .then((data) => { if (active) setHistory(data.requests || []); })
      .catch(() => { if (active) setHistory([]); });
    Promise.all([dashboardLoad, requestLoad, historyLoad])
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, refresh]);

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinkBusy(true);
    setLinkMessage('');
    try {
      await api(`/api/parents/children/${unlinkTarget.id}`, { method: 'DELETE' });
      setLinkMessage(`Đã hủy liên kết với ${unlinkTarget.full_name || 'học sinh'}.`);
      setUnlinkTarget(null);
      if (selectedChildId === unlinkTarget.id) setSelectedChildId('');
      setRefresh((value) => value + 1);
    } catch (unlinkError) {
      setLinkMessage(unlinkError.message || 'Không thể hủy liên kết lúc này.');
    } finally {
      setUnlinkBusy(false);
    }
  };

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
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout}>
      <button
        ref={chatButtonRef}
        type="button"
        className={`header-chat${messagesOpen ? ' open' : ''}`}
        onClick={() => setMessagesOpen((value) => !value)}
        aria-label={unreadMessages ? `Nhắn tin với thầy cô, ${unreadMessages} tin chưa đọc` : 'Nhắn tin với thầy cô của con'}
        aria-expanded={messagesOpen}
        title="Nhắn tin với thầy cô của con"
      >
        <ParentIcon name="chat" size={28} />
        {unreadMessages > 0 && <b className="header-chat-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</b>}
      </button>
    </Header>
    {messagesOpen && <MessagePopup
      api={api}
      viewerRole="parent"
      title="Thầy cô của con"
      subtitle="Chọn thầy cô để nhắn tin riêng về việc học của con"
      onClose={closeMessages}
      onUnreadChange={setUnreadMessages}
      returnFocusRef={chatButtonRef}
    />}
    <div className="parent-layout">
    <ParentSidebar
      childrenList={children}
      selectedChild={selectedChild}
      onSelectChild={(id) => { setSelectedChildId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      requestCount={loading ? 0 : requests.length}
      unreadMessages={unreadMessages}
      onOpenMessages={() => setMessagesOpen(true)}
      loading={loading}
      onRefresh={() => setRefresh((value) => value + 1)}
      onProfile={() => go('/profile')}
    />
    <main className="parent-dashboard">
      <h1 className="parent-sr-only">Theo dõi học tập của con</h1>
      {error && <div className="parent-alert" role="alert">{error}</div>}
      {!session?.profile?.phone_number && <div className="parent-alert parent-phone-reminder">Hãy thêm số điện thoại trong <a href="/profile" onClick={(event) => { event.preventDefault(); go('/profile'); }}>Thông tin cá nhân</a> để học sinh có thể gửi yêu cầu liên kết.</div>}
      {requestError && <div className="parent-alert" role="alert">{requestError}</div>}
      {!loading && requests.length > 0 && <section className="parent-request-card" id="parent-sec-requests">
        <ChristmasTrim variant="request" />
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
          <div className="parent-empty-art" aria-hidden="true"><ParentIcon name="school" size={52} /><i>✨</i></div>
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
            {(selectedChild ? [selectedChild] : []).map((child) => <article className="parent-child-card" key={child.student.id}>
              <ChristmasTrim variant="card" />
              <header className="parent-child-heading">
                <div>
                  <span className="parent-eyebrow">HỒ SƠ HỌC TẬP</span>
                  <h2>{child.student.full_name || 'Học sinh'}</h2>
                  <p>{child.student.classes.length
                    ? child.student.classes.map((classItem) => `${classItem.name} · ${classItem.grade}`).join(' / ')
                    : 'Chưa được xếp lớp'}</p>
                </div>
                <span className="parent-child-icon"><ParentIcon name="backpack" size={36} /></span>
              </header>

              <AttentionBanner attention={child.attention} />

              <section className="parent-metrics" id="parent-sec-overview" aria-label={`Tổng quan học tập của ${child.student.full_name}`}>
                <article><span><ParentIcon name="books" size={30} /></span><strong>{child.summary.assigned_count ? `${child.summary.completion_rate}%` : '—'}</strong><small>Hoàn thành bài tập</small><em>{child.summary.submitted_count}/{child.summary.assigned_count} bài đã nộp</em></article>
                <article><span><ParentIcon name="target" size={30} /></span><strong>{formatPercent(child.summary.accuracy)}</strong><small>Độ chính xác luyện tập</small><em>{child.summary.correct_answers}/{child.summary.total_answers} câu đúng</em></article>
                <article><span><ParentIcon name="pencil" size={30} /></span><strong>{child.summary.attempt_count}</strong><small>Lượt luyện tập</small><em>{trendLabel(child.trend)}</em></article>
                <article><span><ParentIcon name="openBook" size={30} /></span><strong>{child.summary.completed_lesson_count ?? 0}</strong><small>Bài học đã hoàn thành</small><em>{child.completed_lessons?.[0] ? `Gần nhất ${formatDate(child.completed_lessons[0].completed_at)}` : 'Chưa có bài học hoàn thành'}</em></article>
              </section>

              <section className="parent-section" id="parent-sec-activity">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">THEO DÕI THEO THỜI GIAN</span><h3>Tiến bộ và lịch học</h3></div></div>
                <ParentActivity key={child.student.id} activity={child.activity} />
              </section>

              <section className="parent-section" id="parent-sec-competency">
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

              <section className="parent-section" id="parent-sec-recommendations">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">GỢI Ý ĐỒNG HÀNH</span><h3>Khuyến nghị học tập</h3></div></div>
                {child.recommendations.length
                  ? <ul className="parent-recommendations">{child.recommendations.map((item, index) => <li key={`${item.type}-${index}`}>{item.text}</li>)}</ul>
                  : <p className="parent-muted">Chưa có khuyến nghị ưu tiên lúc này. Hãy tiếp tục động viên con duy trì việc học.</p>}
                <p className="parent-disclaimer">Gợi ý được tổng hợp từ bài tập và lượt luyện tập đã lưu, không thay thế đánh giá của giáo viên.</p>
              </section>

              <section className="parent-section" id="parent-sec-assignments">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">THEO DÕI BÀI TẬP</span><h3>Bài được giao</h3></div></div>
                {child.assignments.length ? <div className="parent-assignment-list">{child.assignments.map((assignment) => <article key={assignment.id}>
                  <div><strong>{assignment.title}</strong><small>{assignment.due_at ? `Hạn nộp ${formatDate(assignment.due_at)}` : 'Không có hạn nộp'}</small></div>
                  <span className={`parent-status ${assignment.status}`}>{assignmentStatus[assignment.status]}</span>
                  <b>{assignment.score !== null ? `${Math.round(assignment.score)}%` : ''}</b>
                  {assignment.submission_id
                    ? <button type="button" className="parent-review-open" onClick={() => openReview(child.student.id, 'submission', assignment.submission_id, assignment.title)}>Xem bài làm</button>
                    : <span />}
                  {assignment.feedback?.length > 0 && <blockquote className="parent-inline-feedback"><b>💬 Giáo viên nhận xét · {formatDate(assignment.feedback[0].created_at)}</b>{assignment.feedback[0].comment}</blockquote>}
                </article>)}</div> : <p className="parent-muted">Chưa có bài tập được giao trong các lớp của con.</p>}
              </section>

              <section className="parent-section" id="parent-sec-attempts">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span><h3>Lượt luyện tập</h3></div></div>
                {child.recent_attempts.length ? <div className="parent-attempt-list">{child.recent_attempts.map((attempt, index) => <article key={`${attempt.created_at}-${index}`}>
                  <div><strong>{attempt.title}</strong><small>{attempt.chapter} · {formatDate(attempt.created_at)}</small></div>
                  <b>{attempt.score}/{attempt.total}</b>
                  {attempt.id
                    ? <button type="button" className="parent-review-open" onClick={() => openReview(child.student.id, 'attempt', attempt.id, attempt.title)}>Xem lại</button>
                    : <span />}
                </article>)}</div> : <p className="parent-muted">Chưa có lượt luyện tập được lưu.</p>}
              </section>

              <section className="parent-section" id="parent-sec-lessons">
                <div className="parent-section-heading"><div><span className="parent-eyebrow">HÀNH TRÌNH BÀI HỌC</span><h3>Bài học con đã hoàn thành</h3></div></div>
                {child.completed_lessons?.length ? <div className="parent-lesson-list">{child.completed_lessons.map((lesson) => <article key={lesson.id}>
                  <span aria-hidden="true">✓</span>
                  <div><strong>{lesson.title}</strong><small>{lesson.topic ? `${lesson.topic} · ` : ''}{formatDate(lesson.completed_at)}</small></div>
                </article>)}</div> : <p className="parent-muted">Con chưa hoàn thành bài học nào.</p>}
              </section>
            </article>)}
          </div>}
      {!loading && <section className="parent-links-card" id="parent-sec-links">
        <ChristmasTrim variant="links" />
        <div className="parent-section-heading"><div><span className="parent-eyebrow">TÀI KHOẢN GIA ĐÌNH</span><h3>Quản lý liên kết</h3></div><ParentIcon name="link" size={34} /></div>
        {linkMessage && <p className="parent-link-message" role="status">{linkMessage}</p>}
        <h4>Đang liên kết</h4>
        {children.length ? <div className="parent-link-list">{children.map((child) => <article key={child.student.id}>
          <ParentIcon name="backpack" size={28} />
          <div><strong>{child.student.full_name || 'Học sinh'}</strong><small>{child.student.classes.map((item) => item.name).join(', ') || 'Chưa được xếp lớp'}</small></div>
          <button type="button" className="parent-unlink" onClick={() => setUnlinkTarget({ id: child.student.id, full_name: child.student.full_name })}>Hủy liên kết</button>
        </article>)}</div> : <p className="parent-muted">Chưa có học sinh nào được liên kết.</p>}
        <h4>Lịch sử yêu cầu</h4>
        {history.length ? <ul className="parent-history-list">{history.map((item) => <li key={item.id}>
          <span className={`parent-history-status ${item.status}`}>{item.status === 'accepted' ? 'Đã xác nhận' : 'Đã từ chối'}</span>
          <strong>{item.student?.full_name || 'Học sinh'}</strong>
          <small>Gửi {formatDate(item.created_at)} · xử lý {formatDate(item.updated_at)}</small>
        </li>)}</ul> : <p className="parent-muted">Chưa có yêu cầu nào đã được xử lý.</p>}
      </section>}
      {unlinkTarget && <div className="parent-review-backdrop" onClick={() => !unlinkBusy && setUnlinkTarget(null)}>
        <section className="parent-review parent-confirm" role="alertdialog" aria-modal="true" aria-labelledby="parent-unlink-title" onClick={(event) => event.stopPropagation()}>
          <h3 id="parent-unlink-title">Hủy liên kết với {unlinkTarget.full_name || 'học sinh'}?</h3>
          <p>Bạn sẽ không xem được tiến độ học tập của con nữa. Muốn liên kết lại, con cần gửi yêu cầu mới tới số điện thoại của bạn hoặc nhờ nhà trường kết nối.</p>
          <div className="parent-confirm-actions">
            <button type="button" className="parent-request-reject" onClick={confirmUnlink} disabled={unlinkBusy}>{unlinkBusy ? 'Đang hủy...' : 'Hủy liên kết'}</button>
            <button type="button" className="parent-confirm-cancel" onClick={() => setUnlinkTarget(null)} disabled={unlinkBusy} autoFocus>Giữ liên kết</button>
          </div>
        </section>
      </div>}
      {reviewState && <ReviewPanel state={reviewState} onClose={closeReview} />}
    </main>
    </div>
  </>;
}
