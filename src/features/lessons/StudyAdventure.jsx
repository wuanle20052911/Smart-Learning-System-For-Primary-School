import React, { useState } from 'react';

function shuffledSequence(length, correctOrder) {
  const shuffled = Array.from({ length }, (_, index) => index).reverse();
  if (shuffled.every((value, index) => value === correctOrder[index])) {
    shuffled.push(shuffled.shift());
  }
  return shuffled;
}

function StoryCharacter({ name, role }) {
  const isExplainer = role === 'explainer';
  const species = isExplainer ? 'cáo' : 'thỏ';
  const outfit = isExplainer ? '#6276dc' : '#f2a64a';
  return <div className={`adventure-character adventure-character-${role}`}>
    <svg className="adventure-character-figure" viewBox="0 0 140 170" role="img" aria-label={`${name}, ${species} ${isExplainer ? 'giảng bài' : 'đặt câu hỏi'}`}>
      <ellipse cx="70" cy="160" rx="35" ry="6" fill="rgba(38,58,103,.14)" />
      {isExplainer && <>
        <path d="M90 112 Q119 103 124 122 Q128 139 105 145 L84 130 Z" fill="#ef9841" stroke="#293b62" strokeWidth="3" strokeLinejoin="round" />
        <path d="M108 116 Q124 120 119 132 Q115 139 104 137" fill="none" stroke="#fff1d2" strokeWidth="8" strokeLinecap="round" />
      </>}
      {!isExplainer && <>
        <path d="M49 51 Q30 32 39 10 Q44 1 55 15 L68 39 Z" fill="#fff7eb" stroke="#293b62" strokeWidth="3" />
        <path d="M48 34 Q40 20 44 14 Q48 12 55 29 Z" fill="#f2a4a8" />
        <path d="M77 39 L91 13 Q97 3 102 11 Q108 31 91 51 Z" fill="#fff7eb" stroke="#293b62" strokeWidth="3" />
        <path d="M84 33 L96 15 Q100 13 99 23 L90 39 Z" fill="#f2a4a8" />
      </>}
      <path d="M51 111 L43 145 M84 111 L92 145" fill="none" stroke="#293b62" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="41" cy="147" rx="10" ry="6" fill={isExplainer ? '#ef9841' : '#fff7eb'} stroke="#293b62" strokeWidth="2" />
      <ellipse cx="94" cy="147" rx="10" ry="6" fill={isExplainer ? '#ef9841' : '#fff7eb'} stroke="#293b62" strokeWidth="2" />
      <path d="M50 99 Q70 89 90 99 L96 132 Q70 143 44 132 Z" fill={outfit} stroke="#293b62" strokeWidth="3" strokeLinejoin="round" />
      <path d="M49 105 L34 121 M91 105 L106 120" fill="none" stroke="#293b62" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="32" cy="123" rx="7" ry="8" fill={isExplainer ? '#ef9841' : '#fff7eb'} stroke="#293b62" strokeWidth="2" />
      <ellipse cx="108" cy="122" rx="7" ry="8" fill={isExplainer ? '#ef9841' : '#fff7eb'} stroke="#293b62" strokeWidth="2" />
      {isExplainer
        ? <>
          <path d="M53 105 L70 118 L87 105" fill="none" stroke="#fff1d2" strokeWidth="5" strokeLinejoin="round" />
          <path d="M59 118 L70 126 L81 118" fill="none" stroke="#f2a64a" strokeWidth="4" strokeLinejoin="round" />
        </>
        : <path d="M58 106 Q70 116 82 106" fill="none" stroke="#fff1d2" strokeWidth="5" strokeLinecap="round" />}
      {isExplainer && <>
        <path d="M36 51 L29 23 Q28 18 33 21 L58 39 Z" fill="#ef9841" stroke="#293b62" strokeWidth="3" strokeLinejoin="round" />
        <path d="M104 51 L111 23 Q112 18 107 21 L82 39 Z" fill="#ef9841" stroke="#293b62" strokeWidth="3" strokeLinejoin="round" />
        <path d="M37 39 L33 28 L48 40 Z M103 39 L107 28 L92 40 Z" fill="#f6c0a0" />
      </>}
      <ellipse cx="70" cy="66" rx="38" ry="39" fill={isExplainer ? '#ef9841' : '#fff7eb'} stroke="#293b62" strokeWidth="3" />
      {isExplainer
        ? <path d="M48 70 Q70 58 92 70 Q88 93 70 97 Q52 93 48 70" fill="#fff1d2" />
        : <path d="M47 72 Q70 62 93 72 Q88 92 70 96 Q52 92 47 72" fill="#f7dfd1" />}
      <ellipse cx="57" cy="65" rx="3" ry="4" fill="#293b62" />
      <ellipse cx="83" cy="65" rx="3" ry="4" fill="#293b62" />
      <ellipse cx="48" cy="77" rx="6" ry="3.5" fill="#f49b9d" opacity=".8" />
      <ellipse cx="92" cy="77" rx="6" ry="3.5" fill="#f49b9d" opacity=".8" />
      <ellipse cx="70" cy="76" rx="4" ry="3" fill="#68445a" />
      {isExplainer
        ? <path d="M62 82 Q70 90 78 82" fill="none" stroke="#68445a" strokeWidth="2.5" strokeLinecap="round" />
        : <path d="M65 84 Q70 89 75 84" fill="none" stroke="#68445a" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
    <strong>{name}</strong>
    <small>{isExplainer ? 'Cáo giảng bài' : 'Thỏ đặt câu hỏi'}</small>
  </div>;
}

export default function StudyAdventure({ adventure, lessonTitle, onBack, onStudyActivity }) {
  const [stage, setStage] = useState('story');
  const [panelIndex, setPanelIndex] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [sequenceOrder, setSequenceOrder] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(null);
  const storyPanels = adventure.story.panels;
  const characters = {
    explainer: storyPanels.flatMap((panel) => panel.dialogue).find((line) => line.role === 'explainer')?.speaker,
    curious: storyPanels.flatMap((panel) => panel.dialogue).find((line) => line.role === 'curious')?.speaker
  };
  const challenges = adventure.game.challenges;
  const challenge = challenges[challengeIndex];
  const isSequence = adventure.game.type === 'sequence';
  const isTrueFalse = adventure.game.type === 'true-false';

  const beginGame = () => {
    setChallengeIndex(0);
    setScore(0);
    setFinalScore(null);
    setSelectedAnswer(null);
    setAnswered(false);
    if (isSequence) setSequenceOrder(shuffledSequence(challenge.items.length, challenge.correctOrder));
    setStage('game');
  };

  const submitAnswer = (correct) => {
    setWasCorrect(correct);
    setAnswered(true);
    if (correct) setScore((current) => current + 1);
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) return;
    submitAnswer(isTrueFalse
      ? selectedAnswer === challenge.correct
      : selectedAnswer === challenge.correctIndex);
  };

  const checkSequence = () => {
    submitAnswer(sequenceOrder.every((item, index) => item === challenge.correctOrder[index]));
  };

  const moveSequenceItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= sequenceOrder.length) return;
    setSequenceOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const continueGame = () => {
    if (challengeIndex + 1 >= challenges.length) {
      setFinalScore(score);
      setStage('result');
      onStudyActivity?.();
      return;
    }
    const nextIndex = challengeIndex + 1;
    setChallengeIndex(nextIndex);
    setSelectedAnswer(null);
    setAnswered(false);
    if (isSequence) {
      const nextChallenge = challenges[nextIndex];
      setSequenceOrder(shuffledSequence(nextChallenge.items.length, nextChallenge.correctOrder));
    }
  };

  return <section className="study-adventure">
    <header className="study-adventure-header">
      <div><span className="study-adventure-kicker">HÀNH TRÌNH HỌC TẬP</span><h2>{lessonTitle}</h2></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Về bài học</button>
    </header>

    {stage === 'story' && <div className="adventure-story">
      <div className="adventure-story-heading">
        <span aria-hidden="true">📖</span>
        <div><small>TRUYỆN PHIÊU LƯU KIẾN THỨC</small><h1>{adventure.story.title}</h1></div>
      </div>
      <article className={`adventure-panel adventure-panel-${panelIndex % 4}`}>
        <div className="adventure-panel-art">
          <div className="adventure-scene-icon" aria-hidden="true">{['🌿', '🧭', '🧮', '✨'][panelIndex % 4]}</div>
          <div className="adventure-character-pair" aria-label={`Nhân vật ${characters.explainer} và ${characters.curious}`}>
            <StoryCharacter name={characters.explainer} role="explainer" />
            <StoryCharacter name={characters.curious} role="curious" />
          </div>
        </div>
        <div className="adventure-panel-copy">
          <span>KHUNG {panelIndex + 1} / {storyPanels.length}</span>
          <h3>{storyPanels[panelIndex].caption}</h3>
          <p>{storyPanels[panelIndex].narration}</p>
          <div className="adventure-blackboard">
            <span>BẢNG KIẾN THỨC</span>
            <strong>{storyPanels[panelIndex].boardText}</strong>
          </div>
          <div className="adventure-dialogues" aria-label="Hội thoại nhân vật">
            {storyPanels[panelIndex].dialogue.map((line, index) => {
              return <div
                className={`adventure-speech-bubble ${line.role === 'explainer' ? 'is-guide' : 'is-curious'}`}
                key={`${line.speaker}-${index}`}
              >
                <strong>{line.speaker} · {line.role === 'explainer' ? 'giảng bài' : 'hỏi'}</strong>
                <span>{line.text}</span>
              </div>;
            })}
          </div>
        </div>
      </article>
      <div className="adventure-story-controls">
        <button type="button" className="adventure-secondary-button" onClick={() => setPanelIndex((index) => Math.max(0, index - 1))} disabled={panelIndex === 0}>← Khung trước</button>
        <div className="adventure-progress" aria-label={`Khung truyện ${panelIndex + 1} trên ${storyPanels.length}`}>
          {storyPanels.map((panel, index) => <span className={index === panelIndex ? 'is-current' : ''} key={`${panel.caption}-${index}`} />)}
        </div>
        <button type="button" className="adventure-primary-button" onClick={() => panelIndex + 1 === storyPanels.length ? setStage('preview') : setPanelIndex((index) => index + 1)}>
          {panelIndex + 1 === storyPanels.length ? 'Xem thử thách →' : 'Khung tiếp theo →'}
        </button>
      </div>
    </div>}

    {stage === 'preview' && <div className="adventure-preview">
      <div className="adventure-preview-art" aria-hidden="true">🎮</div>
      <span className="study-adventure-kicker">GIỚI THIỆU TRƯỚC KHI CHƠI · {adventure.game.typeLabel.toLocaleUpperCase('vi-VN')}</span>
      <h1>{adventure.game.title}</h1>
      <p className="adventure-preview-theme">Chủ đề: <strong>{lessonTitle}</strong></p>
      <p>{adventure.game.preview}</p>
      <div className="adventure-preview-rules"><strong>Cách chơi</strong><span>{adventure.game.description}</span></div>
      <div className="adventure-preview-actions">
        <button type="button" className="adventure-secondary-button" onClick={() => setStage('story')}>← Đọc lại truyện</button>
        <button type="button" className="adventure-primary-button" onClick={beginGame}>Chơi thử thách ngay →</button>
      </div>
    </div>}

    {stage === 'game' && <div className="adventure-game">
      <div className="adventure-game-topline">
        <span>{adventure.game.typeLabel}</span>
        <span>{challengeIndex + 1} / {challenges.length}</span>
      </div>
      <h1>{isTrueFalse ? challenge.statement : isSequence ? challenge.prompt : challenge.question}</h1>
      {isSequence ? <div className="adventure-sequence-list">
        {sequenceOrder.map((itemIndex, index) => <div className="adventure-sequence-item" key={`${challenge.items[itemIndex]}-${itemIndex}`}>
          <span className="adventure-sequence-number">{index + 1}</span><span>{challenge.items[itemIndex]}</span>
          <div className="adventure-sequence-controls">
            <button type="button" aria-label="Di chuyển lên" onClick={() => moveSequenceItem(index, -1)} disabled={answered || index === 0}>↑</button>
            <button type="button" aria-label="Di chuyển xuống" onClick={() => moveSequenceItem(index, 1)} disabled={answered || index === sequenceOrder.length - 1}>↓</button>
          </div>
        </div>)}
      </div> : <div className="adventure-answer-options">
        {(isTrueFalse ? [{ label: 'Đúng', value: true }, { label: 'Sai', value: false }] : challenge.options.map((label, index) => ({ label, value: index }))).map((option) => (
          <button
            type="button"
            className={selectedAnswer === option.value ? 'is-selected' : ''}
            key={String(option.value)}
            aria-pressed={selectedAnswer === option.value}
            onClick={() => !answered && setSelectedAnswer(option.value)}
            disabled={answered}
          >{option.label}</button>
        ))}
      </div>}
      {answered && <p className={`adventure-feedback ${wasCorrect ? 'is-correct' : 'is-wrong'}`} role="status">
        {wasCorrect ? 'Chính xác! ' : 'Mình cùng nhớ lại nhé. '}{challenge.explanation}
      </p>}
      <div className="adventure-game-actions">
        {!answered
          ? <button type="button" className="adventure-primary-button" onClick={isSequence ? checkSequence : checkAnswer} disabled={!isSequence && selectedAnswer === null}>Kiểm tra đáp án</button>
          : <button type="button" className="adventure-primary-button" onClick={continueGame}>{challengeIndex + 1 === challenges.length ? 'Xem kết quả →' : 'Thử thách tiếp →'}</button>}
      </div>
    </div>}

    {stage === 'result' && <div className="adventure-result">
      <div className="adventure-result-icon" aria-hidden="true">{finalScore === challenges.length ? '🏆' : '🌟'}</div>
      <span className="study-adventure-kicker">HÀNH TRÌNH HOÀN THÀNH</span>
      <h1>{finalScore === challenges.length ? 'Xuất sắc!' : 'Con đã hoàn thành thử thách!'}</h1>
      <strong className="adventure-result-score">{finalScore}/{challenges.length}</strong>
      <p>Con vừa ôn lại kiến thức trong bài <b>{lessonTitle}</b>.</p>
      <div className="adventure-preview-actions">
        <button type="button" className="adventure-secondary-button" onClick={onBack}>Về bài học</button>
        <button type="button" className="adventure-primary-button" onClick={() => setStage('mini-games')}>Chơi 3 game ôn bài →</button>
        <button type="button" className="adventure-primary-button" onClick={() => { setStage('story'); setPanelIndex(0); }}>Đọc truyện lần nữa</button>
      </div>
    </div>}

    {stage === 'mini-games' && <div className="adventure-minigames">
      <div className="adventure-story-heading">
        <span aria-hidden="true">🕹️</span>
        <div><small>TRÒ CHƠI ÔN TẬP</small><h1>Chọn thử thách tiếp theo</h1></div>
      </div>
      <p className="adventure-minigames-intro">Cùng luyện thêm kiến thức trong bài <b>{lessonTitle}</b>. Mỗi trò chơi sẽ mở ở một trang riêng.</p>
      <div className="adventure-minigame-grid">
        <a className="adventure-minigame-card" href="/public/games/thu-vien-3-buoc.html" target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">📚</span><small>TRÒ CHƠI 1</small><strong>Giải cứu thư viện</strong>
          <p>Tính số sách sau khi nhập thêm và cho mượn.</p><span className="adventure-minigame-link">Bắt đầu chơi ↗</span>
        </a>
        <a className="adventure-minigame-card" href="/public/games/duong-dua-phep-tinh.html" target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">🏁</span><small>TRÒ CHƠI 2</small><strong>Đường đua phép tính</strong>
          <p>Chọn phép tính đúng cho từng tình huống thực tế.</p><span className="adventure-minigame-link">Bắt đầu chơi ↗</span>
        </a>
        <a className="adventure-minigame-card" href="/public/games/xep-buoc-giai-toan.html" target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">🧩</span><small>TRÒ CHƠI 3</small><strong>Xếp bước giải toán</strong>
          <p>Sắp xếp các bước để tìm đáp số chính xác.</p><span className="adventure-minigame-link">Bắt đầu chơi ↗</span>
        </a>
      </div>
      <div className="adventure-preview-actions">
        <button type="button" className="adventure-secondary-button" onClick={() => setStage('result')}>← Về kết quả</button>
        <button type="button" className="adventure-primary-button" onClick={onBack}>Về bài học</button>
      </div>
    </div>}
  </section>;
}
