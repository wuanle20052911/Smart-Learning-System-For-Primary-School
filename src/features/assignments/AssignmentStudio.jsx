import React, { useEffect, useState } from 'react';
import { deduplicateLessonsBySourceNumber, extractLearningText, getLessonDisplayTitle, getLessonSourceCode } from '../../services/learningMaterials.js';

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
  const [storageProgress, setStorageProgress] = useState({ done: 0, total: 0 });
  const [storageLoading, setStorageLoading] = useState(false);
  const [title, setTitle] = useState('Ôn tập Phân số - Phiếu 1');
  const [dueAt, setDueAt] = useState('');
  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [savedQuestionIndexes, setSavedQuestionIndexes] = useState([]);
  const [chapterBatch, setChapterBatch] = useState(null);
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
    setQuestions([]);
    setPublished(false);
    setSavedQuestionIndexes([]);
    try {
      const typeSchemas = {
        'multiple-choice': 'Mỗi câu dạng {"type":"multiple-choice","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}; correctIndex là chỉ số đáp án đúng bắt đầu từ 0.',
        'true-false': 'Mỗi câu dạng {"type":"true-false","question":"...","options":["Đúng","Sai"],"correctIndex":0,"explanation":"..."}; correctIndex là 0 hoặc 1.',
        'fill-blank': 'Mỗi câu dạng {"type":"fill-blank","question":"...","answer":"đáp án ngắn","explanation":"..."}',
        'short-answer': 'Mỗi câu dạng {"type":"short-answer","question":"...","answer":"đáp án ngắn","explanation":"..."}',
        matching: 'Mỗi câu dạng {"type":"matching","question":"...","pairs":[{"left":"...","right":"..."},{"left":"...","right":"..."}],"correctMatches":[1,0],"explanation":"..."}; correctMatches ánh xạ từng vế trái sang chỉ số vế phải.'
      };
      const systemPrompt = `Bạn là giáo viên tiểu học chuyên soạn câu hỏi luyện tập mới dựa trên kiến thức trong tài liệu. Chỉ trả về JSON array hợp lệ, không markdown. ${typeSchemas[questionType]} Đảm bảo đáp án chính xác và phù hợp học sinh tiểu học.`;
      const userPrompt = `Dùng tài liệu sau làm nguồn kiến thức, không dùng nó như danh sách câu hỏi để chép lại:\n"""${material}"""\nTạo đúng 5 câu hỏi tiếng Việt thuộc dạng "${questionTypes.find(([value]) => value === questionType)?.[1]}". ${typeSchemas[questionType]}\nYêu cầu quan trọng:\n- Tạo câu hỏi mới để kiểm tra cùng khái niệm/kỹ năng; tuyệt đối không chép nguyên câu hỏi, ví dụ, tình huống hoặc đáp án mẫu trong tài liệu.\n- Với bài toán có số liệu, thay bằng số liệu mới và tự tính/kiểm tra lại đáp án; giữ mức độ và dạng phép tính tương đương.\n- Với câu hỏi gắn tình huống, đổi nhân vật/đồ vật/bối cảnh nhưng vẫn kiểm tra cùng kiến thức.\n- Có thể đổi cách diễn đạt; không hỏi lại nguyên văn định nghĩa hay ví dụ. Không thêm kiến thức ngoài tài liệu và chương trình tiểu học.\n- Các câu trong cùng một bộ cũng cần đa dạng, không lặp lại cùng một tình huống hoặc mẫu số liệu.`;
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({ systemPrompt, userPrompt, questionType }) });
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
      }).filter(Boolean);
      if (!generated.length) throw new Error('AI không trả về câu hỏi hợp lệ.');
      setQuestions(generated);
      setPublished(false);
      setSavedQuestionIndexes([]);
      onMessage(`AI đã tạo ${generated.length}/5 câu ${questionTypes.find(([value]) => value === questionType)?.[1].toLowerCase()}. Hãy kiểm tra và chỉnh sửa trước khi xuất bản.`);
    } catch (error) {
      onMessage(`AI local chưa tạo được câu hỏi: ${error.message || 'Lỗi không xác định.'} Bạn có thể dùng nút "Dùng dữ liệu mẫu" để thử giao diện.`);
    } finally { setBusy(false); }
  };
  const createChapterOnePractice = async () => {
    const lessonsByCourse = new Map();
    lessons.forEach((lesson) => {
      const sourceCode = getLessonSourceCode(lesson);
      if (sourceCode?.chapterNumber !== 1 || sourceCode.lessonNumber < 1 || sourceCode.lessonNumber > 6) return;
      const courseKey = `${lesson.subject || ''}|${lesson.grade || ''}`;
      if (!lessonsByCourse.has(courseKey)) lessonsByCourse.set(courseKey, []);
      lessonsByCourse.get(courseKey).push(lesson);
    });

    const completeCourses = Array.from(lessonsByCourse.values())
      .map((courseLessons) => deduplicateLessonsBySourceNumber(courseLessons))
      .filter((courseLessons) => courseLessons.length === 6);
    if (completeCourses.length !== 1) {
      onMessage(completeCourses.length
        ? 'Tìm thấy nhiều bộ Chương 1 đủ 6 bài. Hãy lọc/chọn đúng môn và khối trước khi tạo.'
        : 'Không tìm thấy một bộ Chương 1 đủ 6 bài trong danh sách bài học của giáo viên.');
      return;
    }

    setBusy(true);
    setChapterBatch({ current: 0, total: 6, results: [] });
    const results = [];
    try {
      const { questions: bankQuestions = [] } = await api('/api/questions');
      const courseLessons = completeCourses[0].sort((left, right) =>
        getLessonSourceCode(left).lessonNumber - getLessonSourceCode(right).lessonNumber
      );

      for (let index = 0; index < courseLessons.length; index += 1) {
        const lesson = courseLessons[index];
        const lessonNumber = getLessonSourceCode(lesson).lessonNumber;
        const existingCount = bankQuestions.filter((question) => question.lesson_id === lesson.id).length;
        const missingCount = Math.max(0, 10 - existingCount);
        setChapterBatch({ current: index + 1, total: 6, lesson: getLessonDisplayTitle(lesson), results: [...results] });

        if (!missingCount) {
          results.push(`${getLessonDisplayTitle(lesson)}: đã có ${existingCount} câu, không thêm`);
          setChapterBatch({ current: index + 1, total: 6, lesson: getLessonDisplayTitle(lesson), results: [...results] });
          continue;
        }

        let savedCount = 0;
        try {
          const content = await getLessonText(lesson, api);
          const typeSchema = 'Mỗi câu dạng {"type":"multiple-choice","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}; correctIndex là chỉ số đáp án đúng bắt đầu từ 0.';
          const knownQuestions = bankQuestions
            .filter((question) => question.lesson_id === lesson.id)
            .map((question) => question.question?.trim().toLocaleLowerCase())
            .filter(Boolean);
          let consecutiveEmptyBatches = 0;

          while (savedCount < missingCount && consecutiveEmptyBatches < 3) {
            const batchSize = Math.min(2, missingCount - savedCount);
            const payload = await api('/api/generate-quiz', {
              method: 'POST',
              body: JSON.stringify({
                questionType: 'multiple-choice',
                systemPrompt: `Bạn là giáo viên Toán lớp 4. Chỉ trả về JSON array hợp lệ, không markdown. ${typeSchema} Chỉ dùng thông tin trong tài liệu, không tự thêm kiến thức ngoài bài. Đáp án phải chính xác, câu hỏi rõ ràng và phù hợp học sinh tiểu học.`,
                userPrompt: `Tài liệu bài ${lessonNumber} Chương 1:\n${content}\nTạo đúng ${batchSize} câu hỏi trắc nghiệm tiếng Việt, mỗi câu có 4 lựa chọn, giải thích ngắn. Không lặp lại những câu này: ${JSON.stringify(knownQuestions.slice(-20))}. ${typeSchema}`
              })
            });
            const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
            let parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
            if (!Array.isArray(parsed)) parsed = parsed.questions || [parsed];
            const generated = parsed.filter((item) => item
              && typeof item.question === 'string'
              && item.question.trim()
              && Array.isArray(item.options)
              && item.options.length === 4
              && item.options.every((option) => typeof option === 'string' && option.trim())
              && Number.isInteger(item.correctIndex)
              && item.correctIndex >= 0
              && item.correctIndex < item.options.length)
              .filter((item) => !knownQuestions.includes(item.question.trim().toLocaleLowerCase()))
              .slice(0, batchSize);

            if (!generated.length) {
              consecutiveEmptyBatches += 1;
              continue;
            }
            consecutiveEmptyBatches = 0;

            for (const question of generated) {
              await api('/api/questions', {
                method: 'POST',
                body: JSON.stringify({
                  type: 'multiple-choice',
                  lesson_id: lesson.id,
                  question: question.question,
                  options: question.options,
                  answer: question.correctIndex,
                  explanation: question.explanation || '',
                  points: 1
                })
              });
              knownQuestions.push(question.question.trim().toLocaleLowerCase());
              bankQuestions.push({ lesson_id: lesson.id, question: question.question });
              savedCount += 1;
            }
            results.push(`${getLessonDisplayTitle(lesson)}: đã lưu ${existingCount + savedCount}/10 câu`);
            setChapterBatch({ current: index + 1, total: 6, lesson: getLessonDisplayTitle(lesson), results: [...results] });
          }
          if (savedCount < missingCount) {
            throw new Error(`đã lưu ${existingCount + savedCount}/10 câu; AI không tạo thêm câu hợp lệ sau ${consecutiveEmptyBatches} lần`);
          }
        } catch (error) {
          results.push(`${getLessonDisplayTitle(lesson)}: ${savedCount ? `đã lưu ${existingCount + savedCount}/10 câu; ` : ''}lỗi - ${error.message}`);
        }
        setChapterBatch({ current: index + 1, total: 6, lesson: getLessonDisplayTitle(lesson), results: [...results] });
      }

      const failures = results.filter((result) => result.includes(': lỗi -'));
      onMessage(failures.length
        ? `Đã xử lý Chương 1; ${failures.length} bài chưa hoàn tất. ${failures.join(' | ')}`
        : `Đã hoàn tất Chương 1. ${results.join(' | ')}`);
    } catch (error) {
      onMessage(`Không thể tạo câu hỏi Chương 1: ${error.message}`);
    } finally {
      setBusy(false);
    }
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
      <section className="teacher-card studio-source">
        <h3>1. Chọn bài học làm nguồn</h3>
        <button className="secondary-studio" type="button" onClick={createChapterOnePractice} disabled={busy}>
          {busy && chapterBatch ? `Đang tạo Chương 1 (${chapterBatch.current}/${chapterBatch.total})...` : 'Tạo 10 câu luyện tập cho mỗi bài Chương 1'}
        </button>
        {chapterBatch && <div className="studio-source-note" role="status">
          {chapterBatch.lesson && <p>Đang xử lý {chapterBatch.lesson}.</p>}
          {chapterBatch.results.map((result) => <p key={result}>{result}</p>)}
        </div>}
        <label className="lesson-question-source">Bài học
          <select value={selectedLessonId} onChange={(event) => selectLesson(event.target.value)} disabled={busy}>
            <option value="">Chọn bài học</option>
            {lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.subject} · {lesson.grade} · {getLessonDisplayTitle(lesson)}</option>)}
          </select>
        </label>
        <label className="lesson-question-source">Dạng câu hỏi
          <select value={questionType} onChange={(event) => { setQuestionType(event.target.value); setQuestions([]); setPublished(false); setSavedQuestionIndexes([]); }}>
            {questionTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className="material-upload">
          <span>📄</span>
          <b>{materialName || 'Hoặc chọn tài liệu PDF hoặc Word'}</b>
          <small>Hỗ trợ .pdf, .docx, .txt, .md</small>
          <input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={(event) => { setSelectedLessonId(''); setQuestions([]); setPublished(false); setSavedQuestionIndexes([]); readFile(event); }} />
        </label>
        <textarea value={material} onChange={(event) => { setSelectedLessonId(''); setMaterialName(''); setQuestions([]); setPublished(false); setSavedQuestionIndexes([]); setMaterial(event.target.value); }} rows="9" placeholder="Nội dung lesson sẽ được nạp tại đây. Cũng có thể dán nội dung bài học." />
        <button className="teacher-create" type="button" onClick={generate} disabled={busy}>{busy ? 'AI local đang tạo...' : '✦ Tạo câu hỏi bằng AI local'}</button>
        <section className="studio-source-note">Giáo viên xem lại nội dung, sửa câu hỏi/đáp án rồi mới xuất bản cho lớp.</section>
      </section>
      <section className="teacher-card studio-review">
        <div className="studio-review-head">
          <div className="studio-review-title"><h3>2. Kiểm tra và chỉnh sửa</h3><small>{questions.length ? `${questions.length} câu hỏi đã tạo` : 'Chưa có câu hỏi'}</small></div>
          <div className="studio-assignment-fields">
            <label>Tên bài tập<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nhập tên bài tập" /></label>
            <label>Lớp được giao<select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></label>
            <label className="assignment-deadline">Hạn nộp<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><small>Để trống nếu không đặt hạn.</small></label>
          </div>
        </div>
        {questions.length ? questions.map((item, index) => <article className="editable-question" key={index}>
          <div className="editable-question-head"><b>Câu {index + 1} · {questionTypes.find(([value]) => value === item.type)?.[1]}</b><button type="button" onClick={() => setQuestions((items) => items.filter((_, current) => current !== index))}>Xóa</button></div>
          <textarea value={item.question} onChange={(event) => updateQuestion(index, 'question', event.target.value)} rows="2" />
          {item.type === 'matching' ? item.options.map((pair, pairIndex) => <div className="editable-matching-pair" key={pairIndex}>
            <input aria-label={`Vế trái ${pairIndex + 1}`} value={pair.left} onChange={(event) => updateMatchingPair(index, pairIndex, 'left', event.target.value)} />
            <input aria-label={`Vế phải ${pairIndex + 1}`} value={pair.right} onChange={(event) => updateMatchingPair(index, pairIndex, 'right', event.target.value)} />
            <select aria-label={`Đáp án cho vế trái ${pairIndex + 1}`} value={item.answer[pairIndex]} onChange={(event) => updateMatchingAnswer(index, pairIndex, event.target.value)}>
              {item.options.map((choice, choiceIndex) => <option value={choiceIndex} key={choiceIndex}>{choice.right}</option>)}
            </select>
          </div>) : item.type === 'fill-blank' || item.type === 'short-answer' ? <label className="editable-answer-label">Đáp án<input value={item.answer} onChange={(event) => updateQuestion(index, 'answer', event.target.value)} /></label> : item.options.map((option, optionIndex) => <label key={optionIndex}>
            <span>{String.fromCharCode(65 + optionIndex)}</span>
            <input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} />
            <input className="answer-radio" type="radio" checked={item.answer === optionIndex} onChange={() => updateQuestion(index, 'answer', optionIndex)} />
          </label>)}
          <input value={item.explanation || ''} onChange={(event) => updateQuestion(index, 'explanation', event.target.value)} placeholder="Giải thích đáp án (không bắt buộc)" />
          <button className="secondary-studio" type="button" onClick={() => saveToQuestionBank(item, index)} disabled={savedQuestionIndexes.includes(index)}>{savedQuestionIndexes.includes(index) ? '✓ Đã lưu ngân hàng' : '＋ Lưu vào ngân hàng câu hỏi'}</button>
        </article>) : <div className="studio-empty">Câu hỏi AI tạo ra sẽ xuất hiện ở đây để giáo viên kiểm tra.</div>}
        <div className="studio-actions">
          <button className="secondary-studio" type="button" onClick={addQuestion}>+ Thêm câu hỏi</button>
          <button className="teacher-create" type="button" onClick={publish} disabled={busy || published}>{published ? '✓ Đã xuất bản' : 'Xuất bản cho cả lớp'}</button>
        </div>
      </section>
    </div>
  </section>;
}

export function TeacherQuestionBank({ api, onMessage }) {
   const [questions, setQuestions] = useState([]);
   const [lessons, setLessons] = useState([]);
   const [busy, setBusy] = useState(true);
   const load = () => {
     setBusy(true);
     Promise.all([api('/api/questions'), api('/api/lessons/mine')])
       .then(([questionData, lessonData]) => {
         setQuestions(questionData.questions || []);
         setLessons(lessonData.lessons || []);
       })
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
   return <section className="teacher-card student-list-panel"><div className="student-list-head"><div><span className="panel-kicker">TÁI SỬ DỤNG CÂU HỎI</span><h2>Ngân hàng câu hỏi</h2><p>Các câu hỏi giáo viên đã lưu để dùng lại cho nhiều bài tập.</p></div><button className="secondary-studio" type="button" onClick={load}>↻ Làm mới</button></div>{busy ? <p className="student-list-empty">Đang tải...</p> : questions.length ? <div className="submission-list">{questions.map((item) => { const lesson = lessons.find((entry) => entry.id === item.lesson_id); return <article className="submission-row" key={item.id}><span><strong>{item.question}</strong><small>{item.type}{lesson ? ` · ${getLessonDisplayTitle(lesson)}` : item.lesson_id ? ` · Lesson ID: ${item.lesson_id}` : ''} · Lưu ngày {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></span><button className="secondary-studio" type="button" onClick={() => remove(item.id)}>Xóa</button></article>; })}</div> : <p className="student-list-empty">Chưa có câu hỏi. Hãy lưu câu hỏi sau khi AI tạo và chỉnh sửa.</p>}</section>;
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
  const studentById = new Map(students.map((student) => [student.student_id, student]));
  return <section className="teacher-analytics-view">
    <div className="analytics-intro"><div><span className="panel-kicker">LEARNING ANALYTICS</span><h2>Phân tích học tập</h2><p>Dữ liệu tổng hợp từ các bài làm học sinh của giáo viên.</p></div><button className="teacher-create" type="button" onClick={onRetry}>↻ Làm mới</button></div>
    <section className="teacher-metrics analytics-metrics"><article><span className="metric-icon blue">♙</span><div><small>Học sinh theo dõi</small><strong>{overview.studentCount}</strong><em>{overview.attemptCount} lượt làm bài</em></div></article><article><span className="metric-icon green">★</span><div><small>Điểm trung bình</small><strong>{overview.averageScore}%</strong><em>Trên các bài đã làm</em></div></article><article><span className="metric-icon yellow">✓</span><div><small>Độ chính xác</small><strong>{overview.accuracyRate}%</strong><em>Số câu đúng / tổng số câu</em></div></article><article><span className="metric-icon red">!</span><div><small>Cảnh báo nguy cơ cao</small><strong>{overview.supportCount}</strong><em>{overview.insufficientDataCount || 0} học sinh chưa đủ dữ liệu</em></div></article></section>
    <section className="teacher-card risk-alerts-card"><div className="card-heading"><div><small>CẢNH BÁO ĐƯỢC LƯU</small><h2>Học sinh cần giáo viên theo dõi</h2><p>Mỗi cảnh báo được lưu riêng; lần phân tích tiếp theo sẽ cập nhật hoặc đóng cảnh báo.</p></div><b>{analytics.riskAlerts?.length || 0} đang mở</b></div>{analytics.riskAlerts?.length ? <div className="risk-alert-list">{analytics.riskAlerts.map((alert) => { const student = studentById.get(alert.student_id); return <article className="risk-alert-item" key={alert.id}><span className={`risk-alert-indicator ${alert.risk_level === 'Cao' ? 'high' : 'medium'}`}>{alert.risk_level === 'Cao' ? '!' : '◷'}</span><div className="risk-alert-content"><div><strong>{student?.student_name || 'Học sinh'}</strong><em className={alert.risk_level === 'Cao' ? 'high' : 'medium'}>{alert.risk_level}</em></div><p>{alert.reason}</p><small>Cập nhật {new Date(alert.last_seen_at).toLocaleString('vi-VN')}{alert.risk_score !== null ? ` · Điểm TB ${alert.risk_score}%` : ''}</small></div></article>; })}</div> : <div className="student-list-empty">Hiện không có cảnh báo đang mở.</div>}</section>
    <section className="teacher-card analytics-table-card"><div className="card-heading"><div><small>THEO DÕI HỌC SINH</small><h2>Học sinh và cảnh báo sớm</h2><p>Cảnh báo có lý do cụ thể; chưa đủ dữ liệu sẽ không kết luận rủi ro.</p></div></div>{students.length ? <div className="analytics-student-table"><div className="analytics-table-head"><span>Học sinh</span><span>Lượt làm</span><span>Điểm TB</span><span>Độ chính xác</span><span>Trạng thái</span></div>{students.map((student) => <div className="analytics-student-row" key={student.student_id}><div><strong>{student.student_name}</strong><small>{student.student_email}</small>{student.reasons?.map((reason) => <small className="analytics-risk-reason" key={reason}>• {reason}</small>)}</div><span>{student.attempts}</span><strong>{student.averageScore === null ? '—' : `${student.averageScore}%`}</strong><span>{student.accuracyRate === null ? '—' : `${student.accuracyRate}%`}{student.overdueAssignments > 0 && <small className="analytics-overdue-detail">{student.missedOverdueAssignments}/{student.overdueAssignments} bài quá hạn chưa nộp</small>}</span><em className={student.risk === 'Cao' ? 'high' : student.risk === 'Theo dõi' ? 'medium' : student.risk === 'Ổn định' ? 'low' : 'neutral'}>{student.risk}</em></div>)}</div> : <div className="student-list-empty">Chưa có học sinh hoặc dữ liệu để phân tích.</div>}</section>
    {analytics.recentResolvedAlerts?.length > 0 && <section className="teacher-card risk-alert-history"><div className="card-heading"><div><small>LỊCH SỬ CẢNH BÁO</small><h2>Cảnh báo đã đóng</h2></div></div>{analytics.recentResolvedAlerts.map((alert) => <article key={alert.id}><div><strong>{studentById.get(alert.student_id)?.student_name || 'Học sinh'}</strong><small>{alert.reason}</small></div><span>Đã đóng {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString('vi-VN') : ''}</span></article>)}</section>}
    <section className="teacher-card analytics-recent-card"><div className="card-heading"><div><small>LỊCH SỬ GẦN ĐÂY</small><h2>Các bài làm mới nhất</h2></div></div>{recentAttempts.length ? recentAttempts.slice(0, 8).map((attempt) => <div className="analytics-attempt-row" key={attempt.id}><div><strong>{attempt.student_name}</strong><small>{attempt.title} · {new Date(attempt.created_at).toLocaleDateString('vi-VN')}</small></div><b>{attempt.score}/{attempt.total}</b></div>) : <div className="student-list-empty">Chưa có bài làm nào.</div>}</section>
  </section>;
}
