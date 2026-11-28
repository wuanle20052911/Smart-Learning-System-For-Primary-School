import React, { useMemo, useState } from 'react';
import GamePlayer from '../games/GamePlayer.jsx';
import GameResult from '../games/GameResult.jsx';
import { GAME_BY_ID } from '../games/gameCatalog.js';
import { isAnswerCorrect } from '../games/gameAnswers.js';

const CHOICE_GAMES = new Set(['gameshow', 'open-box']);

export default function LessonGameSession({ gameType, onBack }) {
  const game = GAME_BY_ID[gameType];
  const questions = useMemo(() => game?.sample().map((question) => ({
    ...question,
    type: CHOICE_GAMES.has(gameType) ? 'multiple-choice' : 'fill-blank'
  })) || [], [game, gameType]);
  const [answers, setAnswers] = useState(null);
  const [round, setRound] = useState(0);
  if (!game || !questions.length) return <p className="gm-note">Trò chơi này chưa có nội dung.</p>;

  const correct = answers ? questions.filter((question, index) => isAnswerCorrect(question, answers[index])).length : 0;
  return <section className="gm-view lesson-game-session">
    <header className="gm-view-head">
      <div><span className="gm-kicker">TRÒ CHƠI SAU BÀI HỌC</span><h2>{game.name}</h2></div>
      <button className="gm-back" type="button" onClick={onBack}>← Danh sách trò chơi</button>
    </header>
    {answers
      ? <GameResult questions={questions} answers={answers} correct={correct} total={questions.length} score={Math.round((correct / questions.length) * 100)}>
        <div className="lesson-game-select-actions">
          <button className="adventure-secondary-button" type="button" onClick={() => { setAnswers(null); setRound((value) => value + 1); }}>Chơi lại</button>
          <button className="adventure-primary-button" type="button" onClick={onBack}>Chọn trò khác</button>
        </div>
      </GameResult>
      : <GamePlayer
        key={`${gameType}-${round}`}
        gameType={gameType}
        questions={questions}
        settings={{ time_limit: 20, theme: 'garden' }}
        onComplete={setAnswers}
      />}
  </section>;
}
