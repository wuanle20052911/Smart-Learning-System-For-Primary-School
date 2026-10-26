import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toMeteorGameQuestions } from '../services/meteorGameQuestions.js';

export default function MeteorGamePage({ api, Header, Brand, readSession, go, logout }) {
  const iframeRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sendQuestionsToGame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'smart-learning:meteor-questions',
      questions
    }, window.location.origin);
  }, [questions]);

  useEffect(() => {
    let active = true;
    async function loadLearnedQuestions() {
      try {
        const completed = JSON.parse(localStorage.getItem('mathjoy-completed-lessons') || '[]');
        if (!Array.isArray(completed) || !completed.every((id) => typeof id === 'string')) {
          throw new Error('Danh sách bài học đã hoàn thành không hợp lệ.');
        }
        const { lessons = [] } = await api('/api/lessons/published');
        const learnedLessons = lessons.filter((lesson) => completed.includes(lesson.id));
        const groups = await Promise.all(learnedLessons.map(async (lesson) => {
          const { questions: lessonQuestions = [] } = await api(`/api/questions/lesson/${encodeURIComponent(lesson.id)}`);
          return { lessonTitle: lesson.title, questions: lessonQuestions };
        }));
        if (active) {
          setQuestions(toMeteorGameQuestions(groups));
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Không tải được câu hỏi từ bài đã học.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLearnedQuestions();
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    sendQuestionsToGame();
  }, [sendQuestionsToGame]);

  return <>
    <main className="meteor-game-page">
      {loading ? <div className="meteor-game-loading">Đang chuẩn bị câu hỏi từ bài học đã hoàn thành…</div> : <>
        <div className="meteor-game-toolbar">
          <span className={error ? 'is-error' : ''}>
            {error
              ? 'Không tải được câu hỏi bài học; game dùng bộ câu hỏi mẫu.'
              : questions.length
                ? `Đang dùng ${questions.length} câu từ bài học đã hoàn thành.`
                : 'Chưa có câu từ bài đã hoàn thành; game dùng bộ câu hỏi mẫu.'}
          </span>
          <button className="meteor-game-back" type="button" onClick={() => go('/learn')}>← Về trang học</button>
        </div>
        <iframe
          ref={iframeRef}
          className="meteor-game-frame"
          src="/meteor-game.html"
          title="Trò chơi Bắn Thiên Thạch"
          allow="autoplay"
          onLoad={sendQuestionsToGame}
        />
      </>}
    </main>
  </>;
}
