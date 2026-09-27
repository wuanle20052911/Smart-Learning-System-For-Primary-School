import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const fileTypes = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown'
};

async function extractText(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (extension === 'txt' || extension === 'md') return file.text();
  if (extension === 'docx') return (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  if (extension === 'pdf') {
    const pdf = await getDocument({ data: buffer }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const pageContent = await page.getTextContent();
      pages.push(pageContent.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n');
  }
  throw new Error('Chỉ hỗ trợ PDF, DOCX, TXT hoặc Markdown.');
}

async function toBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export default function LessonStudio({ api, onMessage, onRefresh }) {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('Lớp 1');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [sourceMode, setSourceMode] = useState('local');
  const [sampleBucket, setSampleBucket] = useState('Math4');
  const [sampleFiles, setSampleFiles] = useState([]);
  const [sampleFilePath, setSampleFilePath] = useState('');
  const [sampleSource, setSampleSource] = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [subjectData, lessonData] = await Promise.all([
      api('/api/catalog/subjects'),
      api('/api/lessons/mine')
    ]);
    setSubjects(subjectData.subjects || []);
    setLessons(lessonData.lessons || []);
    setSubjectId((current) => current || subjectData.subjects?.[0]?.id || '');
  };

  useEffect(() => {
    refresh()
      .catch((error) => onMessage(`Không thể tải môn học và bài học: ${error.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      setChapterId('');
      return;
    }
    api(`/api/catalog/topics?subject_id=${encodeURIComponent(subjectId)}`)
      .then((data) => {
        const nextChapters = data.topics || [];
        setChapters(nextChapters);
        setChapterId((current) => nextChapters.some((item) => item.id === current) ? current : '');
      })
      .catch((error) => onMessage(`Không thể tải chương: ${error.message}`));
  }, [subjectId]);

  useEffect(() => {
    if (sourceMode !== 'sample') return;
    setSampleLoading(true);
    api(`/api/lessons/storage-files?bucket=${encodeURIComponent(sampleBucket)}`)
      .then((data) => setSampleFiles(data.files || []))
      .catch((error) => onMessage(`Không thể tải file mẫu ${sampleBucket}: ${error.message}`))
      .finally(() => setSampleLoading(false));
  }, [sourceMode, sampleBucket]);

  const createSubject = async (event) => {
    event.preventDefault();
    if (!subjectName.trim()) return;
    setBusy(true);
    try {
      const data = await api('/api/catalog/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: subjectName.trim() })
      });
      setSubjects((current) => [...current, data.subject]);
      setSubjectId(data.subject.id);
      setSubjectName('');
      onMessage('Đã tạo môn học. Tiếp theo, tạo chương cho môn này.');
    } catch (error) {
      onMessage(`Không thể tạo môn học: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const createChapter = async (event) => {
    event.preventDefault();
    if (!subjectId || !chapterName.trim()) return;
    setBusy(true);
    try {
      const data = await api('/api/catalog/topics', {
        method: 'POST',
        body: JSON.stringify({ subject_id: subjectId, name: chapterName.trim() })
      });
      setChapters((current) => [...current, data.topic]);
      setChapterId(data.topic.id);
      setChapterName('');
      onMessage('Đã tạo chương. Chọn chương này để thêm bài học.');
    } catch (error) {
      onMessage(`Không thể tạo chương: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const selectFile = async (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_BYTES) {
      event.target.value = '';
      onMessage('Tài liệu tải lên Supabase Storage tối đa 6 MB.');
      return;
    }
    try {
      const text = await extractText(nextFile);
      setFile(nextFile);
      setSampleFilePath('');
      setSampleSource(null);
      if (text.trim()) setContent(text.trim().slice(0, 18000));
      onMessage(text.trim() ? `Đã đọc nội dung ${nextFile.name}.` : 'File không có chữ để trích xuất; vẫn có thể lưu file gốc lên Storage.');
    } catch (error) {
      event.target.value = '';
      onMessage(`Không đọc được tài liệu: ${error.message}`);
    }
  };

  const selectSampleFile = async (objectPath) => {
    setSampleFilePath(objectPath);
    setSampleSource(null);
    if (!objectPath) return;
    setBusy(true);
    try {
      const signed = await api(`/api/lessons/storage-file-url?bucket=${encodeURIComponent(sampleBucket)}&path=${encodeURIComponent(objectPath)}`);
      const response = await fetch(signed.url);
      if (!response.ok) throw new Error('Không tải được file mẫu từ Supabase Storage.');
      const extension = objectPath.split('.').pop()?.toLowerCase();
      const sampleFile = new File([await response.blob()], objectPath.split('/').pop(), { type: fileTypes[extension] });
      const text = await extractText(sampleFile);
      setContent(text.trim().slice(0, 18000));
      setFile(null);
      setSampleSource({ bucket: sampleBucket, path: objectPath, fileName: sampleFile.name });
      onMessage(`Đã lấy nội dung mẫu từ ${sampleBucket}/${objectPath}.`);
    } catch (error) {
      setSampleFilePath('');
      onMessage(`Không đọc được file mẫu: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const subject = subjects.find((item) => item.id === subjectId);
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!subject || !chapter) {
      onMessage('Hãy chọn môn học và tạo/chọn chương trước.');
      return;
    }
    if (!title.trim() || (!content.trim() && !file && !sampleSource)) {
      onMessage('Nhập tên bài học và nội dung hoặc chọn tài liệu.');
      return;
    }
    setBusy(true);
    try {
      let material = sampleSource ? {
        source_bucket: sampleSource.bucket,
        source_path: sampleSource.path,
        source_filename: sampleSource.fileName
      } : {};
      if (file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        material = await api('/api/lessons/materials', {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || fileTypes[extension],
            contentBase64: await toBase64(file)
          })
        });
      }
      await api('/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          subject: subject.name,
          grade,
          topic: chapter.name,
          topic_id: chapter.id,
          content: content.trim(),
          source_filename: material.source_filename || null,
          source_bucket: material.source_bucket || null,
          source_path: material.source_path || null,
          published
        })
      });
      setTitle('');
      setDescription('');
      setContent('');
      setFile(null);
      setSampleFilePath('');
      setSampleSource(null);
      setPublished(false);
      formElement.reset();
      await refresh();
      onRefresh?.();
      onMessage(`Đã lưu bài học trong chương “${chapter.name}”${material.source_path ? `; nguồn file: ${material.source_bucket}/${material.source_path}` : ''}.`);
    } catch (error) {
      onMessage(`Không thể lưu bài học: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return <section className="lesson-studio">
    <div className="lesson-studio-intro"><div><span className="panel-kicker">NỘI DUNG HỌC TẬP</span><h2>Tạo bài học theo chương</h2><p>Chọn môn học → tạo chương → thêm bài học. Tài liệu gốc được lưu trên Supabase Storage.</p></div><span className="lesson-studio-count">{lessons.length} bài của bạn</span></div>
    {loading ? <section className="teacher-card lesson-studio-empty">Đang tải dữ liệu từ Supabase...</section> : <div className="lesson-studio-grid">
      <section className="teacher-card lesson-studio-setup">
        <div className="lesson-studio-step"><span>1</span><div><h3>Môn học</h3><small>{subjects.length ? 'Chọn môn có sẵn hoặc thêm môn mới' : 'Tạo môn học để bắt đầu'}</small></div></div>
        <label>Môn học<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Chọn môn học</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <form className="lesson-inline-create" onSubmit={createSubject}><input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Tên môn học mới" aria-label="Tên môn học mới" /><button type="submit" disabled={busy || !subjectName.trim()}>＋</button></form>
        <div className="lesson-studio-step"><span>2</span><div><h3>Chương</h3><small>{subjectId ? 'Tạo hoặc chọn chương thuộc môn đã chọn' : 'Chọn môn học trước'}</small></div></div>
        <label>Chương<select value={chapterId} onChange={(event) => setChapterId(event.target.value)} disabled={!subjectId}><option value="">Chọn chương</option>{chapters.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <form className="lesson-inline-create" onSubmit={createChapter}><input value={chapterName} onChange={(event) => setChapterName(event.target.value)} placeholder="Tên chương mới" aria-label="Tên chương mới" disabled={!subjectId} /><button type="submit" disabled={busy || !subjectId || !chapterName.trim()}>＋</button></form>
      </section>
      <form className="teacher-card lesson-studio-form" onSubmit={saveLesson}>
        <div className="lesson-studio-step"><span>3</span><div><h3>Bài học</h3><small>{chapterId ? `Thêm vào chương ${chapters.find((item) => item.id === chapterId)?.name || ''}` : 'Chọn chương trước khi tạo bài'}</small></div></div>
        <label>Tên bài học<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength="120" placeholder="Ví dụ: Phép cộng trong phạm vi 100" /></label>
        <div className="lesson-form-row"><label>Khối lớp<select value={grade} onChange={(event) => setGrade(event.target.value)}>{[1, 2, 3, 4, 5].map((level) => <option value={`Lớp ${level}`} key={level}>Lớp {level}</option>)}</select></label><label className="lesson-publish-toggle"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Xuất bản</label></div>
        <label>Mô tả<textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mục tiêu của bài học" /></label>
        <div className="lesson-source-picker"><div className="lesson-source-tabs" role="tablist" aria-label="Nguồn tài liệu"><button type="button" role="tab" aria-selected={sourceMode === 'local'} className={sourceMode === 'local' ? 'active' : ''} onClick={() => { setSourceMode('local'); setSampleSource(null); setSampleFilePath(''); }}>File từ máy</button><button type="button" role="tab" aria-selected={sourceMode === 'sample'} className={sourceMode === 'sample' ? 'active' : ''} onClick={() => { setSourceMode('sample'); setFile(null); }}>File mẫu Supabase</button></div>
          {sourceMode === 'local' ? <label className="lesson-file-picker"><span>📄</span><b>{file?.name || 'Chọn tài liệu từ máy'}</b><small>PDF, DOCX, TXT, Markdown · tối đa 6 MB</small><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={selectFile} /></label> : <div className="lesson-sample-picker"><label>Bucket<select value={sampleBucket} onChange={(event) => { setSampleBucket(event.target.value); setSampleFilePath(''); setSampleSource(null); }}><option value="Math4">Math4</option><option value="Chapter1">Chapter1</option></select></label><label>File mẫu<select value={sampleFilePath} onChange={(event) => selectSampleFile(event.target.value)} disabled={sampleLoading || busy}><option value="">{sampleLoading ? 'Đang tải danh sách file...' : 'Chọn file trong Storage'}</option>{sampleFiles.map((item) => <option value={item.path} key={item.path}>{item.name}{item.size ? ` · ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</option>)}</select></label><small>{sampleSource ? `Đang dùng ${sampleSource.bucket}/${sampleSource.path}` : 'Danh sách được lấy trực tiếp từ bucket Supabase Storage.'}</small></div>}
        </div>
        <label>Nội dung cho học sinh<textarea rows="6" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Nội dung được trích từ tài liệu hoặc nhập trực tiếp. Nội dung này giúp AI tạo bài tập." /></label>
        <button className="teacher-create lesson-save" type="submit" disabled={busy || !chapterId}>{busy ? 'Đang lưu lên Supabase...' : 'Lưu bài học vào chương'}</button>
      </form>
      <section className="teacher-card lesson-studio-list"><div className="card-heading"><div><h3>Bài học đã tạo</h3><small>Dữ liệu lấy từ bảng lessons trên Supabase</small></div></div>{lessons.length ? lessons.map((lesson) => <article className="lesson-storage-row" key={lesson.id}><div><strong>{lesson.title}</strong><small>{lesson.subject} · {lesson.topic || 'Chưa phân chương'} · {lesson.grade}</small>{lesson.source_path && <small className="lesson-storage-path">Storage: {lesson.source_bucket}/{lesson.source_path}</small>}</div><span className={lesson.published ? 'published' : ''}>{lesson.published ? 'Đã xuất bản' : 'Bản nháp'}</span></article>) : <p className="lesson-studio-empty">Chưa có bài học. Tạo chương rồi thêm bài đầu tiên nhé.</p>}</section>
    </div>}
  </section>;
}
