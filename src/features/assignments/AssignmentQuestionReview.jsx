import React from 'react';

function EditableQuestion({
  item,
  index,
  isSaved,
  onUpdate,
  onUpdateOption,
  onRemove,
  onSave
}) {
  return <article className="editable-question">
    <div className="editable-question-head"><b>Câu {index + 1} · Trắc nghiệm</b><button type="button" onClick={onRemove}>Xóa</button></div>
    <textarea value={item.question} onChange={(event) => onUpdate('question', event.target.value)} rows="2" />
    {item.options.map((option, optionIndex) => <label key={optionIndex}>
      <span>{String.fromCharCode(65 + optionIndex)}</span>
      <input value={option} onChange={(event) => onUpdateOption(optionIndex, event.target.value)} />
      <input className="answer-radio" type="radio" checked={item.answer === optionIndex} onChange={() => onUpdate('answer', optionIndex)} />
    </label>)}
    <input value={item.explanation || ''} onChange={(event) => onUpdate('explanation', event.target.value)} placeholder="Giải thích đáp án (không bắt buộc)" />
    <button className="secondary-studio" type="button" onClick={onSave} disabled={isSaved}>{isSaved ? '✓ Đã lưu ngân hàng' : '＋ Lưu vào ngân hàng câu hỏi'}</button>
  </article>;
}

function GeneratedCandidate({ item, busy, onKeep, onRegenerate, onDiscard }) {
  return <article className="generated-candidate">
    <div className="generated-candidate-head">
      <b>Câu trắc nghiệm mới</b>
    </div>
    <p className="generated-candidate-question">{item.question}</p>
    <ul className="generated-candidate-answers">
      {item.options.map((option, optionIndex) => <li className={item.answer === optionIndex ? 'correct' : ''} key={optionIndex}>
        {String.fromCharCode(65 + optionIndex)}. {option}{item.answer === optionIndex ? ' ✓' : ''}
      </li>)}
    </ul>
    {item.explanation && <p className="generated-candidate-explanation">{item.explanation}</p>}
    <div className="generated-candidate-actions">
      <button type="button" className="teacher-create" onClick={onKeep} disabled={busy}>＋ Đưa vào hàng chờ</button>
      <button type="button" className="secondary-studio" onClick={onRegenerate} disabled={busy}>↻ Tạo câu khác</button>
      <button type="button" className="candidate-discard" onClick={onDiscard} disabled={busy}>Bỏ câu</button>
    </div>
  </article>;
}

export default function AssignmentQuestionReview({
  title,
  classId,
  classes,
  dueAt,
  questions,
  generatedCandidates,
  savedQuestionIndexes,
  busy,
  published,
  onTitleChange,
  onClassChange,
  onDueAtChange,
  onUpdateQuestion,
  onUpdateOption,
  onUpdateMatchingPair,
  onUpdateMatchingAnswer,
  onRemoveQuestion,
  onKeepCandidate,
  onRegenerateCandidate,
  onDiscardCandidate,
  onSaveQuestion,
  onAddQuestion,
  onPublish
}) {
  return <section className="teacher-card studio-review">
    <div className="studio-review-head">
      <div className="studio-review-title"><h3>2. Kiểm tra và chỉnh sửa</h3><small>{questions.length ? `${questions.length} câu trong hàng chờ` : 'Hàng chờ chưa có câu'}</small></div>
      <div className="studio-assignment-fields">
        <label>Tên bài tập<input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Nhập tên bài tập" /></label>
        <label>Lớp được giao<select value={classId} onChange={(event) => onClassChange(event.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></label>
        <label className="assignment-deadline">Hạn nộp<input type="datetime-local" value={dueAt} onChange={(event) => onDueAtChange(event.target.value)} /><small>Để trống nếu không đặt hạn.</small></label>
      </div>
    </div>
    {generatedCandidates.length > 0 && <section className="generated-candidate-section">
      <div className="generated-candidate-section-head">
        <h4>Câu hỏi mới tạo</h4>
        <small>{generatedCandidates.length} câu đang chờ chọn</small>
      </div>
      <p>Giữ câu bạn ưng vào hàng chờ, hoặc tạo câu khác thay cho câu chưa phù hợp.</p>
      {generatedCandidates.map((item, index) => <GeneratedCandidate
        key={`${item.question}-${index}`}
        item={item}
        busy={busy}
        onKeep={() => onKeepCandidate(index)}
        onRegenerate={() => onRegenerateCandidate(index)}
        onDiscard={() => onDiscardCandidate(index)}
      />)}
    </section>}
    <div className="queue-section-head">
      <h4>Hàng chờ bài tập</h4>
      <small>{questions.length} câu đã chọn</small>
    </div>
    {questions.length ? questions.map((item, index) => <EditableQuestion
      key={index}
      item={item}
      index={index}
      isSaved={savedQuestionIndexes.includes(index)}
      onUpdate={(key, value) => onUpdateQuestion(index, key, value)}
      onUpdateOption={(optionIndex, value) => onUpdateOption(index, optionIndex, value)}
      onRemove={() => onRemoveQuestion(index)}
      onSave={() => onSaveQuestion(item, index)}
    />) : <div className="studio-empty">Chọn “Đưa vào hàng chờ” ở câu hỏi phía trên để thêm vào bài tập.</div>}
    <div className="studio-actions">
      <button className="secondary-studio" type="button" onClick={onAddQuestion}>+ Thêm câu hỏi</button>
      <button className="teacher-create" type="button" onClick={onPublish} disabled={busy || published}>{published ? '✓ Đã xuất bản' : 'Xuất bản cho cả lớp'}</button>
    </div>
  </section>;
}
