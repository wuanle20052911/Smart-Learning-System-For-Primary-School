import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { deduplicateLessonsBySourceNumber, extractLearningText, getLessonChapterName, getLessonDisplayTitle, getLessonSourceCode } from '../../services/learningMaterials.js';
import { LESSON_GAMES, MAX_LESSON_GAMES } from './lessonGames.js';
import LessonGameSession from './LessonGameSession.jsx';
import { compressStoryImage } from '../../services/imageCompression.js';

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_STORY_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_STORY_SLIDES = 20;
const storyImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const fileTypes = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown'
};

function groupLessonsByChapter(lessons) {
  const groups = new Map();
  lessons.forEach((lesson) => {
    const sourceCode = getLessonSourceCode(lesson);
    const name = getLessonChapterName(lesson);
    const groupKey = sourceCode ? `source-chapter-${lesson.subject || ''}-${sourceCode.chapterNumber}` : lesson.topic_id || `${lesson.subject || ''}:${lesson.grade || ''}:${name}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { id: lesson.topic_id || `lesson:${groupKey}`, topicId: lesson.topic_id || null, name, subject: lesson.subject, lessons: [] });
    groups.get(groupKey).lessons.push(lesson);
  });
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      lessons: deduplicateLessonsBySourceNumber(group.lessons).sort((left, right) => {
        const leftCode = getLessonSourceCode(left)?.lessonNumber;
        const rightCode = getLessonSourceCode(right)?.lessonNumber;
        if (leftCode !== undefined && rightCode !== undefined && leftCode !== rightCode) return leftCode - rightCode;
        return getLessonDisplayTitle(left).localeCompare(getLessonDisplayTitle(right), undefined, { numeric: true, sensitivity: 'base' });
      })
    }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
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
  const [sampleBuckets, setSampleBuckets] = useState(['Math4']);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('Lớp 1');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [storySlides, setStorySlides] = useState([]);
  const [gameSlugs, setGameSlugs] = useState([]);
  const [previewGameType, setPreviewGameType] = useState('');
  const [dropSlideId, setDropSlideId] = useState(null);
  const [draggedSlide, setDraggedSlide] = useState(null);
  const storySlidesContainerRef = useRef(null);
  const storySlidePositionsRef = useRef(null);
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
  const [editingLesson, setEditingLesson] = useState(null);
  const lessonGroups = groupLessonsByChapter(lessons);
  const lessonChapterOptions = groupLessonsByChapter(lessons.filter((lesson) => {
    const lessonSubject = lesson.subject?.trim().toLocaleLowerCase();
    const selectedSubject = subjects.find((item) => item.id === subjectId)?.name?.trim().toLocaleLowerCase();
    return !selectedSubject || !lessonSubject || lessonSubject === selectedSubject;
  }));
  const chapterOptions = chapters.map((chapter) => ({ id: chapter.id, topicId: chapter.id, name: chapter.name }));
  lessonChapterOptions.forEach((group) => {
    const existingOption = chapterOptions.find((option) => option.topicId === group.topicId || option.name.toLocaleLowerCase() === group.name.toLocaleLowerCase());
    if (existingOption) {
      if (getLessonSourceCode(group.lessons[0])) existingOption.name = group.name;
      return;
    }
    chapterOptions.push({ id: group.id, topicId: group.topicId, name: group.name });
  });
  const selectedChapter = chapterOptions.find((chapter) => chapter.id === chapterId);

  useLayoutEffect(() => {
    const previousPositions = storySlidePositionsRef.current;
    const slideElements = storySlidesContainerRef.current?.querySelectorAll('[data-slide-id]');
    if (!previousPositions || !slideElements) return;
    storySlidePositionsRef.current = null;
    slideElements.forEach((element) => {
      const previousPosition = previousPositions.get(element.dataset.slideId);
      if (!previousPosition) return;
      const currentPosition = element.getBoundingClientRect();
      const offsetX = previousPosition.left - currentPosition.left;
      const offsetY = previousPosition.top - currentPosition.top;
      if (!offsetX && !offsetY) return;
      element.animate([
        { transform: `translate(${offsetX}px, ${offsetY}px)` },
        { transform: 'translate(0, 0)' }
      ], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
  }, [storySlides]);

  const refresh = async () => {
    const [subjectData, lessonData, storageChapterData] = await Promise.all([
      api('/api/catalog/subjects'),
      api('/api/lessons/mine'),
      api('/api/lessons/storage-chapters')
    ]);
    setSubjects(subjectData.subjects || []);
    setLessons(lessonData.lessons || []);
    setSampleBuckets(['Math4', ...(storageChapterData.chapters || [])]);
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
        setChapterId((current) => nextChapters.some((item) => item.id === current)
          || lessonChapterOptions.some((item) => item.id === current)
          ? current
          : '');
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
      const text = await extractLearningText(nextFile);
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

  const selectStoryImages = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (files.some((image) => !storyImageTypes.has(image.type) || image.size > MAX_STORY_IMAGE_BYTES)) {
      onMessage('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF, tối đa 5 MB mỗi ảnh.');
      return;
    }
    const availableSlots = MAX_STORY_SLIDES - storySlides.length;
    if (availableSlots <= 0) {
      onMessage(`Mỗi câu chuyện chỉ có tối đa ${MAX_STORY_SLIDES} bức ảnh.`);
      return;
    }
    const addedSlides = files.slice(0, availableSlots).map((image) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: image,
      path: '',
      caption: '',
      previewUrl: URL.createObjectURL(image),
      localPreview: true
    }));
    setStorySlides((current) => [...current, ...addedSlides]);
    if (files.length > availableSlots) onMessage(`Chỉ thêm ${availableSlots} ảnh để đủ giới hạn ${MAX_STORY_SLIDES} ảnh.`);
  };

  const removeStorySlide = (index) => {
    setStorySlides((current) => {
      const removedSlide = current[index];
      if (removedSlide?.localPreview) URL.revokeObjectURL(removedSlide.previewUrl);
      return current.filter((_, slideIndex) => slideIndex !== index);
    });
  };

  const moveStorySlide = (slideId, targetId) => {
    if (!slideId || !targetId || slideId === targetId) return;
    const slideElements = storySlidesContainerRef.current?.querySelectorAll('[data-slide-id]');
    storySlidePositionsRef.current = new Map(Array.from(slideElements || []).map((element) => [
      element.dataset.slideId,
      element.getBoundingClientRect()
    ]));
    setStorySlides((current) => {
      const fromIndex = current.findIndex((slide) => slide.id === slideId);
      const toIndex = current.findIndex((slide) => slide.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const nextSlides = [...current];
      const [movedSlide] = nextSlides.splice(fromIndex, 1);
      nextSlides.splice(toIndex, 0, movedSlide);
      return nextSlides;
    });
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
      const text = await extractLearningText(sampleFile);
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

  const clearLessonForm = (formElement) => {
    storySlides.forEach((slide) => {
      if (slide.localPreview) URL.revokeObjectURL(slide.previewUrl);
    });
    setEditingLesson(null);
    setTitle('');
    setDescription('');
    setContent('');
    setStorySlides([]);
    setGameSlugs([]);
    setPreviewGameType('');
    setDraggedSlide(null);
    setFile(null);
    setSampleFilePath('');
    setSampleSource(null);
    setPublished(false);
    formElement?.reset();
  };

  const editLesson = async (lesson) => {
    setBusy(true);
    let slides = [];
    try {
      if (lesson.story_slides?.length) {
        const data = await api(`/api/lessons/${lesson.id}/story-images`);
        slides = data.slides || [];
      }
    } catch (error) {
      onMessage(`Không thể tải ảnh câu chuyện: ${error.message}`);
      setBusy(false);
      return;
    }
    storySlides.forEach((slide) => {
      if (slide.localPreview) URL.revokeObjectURL(slide.previewUrl);
    });
    const subject = subjects.find((item) => item.name.trim().toLocaleLowerCase() === lesson.subject?.trim().toLocaleLowerCase());
    const chapter = chapterOptions.find((item) => item.topicId === lesson.topic_id)
      || chapterOptions.find((item) => item.name.toLocaleLowerCase() === getLessonChapterName(lesson).toLocaleLowerCase());
    setEditingLesson(lesson);
    setSubjectId(subject?.id || '');
    setChapterId(lesson.topic_id || chapter?.id || groupLessonsByChapter([lesson])[0]?.id || '');
    setTitle(lesson.title || '');
    setGrade(lesson.grade || 'Lớp 1');
    setDescription(lesson.description || '');
    setContent(lesson.content || '');
    setStorySlides(slides.map((slide, index) => ({
      ...slide,
      id: `${lesson.id}-${index}`,
      file: null,
      previewUrl: slide.url,
      localPreview: false
    })));
    setGameSlugs(Array.isArray(lesson.game_slugs) ? lesson.game_slugs : []);
    setFile(null);
    setSampleFilePath('');
    setSampleSource(null);
    setPublished(lesson.published === true);
    setSourceMode('local');
    setBusy(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài học “${getLessonDisplayTitle(lesson)}” không?`)) return;
    setBusy(true);
    try {
      await api(`/api/lessons/${lesson.id}`, { method: 'DELETE' });
      if (editingLesson?.id === lesson.id) clearLessonForm();
      await refresh();
      onRefresh?.();
      onMessage(`Đã xóa bài học “${getLessonDisplayTitle(lesson)}”.`);
    } catch (error) {
      onMessage(`Không thể xóa bài học: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const subject = subjects.find((item) => item.id === subjectId);
    const chapter = chapterOptions.find((item) => item.id === chapterId);
    if (!subject || !chapter) {
      onMessage('Hãy chọn môn học và tạo/chọn chương trước.');
      return;
    }
    if (!title.trim() || (!content.trim() && !file && !sampleSource && !editingLesson?.source_path)) {
      onMessage('Nhập tên bài học và nội dung hoặc chọn tài liệu.');
      return;
    }
    setBusy(true);
    try {
      let material = sampleSource ? {
        source_bucket: sampleSource.bucket,
        source_path: sampleSource.path,
        source_filename: sampleSource.fileName
      } : editingLesson ? {
        source_bucket: editingLesson.source_bucket,
        source_path: editingLesson.source_path,
        source_filename: editingLesson.source_filename
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
      const savedStorySlides = [];
      for (const slide of storySlides) {
        let objectPath = slide.path;
        if (slide.file) {
          const image = await compressStoryImage(slide.file);
          const uploaded = await api('/api/lessons/story-images', {
            method: 'POST',
            body: JSON.stringify({
              fileName: image.name,
              contentType: image.type,
              contentBase64: await toBase64(image)
            })
          });
          objectPath = uploaded.path;
        }
        savedStorySlides.push({ path: objectPath, caption: slide.caption });
      }
      await api(editingLesson ? `/api/lessons/${editingLesson.id}` : '/api/lessons', {
        method: editingLesson ? 'PATCH' : 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          subject: subject.name,
          grade,
          topic: chapter.name,
          topic_id: chapter.topicId,
          content: content.trim(),
          story_slides: savedStorySlides,
          game_slugs: gameSlugs,
          source_filename: material.source_filename || null,
          source_bucket: material.source_bucket || null,
          source_path: material.source_path || null,
          published
        })
      });
      const wasEditing = Boolean(editingLesson);
      clearLessonForm(formElement);
      await refresh();
      onRefresh?.();
      onMessage(`${wasEditing ? 'Đã cập nhật' : 'Đã lưu'} bài học trong chương “${chapter.name}”${material.source_path ? `; nguồn file: ${material.source_bucket}/${material.source_path}` : ''}.`);
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
        <label>Chương<select value={chapterId} onChange={(event) => setChapterId(event.target.value)} disabled={!subjectId}><option value="">Chọn chương</option>{chapterOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <form className="lesson-inline-create" onSubmit={createChapter}><input value={chapterName} onChange={(event) => setChapterName(event.target.value)} placeholder="Tên chương mới" aria-label="Tên chương mới" disabled={!subjectId} /><button type="submit" disabled={busy || !subjectId || !chapterName.trim()}>＋</button></form>
      </section>
      <form className="teacher-card lesson-studio-form" onSubmit={saveLesson}>
        <div className="lesson-studio-step"><span>3</span><div><h3>{editingLesson ? 'Chỉnh sửa bài học' : 'Bài học'}</h3><small>{chapterId ? `${editingLesson ? 'Chuyển hoặc giữ trong chương' : 'Thêm vào chương'} ${selectedChapter?.name || ''}` : 'Chọn chương trước khi tạo bài'}</small></div></div>
        <label>Tên bài học<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength="120" placeholder="Ví dụ: Phép cộng trong phạm vi 100" /></label>
        <div className="lesson-form-row"><label>Khối lớp<select value={grade} onChange={(event) => setGrade(event.target.value)}>{[1, 2, 3, 4, 5].map((level) => <option value={`Lớp ${level}`} key={level}>Lớp {level}</option>)}</select></label><label className="lesson-publish-toggle"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Xuất bản</label></div>
        <label>Mô tả<textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mục tiêu của bài học" /></label>
        <div className="lesson-source-picker"><div className="lesson-source-tabs" role="tablist" aria-label="Nguồn tài liệu"><button type="button" role="tab" aria-selected={sourceMode === 'local'} className={sourceMode === 'local' ? 'active' : ''} onClick={() => { setSourceMode('local'); setSampleSource(null); setSampleFilePath(''); }}>File từ máy</button><button type="button" role="tab" aria-selected={sourceMode === 'sample'} className={sourceMode === 'sample' ? 'active' : ''} onClick={() => { setSourceMode('sample'); setFile(null); }}>File mẫu Supabase</button></div>
          {sourceMode === 'local' ? <label className="lesson-file-picker"><span>📄</span><b>{file?.name || (editingLesson?.source_filename ? `Giữ tài liệu hiện tại: ${editingLesson.source_filename}` : 'Chọn tài liệu từ máy')}</b><small>PDF, DOCX, TXT, Markdown · tối đa 6 MB</small><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={selectFile} /></label> : <div className="lesson-sample-picker"><label>Bucket<select value={sampleBucket} onChange={(event) => { setSampleBucket(event.target.value); setSampleFilePath(''); setSampleSource(null); }}><option value="">Chọn chương / bucket</option>{sampleBuckets.map((bucket) => <option value={bucket} key={bucket}>{bucket}</option>)}</select></label><label>File mẫu<select value={sampleFilePath} onChange={(event) => selectSampleFile(event.target.value)} disabled={!sampleBucket || sampleLoading || busy}><option value="">{sampleLoading ? 'Đang tải danh sách file...' : 'Chọn file trong Storage'}</option>{sampleFiles.map((item) => <option value={item.path} key={item.path}>{item.name}{item.size ? ` · ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</option>)}</select></label><small>{sampleSource ? `Đang dùng ${sampleSource.bucket}/${sampleSource.path}` : editingLesson?.source_filename ? `Để giữ tài liệu hiện tại, không cần chọn file mới (${editingLesson.source_filename}).` : 'Danh sách chương và file được lấy từ Supabase Storage.'}</small></div>}
        </div>
        <label>Nội dung cho học sinh<textarea rows="6" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Nội dung được trích từ tài liệu hoặc nhập trực tiếp. Nội dung này giúp AI tạo bài tập." /></label>
        <section className="lesson-story-editor">
          <div className="lesson-story-editor-heading"><div><strong>Truyện tranh mở đầu bài học</strong><small>Kéo thả các ảnh trên hàng để thay đổi thứ tự như các slide.</small></div><span>{storySlides.length}/{MAX_STORY_SLIDES}</span></div>
          <label className="lesson-story-picker"><span>＋</span><b>Thêm ảnh vào câu chuyện</b><small>JPG, PNG, WEBP hoặc GIF · tối đa 5 MB mỗi ảnh</small><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={selectStoryImages} disabled={busy || storySlides.length >= MAX_STORY_SLIDES} /></label>
          {storySlides.length > 0 && <div className="lesson-story-slides" ref={storySlidesContainerRef}>{storySlides.map((slide, index) => <article
            className={`lesson-story-slide${draggedSlide === slide.id ? ' is-dragged' : ''}${dropSlideId === slide.id ? ' is-drop-target' : ''}`}
            key={slide.id}
            data-slide-id={slide.id}
            draggable
            onDragStart={(event) => { setDraggedSlide(slide.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', slide.id); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!draggedSlide || draggedSlide === slide.id || dropSlideId === slide.id) return;
              setDropSlideId(slide.id);
              moveStorySlide(draggedSlide, slide.id);
            }}
            onDrop={(event) => { event.preventDefault(); setDraggedSlide(null); setDropSlideId(null); }}
            onDragEnd={() => { setDraggedSlide(null); setDropSlideId(null); }}
          >
            <div className="lesson-story-slide-top"><span className="lesson-story-drag-handle" aria-hidden="true" title="Kéo để đổi thứ tự">⠿</span><strong>Slide {index + 1}</strong><button type="button" className="lesson-story-remove" disabled={busy} onClick={() => removeStorySlide(index)}>Xóa</button></div>
            <img src={slide.previewUrl} alt={`Ảnh ${index + 1}: ${slide.file?.name || 'trong câu chuyện'}`} />
            <div className="lesson-story-slide-details"><input aria-label={`Chú thích ảnh ${index + 1}`} value={slide.caption} maxLength="300" onChange={(event) => setStorySlides((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} placeholder="Chú thích (không bắt buộc)" /></div>
          </article>)}</div>}
        </section>
        <section className="lesson-game-editor">
          <div className="lesson-story-editor-heading"><div><strong>Trò chơi sau bài học</strong><small>Chọn trò chơi học sinh được chơi sau khi đọc truyện. Thứ tự bấm chọn là thứ tự hiển thị.</small></div><span>{gameSlugs.length}/{MAX_LESSON_GAMES}</span></div>
          <div className="lesson-game-options">{LESSON_GAMES.map((game) => {
            const order = gameSlugs.indexOf(game.slug);
            const checked = order >= 0;
            const inputId = `lesson-game-${game.slug}`;
            return <div className={`lesson-game-option${checked ? ' checked' : ''}`} key={game.slug}>
              <input id={inputId} type="checkbox" aria-label={game.title} checked={checked} disabled={busy || (!checked && gameSlugs.length >= MAX_LESSON_GAMES)} onChange={() => setGameSlugs((current) => (current.includes(game.slug) ? current.filter((slug) => slug !== game.slug) : [...current, game.slug]))} />
              <label htmlFor={inputId} className="lesson-game-option-label">
                <span className="lesson-game-option-icon" aria-hidden="true">{game.icon}</span>
                <span className="lesson-game-option-text"><b>{game.title}</b><small>{game.description}</small></span>
                {checked && <span className="lesson-game-option-order" aria-label={`Thứ tự ${order + 1}`}>{order + 1}</span>}
              </label>
              {game.gameType
                ? <button type="button" className="lesson-game-preview" onClick={() => setPreviewGameType(game.gameType)}>Xem thử</button>
                : <a href={game.href} target="_blank" rel="noopener noreferrer">Xem thử ↗</a>}
            </div>;
          })}</div>
        </section>
        <button className="teacher-create lesson-save" type="submit" disabled={busy || !chapterId}>{busy ? 'Đang lưu lên Supabase...' : editingLesson ? 'Cập nhật bài học' : 'Lưu bài học vào chương'}</button>
        {editingLesson && <button className="lesson-cancel-edit" type="button" disabled={busy} onClick={() => clearLessonForm()}>Hủy chỉnh sửa</button>}
      </form>
      <section className="teacher-card lesson-studio-list"><div className="card-heading"><div><h3>Bài học đã tạo</h3><small>Dữ liệu lấy từ bảng lessons trên Supabase</small></div></div>{lessonGroups.length ? lessonGroups.map((group) => <section className="lesson-storage-chapter" key={group.id}><div className="lesson-storage-chapter-heading"><strong>{group.name}</strong><small>{group.subject || 'Môn học'} · {group.lessons.length} bài</small></div>{group.lessons.map((lesson) => <article className="lesson-storage-row" key={lesson.id}><div><strong>{getLessonDisplayTitle(lesson)}</strong><small>{lesson.subject} · {lesson.grade}</small>{lesson.source_path && <small className="lesson-storage-path">Tài liệu: {lesson.source_filename || `${lesson.source_bucket}/${lesson.source_path}`}</small>}</div><div className="lesson-storage-actions"><span className={lesson.published ? 'published' : ''}>{lesson.published ? 'Đã xuất bản' : 'Bản nháp'}</span><button type="button" disabled={busy} onClick={() => editLesson(lesson)}>Sửa</button><button className="lesson-delete" type="button" disabled={busy} onClick={() => deleteLesson(lesson)}>Xóa</button></div></article>)}</section>) : <p className="lesson-studio-empty">Chưa có bài học. Tạo chương rồi thêm bài đầu tiên nhé.</p>}</section>
    </div>}
    {previewGameType && <div className="gm-modal" role="dialog" aria-modal="true" aria-label="Xem thử trò chơi">
      <div className="gm-modal-card is-wide">
        <div className="gm-panel-head"><span className="gm-kicker">XEM THỬ · BỘ CÂU HỎI MẪU</span><button type="button" className="gm-icon-button" aria-label="Đóng xem thử" onClick={() => setPreviewGameType('')}>×</button></div>
        <LessonGameSession gameType={previewGameType} onBack={() => setPreviewGameType('')} />
      </div>
    </div>}
  </section>;
}
