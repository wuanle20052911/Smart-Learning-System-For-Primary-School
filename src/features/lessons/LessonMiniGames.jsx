import React from 'react';

const games = [
  {
    href: '/public/games/sap-xep-so-tang-dan.html',
    icon: '🪨',
    title: 'Đường đua sắp xếp',
    description: 'Đưa các số từ bé đến lớn để hoàn thành chặng đua.'
  },
  {
    href: '/public/games/so-sanh-so.html',
    icon: '⚖️',
    title: 'Ai lớn hơn?',
    description: 'So sánh các số có nhiều chữ số bằng dấu >, < hoặc =.'
  },
  {
    href: '/public/games/giai-ma-hang-so.html',
    icon: '🔎',
    title: 'Giải mã hàng số',
    description: 'Khám phá giá trị của chữ số và cấu tạo số đến 100 000.'
  }
];

export default function LessonMiniGames({ lessonTitle, onBack, onContinue }) {
  return <section className="lesson-game-select" aria-label="Trò chơi tiếp theo sau câu chuyện">
    <header className="study-adventure-header">
      <div><span className="study-adventure-kicker">CÂU CHUYỆN ĐÃ KẾT THÚC</span><h2>{lessonTitle}</h2></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Xem lại truyện</button>
    </header>
    <div className="lesson-game-select-content">
      <div className="lesson-game-select-heading">
        <span aria-hidden="true">🎮</span>
        <div><small>CHẶNG TIẾP THEO</small><h1>Cùng chinh phục các số đến 100 000!</h1></div>
      </div>
      <p className="lesson-game-select-intro">Mỗi trò chơi là một trang riêng. Sắp xếp, so sánh và giải mã các số để hoàn thành thử thách nhé.</p>
      <div className="lesson-game-grid">
        {games.map((game, index) => <a
          className="lesson-game-card"
          href={game.href}
          target="_blank"
          rel="noopener noreferrer"
          key={game.href}
        >
          <span className="lesson-game-icon" aria-hidden="true">{game.icon}</span>
          <small>TRÒ CHƠI {index + 1}</small>
          <strong>{game.title}</strong>
          <p>{game.description}</p>
          <span className="lesson-game-link">Bắt đầu chơi ↗</span>
        </a>)}
      </div>
      <div className="lesson-game-select-actions">
        <button className="adventure-secondary-button" type="button" onClick={onBack}>← Xem lại truyện</button>
        <button className="adventure-primary-button" type="button" onClick={onContinue}>Vào bài học →</button>
      </div>
    </div>
  </section>;
}
