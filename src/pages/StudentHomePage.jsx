import React, { useEffect, useState } from 'react';

function formatFileSize(bytes) {
  if (!bytes) return 'Tài liệu';
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(fileName) {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE';
}

export default function StudentHomePage({ api, readSession, Header, Brand, AssignedWorkView, go, logout }) {
  const [chapters, setChapters] = useState([]);
  const [chapterFiles, setChapterFiles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState('');
  const session = readSession();
  const [progress] = useState(() => JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0}'));

  useEffect(() => {
    api('/api/lessons/storage-chapters')
      .then((data) => setChapters(data.chapters || []))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoadingChapters(false));

    Promise.all([api('/api/assignments/published'), api('/api/submissions/mine')])
      .then(([assignmentData, submissionData]) => {
        const submissions = submissionData.submissions || [];
        setAssignments((assignmentData.assignments || []).map((item) => ({
          ...item,
          submission: submissions.find((submission) => submission.assignment_id === item.id) || null
        })));
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const chooseChapter = async (chapter) => {
    setSelectedChapter(chapter);
    setChapterFiles([]);
    setError('');
    setLoadingFiles(true);
    try {
      const data = await api(`/api/lessons/storage-chapters/${encodeURIComponent(chapter)}/files`);
      setChapterFiles(data.files || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const openStorageFile = async (file) => {
    const fileWindow = window.open('about:blank', '_blank');
    if (!fileWindow) {
      setError('Trình duyệt đang chặn cửa sổ mở tài liệu.');
      return;
    }
    try {
      const result = await api(`/api/lessons/storage-chapters/${encodeURIComponent(selectedChapter)}/file-url?path=${encodeURIComponent(file.path)}`);
      fileWindow.opener = null;
      fileWindow.location.href = result.url;
    } catch (openError) {
      fileWindow.close();
      setError(openError.message || 'Không thể mở tài liệu Supabase.');
    }
  };

  const openAssignment = async (item) => {
    try {
      const data = await api(`/api/assignments/${item.id}`);
      setSelectedAssignment({ ...data.assignment, submission: item.submission || null, isAssignment: true });
    } catch (openError) {
      setError(openError.message);
    }
  };

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout}>
      <button className="nav-chip">🔥 0 ngày</button>
      {session?.profile?.role === 'teacher' && <a className="nav-chip" href="/teacher" onClick={(event) => { event.preventDefault(); go('/teacher'); }}>Bảng giáo viên</a>}
    </Header>
    <main className="home">
      <section className="welcome"><div><h1>Chào bạn nhỏ! 👋</h1><p>Cùng khám phá những điều thú vị trong thế giới Toán học nhé.</p></div><div className="mascot">🧮</div></section>
      <section className="stats">
        <div className="stat"><span className="stat-icon">⭐</span><div><strong>{progress.xp}</strong><span>Điểm hôm nay</span></div></div>
        <div className="stat"><span className="stat-icon">🏆</span><div><strong>{progress.lessons}</strong><span>Bài đã hoàn thành</span></div></div>
        <div className="stat"><span className="stat-icon">🎯</span><div><strong>15 phút</strong><span>Mục tiêu mỗi ngày</span></div></div>
      </section>
      <div className="home-grid">
        <section className="home-panel">
          {selectedAssignment ? <AssignedWorkView assignment={selectedAssignment} onBack={() => setSelectedAssignment(null)} api={api} /> : <>
            <div className="panel-heading"><div><h2>{selectedChapter ? `Chương ${selectedChapter.replace(/^Chapter/i, '')}` : 'Chọn chương học'}</h2><p>{selectedChapter ? `${chapterFiles.length} bài học trong chương` : 'Chọn một chương để xem các bài học'}</p></div>{selectedChapter && <button className="chapter-back" type="button" onClick={() => { setSelectedChapter(''); setChapterFiles([]); }}>← Tất cả chương</button>}</div>
            {error && <p className="message error">{error}</p>}
            {loadingChapters ? <p className="lesson-empty">Đang tải chương từ Supabase Storage...</p> : selectedChapter ? loadingFiles ? <p className="lesson-empty">Đang tải file bài học...</p> : chapterFiles.length ? <div className="lesson-grid">{chapterFiles.map((file) => <button className={`lesson ${['blue', 'yellow', 'green', 'pink'][chapterFiles.indexOf(file) % 4]}`} type="button" key={file.path} onClick={() => openStorageFile(file)}><small>{getFileType(file.name)} · {formatFileSize(file.size)}</small><h3>{file.name.split('/').pop()}</h3><p>{file.path.includes('/') ? file.path : `Chương ${selectedChapter.replace(/^Chapter/i, '')}`}</p><span className="lesson-art">📄</span><span className="lesson-completed" aria-label="Mở tài liệu">↗</span></button>)}</div> : <p className="lesson-empty">Chương này chưa có file bài học.</p> : chapters.length ? <div className="chapter-grid">{chapters.map((chapter, index) => <button className="chapter-card" type="button" key={chapter} onClick={() => chooseChapter(chapter)}><span className="chapter-card-icon">{['📘', '🧮', '✏️', '📐'][index % 4]}</span><span className="chapter-card-copy"><small>Supabase Storage</small><strong>Chương {chapter.replace(/^Chapter/i, '')}</strong><span>Mở danh sách bài học</span></span><span className="chapter-card-arrow" aria-hidden="true">›</span></button>)}</div> : <p className="lesson-empty">Chưa tìm thấy chương trong Supabase Storage.</p>}
          </>}
        </section>
        <aside>
          <section className="daily-card"><h2>Mục tiêu hôm nay</h2><p>Hoàn thành 5 câu hỏi để nhận thêm sao và giữ chuỗi học tập!</p><div className="daily-progress"><span style={{ width: `${Math.min(100, (progress.answered / 5) * 100)}%` }} /></div><small>{Math.min(5, progress.answered)}/5 câu hỏi</small></section>
          <section className="assigned-work-card"><div className="assigned-work-heading"><div><span>📚</span><h2>Bài tập cần làm</h2></div><b>{assignments.length}</b></div><p className="assigned-work-subtitle">Bài tập cô giao cho em</p>{assignments.length ? <div className="assigned-work-list">{assignments.map((item) => <button className={`assigned-work-item ${item.submission ? 'is-done' : ''}`} key={item.id} onClick={() => openAssignment(item)}><span className="assigned-work-icon">{item.submission ? '✅' : '📝'}</span><span className="assigned-work-content"><strong>{item.title}</strong><small>{item.submission ? `Đã làm · ${item.submission.score}/100 · Bấm để xem lại` : `${item.question_count || 0} câu · ${item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Vừa' : 'Dễ'}`}</small></span><span className="assigned-work-arrow">›</span></button>)}</div> : <div className="assigned-work-empty">Hiện chưa có bài tập cô giao. 🎉</div>}</section>
        </aside>
      </div>
    </main>
  </>;
}