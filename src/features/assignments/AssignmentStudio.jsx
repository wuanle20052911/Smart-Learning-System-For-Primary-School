import React, { useEffect, useState } from 'react';
import { extractLearningText } from '../../services/learningMaterials.js';

export function AssignmentStudio({ onMessage, api }) {
  const sampleQuestions = [
    { type: 'multiple-choice', question: 'Phân số nào bé hơn 1?', options: ['5/3', '3/5', '7/4', '9/2'], answer: 1, explanation: 'Tử số nhỏ hơn mẫu số nên 3/5 bé hơn 1.' },
    { type: 'multiple-choice', question: 'Kết quả của 2/5 + 1/5 là gì?', options: ['1/5', '2/5', '3/5', '4/5'], answer: 2, explanation: 'Cộng hai tử số và giữ nguyên mẫu số: 2/5 + 1/5 = 3/5.' },
    { type: 'true-false', question: 'Mọi phân số có tử số nhỏ hơn mẫu số đều bé hơn 1.', options: ['Đúng', 'Sai'], answer: 0, explanation: 'Đây là tính chất cơ bản của phân số.' }
  ];
  const [material, setMaterial] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [storageProgress, setStorageProgress] = useState({ done: 0, total: 0 });
  const [storageLoading, setStorageLoading] = useState(false);
  const [title, setTitle] = useState('Ôn tập Phân số - Phiếu 1');
  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [savedQuestionIndexes, setSavedQuestionIndexes] = useState([]);
  useEffect(() => { api('/api/catalog/classes').then((data) => setClasses(data.classes || [])).catch((error) => onMessage(`Không thể tải danh sách lớp: ${error.message}`)); }, []);
  const updateQuestion = (index, key, value) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateOption = (qIndex, optionIndex, value) => setQuestions((items) => items.map((item, index) => index === qIndex ? { ...item, options: item.options.map((option, current) => current === optionIndex ? value : option) } : item));
  const generate = async () => {
    if (!material.trim()) { onMessage('Hãy nhập nội dung hoặc đưa tài liệu trước khi tạo câu hỏi.'); return; }
    setBusy(true);
    try {
      const systemPrompt = 'Bạn là giáo viên tiểu học. Chỉ trả về JSON array. Mỗi câu gồm type, question, options, correctIndex là số nguyên chỉ đáp án đúng bắt đầu từ 0, explanation. Dùng type multiple-choice hoặc true-false.';
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({ systemPrompt, userPrompt: `Tài liệu từ các nguồn đã chọn:\n${material}\nChỉ tạo câu hỏi dựa trên tài liệu trên. Tạo 5 câu hỏi trắc nghiệm tiếng Việt, chính xác, phù hợp học sinh tiểu học.` }) });
      const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
      const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
      const generated = (Array.isArray(parsed) ? parsed : parsed.questions || []).map((item) => ({ ...item, answer: Number.isInteger(item.answer) ? item.answer : Number(item.correctIndex) || 0 })).filter((item) => item.question && Array.isArray(item.options));
      if (!generated.length) throw new Error('AI không trả về câu hỏi hợp lệ.');
      setQuestions(generated);
      onMessage('AI đã tạo câu hỏi. Hãy kiểm tra và chỉnh sửa trước khi xuất bản.');
    } catch (error) {
      onMessage(`AI local chưa tạo được câu hỏi: ${error.message || 'Lỗi không xác định.'} Bạn có thể dùng nút "Dùng dữ liệu mẫu" để thử giao diện.`);
    } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!questions.length) { onMessage('Hãy tạo câu hỏi trước khi xuất bản.'); return; }
    if (!title.trim()) { onMessage('Hãy nhập tên bài tập trước khi xuất bản.'); return; }
    if (!classId) { onMessage('Hãy chọn lớp được giao bài tập trước khi xuất bản.'); return; }
    setBusy(true);
    try {
      await api('/api/assignments', { method: 'POST', body: JSON.stringify({ title, description: 'Bài tập được giáo viên kiểm tra từ tài liệu.', difficulty: 'medium', published: true, class_id: classId || null, questions: questions.map((item) => ({ type: item.type || 'multiple-choice', question: item.question, options: item.options || [], answer: item.answer, explanation: item.explanation || '', points: 1 })) }) });
      setPublished(true); onMessage('Đã xuất bản bài tập cho cả lớp.');
    } catch (error) { onMessage(`Không thể xuất bản bài tập: ${error.message}`); }
    finally { setBusy(false); }
  };
  const saveToQuestionBank = async (question, index) => {
    try {
      await api('/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          type: question.type || 'multiple-choice',
          question: question.question,
          options: question.options || [],
          answer: question.answer,
          explanation: question.explanation || '',
          points: 1
        })
      });
      setSavedQuestionIndexes((items) => [...new Set([...items, index])]);
      onMessage(`Đã lưu câu ${index + 1} vào ngân hàng câu hỏi.`);
    } catch (error) {
      onMessage(`Không thể lưu câu hỏi: ${error.message}`);
    }
  };
  const readFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const text = await extractLearningText(file);
      if (!text.trim()) throw new Error('File không có nội dung văn bản để AI đọc.');
      setMaterial(text.trim());
      setMaterialName(file.name);
      onMessage(`Đã đọc tài liệu ${file.name}.`);
    } catch (error) {
      event.target.value = ''; setMaterialName(''); onMessage(`Không đọc được tài liệu: ${error.message}`); return;
    }
  };
  const loadStorageMaterials = async () => {
    setStorageLoading(true);
    setStorageProgress({ done: 0, total: 0 });
    try {
      const bucketNames = ['Math4', 'Chapter1'];
      const bucketResults = await Promise.all(bucketNames.map(async (bucket) => {
        const result = await api(`/api/lessons/storage-files?bucket=${encodeURIComponent(bucket)}`);
        return (result.files || []).map((file) => ({ ...file, bucket }));
      }));
      const files = bucketResults.flat();
      if (!files.length) throw new Error('Không tìm thấy file PDF, DOCX, TXT, Markdown, CSV hoặc JSON trong hai bucket.');
      setStorageProgress({ done: 0, total: files.length });
      const documents = new Array(files.length).fill('');
      const failures = [];
      let nextIndex = 0;
      let completed = 0;
      const readNext = async () => {
        while (nextIndex < files.length) {
          const index = nextIndex;
          nextIndex += 1;
          const file = files[index];
          try {
            const signed = await api(`/api/lessons/storage-file-url?bucket=${encodeURIComponent(file.bucket)}&path=${encodeURIComponent(file.path)}`);
            const response = await fetch(signed.url);
            if (!response.ok) throw new Error('Tải file thất bại.');
            const localFile = new File([await response.blob()], file.name.split('/').pop());
            const text = await extractLearningText(localFile);
            if (!text.trim()) throw new Error('Không trích xuất được chữ.');
            documents[index] = `Nguồn: ${file.bucket}/${file.path}\n${text.trim()}`;
          } catch (error) {
            failures.push(`${file.bucket}/${file.path}: ${error.message}`);
          } finally {
            completed += 1;
            setStorageProgress({ done: completed, total: files.length });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, () => readNext()));
      const loadedDocuments = documents.filter(Boolean);
      if (!loadedDocuments.length) throw new Error(failures[0] || 'Không đọc được nội dung file nào trong Storage.');
      setMaterial(loadedDocuments.join('\n\n---\n\n'));
      setMaterialName(`${loadedDocuments.length}/${files.length} file từ Math4 và Chapter1`);
      onMessage(`Đã nạp nội dung từ ${loadedDocuments.length}/${files.length} file Storage.${failures.length ? ` Bỏ qua ${failures.length} file không đọc được.` : ''}`);
    } catch (error) {
      onMessage(`Không thể nạp dữ liệu Storage: ${error.message}`);
    } finally {
      setStorageLoading(false);
    }
  };
  return <section className="assignment-studio"><div className="studio-intro"><div><span className="panel-kicker">TẠO BÀI TẬP CÙNG AI LOCAL</span><h2>Từ tài liệu đến bài tập cho cả lớp</h2><p>Đang sử dụng Ollama trên máy local, không gửi tài liệu ra dịch vụ bên ngoài.</p></div><span className="studio-steps">1 Tài liệu　→　2 AI local　→　3 Kiểm tra　→　4 Xuất bản</span></div><div className="studio-grid"><section className="teacher-card studio-source"><h3>1. Thêm tài liệu</h3><label className="material-upload"><span>📄</span><b>{materialName || 'Chọn tài liệu PDF hoặc Word'}</b><small>Hỗ trợ .pdf, .docx, .txt, .md</small><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={readFile} /></label><textarea value={material} onChange={(event) => setMaterial(event.target.value)} rows="9" placeholder="Hoặc dán nội dung bài học tại đây..." /><button className="teacher-create" onClick={generate} disabled={busy}>{busy ? 'AI local đang tạo...' : '✦ Tạo câu hỏi bằng AI local'}</button><button className="secondary-studio sample-button" type="button" onClick={() => { setQuestions(sampleQuestions); onMessage('Đã nạp dữ liệu mẫu.'); }}>Dùng dữ liệu mẫu</button></section><section className="teacher-card studio-review"><div className="studio-review-head"><div><h3>2. Kiểm tra và chỉnh sửa</h3><small>{questions.length ? `${questions.length} câu hỏi đã tạo` : 'Chưa có câu hỏi'}</small></div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên bài tập" /><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp được giao</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></div>{questions.length ? questions.map((item, index) => <article className="editable-question" key={index}><div className="editable-question-head"><b>Câu {index + 1}</b><button type="button" onClick={() => setQuestions((items) => items.filter((_, current) => current !== index))}>Xóa</button></div><textarea value={item.question} onChange={(event) => updateQuestion(index, 'question', event.target.value)} rows="2" />{(item.options || []).map((option, optionIndex) => <label key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} /><input className="answer-radio" type="radio" checked={item.answer === optionIndex} onChange={() => updateQuestion(index, 'answer', optionIndex)} /></label>)}<input value={item.explanation || ''} onChange={(event) => updateQuestion(index, 'explanation', event.target.value)} placeholder="Giải thích đáp án (không bắt buộc)" /><button className="secondary-studio" type="button" onClick={() => saveToQuestionBank(item, index)} disabled={savedQuestionIndexes.includes(index)}>{savedQuestionIndexes.includes(index) ? '✓ Đã lưu ngân hàng' : '＋ Lưu vào ngân hàng câu hỏi'}</button></article>) : <div className="studio-empty">Câu hỏi AI tạo ra sẽ xuất hiện ở đây để giáo viên kiểm tra.</div>}<div className="studio-actions"><button className="secondary-studio" type="button" onClick={() => setQuestions((items) => [...items, { ...sampleQuestions[0], question: 'Câu hỏi mới của giáo viên?' }])}>+ Thêm câu hỏi</button><button className="teacher-create" type="button" onClick={publish} disabled={busy || published}>{published ? '✓ Đã xuất bản' : 'Xuất bản cho cả lớp'}</button></div></section></div></section>;
}

export function TeacherQuestionBank({ api, onMessage }) {
   const [questions, setQuestions] = useState([]);
   const [busy, setBusy] = useState(true);
   const load = () => {
     setBusy(true);
     api('/api/questions')
       .then((data) => setQuestions(data.questions || []))
       .catch((error) => onMessage(`Không thể tải ngân hàng câu hỏi: ${error.message}`))
       .finally(() => setBusy(false));
   };
   useEffect(() => { load(); }, []);
   const remove = async (id) => {
     try {
       await api(`/api/questions/${id}`, { method: 'DELETE' });
       setQuestions((items) => items.filter((item) => item.id !== id));
       onMessage('Đã xóa câu hỏi khỏi ngân hàng.');
     } catch (error) {
       onMessage(`Không thể xóa câu hỏi: ${error.message}`);
     }
   };
   return <section className="teacher-card student-list-panel"><div className="student-list-head"><div><span className="panel-kicker">TÁI SỬ DỤNG CÂU HỎI</span><h2>Ngân hàng câu hỏi</h2><p>Các câu hỏi giáo viên đã lưu để dùng lại cho nhiều bài tập.</p></div><button className="secondary-studio" type="button" onClick={load}>↻ Làm mới</button></div>{busy ? <p className="student-list-empty">Đang tải...</p> : questions.length ? <div className="submission-list">{questions.map((item) => <article className="submission-row" key={item.id}><span><strong>{item.question}</strong><small>{item.type} · Lưu ngày {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></span><button className="secondary-studio" type="button" onClick={() => remove(item.id)}>Xóa</button></article>)}</div> : <p className="student-list-empty">Chưa có câu hỏi. Hãy lưu câu hỏi sau khi AI tạo và chỉnh sửa.</p>}</section>;
}

export function TeacherClassManagement({ classes, onMessage, onRefresh }) {
  return <section className="teacher-card student-list-panel"><div className="student-list-head"><div><span className="panel-kicker">LỚP HỌC ĐƯỢC PHÂN CÔNG</span><h2>Danh sách lớp</h2><p>Quản lý nhà trường là người tạo lớp và chỉ định giáo viên.</p></div></div><div className="student-list-table" style={{ marginTop: 18 }}><div className="student-list-summary"><b>{classes.length}</b><span>lớp đang quản lý</span></div>{classes.length ? classes.map((item) => <article className="student-list-row" key={item.id}><span className="student-number">•</span><div><strong>{item.name} · {item.grade}</strong><small>{item.assigned_teacher_name || 'Chưa chỉ định giáo viên'}</small></div><time>{new Date(item.created_at).toLocaleDateString('vi-VN')}</time></article>) : <p className="student-list-empty">Chưa có lớp học nào.</p>}</div></section>;
}

export function TeacherStudents({ classes, onMessage, api }) {
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (!classId && classes[0]?.id) setClassId(classes[0].id);
  }, [classId, classes]);
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    setBusy(true);
    api(`/api/catalog/classes/${classId}/students`)
      .then((data) => setStudents(data.students || []))
      .catch((error) => onMessage(`Không thể tải danh sách học sinh: ${error.message}`))
      .finally(() => setBusy(false));
  }, [classId, onMessage]);
  const selectedClass = classes.find((item) => item.id === classId);
  const addStudent = async (event) => {
    event.preventDefault();
    if (!classId || !email.trim()) {
      onMessage('Vui lòng chọn lớp và nhập email học sinh.');
      return;
    }
    try {
      await api('/api/catalog/classes/members', {
        method: 'POST',
        body: JSON.stringify({ class_id: classId, email: email.trim() })
      });
      setEmail('');
      onMessage('Đã thêm học sinh vào lớp.');
      const data = await api(`/api/catalog/classes/${classId}/students`);
      setStudents(data.students || []);
    } catch (error) {
      onMessage(error.message);
    }
  };
  return <section className="teacher-card student-list-panel"><div className="student-list-head"><div><span className="panel-kicker">QUẢN LÝ LỚP HỌC</span><h2>Danh sách học sinh</h2><p>{selectedClass ? `${selectedClass.name} · Khối ${selectedClass.grade}` : 'Chọn lớp để xem học sinh'}</p></div><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></div><form onSubmit={addStudent} className="profile-form" style={{ marginTop: 18 }}><label>Email học sinh<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required /></label><button className="teacher-create" type="submit">＋ Thêm học sinh</button></form>{busy ? <p className="student-list-empty">Đang tải danh sách...</p> : !classId ? <p className="student-list-empty">Bạn chưa có lớp để xem.</p> : students.length ? <div className="student-list-table"><div className="student-list-summary"><b>{students.length}</b><span>học sinh trong lớp</span></div>{students.map((student, index) => <article className="student-list-row" key={student.id}><span className="student-number">{index + 1}</span><span className="student-list-avatar">{student.avatar_url ? <img src={student.avatar_url} alt="" /> : '👧'}</span><div><strong>{student.full_name || 'Chưa cập nhật tên'}</strong><small>{student.email}</small></div><time>Tham gia {new Date(student.joined_at).toLocaleDateString('vi-VN')}</time></article>)}</div> : <p className="student-list-empty">Lớp này chưa có học sinh.</p>}</section>;
}

export function TeacherOverview({ students, assignments, onOpenAssignments, onOpenStudents }) {
  return <><section className="teacher-metrics"><article><span className="metric-icon blue">★</span><div><small>Điểm trung bình lớp ⓘ</small><strong>7.8/10</strong><em>↑ 0.6 so với 30 ngày trước</em></div></article><article><span className="metric-icon green">✓</span><div><small>Tỷ lệ hoàn thành ⓘ</small><strong>86%</strong><em>↑ 8% so với 30 ngày trước</em></div></article><article><span className="metric-icon yellow">◎</span><div><small>Tỷ lệ chính xác ⓘ</small><strong>74%</strong><em className="down">↓ 3% so với 30 ngày trước</em></div></article><article><span className="metric-icon red">♟</span><div><small>Học sinh cần hỗ trợ ⓘ</small><strong>6</strong><em className="neutral">— không đổi</em></div></article></section><section className="teacher-chart-grid"><article className="teacher-card trend-card"><div className="card-heading"><div><small>XU HƯỚNG ĐIỂM TRUNG BÌNH THEO TUẦN</small><h2>Tiến bộ của lớp</h2></div><span>7.8</span></div><div className="line-chart"><svg viewBox="0 0 500 170" role="img" aria-label="Biểu đồ điểm trung bình"><path d="M30 130 L135 112 L240 94 L345 78 L465 48 L465 150 L30 150 Z" fill="#e9f5ff" /><path d="M30 130 L135 112 L240 94 L345 78 L465 48" fill="none" stroke="#46a9ea" strokeWidth="4" />{[[30,130,'6.4'],[135,112,'6.8'],[240,94,'7.1'],[345,78,'7.4'],[465,48,'7.8']].map(([x, y, value]) => <g key={x}><circle cx={x} cy={y} r="5" fill="#46a9ea" /><text x={x - 10} y={y - 12}>{value}</text></g>)}</svg><div className="chart-labels"><span>Tuần 1</span><span>Tuần 2</span><span>Tuần 3</span><span>Tuần 4</span><span>Tuần 5</span></div></div></article><article className="teacher-card skill-card"><div className="card-heading"><div><small>MỨC ĐỘ THÀNH THẠO KỸ NĂNG</small><h2>Kỹ năng của lớp</h2></div></div>{[['Số tự nhiên','85%','green'],['Phép cộng, trừ','80%','green'],['Phép nhân, chia','68%','yellow'],['Hình học','65%','blue'],['Đo lường','60%','blue'],['Phân số','42%','red']].map(([label, value, color]) => <div className="skill-row" key={label}><span>{label}</span><i><b className={color} style={{ width: value }} /></i><strong>{value}</strong></div>)}</article><article className="teacher-card donut-card"><div className="card-heading"><div><small>TỶ LỆ NỘP BÀI</small><h2>Đúng hạn</h2></div></div><div className="donut"><strong>86%</strong><small>Đã nộp bài</small></div><p><span className="dot green" /> Đã nộp: 86% (25 học sinh)</p><p><span className="dot gray" /> Chưa nộp: 14% (4 học sinh)</p></article><article className="teacher-card ai-suggestion"><span className="ai-badge">✦ AI</span><h3>Đề xuất từ AI</h3><p>Dựa trên kết quả học tập 30 ngày, bạn có thể:</p><b>▣ Ôn tập chủ đề Phân số</b><small>Kỹ năng này đang đáng để ôn tập cho lớp (42% thành thạo).</small><ul><li>Giao bài tập ôn Phân số</li><li>Sử dụng bài tập tương tác</li><li>Kiểm tra lại sau 7 ngày</li></ul><button onClick={onOpenAssignments}>Tạo bài tập ôn tập　›</button></article></section><section className="teacher-bottom-grid"><article className="teacher-card assignment-table-card"><div className="card-heading"><div><small>BÀI TẬP ĐANG GIAO</small><h2>Hoạt động gần đây</h2></div><button onClick={onOpenAssignments}>Xem tất cả bài tập　›</button></div><table><thead><tr><th>Tên bài tập</th><th>Chủ đề</th><th>Hoàn thành</th><th>Đã nộp</th></tr></thead><tbody>{assignments.map(([name, topic, progress, submitted, color]) => <tr key={name}><td><span className={`table-file ${color}`}>▣</span>{name}</td><td>{topic}</td><td><b className="mini-progress"><i className={color} style={{ width: progress }} />{progress}</b></td><td>{submitted}</td></tr>)}</tbody></table></article><article className="teacher-card support-card"><div className="card-heading"><div><small>HỌC SINH CẦN HỖ TRỢ</small><h2>Ưu tiên theo dõi</h2></div><button onClick={onOpenStudents}>Xem tất cả</button></div>{students.map(([name, topics, score, risk]) => <div className="support-row" key={name}><span className="student-face">●</span><div><b>{name}</b><small>Yếu: {topics}</small></div><strong>{score}</strong><em className={risk === 'Cao' ? 'high' : 'medium'}>{risk}</em></div>)}</article></section></>;
}

export function TeacherAnalytics({ analytics, onRetry }) {
  if (!analytics) return <section className="teacher-placeholder teacher-card"><span>▥</span><h2>Đang tải phân tích học tập...</h2><p>Dữ liệu sẽ được tổng hợp từ các bài làm đã lưu.</p></section>;
  const { overview, students, recentAttempts } = analytics;
  return <section className="teacher-analytics-view">
    <div className="analytics-intro"><div><span className="panel-kicker">LEARNING ANALYTICS</span><h2>Phân tích học tập</h2><p>Dữ liệu tổng hợp từ các bài làm học sinh của giáo viên.</p></div><button className="teacher-create" type="button" onClick={onRetry}>↻ Làm mới</button></div>
    <section className="teacher-metrics analytics-metrics"><article><span className="metric-icon blue">♙</span><div><small>Học sinh có dữ liệu</small><strong>{overview.studentCount}</strong><em>{overview.attemptCount} lượt làm bài</em></div></article><article><span className="metric-icon green">★</span><div><small>Điểm trung bình</small><strong>{overview.averageScore}%</strong><em>Trên các bài đã làm</em></div></article><article><span className="metric-icon yellow">✓</span><div><small>Tỷ lệ trả lời đúng</small><strong>{overview.accuracyRate}%</strong><em>Tổng số câu hỏi</em></div></article><article><span className="metric-icon red">!</span><div><small>Cần hỗ trợ</small><strong>{overview.supportCount}</strong><em>Điểm thấp hoặc thiếu ổn định</em></div></article></section>
    <section className="teacher-card analytics-table-card"><div className="card-heading"><div><small>THEO DÕI HỌC SINH</small><h2>Học sinh và cảnh báo</h2></div></div>{students.length ? <div className="analytics-student-table"><div className="analytics-table-head"><span>Học sinh</span><span>Số bài</span><span>Điểm trung bình</span><span>Tỷ lệ đúng</span><span>Trạng thái</span></div>{students.map((student) => <div className="analytics-student-row" key={student.student_id}><div><strong>{student.student_name}</strong><small>{student.student_email}</small></div><span>{student.attempts}</span><strong>{student.averageScore}%</strong><span>{student.completionRate}%</span><em className={student.risk === 'Cao' ? 'high' : student.risk === 'Theo dõi' ? 'medium' : 'low'}>{student.risk}</em></div>)}</div> : <div className="student-list-empty">Chưa có dữ liệu bài làm của học sinh.</div>}</section>
    <section className="teacher-card analytics-recent-card"><div className="card-heading"><div><small>LỊCH SỬ GẦN ĐÂY</small><h2>Các bài làm mới nhất</h2></div></div>{recentAttempts.length ? recentAttempts.slice(0, 8).map((attempt) => <div className="analytics-attempt-row" key={attempt.id}><div><strong>{attempt.student_name}</strong><small>{attempt.title} · {new Date(attempt.created_at).toLocaleDateString('vi-VN')}</small></div><b>{attempt.score}/{attempt.total}</b></div>) : <div className="student-list-empty">Chưa có bài làm nào.</div>}</section>
  </section>;
}
