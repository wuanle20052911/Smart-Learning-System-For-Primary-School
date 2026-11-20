import React from 'react';

const games = [
  {
    href: '/public/games/kiem-tra-so-chan-le.html',
    icon: '🚦',
    title: 'Trạm số chẵn, số lẻ',
    description: 'Nhìn chữ số tận cùng và chọn đúng nhóm cho mỗi số.'
  },
  {
    href: '/public/games/xep-so-vao-nha.html',
    icon: '🏠',
    title: 'Xếp số về đúng nhà',
    description: 'Phân loại nhanh các số vào nhà chẵn hoặc nhà lẻ.'
  },
  {
    href: '/public/games/mat-ma-chu-so.html',
    icon: '🔐',
    title: 'Mật mã chữ số cuối',
    description: 'Tìm chữ số tận cùng để mở cánh cửa bí mật.'
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
        <div><small>CHẶNG TIẾP THEO</small><h1>Cùng chơi để khám phá số chẵn, số lẻ!</h1></div>
      </div>
      <p className="lesson-game-select-intro">Mỗi trò chơi là một trang riêng. Hãy thử cả 3 trò để nhớ mẹo nhận biết qua chữ số tận cùng nhé.</p>
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
