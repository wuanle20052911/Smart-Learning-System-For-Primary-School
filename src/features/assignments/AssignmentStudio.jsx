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

function parseGeneratedQuestions(payload, limit) {
  const responseText = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
  let parsed = JSON.parse(responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  if (!Array.isArray(parsed)) parsed = parsed.questions || [parsed];
  return parsed.map((item) => {
    if (!item || typeof item.question !== 'string' || !item.question.trim() || item.type && item.type !== 'multiple-choice') return null;
    const answer = Number.isInteger(item.correctIndex) ? item.correctIndex : Number(item.answer);
    if (!Array.isArray(item.options) || item.options.length !== 4
      || !item.options.every((option) => typeof option === 'string' && option.trim())
      || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) return null;
    return { ...item, type: 'multiple-choice', answer };
  }).filter(Boolean).slice(0, limit);
}

export function AssignmentStudio({ onMessage, api }) {
  const sampleQuestions = [
    { type: 'multiple-choice', question: 'Phân số nào bé hơn 1?', options: ['5/3', '3/5', '7/4', '9/2'], answer: 1, explanation: 'Tử số nhỏ hơn mẫu số nên 3/5 bé hơn 1.' },
    { type: 'multiple-choice', question: 'Kết quả của 2/5 + 1/5 là gì?', options: ['1/5', '2/5', '3/5', '4/5'], answer: 2, explanation: 'Cộng hai tử số và giữ nguyên mẫu số: 2/5 + 1/5 = 3/5.' }
  ];
  const [material, setMaterial] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [title, setTitle] = useState('Ôn tập Phân số - Phiếu 1');
  const [dueAt, setDueAt] = useState('');
  const [questions, setQuestions] = useState([]);
  const [generatedCandidates, setGeneratedCandidates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const questionType = 'multiple-choice';
  const [questionCount, setQuestionCount] = useState(5);
  const [classId, setClassId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [learningGoal, setLearningGoal] = useState('');
  const [personalizedLessons, setPersonalizedLessons] = useState([]);
  const [generationDifficulty, setGenerationDifficulty] = useState('balanced');
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
  useEffect(() => {
    setTargetStudentId('');
    setLearningGoal('');
    setClassStudents([]);
    if (!classId) return undefined;
    let active = true;
    setStudentsLoading(true);
    api(`/api/catalog/classes/${classId}/students`)
      .then((data) => { if (active) setClassStudents(data.students || []); })
      .catch((error) => { if (active) onMessage(`Không thể tải danh sách học sinh: ${error.message}`); })
      .finally(() => { if (active) setStudentsLoading(false); });
    return () => { active = false; };
  }, [classId]);
  const updateQuestion = (index, key, value) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateOption = (qIndex, optionIndex, value) => setQuestions((items) => items.map((item, index) => index === qIndex ? { ...item, options: item.options.map((option, current) => current === optionIndex ? value : option) } : item));
  const clearDraftQuestions = () => {
    setQuestions([]);
    setGeneratedCandidates([]);
    setSavedQuestionIndexes([]);
    setPersonalizedLessons([]);
    setLearningGoal('');
    setPublished(false);
  };
  const changeClass = (nextClassId) => {
    clearDraftQuestions();
    setTargetStudentId('');
    setClassId(nextClassId);
  };
  const changeTargetStudent = (studentId) => {
    clearDraftQuestions();
    setTargetStudentId(studentId);
  };
  const buildGenerationInstructions = (avoidQuestions = '') => (
    avoidQuestions ? `Tạo câu hỏi mới, không lặp lại nội dung sau: ${avoidQuestions}` : ''
  );
  const selectedGrade = () => String(classes.find((item) => item.id === classId)?.grade || '').match(/[1-5]/)?.[0] || '';
  const addQuestion = () => {
    const newQuestion = { ...sampleQuestions[0], options: [...sampleQuestions[0].options], answer: 0, question: 'Nhập câu hỏi mới' };
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
    setGeneratedCandidates([]);
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
    if (targetStudentId) {
      onMessage('Với bài tập cá nhân, hãy phân tích kết quả và lấy câu hỏi từ ngân hàng.');
      return;
    }
    if (!material.trim()) { onMessage('Hãy nhập nội dung hoặc đưa tài liệu trước khi tạo câu hỏi.'); return; }
    setBusy(true);
    try {
      const lesson = lessons.find((item) => item.id === selectedLessonId);
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({
        material, questionType, questionCount,
        lessonTitle: lesson ? getLessonDisplayTitle(lesson) : materialName,
        grade: selectedGrade(),
        difficulty: generationDifficulty,
        instructions: buildGenerationInstructions()
      }) });
      const generated = parseGeneratedQuestions(payload, questionCount);
      if (!generated.length) throw new Error('AI không trả về câu hỏi hợp lệ.');
      setGeneratedCandidates((items) => [...items, ...generated]);
      onMessage(`AI đã tạo ${generated.length} câu mới. Chọn câu ưng ý để đưa vào hàng chờ; câu trong hàng chờ sẽ được giữ lại khi tạo thêm.`);
    } catch (error) {
      onMessage(`AI local chưa tạo được câu hỏi: ${error.message || 'Lỗi không xác định.'} Các câu trong hàng chờ vẫn được giữ; thầy/cô có thể chọn bài ngắn hơn hoặc giảm số câu.`);
    } finally { setBusy(false); }
  };
  const buildPersonalizedDraft = async () => {
    if (!classId || !targetStudentId) {
      onMessage('Hãy chọn lớp và học sinh trước khi phân tích.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/api/assignments/personalized-draft', {
        method: 'POST',
        body: JSON.stringify({ class_id: classId, student_id: targetStudentId })
      });
      setPersonalizedLessons(result.lessons || []);
      if (!result.questions?.length) {
        setQuestions([]);
        setGeneratedCandidates([]);
        setSavedQuestionIndexes([]);
        setLearningGoal('');
        setPublished(false);
        const messages = {
          'no-attempts': 'Học sinh chưa có kết quả làm bài theo các bài học của giáo viên để xác định phần cần ôn.',
          'no-weak-lessons': 'Chưa tìm thấy bài học có kết quả dưới 70%; chưa cần tạo bài ôn yếu.',
          'no-bank-questions': 'Đã tìm thấy bài cần ôn nhưng ngân hàng chưa có câu hỏi gắn với các bài đó.'
        };
        onMessage(messages[result.reason] || 'Chưa tìm được câu hỏi phù hợp trong ngân hàng.');
        return;
      }
      const lessonNames = result.lessons.map((lesson) => lesson.lesson_title);
      setQuestions(result.questions.map((question) => ({
        type: 'multiple-choice',
        question: question.question,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation || '',
        points: question.points || 1,
        skill_id: question.skill_id || null,
        lesson_id: question.lesson_id
      })));
      setGeneratedCandidates([]);
      setSavedQuestionIndexes([]);
      setSelectedLessonId(result.lessons.length === 1 ? result.lessons[0].lesson_id : '');
      setLearningGoal(`Ôn tập ${lessonNames.join(', ')}`.slice(0, 500));
      setTitle(`Bài ôn cá nhân - ${lessonNames.slice(0, 2).join(', ')}`.slice(0, 160));
      setGenerationDifficulty(result.lessons[0].accuracy < 50 ? 'basic' : 'balanced');
      setPublished(false);
      onMessage(`Đã tìm ${result.lessons.length} bài còn yếu và lấy ${result.questions.length} câu từ ngân hàng. Thầy/cô có thể kiểm tra, chỉnh sửa trước khi giao.`);
    } catch (error) {
      onMessage(`Không thể tạo bài ôn từ ngân hàng: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };
  const addCandidateToQueue = (index) => {
    const candidate = generatedCandidates[index];
    if (!candidate) return;
    setQuestions((items) => [...items, candidate]);
    setGeneratedCandidates((items) => items.filter((_, current) => current !== index));
    setPublished(false);
    onMessage('Đã đưa câu hỏi vào hàng chờ bài tập.');
  };
  const discardCandidate = (index) => {
    setGeneratedCandidates((items) => items.filter((_, current) => current !== index));
  };
  const regenerateCandidate = async (index) => {
    const candidate = generatedCandidates[index];
    if (!candidate || !material.trim()) return;
    setBusy(true);
    try {
      const lesson = lessons.find((item) => item.id === selectedLessonId);
      const avoidQuestions = [candidate.question, ...questions.map((item) => item.question)].join('\n').slice(0, 650);
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({
        material, questionType, questionCount: 1,
        lessonTitle: lesson ? getLessonDisplayTitle(lesson) : materialName,
        grade: selectedGrade(),
        difficulty: generationDifficulty,
        instructions: buildGenerationInstructions(avoidQuestions)
      }) });
      const [replacement] = parseGeneratedQuestions(payload, 1);
      if (!replacement) throw new Error('AI không trả về câu hỏi thay thế hợp lệ.');
      setGeneratedCandidates((items) => items.map((item, current) => current === index ? replacement : item));
      onMessage('Đã tạo câu thay thế. Những câu khác và hàng chờ vẫn được giữ nguyên.');
    } catch (error) {
      onMessage(`Không thể tạo câu thay thế: ${error.message || 'Lỗi không xác định.'} Câu hỏi hiện tại vẫn được giữ.`);
    } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!questions.length) { onMessage('Hãy tạo câu hỏi trước khi xuất bản.'); return; }
    if (!title.trim()) { onMessage('Hãy nhập tên bài tập trước khi xuất bản.'); return; }
    if (!classId) { onMessage('Hãy chọn lớp được giao bài tập trước khi xuất bản.'); return; }
    setBusy(true);
    try {
      const lesson = lessons.find((item) => item.id === selectedLessonId);
      if (targetStudentId && !learningGoal.trim()) {
        onMessage('Hãy phân tích kết quả và lấy câu hỏi từ ngân hàng trước khi giao bài cá nhân.');
        return;
      }
      const sourceDescription = targetStudentId
        ? `Bài ôn cá nhân từ ngân hàng câu hỏi. Trọng tâm: ${learningGoal}.`
        : lesson
        ? `Bài tập từ bài học “${getLessonDisplayTitle(lesson)}”, đã được giáo viên kiểm tra.`
        : 'Bài tập được giáo viên kiểm tra từ tài liệu.';
      if (dueAt && new Date(dueAt).getTime() <= Date.now()) {
        onMessage('Hạn nộp phải ở thời điểm trong tương lai.');
        return;
      }
      await api('/api/assignments', { method: 'POST', body: JSON.stringify({ title, description: sourceDescription, lesson_id: selectedLessonId || null, difficulty: { basic: 'easy', balanced: 'medium', application: 'hard' }[generationDifficulty], due_at: dueAt ? new Date(dueAt).toISOString() : null, published: true, class_id: classId || null, target_student_id: targetStudentId || null, learning_goal: learningGoal.trim(), questions: questions.map((item) => ({ type: item.type || 'multiple-choice', lesson_id: item.lesson_id || selectedLessonId || null, skill_id: item.skill_id || null, question: item.question, options: item.options || [], answer: item.answer, explanation: item.explanation || '', points: item.points || 1 })) }) });
      setPublished(true); onMessage(targetStudentId ? 'Đã xuất bản bài tập cá nhân hóa cho học sinh.' : 'Đã xuất bản bài tập cho cả lớp.');
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
      setGeneratedCandidates([]);
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
        questionCount={questionCount}
        materialName={materialName}
        material={material}
        busy={busy}
        getLessonTitle={getLessonDisplayTitle}
        personalizedMode={Boolean(targetStudentId)}
        onSelectLesson={selectLesson}
        onQuestionCountChange={setQuestionCount}
        onFileChange={(event) => {
          setSelectedLessonId('');
          setQuestions([]);
          setGeneratedCandidates([]);
          setPublished(false);
          setSavedQuestionIndexes([]);
          readFile(event);
        }}
        onMaterialChange={(value) => {
          setSelectedLessonId('');
          setMaterialName('');
          setQuestions([]);
          setGeneratedCandidates([]);
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
        targetStudentId={targetStudentId}
        classStudents={classStudents}
        studentsLoading={studentsLoading}
        learningGoal={learningGoal}
        personalizedLessons={personalizedLessons}
        generationDifficulty={generationDifficulty}
        personalizedBusy={busy}
        dueAt={dueAt}
        questions={questions}
        generatedCandidates={generatedCandidates}
        savedQuestionIndexes={savedQuestionIndexes}
        busy={busy}
        published={published}
        onTitleChange={setTitle}
        onClassChange={changeClass}
        onTargetStudentChange={changeTargetStudent}
        onBuildPersonalizedDraft={buildPersonalizedDraft}
        onDifficultyChange={setGenerationDifficulty}
        onDueAtChange={setDueAt}
        onUpdateQuestion={updateQuestion}
        onUpdateOption={updateOption}
        onRemoveQuestion={(index) => setQuestions((items) => items.filter((_, current) => current !== index))}
        onKeepCandidate={addCandidateToQueue}
        onRegenerateCandidate={regenerateCandidate}
        onDiscardCandidate={discardCandidate}
        onSaveQuestion={saveToQuestionBank}
        onAddQuestion={addQuestion}
        onPublish={publish}
      />
    </div>
  </section>;
}
