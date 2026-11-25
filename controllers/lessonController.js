const lessonModel = require('../models/lessonModel');
const { getSupabaseClient } = require('../models/supabaseClient');
const { randomUUID } = require('crypto');
const path = require('path');
const { normalizeGameSlugs } = require('../services/lessonGames');

const colors = new Set(['blue', 'yellow', 'green', 'pink']);
const materialBucket = 'lesson-materials';
const chapterStorageBuckets = new Set(['Chapter1', 'Chapter2', 'Chapter3']);
const sampleBuckets = new Set(['Math4', ...chapterStorageBuckets]);
const sourceBuckets = new Set([materialBucket, ...sampleBuckets]);
const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'docm', 'odt', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'json', 'txt', 'md']);
const readableChapterExtensions = new Set(['pdf', 'docx', 'csv', 'json', 'txt', 'md']);
const allowedMaterialTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]);
const allowedStoryImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function normalizeStorySlides(slides, userId) {
  if (slides === undefined) return [];
  if (!Array.isArray(slides) || slides.length > 20) {
    throw new Error('Câu chuyện chỉ được có tối đa 20 bức ảnh.');
  }
  const paths = new Set();
  return slides.map((slide) => {
    const objectPath = typeof slide?.path === 'string' ? slide.path.trim() : '';
    if (!objectPath.startsWith(`${userId}/`) || paths.has(objectPath)) {
      throw new Error('Ảnh câu chuyện không hợp lệ. Vui lòng tải ảnh lên lại.');
    }
    paths.add(objectPath);
    return {
      path: objectPath,
      caption: typeof slide.caption === 'string' ? slide.caption.trim().slice(0, 300) : ''
    };
  });
}

function normalizeLesson(body = {}, userId) {
  const sourcePath = typeof body.source_path === 'string' ? body.source_path.trim().slice(0, 500) : null;
  const sourceBucket = sourcePath
    ? (typeof body.source_bucket === 'string' && sourceBuckets.has(body.source_bucket) ? body.source_bucket : materialBucket)
    : null;
  const lesson = {
    title: typeof body.title === 'string' ? body.title.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    subject: typeof body.subject === 'string' ? body.subject.trim() : 'Toán',
    grade: typeof body.grade === 'string' ? body.grade.trim() : 'Tiểu học',
    topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : 'Chưa phân loại',
    topic_id: typeof body.topic_id === 'string' && body.topic_id ? body.topic_id : null,
    content: typeof body.content === 'string' ? body.content.trim().slice(0, 18000) : '',
    story_slides: normalizeStorySlides(body.story_slides, userId),
    source_filename: typeof body.source_filename === 'string' ? body.source_filename.trim().slice(0, 255) : null,
    source_bucket: sourceBucket,
    source_path: sourcePath,
    color: colors.has(body.color) ? body.color : 'blue',
    published: body.published === true
  };
  const gameSlugs = normalizeGameSlugs(body.game_slugs);
  if (gameSlugs !== undefined) lesson.game_slugs = gameSlugs;
  if (lesson.title.length < 2 || lesson.title.length > 120) {
    throw new Error('Tên bài học phải dài từ 2 đến 120 ký tự.');
  }
  return lesson;
}

async function getStorageFiles(accessToken, bucket, supportedExtensions = allowedExtensions) {
  const storage = getSupabaseClient(accessToken).storage.from(bucket);
  const files = [];
  const visit = async (folder = '') => {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(folder, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) throw error;
      if (!data?.length) break;
      for (const item of data) {
        const itemPath = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null && !item.metadata) {
          await visit(itemPath);
          continue;
        }
        const extension = item.name.split('.').pop()?.toLowerCase();
        if (!supportedExtensions.has(extension)) continue;
        files.push({
          name: itemPath,
          path: itemPath,
          size: item.metadata?.size || 0,
          updatedAt: item.updated_at || item.created_at || null
        });
      }
      if (data.length < 100) break;
    }
  };
  await visit();
  return files.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

async function listStorageFiles(req, res) {
  const bucket = req.query.bucket;
  if (!sampleBuckets.has(bucket)) return res.status(400).json({ error: 'Bucket mẫu không hợp lệ.' });
  try {
    return res.json({ bucket, files: await getStorageFiles(req.accessToken, bucket) });
  } catch (error) {
    console.error(`Could not list ${bucket} sample files:`, error);
    return res.status(500).json({ error: `Không thể đọc file trong bucket ${bucket}. Hãy kiểm tra policy Storage.` });
  }
}

function listStorageChapters(req, res) {
  return res.json({ chapters: Array.from(chapterStorageBuckets) });
}

async function listStorageChapterFiles(req, res) {
  const { bucket } = req.params;
  if (!chapterStorageBuckets.has(bucket)) return res.status(404).json({ error: 'Không tìm thấy chương học.' });
  try {
    return res.json({ bucket, files: await getStorageFiles(req.accessToken, bucket, readableChapterExtensions) });
  } catch (error) {
    console.error(`Could not list student chapter files for ${bucket}:`, error);
    return res.status(500).json({ error: `Không thể tải tài liệu của ${bucket}. Hãy kiểm tra policy Storage.` });
  }
}

async function createStorageChapterFileUrl(req, res) {
  const { bucket } = req.params;
  const objectPath = req.query.path;
  const extension = typeof objectPath === 'string' ? objectPath.split('.').pop()?.toLowerCase() : '';
  if (!chapterStorageBuckets.has(bucket) || typeof objectPath !== 'string' || !objectPath.trim() || !readableChapterExtensions.has(extension)) {
    return res.status(400).json({ error: 'Đường dẫn tài liệu chương không hợp lệ.' });
  }
  try {
    const { data, error } = await getSupabaseClient(req.accessToken)
      .storage
      .from(bucket)
      .createSignedUrl(objectPath, 60);
    if (error) throw error;
    return res.json({ url: data.signedUrl });
  } catch (error) {
    console.error(`Could not sign student chapter file URL for ${bucket}:`, error);
    return res.status(500).json({ error: 'Không thể mở tài liệu. Hãy kiểm tra policy Storage.' });
  }
}

async function createStorageFileUrl(req, res) {
  const { bucket, path: objectPath } = req.query;
  const extension = typeof objectPath === 'string' ? objectPath.split('.').pop()?.toLowerCase() : '';
  if (!sourceBuckets.has(bucket) || typeof objectPath !== 'string' || !objectPath.trim() || !allowedExtensions.has(extension)) {
    return res.status(400).json({ error: 'Đường dẫn file mẫu không hợp lệ.' });
  }
  try {
    const { data, error } = await getSupabaseClient(req.accessToken)
      .storage
      .from(bucket)
      .createSignedUrl(objectPath, 60);
    if (error) throw error;
    return res.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Could not sign sample material URL:', error);
    return res.status(500).json({ error: 'Không thể mở file mẫu. Hãy kiểm tra policy đọc Storage.' });
  }
}

async function uploadMaterial(req, res) {
  const { fileName, contentType, contentBase64 } = req.body || {};
  if (typeof fileName !== 'string' || !fileName.trim() || typeof contentBase64 !== 'string' || !contentBase64) {
    return res.status(400).json({ error: 'Vui lòng chọn tài liệu cần tải lên.' });
  }
  if (!allowedMaterialTypes.has(contentType)) {
    return res.status(400).json({ error: 'Chỉ hỗ trợ PDF, DOCX, TXT hoặc Markdown.' });
  }
  if (contentBase64.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'Tài liệu tối đa 6 MB.' });
  }

  try {
    const buffer = Buffer.from(contentBase64, 'base64');
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'Tài liệu trống hoặc vượt quá 6 MB.' });
    }
    const originalName = path.basename(fileName.trim()).slice(0, 255);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'lesson-material';
    const objectPath = `${req.user.id}/${randomUUID()}-${safeName}`;
    const { data, error } = await getSupabaseClient(req.accessToken)
      .storage
      .from(materialBucket)
      .upload(objectPath, buffer, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return res.status(201).json({
      source_bucket: materialBucket,
      source_path: data.path,
      source_filename: originalName
    });
  } catch (error) {
    console.error('Could not upload lesson material:', error);
    return res.status(400).json({ error: error.message || 'Không thể tải tài liệu lên Supabase Storage.' });
  }
}

async function uploadStoryImage(req, res) {
  const { fileName, contentType, contentBase64 } = req.body || {};
  if (typeof fileName !== 'string' || !fileName.trim() || typeof contentBase64 !== 'string' || !contentBase64) {
    return res.status(400).json({ error: 'Vui lòng chọn ảnh cần tải lên.' });
  }
  if (!allowedStoryImageTypes.has(contentType)) {
    return res.status(400).json({ error: 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.' });
  }
  if (contentBase64.length > 7 * 1024 * 1024 || !/^[\da-z+/]+={0,2}$/i.test(contentBase64)) {
    return res.status(413).json({ error: 'Ảnh trống hoặc vượt quá 5 MB.' });
  }

  try {
    const buffer = Buffer.from(contentBase64, 'base64');
    const signatures = {
      'image/jpeg': buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      'image/png': buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/webp': buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
      'image/gif': buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
    };
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 || !signatures[contentType]) {
      return res.status(400).json({ error: 'Ảnh không hợp lệ hoặc vượt quá 5 MB.' });
    }
    const originalName = path.basename(fileName.trim()).slice(0, 255);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'story-image';
    const objectPath = `${req.user.id}/${randomUUID()}-${safeName}`;
    const { data, error } = await getSupabaseClient(req.accessToken)
      .storage
      .from(materialBucket)
      .upload(objectPath, buffer, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return res.status(201).json({ path: data.path });
  } catch (error) {
    console.error('Could not upload lesson story image:', error);
    return res.status(400).json({ error: error.message || 'Không thể tải ảnh câu chuyện lên Supabase Storage.' });
  }
}

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền quản lý bài học.' });
  }
  return next();
}

async function listPublished(req, res) {
  try {
    return res.json({ lessons: await lessonModel.listPublished(req.accessToken) });
  } catch (error) {
    console.error('Could not list published lessons:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách bài học.' });
  }
}

async function listMine(req, res) {
  try {
    return res.json({ lessons: await lessonModel.listForTeacher(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list teacher lessons:', error);
    return res.status(500).json({ error: 'Không thể tải bài học của giáo viên.' });
  }
}

async function getMaterial(req, res) {
  try {
    const lesson = await lessonModel.getById(req.accessToken, req.params.id);
    if (!lesson?.source_bucket || !lesson.source_path) {
      return res.status(404).json({ error: 'Bài học không có tài liệu trong Supabase Storage.' });
    }
    const { data, error } = await getSupabaseClient(req.accessToken)
      .storage
      .from(lesson.source_bucket)
      .createSignedUrl(lesson.source_path, 60);
    if (error) throw error;
    return res.json({ url: data.signedUrl, fileName: lesson.source_filename });
  } catch (error) {
    console.error('Could not create lesson material URL:', error);
    return res.status(500).json({ error: 'Không thể lấy tài liệu từ Supabase Storage.' });
  }
}

// Link ảnh có chữ ký sống 1 giờ. Server nhớ link trong 50 phút, nên mỗi lần mở bài
// cùng một ảnh vẫn có cùng link và trình duyệt dùng lại bản đã tải thay vì tải lại từ Supabase.
const STORY_URL_TTL_SECONDS = 60 * 60;
const STORY_URL_REUSE_MS = 50 * 60 * 1000;
const storyUrlCache = new Map();

async function signStoryImages(accessToken, paths) {
  const now = Date.now();
  const urls = new Map();
  const missing = [];
  for (const objectPath of new Set(paths)) {
    const cached = storyUrlCache.get(objectPath);
    if (cached && cached.reuseUntil > now) urls.set(objectPath, cached.url);
    else missing.push(objectPath);
  }
  if (missing.length) {
    const { data, error } = await getSupabaseClient(accessToken)
      .storage
      .from(materialBucket)
      .createSignedUrls(missing, STORY_URL_TTL_SECONDS);
    if (error) throw error;
    for (const item of data || []) {
      if (item.error || !item.signedUrl) throw new Error(item.error || `Không tạo được link cho ảnh ${item.path}.`);
      urls.set(item.path, item.signedUrl);
      if (storyUrlCache.size >= 2000) storyUrlCache.delete(storyUrlCache.keys().next().value);
      storyUrlCache.set(item.path, { url: item.signedUrl, reuseUntil: now + STORY_URL_REUSE_MS });
    }
  }
  return urls;
}

async function getStoryImages(req, res) {
  try {
    const lesson = await lessonModel.getById(req.accessToken, req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học.' });
    if (!lesson.published && lesson.created_by !== req.user.id && req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xem câu chuyện ảnh này.' });
    }
    const storySlides = lesson.story_slides || [];
    const urls = await signStoryImages(req.accessToken, storySlides.map((slide) => slide.path));
    const slides = storySlides.map((slide) => ({ path: slide.path, caption: slide.caption || '', url: urls.get(slide.path) }));
    return res.json({ slides });
  } catch (error) {
    console.error('Could not create lesson story image URLs:', error);
    return res.status(500).json({ error: 'Không thể tải ảnh câu chuyện.' });
  }
}

async function create(req, res) {
  try {
    const lesson = await lessonModel.create(req.accessToken, req.user.id, normalizeLesson(req.body, req.user.id));
    return res.status(201).json({ lesson });
  } catch (error) {
    console.error('Could not create lesson:', error);
    return res.status(400).json({
      error: error.message || 'Không thể tạo bài học.',
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function update(req, res) {
  try {
    const lesson = await lessonModel.update(req.accessToken, req.user.id, req.params.id, normalizeLesson(req.body, req.user.id));
    return res.json({ lesson });
  } catch (error) {
    console.error('Could not update lesson:', error);
    return res.status(400).json({
      error: error.message || 'Không thể cập nhật bài học.',
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function remove(req, res) {
  try {
    await lessonModel.remove(req.accessToken, req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Could not delete lesson:', error);
    return res.status(400).json({ error: 'Không thể xoá bài học.' });
  }
}

module.exports = { listPublished, listMine, getMaterial, getStoryImages, listStorageFiles, listStorageChapters, listStorageChapterFiles, createStorageChapterFileUrl, createStorageFileUrl, teacherOnly, uploadMaterial, uploadStoryImage, create, update, remove };
