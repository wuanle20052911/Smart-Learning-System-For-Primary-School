const lessonModel = require('../models/lessonModel');
const { getSupabaseClient } = require('../models/supabaseClient');
const { randomUUID } = require('crypto');
const path = require('path');

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

function normalizeLesson(body = {}) {
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
    source_filename: typeof body.source_filename === 'string' ? body.source_filename.trim().slice(0, 255) : null,
    source_bucket: sourceBucket,
    source_path: sourcePath,
    icon: typeof body.icon === 'string' ? body.icon.trim() : '📚',
    color: colors.has(body.color) ? body.color : 'blue',
    published: body.published === true
  };
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
      .upload(objectPath, buffer, { contentType, upsert: false });
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

async function create(req, res) {
  try {
    return res.status(201).json({
      lesson: await lessonModel.create(req.accessToken, req.user.id, normalizeLesson(req.body))
    });
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
    return res.json({
      lesson: await lessonModel.update(req.accessToken, req.user.id, req.params.id, normalizeLesson(req.body))
    });
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

module.exports = { listPublished, listMine, getMaterial, listStorageFiles, listStorageChapters, listStorageChapterFiles, createStorageChapterFileUrl, createStorageFileUrl, teacherOnly, uploadMaterial, create, update, remove };
