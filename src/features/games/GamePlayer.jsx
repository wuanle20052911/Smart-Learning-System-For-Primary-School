import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BLANK, FLASH_CARD_THEMES, GAME_BY_ID, shuffle, shuffleAway } from './gameCatalog.js';
import { isAnswerCorrect } from './gameAnswers.js';
import FlashCardThemePicker from './FlashCardThemePicker.jsx';
import './games.css';

const FEEDBACK_MS = 1100;

// Kéo-thả bằng chuột, và chạm-chọn-rồi-chạm-đặt cho màn hình cảm ứng.
const dragProps = (id, onPick) => ({
  draggable: true,
  onDragStart: (event) => { event.dataTransfer.setData('text/plain', String(id)); event.dataTransfer.effectAllowed = 'move'; onPick?.(id); }
});
const dropProps = (onDrop) => ({
  onDragOver: (event) => event.preventDefault(),
  onDrop: (event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id !== '') onDrop(id); }
});

function useLater() {
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (callback, delay = FEEDBACK_MS) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(callback, delay); };
}

function Progress({ current, total, extra }) {
  return <div className="gm-progress">
    <div className="gm-progress-bar"><i style={{ width: `${Math.round((current / Math.max(total, 1)) * 100)}%` }} /></div>
    <span>{current}/{total}</span>{extra}
  </div>;
}

function SubmitBar({ ready, remaining, onSubmit, label = 'Nộp bài', unit = 'thẻ chưa đặt' }) {
  return <div className="gm-submit-bar">
    <small>{ready ? 'Con đã xếp xong. Kiểm tra lại rồi bấm nộp nhé!' : `Còn ${remaining} ${unit}.`}</small>
    <button className="gm-primary" type="button" disabled={!ready} onClick={onSubmit}>{label}</button>
  </div>;
}

/* ---------- Trắc nghiệm, Đấu trường tính giờ ---------- */
function ChoiceCard({ question, onAnswer, locked, chosen, hidden = [] }) {
  return <div className="gm-choice-card">
    <h3 className="gm-question">{question.question}</h3>
    <div className={`gm-options count-${question.options.length}`}>
      {question.options.map((option, index) => {
        const state = locked ? index === Number(question.answer) ? 'is-right' : index === chosen ? 'is-wrong' : 'is-dim' : '';
        return <button type="button" key={index} className={`gm-option tone-${index} ${state}`} disabled={locked || hidden.includes(index)} style={hidden.includes(index) ? { visibility: 'hidden' } : undefined} onClick={() => onAnswer(index)}>
          <b>{String.fromCharCode(65 + index)}</b><span>{option}</span>
        </button>;
      })}
    </div>
  </div>;
}

function QuizPlayer({ questions, onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [chosen, setChosen] = useState(null);
  const later = useLater();
  const answer = (option) => {
    if (chosen !== null) return;
    const next = [...answers, option];
    setChosen(option);
    setAnswers(next);
    later(() => {
      if (index + 1 >= questions.length) onComplete(next);
      else { setIndex(index + 1); setChosen(null); }
    });
  };
  return <>
    <Progress current={index + (chosen !== null ? 1 : 0)} total={questions.length} />
    <ChoiceCard key={index} question={questions[index]} locked={chosen !== null} chosen={chosen} onAnswer={answer} />
  </>;
}

function patternHint(question) {
  const values = String(question || '').split(',').map((token) => {
    const value = token.trim().replace(/\s+/g, '');
    return value === '?' ? null : Number(value);
  });
  const differences = values.slice(1).map((value, index) => (
    value === null || values[index] === null ? null : value - values[index]
  )).filter((value) => value !== null);
  if (differences.length > 1 && differences.every((value) => value === differences[0])) {
    return 'So sánh hiệu giữa các số liền kề; mỗi bước đang tăng hoặc giảm cùng một lượng.';
  }
  const ratios = values.slice(1).map((value, index) => (
    value === null || values[index] === null || values[index] === 0 ? null : value / values[index]
  )).filter((value) => value !== null);
  if (ratios.length > 1 && ratios.every((value) => value === ratios[0])) {
    return 'Thử xem mỗi số có được nhân với cùng một số để ra số tiếp theo không.';
  }
  return 'Quan sát các số liền kề và tìm xem khoảng cách giữa chúng thay đổi theo quy luật nào.';
}

function DetectivePatternPlayer({ questions, onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [left, setLeft] = useState(25);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dialogMode, setDialogMode] = useState('');
  const [feedback, setFeedback] = useState('');
  const answerRef = useRef(null);
  const question = questions[index];
  const answer = (option) => {
    if (chosen !== null || paused) return;
    const next = [...answers, option];
    setChosen(option);
    setAnswers(next);
    const correct = option !== null && Number(option) === Number(question.answer);
    const bonus = correct && !hintUsed ? 5 : 0;
    setFeedback(`${option === null ? 'Hết giờ! ' : correct ? 'Chính xác! ' : 'Cùng xem lại nhé. '}${question.explanation || ''}${bonus ? ' Thưởng không dùng gợi ý: +5 điểm.' : ''}`);
    if (correct) setScore((value) => value + 100 + bonus);
    else setLives((value) => Math.max(0, value - 1));
  };
  answerRef.current = answer;
  useEffect(() => {
    if (paused || chosen !== null) return undefined;
    if (left <= 0) {
      answerRef.current(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, paused, chosen, index]);
  const moveNext = () => {
    if (chosen === null) return;
    if (index + 1 >= questions.length || lives === 0) {
      onComplete(answers);
      return;
    }
    setIndex((value) => value + 1);
    setChosen(null);
    setLeft(25);
    setHintUsed(false);
    setHintVisible(false);
    setFeedback('');
  };
  const restart = () => {
    setIndex(0);
    setAnswers([]);
    setChosen(null);
    setLeft(25);
    setLives(3);
    setScore(0);
    setHintUsed(false);
    setHintVisible(false);
    setFeedback('');
    setPaused(false);
    setDialogMode('');
  };
  const sequence = String(question.question || '').split(',').map((token) => token.trim());
  return <div className="gm-detective">
    <header className="gm-detective-hero">
      <div><small>GIẢI MÃ · QUAN SÁT · SUY LUẬN</small><h3>Thám tử tìm quy luật</h3></div>
      <img src="/public/img/conan.png" alt="" />
    </header>
    <Progress current={index + (chosen !== null ? 1 : 0)} total={questions.length} extra={<b className="gm-stars">⭐ {score} · ❤️ {lives}</b>} />
    <div className={`gm-detective-clock ${left <= 5 && chosen === null ? 'is-urgent' : ''}`} role="timer" aria-live="polite">⏱ {left} giây</div>
    <div className="gm-detective-sequence" aria-label={`Dãy số: ${sequence.join(', ')}`}>
      {sequence.map((token, tokenIndex) => <span key={tokenIndex} className={token === '?' ? 'is-missing' : ''}>
        {token === '?' ? '?' : token}
      </span>)}
    </div>
    <p className="gm-question">Số nào phù hợp với dấu hỏi?</p>
    <ChoiceCard question={{ ...question, question: 'Chọn đáp án' }} locked={chosen !== null} chosen={chosen} onAnswer={answer} />
    <p className={`gm-detective-feedback ${chosen === null ? '' : 'is-visible'}`} role="status" aria-live="polite">{feedback}</p>
    <div className="gm-detective-hint" aria-live="polite">
      {hintVisible && <p>{question.hint || patternHint(question.question)}</p>}
      <div>
        <button className="gm-secondary" type="button" disabled={hintUsed || chosen !== null || paused} onClick={() => { setHintUsed(true); setHintVisible(true); }}>💡 Mở gợi ý</button>
        <button className="gm-secondary" type="button" disabled={chosen !== null} onClick={() => { setPaused(true); setDialogMode('pause'); }}>⏸ Tạm dừng</button>
        <button className="gm-secondary" type="button" disabled={chosen !== null} onClick={() => { setPaused(true); setDialogMode('restart'); }}>↻ Chơi lại</button>
      </div>
    </div>
    <div className="gm-detective-next">
      <button className="gm-primary" type="button" disabled={chosen === null} onClick={moveNext}>
        {index === questions.length - 1 || lives === 0 ? 'Xem kết quả →' : 'Mật mã tiếp theo →'}
      </button>
    </div>
    {dialogMode && <div className="gm-detective-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="gm-detective-dialog-title">
        <h3 id="gm-detective-dialog-title">{dialogMode === 'pause' ? 'Tạm dừng giải mã' : 'Làm lại từ đầu?'}</h3>
        <p>{dialogMode === 'pause' ? 'Thời gian đã dừng. Tiếp tục khi con sẵn sàng.' : 'Tiến trình hiện tại sẽ được đặt lại để bắt đầu bộ mật mã mới.'}</p>
        <button className="gm-primary" type="button" onClick={dialogMode === 'pause' ? () => { setPaused(false); setDialogMode(''); } : restart}>
          {dialogMode === 'pause' ? 'Tiếp tục' : 'Bắt đầu lại'}
        </button>
        {dialogMode === 'restart' && <button className="gm-secondary" type="button" onClick={() => { setPaused(false); setDialogMode(''); }}>Tiếp tục chơi</button>}
      </section>
    </div>}
  </div>;
}

function GameshowPlayer({ questions, settings, onComplete }) {
  const limit = settings?.time_limit || 20;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [left, setLeft] = useState(limit);
  const [stars, setStars] = useState(0);
  const [lifelines, setLifelines] = useState({ half: true, time: true });
  const [hidden, setHidden] = useState([]);
  const later = useLater();
  const locked = chosen !== null;
  const question = questions[index];
  const finish = (option) => {
    const next = [...answers, option];
    setChosen(option === null ? -1 : option);
    setAnswers(next);
    if (option !== null && Number(option) === Number(question.answer)) setStars((value) => value + (left >= limit / 2 ? 2 : 1));
    later(() => {
      if (index + 1 >= questions.length) onComplete(next);
      else { setIndex(index + 1); setChosen(null); setLeft(limit); setHidden([]); }
    }, 1400);
  };
  useEffect(() => {
    if (locked) return undefined;
    if (left <= 0) { finish(null); return undefined; }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, locked]);
  const useHalf = () => {
    const wrong = shuffle(question.options.map((_, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== Number(question.answer)));
    setHidden(wrong.slice(0, Math.floor(question.options.length / 2)));
    setLifelines((value) => ({ ...value, half: false }));
  };
  const useTime = () => { setLeft((value) => value + 15); setLifelines((value) => ({ ...value, time: false })); };
  return <div className="gm-gameshow">
    <Progress current={index + (locked ? 1 : 0)} total={questions.length} extra={<b className="gm-stars">★ {stars}</b>} />
    <div className="gm-gameshow-top">
      <div className={`gm-clock ${left <= 5 && !locked ? 'is-urgent' : ''}`} aria-live="polite"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" /><circle className="gm-clock-fill" cx="18" cy="18" r="15" style={{ strokeDashoffset: `${94.2 * (1 - Math.min(left, limit) / limit)}` }} /></svg><span>{Math.max(left, 0)}</span></div>
      <div className="gm-lifelines">
        <button type="button" disabled={!lifelines.half || locked || question.options.length < 3} onClick={useHalf}>50 : 50</button>
        <button type="button" disabled={!lifelines.time || locked} onClick={useTime}>+15 giây</button>
      </div>
    </div>
    {chosen === -1 && <p className="gm-flash is-wrong">⏰ Hết giờ rồi!</p>}
    <ChoiceCard key={index} question={question} locked={locked} chosen={chosen} hidden={hidden} onAnswer={finish} />
    <p className="gm-note">Trả lời đúng khi còn hơn nửa thời gian được 2 sao, chậm hơn được 1 sao.</p>
  </div>;
}

/* ---------- Mở hộp bí mật ---------- */
function OpenBoxPlayer({ questions, onComplete }) {
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(undefined));
  const [open, setOpen] = useState(null);
  const [chosen, setChosen] = useState(null);
  const later = useLater();
  const done = answers.filter((value) => value !== undefined).length;
  const answer = (option) => {
    if (chosen !== null) return;
    setChosen(option);
    const next = answers.map((value, index) => index === open ? option : value);
    setAnswers(next);
    later(() => {
      setOpen(null); setChosen(null);
      if (next.every((value) => value !== undefined)) onComplete(next);
    });
  };
  return <>
    <Progress current={done} total={questions.length} />
    <div className="gm-boxes">
      {questions.map((question, index) => {
        const opened = answers[index] !== undefined;
        const right = opened && isAnswerCorrect(question, answers[index]);
        return <button type="button" key={index} className={`gm-box ${opened ? right ? 'is-right' : 'is-wrong' : ''}`} disabled={opened} onClick={() => setOpen(index)} aria-label={`Hộp số ${index + 1}`}>
          <span className="gm-box-lid" /><b>{opened ? right ? '✓' : '✗' : index + 1}</b>
        </button>;
      })}
    </div>
    {open !== null && <div className="gm-modal" role="dialog" aria-modal="true" aria-label={`Câu hỏi trong hộp ${open + 1}`}>
      <div className="gm-modal-card"><span className="gm-kicker">Hộp số {open + 1}</span>
        <ChoiceCard question={questions[open]} locked={chosen !== null} chosen={chosen} onAnswer={answer} />
        {chosen === null && <button type="button" className="gm-link" onClick={() => setOpen(null)}>Đóng hộp, chọn hộp khác</button>}
      </div>
    </div>}
  </>;
}

/* ---------- Lật thẻ ghép cặp ---------- */
function MatchUpPlayer({ questions, onComplete }) {
  const tiles = useMemo(() => shuffleAway(questions.flatMap((question, pairIndex) => [
    { id: `question-${pairIndex}`, pairIndex, side: 'question', text: question.question },
    { id: `answer-${pairIndex}`, pairIndex, side: 'answer', text: question.answer }
  ])), [questions]);
  const [revealed, setRevealed] = useState([]);
  const [matched, setMatched] = useState([]);
  const [locked, setLocked] = useState(false);
  const later = useLater();
  const flip = (tile) => {
    if (locked || matched.includes(tile.pairIndex) || revealed.some((item) => item.id === tile.id)) return;
    const nextRevealed = [...revealed, tile];
    setRevealed(nextRevealed);
    if (nextRevealed.length < 2) return;
    setLocked(true);
    const [first, second] = nextRevealed;
    if (first.pairIndex === second.pairIndex && first.side !== second.side) {
      const nextMatched = [...matched, tile.pairIndex];
      setMatched(nextMatched);
      setRevealed([]);
      later(() => {
        setLocked(false);
        if (nextMatched.length === questions.length) onComplete(questions.map((question) => question.answer));
      }, 500);
    } else {
      later(() => { setRevealed([]); setLocked(false); });
    }
  };
  const isRevealed = (tile) => revealed.some((item) => item.id === tile.id);
  const isMatched = (tile) => matched.includes(tile.pairIndex);
  return <>
    <Progress current={matched.length} total={questions.length} />
    <p className="gm-instruction">Lật hai thẻ mỗi lượt. Hãy ghi nhớ vị trí và tìm thẻ phép tính khớp với đáp án.</p>
    <div className="gm-flip-grid">
      {tiles.map((tile, index) => {
        const faceUp = isRevealed(tile) || isMatched(tile);
        return <button
          type="button"
          key={tile.id}
          className={`gm-flip-card ${faceUp ? 'is-revealed' : ''} ${isMatched(tile) ? 'is-matched' : ''}`}
          onClick={() => flip(tile)}
          disabled={locked || isMatched(tile)}
          aria-pressed={faceUp}
          aria-label={faceUp ? `Thẻ ${index + 1}: ${tile.text}` : `Lật thẻ ${index + 1}`}
        >{faceUp ? tile.text : '?'}</button>;
      })}
    </div>
    <div className="gm-flip-score" aria-live="polite">
      Đã ghép {matched.length}/{questions.length} cặp
      {locked && matched.length < questions.length ? ' · Hãy ghi nhớ vị trí thẻ' : ''}
    </div>
  </>;
}

/* ---------- Phân nhóm ---------- */
function GroupSortPlayer({ questions, onComplete }) {
  const groups = questions[0]?.options || [];
  const order = useMemo(() => shuffle(questions.map((_, index) => index)), [questions]);
  const [placed, setPlaced] = useState(() => Array(questions.length).fill(undefined));
  const [picked, setPicked] = useState(null);
  const pile = order.filter((index) => placed[index] === undefined);
  const drop = (groupIndex, id) => { setPlaced((current) => current.map((value, index) => index === Number(id) ? groupIndex : value)); setPicked(null); };
  return <>
    <p className="gm-instruction">Kéo từng thẻ vào đúng nhóm (hoặc chạm thẻ rồi chạm nhóm). Chạm thẻ trong nhóm để lấy ra.</p>
    <div className="gm-pile" {...dropProps((id) => setPlaced((current) => current.map((value, index) => index === Number(id) ? undefined : value)))}>
      {pile.map((index) => <button type="button" key={index} className={`gm-tile tone-2 ${picked === String(index) ? 'is-picked' : ''}`} onClick={() => setPicked(picked === String(index) ? null : String(index))} {...dragProps(index)}>{questions[index].question}</button>)}
      {!pile.length && <small>Đã xếp hết thẻ ✓</small>}
    </div>
    <div className={`gm-groups count-${groups.length}`}>
      {groups.map((group, groupIndex) => <div key={group} className={`gm-group tone-${groupIndex} ${picked !== null ? 'is-ready' : ''}`} role="button" tabIndex={0} aria-label={`Nhóm ${group}`} onClick={() => picked !== null && drop(groupIndex, picked)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && picked !== null) { event.preventDefault(); drop(groupIndex, picked); } }} {...dropProps((id) => drop(groupIndex, id))}>
        <h4>{group}</h4>
        <div>{order.filter((index) => placed[index] === groupIndex).map((index) => <button type="button" key={index} className={`gm-tile tone-${groupIndex}`} {...dragProps(index)} onClick={(event) => { event.stopPropagation(); setPlaced((current) => current.map((value, itemIndex) => itemIndex === index ? undefined : value)); }}>{questions[index].question}</button>)}</div>
      </div>)}
    </div>
    <SubmitBar ready={!pile.length} remaining={pile.length} onSubmit={() => onComplete(placed)} />
  </>;
}

/* ---------- Sắp xếp thứ tự ---------- */
function OrderingPlayer({ questions, onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [order, setOrder] = useState(() => shuffleAway(questions[0].options.map((_, position) => position)));
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(null);
  const later = useLater();
  const question = questions[index];
  const move = (from, to) => {
    if (from === to || checked !== null) return;
    setOrder((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
    setPicked(null);
  };
  const confirm = () => {
    const next = [...answers, order];
    setAnswers(next);
    setChecked(isAnswerCorrect(question, order));
    later(() => {
      if (index + 1 >= questions.length) { onComplete(next); return; }
      setIndex(index + 1);
      setOrder(shuffleAway(questions[index + 1].options.map((_, position) => position)));
      setChecked(null);
    }, 1500);
  };
  return <>
    <Progress current={index + (checked !== null ? 1 : 0)} total={questions.length} />
    <h3 className="gm-question">{question.question}</h3>
    <p className="gm-instruction">Kéo thẻ sang vị trí mới, hoặc chạm một thẻ rồi chạm vị trí muốn đổi chỗ.</p>
    <div className={`gm-order ${checked === true ? 'is-right' : checked === false ? 'is-wrong' : ''}`}>
      {order.map((optionIndex, position) => <button type="button" key={optionIndex} className={`gm-tile tone-3 ${picked === position ? 'is-picked' : ''}`}
        onClick={() => picked === null ? setPicked(position) : move(picked, position)}
        {...dragProps(position)} {...dropProps((from) => move(Number(from), position))}>
        {question.options[optionIndex]}
      </button>)}
    </div>
    {checked === false && <p className="gm-flash is-wrong">Thứ tự đúng: {question.options.join(' → ')}</p>}
    {checked === true && <p className="gm-flash is-right">Chính xác! 🎉</p>}
    <div className="gm-submit-bar"><span /><button className="gm-primary" type="button" disabled={checked !== null} onClick={confirm}>Chốt thứ tự</button></div>
  </>;
}

/* ---------- Điền vào chỗ trống ---------- */
function ClozePlayer({ questions, onComplete }) {
  const chips = useMemo(() => shuffle(questions.flatMap((question, questionIndex) => [
    ...(question.answer || []).map((text, blank) => ({ id: `a${questionIndex}-${blank}`, text })),
    ...(question.options || []).map((text, extra) => ({ id: `d${questionIndex}-${extra}`, text }))
  ])), [questions]);
  const [filled, setFilled] = useState(() => questions.map((question) => Array((question.answer || []).length).fill(null)));
  const [picked, setPicked] = useState(null);
  const used = filled.flat().filter(Boolean);
  const chipText = (id) => chips.find((chip) => chip.id === id)?.text;
  const put = (questionIndex, blank, chipId) => {
    setFilled((current) => current.map((row, rowIndex) => row.map((value, cell) => {
      if (rowIndex === questionIndex && cell === blank) return chipId;
      return value === chipId ? null : value;
    })));
    setPicked(null);
  };
  const clear = (questionIndex, blank) => setFilled((current) => current.map((row, rowIndex) => row.map((value, cell) => rowIndex === questionIndex && cell === blank ? null : value)));
  const totalBlanks = filled.flat().length;
  return <>
    <p className="gm-instruction">Kéo thẻ vào chỗ trống (hoặc chạm thẻ rồi chạm chỗ trống). Có thể có thẻ thừa.</p>
    <div className="gm-bank is-sticky" {...dropProps((id) => setFilled((current) => current.map((row) => row.map((value) => value === id ? null : value))))}>
      {chips.filter((chip) => !used.includes(chip.id)).map((chip) => <button type="button" key={chip.id} className={`gm-tile tone-1 ${picked === chip.id ? 'is-picked' : ''}`} onClick={() => setPicked(picked === chip.id ? null : chip.id)} {...dragProps(chip.id)}>{chip.text}</button>)}
    </div>
    <ol className="gm-cloze">
      {questions.map((question, questionIndex) => {
        const parts = question.question.split(BLANK);
        return <li key={questionIndex}>{parts.map((part, partIndex) => <React.Fragment key={partIndex}>
          {part}
          {partIndex < parts.length - 1 && <button type="button" className={`gm-blank ${filled[questionIndex][partIndex] ? 'is-filled' : ''} ${picked ? 'is-ready' : ''}`}
            onClick={() => picked ? put(questionIndex, partIndex, picked) : clear(questionIndex, partIndex)}
            {...dropProps((id) => put(questionIndex, partIndex, id))}
            aria-label={`Chỗ trống ${partIndex + 1} của câu ${questionIndex + 1}`}>
            {filled[questionIndex][partIndex] ? <span {...dragProps(filled[questionIndex][partIndex])}>{chipText(filled[questionIndex][partIndex])}</span> : ' '}
          </button>}
        </React.Fragment>)}</li>;
      })}
    </ol>
    <SubmitBar ready={used.length === totalBlanks} remaining={totalBlanks - used.length} unit="chỗ trống chưa điền" onSubmit={() => onComplete(filled.map((row) => row.map(chipText)))} />
  </>;
}

/* ---------- Tìm đáp án ---------- */
function FindMatchPlayer({ questions, onComplete }) {
  const order = useMemo(() => shuffle(questions.map((_, index) => index)), [questions]);
  const tiles = useMemo(() => shuffle(questions.map((question, index) => ({ index, text: question.answer }))), [questions]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(undefined));
  const [flash, setFlash] = useState(null);
  const later = useLater();
  const current = order[step];
  const gone = order.slice(0, step);
  const tap = (tile) => {
    if (flash) return;
    const next = answers.map((value, index) => index === current ? tile.text : value);
    setAnswers(next);
    setFlash({ tile: tile.index, right: tile.index === current });
    later(() => {
      setFlash(null);
      if (step + 1 >= order.length) onComplete(next);
      else setStep(step + 1);
    }, 900);
  };
  return <>
    <Progress current={step + (flash ? 1 : 0)} total={questions.length} />
    <div className="gm-find-prompt"><span className="gm-kicker">Tìm đáp án cho</span><strong>{questions[current].question}</strong></div>
    <div className="gm-find-grid">
      {tiles.map((tile) => {
        const isGone = gone.includes(tile.index);
        const state = flash && tile.index === flash.tile ? flash.right ? 'is-right' : 'is-wrong' : flash && !flash.right && tile.index === current ? 'is-hint' : '';
        return <button type="button" key={tile.index} className={`gm-find-tile ${isGone ? 'is-gone' : ''} ${state}`} disabled={isGone || Boolean(flash)} onClick={() => tap(tile)}>{tile.text}</button>;
      })}
    </div>
  </>;
}

/* ---------- Xếp chữ số ---------- */
function DigitArrangePlayer({ questions, onComplete }) {
  const deal = (question) => shuffleAway([...String(question.answer)].map((char, index) => ({ id: index, char })));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [tiles, setTiles] = useState(() => deal(questions[0]));
  const [slots, setSlots] = useState(() => Array(String(questions[0].answer).length).fill(null));
  const [checked, setChecked] = useState(null);
  const later = useLater();
  const question = questions[index];
  const placed = slots.filter((value) => value !== null);
  const put = (tileId, slotIndex) => {
    if (checked !== null) return;
    setSlots((current) => {
      const next = current.map((value) => value === tileId ? null : value);
      const target = slotIndex ?? next.indexOf(null);
      if (target >= 0) next[target] = tileId;
      return next;
    });
  };
  const charOf = (id) => tiles.find((tile) => tile.id === id)?.char ?? '';
  const confirm = () => {
    const value = slots.map(charOf).join('');
    const next = [...answers, value];
    setAnswers(next);
    setChecked(isAnswerCorrect(question, value));
    later(() => {
      if (index + 1 >= questions.length) { onComplete(next); return; }
      const upcoming = questions[index + 1];
      setIndex(index + 1); setTiles(deal(upcoming)); setSlots(Array(String(upcoming.answer).length).fill(null)); setChecked(null);
    }, 1500);
  };
  return <>
    <Progress current={index + (checked !== null ? 1 : 0)} total={questions.length} />
    <h3 className="gm-question">{question.question}</h3>
    <div className={`gm-digit-slots ${checked === true ? 'is-right' : checked === false ? 'is-wrong' : ''}`}>
      {slots.map((tileId, slotIndex) => <button type="button" key={slotIndex} className={`gm-digit-slot ${tileId !== null ? 'is-filled' : ''}`}
        onClick={() => tileId !== null && checked === null && setSlots((current) => current.map((value, cell) => cell === slotIndex ? null : value))}
        {...dropProps((id) => put(Number(id), slotIndex))} aria-label={`Vị trí ${slotIndex + 1}`}>
        {tileId !== null ? <span {...dragProps(tileId)}>{charOf(tileId)}</span> : ''}
      </button>)}
    </div>
    <div className="gm-digit-tiles">
      {tiles.filter((tile) => !placed.includes(tile.id)).map((tile) => <button type="button" key={tile.id} className="gm-digit-tile" onClick={() => put(tile.id)} {...dragProps(tile.id)}>{tile.char}</button>)}
    </div>
    {checked === false && <p className="gm-flash is-wrong">Đáp án đúng: {question.answer}</p>}
    {checked === true && <p className="gm-flash is-right">Giỏi quá! 🎉</p>}
    <div className="gm-submit-bar"><small>Chạm thẻ để đặt vào ô trống tiếp theo, chạm ô để gỡ ra.</small><button className="gm-primary" type="button" disabled={placed.length < slots.length || checked !== null} onClick={confirm}>Chốt số</button></div>
  </>;
}

function FlashCardsPlayer({ questions, settings, onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [remembered, setRemembered] = useState(null);
  const later = useLater();
  const question = questions[index];
  const theme = FLASH_CARD_THEMES.some((item) => item.id === settings?.theme) ? settings.theme : 'garden';

  const rateCard = (didRemember) => {
    if (remembered !== null) return;
    const answer = didRemember ? question.answer : 'Cần ôn thêm';
    const next = [...answers, answer];
    setAnswers(next);
    setRemembered(didRemember);
    later(() => {
      if (index + 1 >= questions.length) {
        onComplete(next);
        return;
      }
      setIndex(index + 1);
      setFlipped(false);
      setRemembered(null);
    }, 650);
  };

  return <div className={`gm-flashcards gm-flashcards-${theme}`}>
    <Progress current={index + (remembered !== null ? 1 : 0)} total={questions.length} extra={<span className="gm-flash-theme-label">{FLASH_CARD_THEMES.find((item) => item.id === theme)?.emoji} {FLASH_CARD_THEMES.find((item) => item.id === theme)?.name}</span>} />
    <button
      type="button"
      className={`gm-flashcard ${flipped ? 'is-flipped' : ''}`}
      onClick={() => setFlipped((value) => !value)}
      aria-pressed={flipped}
      aria-label={flipped ? `Mặt sau: ${question.answer}. Chạm để lật lại.` : `Mặt trước: ${question.question}. Chạm để xem đáp án.`}
    >
      <span className="gm-flashcard-inner">
        <span className="gm-flashcard-face gm-flashcard-front">
          <small>MẶT TRƯỚC · THẺ {index + 1}</small>
          <strong>{question.question}</strong>
          <em>Chạm thẻ để lật ↻</em>
        </span>
        <span className="gm-flashcard-face gm-flashcard-back">
          <small>ĐÁP ÁN</small>
          <strong>{question.answer}</strong>
          <em>Con đã nhớ chưa?</em>
        </span>
      </span>
    </button>
    {flipped && <div className="gm-flashcard-actions" aria-live="polite">
      {remembered === null
        ? <>
          <button type="button" className="gm-flashcard-review" onClick={() => rateCard(false)}>↻ Cần ôn thêm</button>
          <button type="button" className="gm-flashcard-known" onClick={() => rateCard(true)}>✓ Con đã nhớ</button>
        </>
        : <p>{remembered ? 'Giỏi lắm, mình đã nhớ thẻ này!' : 'Không sao, thẻ này sẽ cần ôn thêm nhé.'}</p>}
    </div>}
  </div>;
}

const PLAYERS = {
  quiz: QuizPlayer,
  'compare-numbers': QuizPlayer,
  'decode-place-value': QuizPlayer,
  'detective-pattern': DetectivePatternPlayer,
  gameshow: GameshowPlayer,
  'open-box': OpenBoxPlayer,
  'match-up': MatchUpPlayer,
  'group-sort': GroupSortPlayer,
  ordering: OrderingPlayer,
  'sort-numbers': OrderingPlayer,
  cloze: ClozePlayer,
  'find-match': FindMatchPlayer,
  'digit-arrange': DigitArrangePlayer,
  'flash-cards': FlashCardsPlayer
};

export default function GamePlayer({ gameType, questions, settings, onComplete }) {
  const Player = PLAYERS[gameType];
  const [started, setStarted] = useState(false);
  const [theme, setTheme] = useState(FLASH_CARD_THEMES.some((item) => item.id === settings?.theme) ? settings.theme : 'garden');
  const game = GAME_BY_ID[gameType];
  if (!Player || !questions?.length) return <p className="gm-note">Trò chơi này chưa có nội dung.</p>;
  if (!started) {
    return <div className="gm-start">
      <span className="gm-start-badge">{game?.name}</span>
      <p>{game?.description}</p>
      <small>{questions.length} {game?.itemLabel}{gameType === 'gameshow' ? ` · ${settings?.time_limit || 20} giây mỗi câu` : ''}</small>
      {gameType === 'flash-cards' && <div className="gm-start-themes">
        <strong>Chọn chủ đề yêu thích</strong>
        <FlashCardThemePicker value={theme} onChange={setTheme} />
      </div>}
      <button className="gm-primary gm-start-button" type="button" onClick={() => setStarted(true)}>▶ Bắt đầu chơi</button>
    </div>;
  }
  return <div className={`gm-stage gm-stage-${gameType}`}><Player questions={questions} settings={{ ...settings, theme }} onComplete={onComplete} /></div>;
}
