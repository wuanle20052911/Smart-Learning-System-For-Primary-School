const catalogModel = require('../models/catalogModel');

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền quản lý danh mục.' });
  return next();
}

function adminOnly(req, res, next) {
  if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản lý mới có quyền thực hiện thao tác này.' });
  return next();
}

async function listSubjects(req, res) {
  try { return res.json({ subjects: await catalogModel.list(catalogModel.getSupabaseClient(req.accessToken), 'subjects') }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải môn học.' }); }
}

async function listTopics(req, res) {
  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    let query = client.from('topics').select('*').order('name');
    if (req.query.subject_id) query = query.eq('subject_id', req.query.subject_id);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ topics: data });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải chủ đề.' }); }
}

async function listSkills(req, res) {
  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    let query = client.from('skills').select('*').order('name');
    if (req.query.topic_id) query = query.eq('topic_id', req.query.topic_id);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ skills: data });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải kỹ năng.' }); }
}

async function listClasses(req, res) {
  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    const classes = req.profile.role === 'admin'
      ? await catalogModel.listManagedClasses(client)
      : await catalogModel.listClasses(client, req.user.id);
    return res.json({ classes });
  }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải lớp học.' }); }
}

async function createSubject(req, res) {
  try { return res.status(201).json({ subject: await catalogModel.create(catalogModel.getSupabaseClient(req.accessToken), 'subjects', { name: req.body?.name?.trim(), description: req.body?.description?.trim() || '', created_by: req.user.id }) }); }
  catch (error) { return res.status(400).json({ error: error.message || 'Không thể tạo môn học.' }); }
}

async function createTopic(req, res) {
  try { return res.status(201).json({ topic: await catalogModel.create(catalogModel.getSupabaseClient(req.accessToken), 'topics', { subject_id: req.body?.subject_id, name: req.body?.name?.trim(), description: req.body?.description?.trim() || '' }) }); }
  catch (error) { return res.status(400).json({ error: error.message || 'Không thể tạo chủ đề.' }); }
}

async function createSkill(req, res) {
  try { return res.status(201).json({ skill: await catalogModel.create(catalogModel.getSupabaseClient(req.accessToken), 'skills', { topic_id: req.body?.topic_id, name: req.body?.name?.trim(), description: req.body?.description?.trim() || '' }) }); }
  catch (error) { return res.status(400).json({ error: error.message || 'Không thể tạo kỹ năng.' }); }
}

async function createClass(req, res) {
  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    const item = req.profile.role === 'admin'
      ? await catalogModel.managerCreateClass(client, req.body?.name?.trim(), req.body?.grade?.trim(), req.body?.teacher_id || null)
      : await catalogModel.create(client, 'classes', { name: req.body?.name?.trim(), grade: req.body?.grade?.trim(), created_by: req.user.id });
    return res.status(201).json({ class: item });
  }
  catch (error) { return res.status(400).json({ error: error.message || 'Không thể tạo lớp học.' }); }
}

async function addClassMember(req, res) {
  const classId = typeof req.body?.class_id === 'string' ? req.body.class_id : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!classId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Vui lòng chọn lớp và nhập email học sinh hợp lệ.' });
  }
  try {
    return res.status(201).json({
      member: req.profile.role === 'admin'
        ? await catalogModel.managerAddClassMember(catalogModel.getSupabaseClient(req.accessToken), classId, email)
        : await catalogModel.addClassMember(catalogModel.getSupabaseClient(req.accessToken), classId, email)
    });
  } catch (error) {
    console.error('Could not add student to class:', error);
    return res.status(400).json({ error: error.message || 'Không thể thêm học sinh vào lớp.' });
  }
}

async function listManagementOptions(req, res) {
  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    return res.json({
      teachers: await catalogModel.listTeachers(client),
      classes: await catalogModel.listManagedClasses(client)
    });
  } catch (error) {
    console.error('Could not load management options:', error);
    return res.status(500).json({ error: 'Không thể tải dữ liệu quản lý lớp.' });
  }
}

module.exports = { teacherOnly, adminOnly, listSubjects, listTopics, listSkills, listClasses, listManagementOptions, createSubject, createTopic, createSkill, createClass, addClassMember };
