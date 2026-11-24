import React, { useState } from 'react';
import LessonGameSession from './LessonGameSession.jsx';

export default function LessonMiniGames({ lessonTitle, games, hasStory, onBack, onContinue }) {
  const [activeGame, setActiveGame] = useState(null);
  const backLabel = hasStory ? '← Xem lại truyện' : '← Quay lại bài học';
  return <section className="lesson-game-select" aria-label="Trò chơi của bài học">
    <header className="study-adventure-header">
      <div><span className="study-adventure-kicker">{hasStory ? 'CÂU CHUYỆN ĐÃ KẾT THÚC' : 'TRÒ CHƠI CỦA BÀI HỌC'}</span><h2>{lessonTitle}</h2></div>
      <button className="lesson-close" type="button" onClick={onBack}>{backLabel}</button>
    </header>
    <div className="lesson-game-select-content">
      {activeGame
        ? <LessonGameSession gameType={activeGame.gameType} onBack={() => setActiveGame(null)} />
        : <>
          <div className="lesson-game-banner">
            <div className="lesson-game-select-heading">
              <span aria-hidden="true">🎮</span>
              <div>
                <small>CHẶNG TIẾP THEO</small>
                <h1><span>Cùng chinh phục</span><strong>{lessonTitle}!</strong></h1>
              </div>
            </div>
            <p className="lesson-game-select-intro">Mỗi trò chơi là một chặng riêng. Hoàn thành các thử thách để ôn lại kiến thức của bài nhé.</p>
          </div>
          <div className="lesson-game-grid">
            {games.map((game, index) => {
              const content = <>
                <span className="lesson-game-icon" aria-hidden="true">{game.icon}</span>
                <small>TRÒ CHƠI {index + 1}</small>
                <strong>{game.title}</strong>
                <p>{game.description}</p>
                <span className="lesson-game-link">{game.gameType ? 'Bắt đầu chơi' : 'Bắt đầu chơi ↗'}</span>
              </>;
              return game.gameType
                ? <button className="lesson-game-card" type="button" key={game.slug} onClick={() => setActiveGame(game)}>
                  {content}
                </button>
                : <a className="lesson-game-card" href={game.href} target="_blank" rel="noopener noreferrer" key={game.slug}>
                  {content}
                </a>;
            })}
          </div>
          <div className="lesson-game-select-actions">
            <button className="adventure-secondary-button" type="button" onClick={onBack}>{backLabel}</button>
            <button className="adventure-primary-button" type="button" onClick={onContinue}>Vào bài học →</button>
          </div>
        </>}
    </div>
  </section>;
}
