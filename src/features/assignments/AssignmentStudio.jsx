import React, { useEffect, useState } from 'react';
import { extractLearningText, getLessonDisplayTitle, getLessonSourceCode } from '../../services/learningMaterials.js';
import AssignmentSourcePanel from './AssignmentSourcePanel.jsx';
import AssignmentQuestionReview from './AssignmentQuestionReview.jsx';

const readableFileTypes = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown'
};
const questionTypes = [
  ['multiple-choice', 'Trắc nghiệm'],
  ['true-false', 'Đúng / Sai'],
  ['fill-blank', 'Điền chỗ trống'],
  ['short-answer', 'Trả lời ngắn'],
  ['matching', 'Nối cặp']
];

async function getLessonMaterialUrl(lesson, api) {
  const sourceCode = getLessonSourceCode(lesson);
  let sourcePathError = '';
  if (lesson.source_path) {
    try {
      const material = await api(`/api/lessons/${lesson.id}/material`);
      return {
        url: material.url,
        filename: lesson.source_filename || lesson.source_path.split('/').pop() || ''
      };
    } catch (error) {
      sourcePathError = error.message;
    }
  }

  const filename = lesson.source_filename?.trim() || lesson.source_path?.split(/[\\/]/).pop() || '';
  if (!filename && !sourceCode) throw new Error('Bài học chưa lưu đường dẫn hoặc tên file Storage.');

  const basename = filename.split(/[\\/]/).pop();
  const correctedFilename = sourceCode
    ? basename
      ? basename.replace(/^C\d+B\d+/i, `C${sourceCode.chapterNumber}B${sourceCode.lessonNumber}`)
      : `C${sourceCode.chapterNumber}B${sourceCode.lessonNumber}.docx`
    : '';
  const { chapters = [] } = await api('/api/lessons/storage-chapters');
  const preferredChapter = correctedFilename && correctedFilename !== basename && sourceCode
    ? `Chapter${sourceCode.chapterNumber}`
    : '';
  const buckets = [
    preferredChapter,
    lesson.source_bucket,
    ...(sourceCode ? [`Chapter${sourceCode.chapterNumber}`] : []),
    ...chapters,
    'Math4'
  ].filter((bucket, index, all) => bucket && all.indexOf(bucket) === index);
  const candidateNames = [basename, correctedFilename].filter((name, index, all) => name && all.indexOf(name) === index);
  const errors = [];
  for (const bucket of buckets) {
    try {
      if (!['Math4', 'Chapter1', 'Chapter2', 'Chapter3'].includes(bucket)) continue;
      const filesEndpoint = bucket === 'Math4'
        ? `/api/lessons/storage-files?bucket=${encodeURIComponent(bucket)}`
        : `/api/lessons/storage-chapters/${encodeURIComponent(bucket)}/files`;
      const { files } = await api(filesEndpoint);
      const file = (files || []).find((item) => candidateNames.includes(item.path)
        || candidateNames.includes(item.path.split(/[\\/]/).pop()));
      if (!file) continue;
      const urlEndpoint = bucket === 'Math4'
        ? `/api/lessons/storage-file-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(file.path)}`
        : `/api/lessons/storage-chapters/${encodeURIComponent(bucket)}/file-url?path=${encodeURIComponent(file.path)}`;
      const signed = await api(urlEndpoint);
      return { url: signed.url, filename: file.path.split(/[\\/]/).pop() || basename };
    } catch (error) {
      errors.push(`${bucket}: ${error.message}`);
    }
  }

  const detail = errors.length ? ` ${errors.join('; ')}` : '';
  throw new Error(`Không tìm thấy file “${filename || correctedFilename}” trong Storage.${sourcePathError ? ` Đường dẫn đã lưu: ${sourcePathError}.` : ''}${detail}`);
}

async function getLessonText(lesson, api) {
  let content = lesson.content?.trim() || '';
  if (!content && (lesson.source_path || lesson.source_filename || getLessonSourceCode(lesson))) {
    const material = await getLessonMaterialUrl(lesson, api);
    const response = await fetch(material.url);
    if (!response.ok) throw new Error(`Không tải được tài liệu “${material.filename}”.`);
    const extension = material.filename.split('.').pop()?.toLowerCase();
    const contentType = readableFileTypes[extension];
    if (!contentType) throw new Error(`Định dạng tài liệu “${material.filename}” chưa được hỗ trợ.`);
    content = (await extractLearningText(new File([await response.blob()], material.filename, { type: contentType }))).trim();
  }
  if (!content) throw new Error('Bài học chưa có nội dung văn bản để tạo câu hỏi.');
  return content.slice(0, 18000);
}

export function AssignmentStudio({ onMessage, api }) {
  const sampleQuestions = [
    { type: 'multiple-choice', question: 'Phân số nào bé hơn 1?', options: ['5/3', '3/5', '7/4', '9/2'], answer: 1, explanation: 'Tử số nhỏ hơn mẫu số nên 3/5 bé hơn 1.' },
    { type: 'multiple-choice', question: 'Kết quả của 2/5 + 1/5 là gì?', options: ['1/5', '2/5', '3/5', '4/5'], answer: 2, explanation: 'Cộng hai tử số và giữ nguyên mẫu số: 2/5 + 1/5 = 3/5.' },
    { type: 'true-false', question: 'Mọi phân số có tử số nhỏ hơn mẫu số đều bé hơn 1.', options: ['Đúng', 'Sai'], answer: 0, explanation: 'Đây là tính chất cơ bản của phân số.' }
  ];
  const [material, setMaterial] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [title, setTitle] = useState('Ôn tập Phân số - Phiếu 1');
  const [dueAt, setDueAt] = useState('');
  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [questionCount, setQuestionCount] = useState(5);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [savedQuestionIndexes, setSavedQuestionIndexes] = useState([]);
  useEffect(() => {
    Promise.all([api('/api/catalog/classes'), api('/api/lessons/mine')])
      .then(([classData, lessonData]) => {
        setClasses(classData.classes || []);
        setLessons(lessonData.lessons || []);
      })
      .catch((error) => onMessage(`Không thể tải lớp hoặc bài học: ${error.message}`));
  }, []);
  const updateQuestion = (index, key, value) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateOption = (qIndex, optionIndex, value) => setQuestions((items) => items.map((item, index) => index === qIndex ? { ...item, options: item.options.map((option, current) => current === optionIndex ? value : option) } : item));
  const updateMatchingPair = (questionIndex, pairIndex, key, value) => setQuestions((items) => items.map((item, index) => index === questionIndex
    ? { ...item, options: item.options.map((pair, current) => current === pairIndex ? { ...pair, [key]: value } : pair) }
    : item));
  const updateMatchingAnswer = (questionIndex, pairIndex, value) => setQuestions((items) => items.map((item, index) => index === questionIndex
    ? { ...item, answer: item.answer.map((answer, current) => current === pairIndex ? Number(value) : answer) }
    : item));
  const addQuestion = () => {
    const newQuestion = questionType === 'matching'
      ? { type: questionType, question: 'Nối các cặp phù hợp', options: [{ left: 'Vế trái 1', right: 'Vế phải 1' }, { left: 'Vế trái 2', right: 'Vế phải 2' }], answer: [0, 1], explanation: '' }
      : questionType === 'fill-blank' || questionType === 'short-answer'
        ? { type: questionType, question: 'Nhập câu hỏi mới', options: [], answer: '', explanation: '' }
        : { ...sampleQuestions[0], type: questionType, options: questionType === 'true-false' ? ['Đúng', 'Sai'] : [...sampleQuestions[0].options], answer: 0, question: 'Nhập câu hỏi mới' };
    setQuestions((items) => [...items, newQuestion]);
    setPublished(false);
  };
  const selectLesson = async (lessonId) => {
    setSelectedLessonId(lessonId);
    if (!lessonId) return;
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    setMaterial('');
    setMaterialName('');
    setQuestions([]);
    setPublished(false);
    setSavedQuestionIndexes([]);
    setBusy(true);
    try {
      const lessonContent = await getLessonText(lesson, api);
      setMaterial(lessonContent);
      setMaterialName(`Bài học: ${getLessonDisplayTitle(lesson)}`);
      setTitle(`Bài tập - ${getLessonDisplayTitle(lesson)}`);
      onMessage(`Đã lấy nội dung bài “${getLessonDisplayTitle(lesson)}”. Tạo câu hỏi rồi kiểm tra trước khi giao cho lớp.`);
    } catch (error) {
      setSelectedLessonId('');
      onMessage(`Không thể lấy nội dung bài học: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    if (!material.trim()) { onMessage('Hãy nhập nội dung hoặc đưa tài liệu trước khi tạo câu hỏi.'); return; }
    setBusy(true);
    setPublished(false);
    setSavedQuestionIndexes([]);
    try {
      const lesson = lessons.find((item) => item.id === selectedLessonId);
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({
        material, questionType, questionCount,
        lessonTitle: lesson ? getLessonDisplayTitle(lesson) : materialName
      }) });
      const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
      let parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
      if (!Array.isArray(parsed)) parsed = parsed.questions || [parsed];
      const generated = parsed.map((item) => {
        if (!item || typeof item.question !== 'string' || !item.question.trim()) return null;
        if (questionType === 'multiple-choice' || questionType === 'true-false') {
          const answer = Number.isInteger(item.correctIndex) ? item.correctIndex : Number(item.answer);
          if (!Array.isArray(item.options) || item.options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) return null;
          if (questionType === 'true-false' && item.options.length !== 2) return null;
          return { ...item, type: questionType, answer };
        }
        if (questionType === 'matching') {
          if (!Array.isArray(item.pairs) || item.pairs.length < 2 || !Array.isArray(item.correctMatches)
            || item.correctMatches.length !== item.pairs.length
            || !item.pairs.every((pair) => typeof pair.left === 'string' && pair.left.trim() && typeof pair.right === 'string' && pair.right.trim())
            || !item.correctMatches.every((answer) => Number.isInteger(answer) && answer >= 0 && answer < item.pairs.length)) return null;
          return { ...item, type: questionType, options: item.pairs, answer: item.correctMatches };
        }
        const answer = typeof item.answer === 'string' || typeof item.answer === 'number' ? String(item.answer).trim() : '';
        if (!answer) return null;
        return { ...item, type: questionType, options: [], answer };
      }).filter(Boolean).slice(0, questionCount);
      if (!generated.length) throw new Error('AI không trả về câu hỏi hợp lệ.');
      setQuestions(generated);
      setPublished(false);
      setSavedQuestionIndexes([]);
      onMessage(`AI đã tạo và kiểm tra ${generated.length}/${questionCount} câu ${questionTypes.find(([value]) => value === questionType)?.[1].toLowerCase()}.${generated.length < questionCount ? ' Một số câu chưa qua kiểm tra, thầy/cô có thể giảm số câu hoặc tạo lại.' : ''} Hãy kiểm tra và chỉnh sửa trước khi xuất bản.`);
    } catch (error) {
      onMessage(`AI local chưa tạo được câu hỏi: ${error.message || 'Lỗi không xác định.'} Bản nháp trước đó vẫn được giữ; thầy/cô có thể chọn bài ngắn hơn hoặc giảm số câu.`);
    } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!questions.length) { onMessage('Hãy tạo câu hỏi trước khi xuất bản.'); return; }
    if (!title.trim()) { onMessage('Hãy nhập tên bài tập trước khi xuất bản.'); return; }
    if (!classId) { onMessage('Hãy chọn lớp được giao bài tập trước khi xuất bản.'); return; }
    setBusy(true);
    try {
      const lesson = lessons.find((item) => item.id === selectedLessonId);
      const sourceDescription = lesson
        ? `Bài tập từ bài học “${getLessonDisplayTitle(lesson)}”, đã được giáo viên kiểm tra.`
        : 'Bài tập được giáo viên kiểm tra từ tài liệu.';
      if (dueAt && new Date(dueAt).getTime() <= Date.now()) {
        onMessage('Hạn nộp phải ở thời điểm trong tương lai.');
        return;
      }
      await api('/api/assignments', { method: 'POST', body: JSON.stringify({ title, description: sourceDescription, lesson_id: selectedLessonId || null, difficulty: 'medium', due_at: dueAt ? new Date(dueAt).toISOString() : null, published: true, class_id: classId || null, questions: questions.map((item) => ({ type: item.type || 'multiple-choice', question: item.question, options: item.options || [], answer: item.answer, explanation: item.explanation || '', points: 1 })) }) });
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
          lesson_id: selectedLessonId || null,
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
      setQuestions([]);
      setPublished(false);
      setSavedQuestionIndexes([]);
      setMaterial(text.trim());
      setMaterialName(file.name);
      onMessage(`Đã đọc tài liệu ${file.name}.`);
    } catch (error) {
      event.target.value = ''; setMaterialName(''); onMessage(`Không đọc được tài liệu: ${error.message}`); return;
    }
  };
  return <section className="assignment-studio">
    <div className="studio-intro">
      <div>
        <span className="panel-kicker">TẠO BÀI TẬP CÙNG AI LOCAL</span>
        <h2>Từ bài học đến bộ câu hỏi cho lớp</h2>
        <p>Chọn lesson, chọn dạng câu hỏi, để AI tạo rồi kiểm tra trước khi giao cho học sinh.</p>
      </div>
      <span className="studio-steps">1 Chọn bài học　→　2 Chọn dạng　→　3 Kiểm tra　→　4 Xuất bản</span>
    </div>
    <div className="studio-grid">
      <AssignmentSourcePanel
        lessons={lessons}
        selectedLessonId={selectedLessonId}
        questionType={questionType}
        questionCount={questionCount}
        materialName={materialName}
        material={material}
        busy={busy}
        questionTypes={questionTypes}
        getLessonTitle={getLessonDisplayTitle}
        onSelectLesson={selectLesson}
        onQuestionTypeChange={(value) => {
          setQuestionType(value);
          setQuestions([]);
          setPublished(false);
          setSavedQuestionIndexes([]);
        }}
        onQuestionCountChange={setQuestionCount}
        onFileChange={(event) => {
          setSelectedLessonId('');
          setQuestions([]);
          setPublished(false);
          setSavedQuestionIndexes([]);
          readFile(event);
        }}
        onMaterialChange={(value) => {
          setSelectedLessonId('');
          setMaterialName('');
          setQuestions([]);
          setPublished(false);
          setSavedQuestionIndexes([]);
          setMaterial(value);
        }}
        onGenerate={generate}
      />
      <AssignmentQuestionReview
        title={title}
        classId={classId}
        classes={classes}
        dueAt={dueAt}
        questions={questions}
        savedQuestionIndexes={savedQuestionIndexes}
        questionTypes={questionTypes}
        busy={busy}
        published={published}
        onTitleChange={setTitle}
        onClassChange={setClassId}
        onDueAtChange={setDueAt}
        onUpdateQuestion={updateQuestion}
        onUpdateOption={updateOption}
        onUpdateMatchingPair={updateMatchingPair}
        onUpdateMatchingAnswer={updateMatchingAnswer}
        onRemoveQuestion={(index) => setQuestions((items) => items.filter((_, current) => current !== index))}
        onSaveQuestion={saveToQuestionBank}
        onAddQuestion={addQuestion}
        onPublish={publish}
      />
    </div>
  </section>;
}
