import React, { useEffect, useState } from 'react';
import { BLANK, GAME_BY_ID, GAME_TEMPLATES } from './gameCatalog.js';
import GameThumb from './GameThumb.jsx';
import GamePlayer from './GamePlayer.jsx';
import GameResult from './GameResult.jsx';
import { isAnswerCorrect } from './gameAnswers.js';
import './games.css';

const CHOICE_GAMES = ['quiz', 'open-box', 'gameshow'];
const PAIR_GAMES = ['match-up', 'find-match'];

// Chuyển dữ liệu mẫu sang dạng giáo viên chỉnh sửa (điền chỗ trống viết bằng [ngoặc vuông]).
function toDraft(gameType, items) {
  if (gameType === 'cloze') {
    return items.map((item) => {
      const answers = [...(item.answer || [])];
      return { source: item.question.split(BLANK).reduce((text, part, index) => index === 0 ? part : `${text}[${answers[index - 1] ?? ''}]${part}`, ''), extras: (item.options || []).join(', ') };
    });
  }
  if (gameType === 'group-sort') return items.map((item) => ({ question: item.question, answer: item.answer }));
  return items.map((item) => ({ ...item, options: item.options ? [...item.options] : undefined }));
}

function emptyItem(gameType, groups) {
  if (CHOICE_GAMES.includes(gameType)) return { question: '', options: ['', '', '', ''], answer: 0 };
  if (PAIR_GAMES.includes(gameType)) return { question: '', answer: '' };
  if (gameType === 'group-sort') return { question: '', answer: 0 };
  if (gameType === 'ordering') return { question: 'Xếp các số theo thứ tự từ bé đến lớn', options: ['', '', ''] };
  if (gameType === 'cloze') return { source: '', extras: '' };
  return { question: '', answer: '' };
}

const splitList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

// Dữ liệu gửi lên server; cũng dùng cho chế độ chơi thử (cần có `type` để chấm).
function toPayload(gameType, items, groups) {
  return items.map((item) => {
    if (CHOICE_GAMES.includes(gameType)) return { type: 'multiple-choice', question: item.question.trim(), options: item.options.map((option) => option.trim()), answer: item.answer, explanation: item.explanation || '' };
    if (gameType === 'group-sort') return { type: 'multiple-choice', question: item.question.trim(), options: groups.map((group) => group.trim()), answer: Number(item.answer) };
    if (gameType === 'ordering') return { type: 'ordering', question: item.question.trim(), options: item.options.map((option) => option.trim()), answer: item.options.map((_, index) => index) };
    if (gameType === 'cloze') {
      const answer = [...item.source.matchAll(/\[([^\]]*)\]/g)].map((match) => match[1].trim());
      return { type: 'cloze', question: item.source.replace(/\[[^\]]*\]/g, BLANK).trim(), answer, options: splitList(item.extras) };
    }
    return { type: 'fill-blank', question: item.question.trim(), answer: gameType === 'digit-arrange' ? item.answer.replace(/\s+/g, '') : item.answer.trim(), options: [] };
  });
}

function findProblem(gameType, payload, groups) {
  const min = PAIR_GAMES.includes(gameType) ? 3 : gameType === 'group-sort' ? 4 : 1;
  if (payload.length < min) return `Trò chơi này cần ít nhất ${min} ${GAME_BY_ID[gameType].itemLabel}.`;
  if (gameType === 'group-sort' && (groups.length < 2 || groups.some((group) => !group.trim()))) return 'Hãy đặt tên cho tất cả các nhóm (2–4 nhóm).';
  for (const [index, item] of payload.entries()) {
    const label = `Mục ${index + 1}`;
    if (!item.question) return `${label}: chưa nhập nội dung.`;
    if (item.type === 'multiple-choice' && gameType !== 'group-sort' && item.options.some((option) => !option)) return `${label}: còn lựa chọn để trống.`;
    if (item.type === 'ordering' && (item.options.length < 3 || item.options.some((option) => !option))) return `${label}: cần ít nhất 3 thẻ, không để trống.`;
    if (item.type === 'cloze' && (!item.answer.length || item.answer.some((value) => !value))) return `${label}: hãy đặt đáp án trong [ngoặc vuông], ví dụ 1 tạ = [100] kg.`;
    if (item.type === 'fill-blank' && !item.answer) return `${label}: chưa nhập đáp án.`;
    if (gameType === 'digit-arrange' && item.answer.length < 2) return `${label}: đáp án cần ít nhất 2 kí tự.`;
  }
  if (PAIR_GAMES.includes(gameType) && new Set(payload.map((item) => item.answer.toLocaleLowerCase('vi-VN'))).size !== payload.length) return 'Các đáp án ghép cặp không được trùng nhau.';
  return '';
}

function ChoiceEditor({ item, onChange }) {
  const setOption = (index, value) => onChange({ ...item, options: item.options.map((option, current) => current === index ? value : option) });
  return <>
    <input className="gm-input" value={item.question} placeholder="Câu hỏi, ví dụ: 7 × 8 = ?" onChange={(event) => onChange({ ...item, question: event.target.value })} />
    <div className="gm-option-editor">
      {item.options.map((option, index) => <label key={index} className={item.answer === index ? 'is-answer' : ''}>
        <input type="radio" checked={item.answer === index} onChange={() => onChange({ ...item, answer: index })} aria-label={`Đáp án đúng là lựa chọn ${String.fromCharCode(65 + index)}`} />
        <b>{String.fromCharCode(65 + index)}</b>
        <input className="gm-input" value={option} placeholder={index === item.answer ? 'Đáp án đúng' : 'Đáp án sai'} onChange={(event) => setOption(index, event.target.value)} />
        {item.options.length > 2 && <button type="button" className="gm-icon-button" aria-label="Xoá lựa chọn" onClick={() => onChange({ ...item, options: item.options.filter((_, current) => current !== index), answer: item.answer === index ? 0 : item.answer > index ? item.answer - 1 : item.answer })}>×</button>}
      </label>)}
      {item.options.length < 4 && <button type="button" className="gm-link" onClick={() => onChange({ ...item, options: [...item.options, ''] })}>＋ Thêm lựa chọn</button>}
    </div>
    <input className="gm-input is-soft" value={item.explanation || ''} placeholder="Giải thích (không bắt buộc) – hiện khi học sinh xem lại bài" onChange={(event) => onChange({ ...item, explanation: event.target.value })} />
  </>;
}

function ItemEditor({ gameType, item, groups, onChange }) {
  if (CHOICE_GAMES.includes(gameType)) return <ChoiceEditor item={item} onChange={onChange} />;
  if (PAIR_GAMES.includes(gameType)) {
    return <div className="gm-pair-editor">
      <input className="gm-input" value={item.question} placeholder={gameType === 'match-up' ? 'Vế trái, ví dụ: 1 tấn' : 'Câu hỏi, ví dụ: 36 : 4'} onChange={(event) => onChange({ ...item, question: event.target.value })} />
      <span aria-hidden="true">↔</span>
      <input className="gm-input" value={item.answer} placeholder={gameType === 'match-up' ? 'Vế phải, ví dụ: 1 000 kg' : 'Đáp án, ví dụ: 9'} onChange={(event) => onChange({ ...item, answer: event.target.value })} />
    </div>;
  }
  if (gameType === 'group-sort') {
    return <div className="gm-pair-editor">
      <input className="gm-input" value={item.question} placeholder="Nội dung thẻ, ví dụ: 1 234" onChange={(event) => onChange({ ...item, question: event.target.value })} />
      <span aria-hidden="true">→</span>
      <select className="gm-input" value={item.answer} onChange={(event) => onChange({ ...item, answer: Number(event.target.value) })}>
        {groups.map((group, index) => <option key={index} value={index}>{group || `Nhóm ${index + 1}`}</option>)}
      </select>
    </div>;
  }
  if (gameType === 'ordering') {
    const setCard = (index, value) => onChange({ ...item, options: item.options.map((option, current) => current === index ? value : option) });
    return <>
      <input className="gm-input" value={item.question} placeholder="Yêu cầu, ví dụ: Xếp theo thứ tự từ bé đến lớn" onChange={(event) => onChange({ ...item, question: event.target.value })} />
      <p className="gm-help">Nhập các thẻ <b>theo đúng thứ tự</b>. Học sinh sẽ thấy chúng bị xáo trộn.</p>
      <div className="gm-order-editor">
        {item.options.map((option, index) => <label key={index}><small>{index + 1}</small>
          <input className="gm-input" value={option} onChange={(event) => setCard(index, event.target.value)} />
          {item.options.length > 3 && <button type="button" className="gm-icon-button" aria-label="Xoá thẻ" onClick={() => onChange({ ...item, options: item.options.filter((_, current) => current !== index) })}>×</button>}
        </label>)}
        {item.options.length < 8 && <button type="button" className="gm-link" onClick={() => onChange({ ...item, options: [...item.options, ''] })}>＋ Thêm thẻ</button>}
      </div>
    </>;
  }
  if (gameType === 'cloze') {
    return <>
      <textarea className="gm-input" rows={2} value={item.source} placeholder="Ví dụ: 3 tạ 5 kg = [305] kg" onChange={(event) => onChange({ ...item, source: event.target.value })} />
      <input className="gm-input is-soft" value={item.extras} placeholder="Thẻ gây nhiễu, cách nhau bằng dấu phẩy (không bắt buộc), ví dụ: 35, 350" onChange={(event) => onChange({ ...item, extras: event.target.value })} />
    </>;
  }
  return <div className="gm-pair-editor">
    <input className="gm-input" value={item.question} placeholder="Yêu cầu, ví dụ: Lập số lớn nhất từ 3, 0, 7, 5" onChange={(event) => onChange({ ...item, question: event.target.value })} />
    <span aria-hidden="true">=</span>
    <input className="gm-input" value={item.answer} placeholder="Đáp án, ví dụ: 7530" onChange={(event) => onChange({ ...item, answer: event.target.value })} />
  </div>;
}

function TemplatePicker({ onPick }) {
  return <section className="gm-studio">
    <div className="gm-studio-intro">
      <span className="gm-kicker">BÀI TẬP TRÒ CHƠI</span>
      <h2>Chọn một mẫu trò chơi</h2>
      <p>Thầy/cô tự soạn câu hỏi và đáp án; học sinh chơi ở nhà và hệ thống tự chấm điểm.</p>
    </div>
    <div className="gm-template-grid">
      {GAME_TEMPLATES.map((game) => <button type="button" className="gm-template" key={game.id} onClick={() => onPick(game.id)}>
        <span className="gm-template-art"><GameThumb type={game.id} /></span>
        <span className="gm-template-text"><strong>{game.name}</strong><small>{game.description}</small><em>Gợi ý: {game.hint}</em></span>
      </button>)}
    </div>
  </section>;
}

export default function GameAssignmentStudio({ api, onMessage }) {
  const [gameType, setGameType] = useState('');
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState(['', '']);
  const [timeLimit, setTimeLimit] = useState(20);
  const [title, setTitle] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    api('/api/catalog/classes').then((data) => setClasses(data.classes || [])).catch((error) => onMessage(`Không thể tải danh sách lớp: ${error.message}`));
  }, []);

  const pick = (type) => {
    const sample = GAME_BY_ID[type].sample();
    setGameType(type);
    setItems(toDraft(type, sample));
    setGroups(type === 'group-sort' ? [...sample[0].options] : ['', '']);
    setTitle(GAME_BY_ID[type].name);
    setProblem('');
  };
  if (!gameType) return <TemplatePicker onPick={pick} />;

  const game = GAME_BY_ID[gameType];
  const payload = toPayload(gameType, items, groups);
  const check = () => { const found = findProblem(gameType, payload, groups); setProblem(found); return !found; };
  const updateItem = (index, next) => { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? next : item)); setProblem(''); };
  const moveItem = (index, step) => setItems((current) => {
    const next = [...current]; const target = index + step;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const setGroup = (index, value) => setGroups((current) => current.map((group, groupIndex) => groupIndex === index ? value : group));
  const removeGroup = (index) => {
    setGroups((current) => current.filter((_, groupIndex) => groupIndex !== index));
    setItems((current) => current.map((item) => ({ ...item, answer: item.answer === index ? 0 : item.answer > index ? item.answer - 1 : item.answer })));
  };

  const publish = async () => {
    if (!check()) return;
    if (title.trim().length < 2) { setProblem('Hãy đặt tên cho bài tập.'); return; }
    if (!classId) { setProblem('Hãy chọn lớp được giao bài.'); return; }
    if (dueAt && new Date(dueAt).getTime() <= Date.now()) { setProblem('Hạn nộp phải ở thời điểm trong tương lai.'); return; }
    setBusy(true);
    try {
      await api('/api/assignments', { method: 'POST', body: JSON.stringify({
        title: title.trim(),
        description: `Bài tập trò chơi “${game.name}” do giáo viên soạn.`,
        game_type: gameType,
        game_settings: gameType === 'gameshow' ? { time_limit: Number(timeLimit) } : {},
        class_id: classId,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        published: true,
        questions: payload
      }) });
      onMessage(`Đã giao bài tập trò chơi “${title.trim()}” cho lớp.`);
      setGameType('');
      setItems([]);
      setTitle('');
      setDueAt('');
    } catch (error) {
      setProblem(error.message || 'Không thể giao bài tập.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="gm-studio">
    <div className="gm-editor-head">
      <button type="button" className="gm-back" onClick={() => { if (window.confirm('Đổi mẫu trò chơi? Nội dung đang soạn sẽ bị xoá.')) setGameType(''); }}>← Đổi mẫu</button>
      <span className="gm-template-art is-small"><GameThumb type={gameType} /></span>
      <div><span className="gm-kicker">Mẫu trò chơi</span><h2>{game.name}</h2><small>{game.description}</small></div>
    </div>

    <div className="gm-editor-grid">
      <div className="gm-editor-main">
        {gameType === 'group-sort' && <div className="gm-panel">
          <h3>Các nhóm</h3>
          <div className="gm-group-editor">
            {groups.map((group, index) => <label key={index}><input className="gm-input" value={group} placeholder={`Tên nhóm ${index + 1}, ví dụ: Chia hết cho 5`} onChange={(event) => setGroup(index, event.target.value)} />
              {groups.length > 2 && <button type="button" className="gm-icon-button" aria-label="Xoá nhóm" onClick={() => removeGroup(index)}>×</button>}</label>)}
            {groups.length < 4 && <button type="button" className="gm-link" onClick={() => setGroups((current) => [...current, ''])}>＋ Thêm nhóm</button>}
          </div>
        </div>}

        <div className="gm-panel">
          <div className="gm-panel-head">
            <h3>Nội dung ({items.length} {game.itemLabel})</h3>
            <button type="button" className="gm-link" onClick={() => { if (window.confirm('Xoá toàn bộ nội dung ví dụ để soạn mới?')) setItems([emptyItem(gameType)]); }}>Xoá hết, soạn mới</button>
          </div>
          {gameType === 'cloze' && <p className="gm-help">Viết câu và đặt đáp án trong <b>[ngoặc vuông]</b>. Mỗi cặp ngoặc thành một chỗ trống. Ví dụ: <code>2 giờ = [120] phút</code></p>}
          {gameType === 'digit-arrange' && <p className="gm-help">Học sinh nhận các thẻ là từng kí tự của đáp án (đã xáo trộn) và xếp lại cho đúng.</p>}
          <ol className="gm-item-list">
            {items.map((item, index) => <li className="gm-item" key={index}>
              <div className="gm-item-tools">
                <b>{index + 1}</b>
                <button type="button" className="gm-icon-button" aria-label="Chuyển lên" disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                <button type="button" className="gm-icon-button" aria-label="Chuyển xuống" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
                <button type="button" className="gm-icon-button is-danger" aria-label="Xoá mục" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>🗑</button>
              </div>
              <div className="gm-item-body"><ItemEditor gameType={gameType} item={item} groups={groups} onChange={(next) => updateItem(index, next)} /></div>
            </li>)}
          </ol>
          {items.length < 40 && <button type="button" className="gm-add" onClick={() => setItems((current) => [...current, emptyItem(gameType)])}>＋ Thêm {game.itemLabel}</button>}
        </div>
      </div>

      <aside className="gm-panel gm-publish">
        <h3>Giao bài</h3>
        <label>Tên bài tập<input className="gm-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ôn đổi đơn vị khối lượng" /></label>
        <label>Lớp<select className="gm-input" value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">— Chọn lớp —</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.grade ? ` · ${item.grade}` : ''}</option>)}
        </select></label>
        <label>Hạn nộp (không bắt buộc)<input className="gm-input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        {gameType === 'gameshow' && <label>Thời gian mỗi câu (giây)<input className="gm-input" type="number" min={10} max={120} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} /></label>}
        {problem && <p className="gm-error" role="alert">{problem}</p>}
        <button type="button" className="gm-secondary" onClick={() => { if (check()) setPreview({ answers: null }); }}>▶ Chơi thử</button>
        <button type="button" className="gm-primary" disabled={busy} onClick={publish}>{busy ? 'Đang giao…' : 'Giao cho lớp'}</button>
      </aside>
    </div>

    {preview && <div className="gm-modal" role="dialog" aria-modal="true" aria-label="Chơi thử">
      <div className="gm-modal-card is-wide">
        <div className="gm-panel-head"><span className="gm-kicker">Chơi thử – kết quả không được lưu</span><button type="button" className="gm-icon-button" aria-label="Đóng" onClick={() => setPreview(null)}>×</button></div>
        {preview.answers
          ? (() => {
            const correct = payload.filter((question, index) => isAnswerCorrect(question, preview.answers[index])).length;
            return <GameResult questions={payload} answers={preview.answers} correct={correct} total={payload.length} score={Math.round((correct / payload.length) * 100)}>
              <button type="button" className="gm-secondary" onClick={() => setPreview({ answers: null, round: (preview.round || 0) + 1 })}>Chơi lại</button>
            </GameResult>;
          })()
          : <GamePlayer key={preview.round || 0} gameType={gameType} questions={payload} settings={{ time_limit: Number(timeLimit) || 20 }} onComplete={(answers) => setPreview((current) => ({ ...current, answers }))} />}
      </div>
    </div>}
  </section>;
}
