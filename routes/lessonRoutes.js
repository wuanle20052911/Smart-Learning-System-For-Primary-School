const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const lessonController = require('../controllers/lessonController');

const router = express.Router();

router.get('/published', requireAuth, lessonController.listPublished);
router.get('/:id/material', requireAuth, lessonController.getMaterial);
router.get('/storage-chapters', requireAuth, lessonController.listStorageChapters);
router.get('/storage-chapters/:bucket/files', requireAuth, lessonController.listStorageChapterFiles);
router.get('/storage-chapters/:bucket/file-url', requireAuth, lessonController.createStorageChapterFileUrl);
router.use(requireAuth, lessonController.teacherOnly);
router.get('/mine', lessonController.listMine);
router.get('/storage-files', lessonController.listStorageFiles);
router.get('/storage-file-url', lessonController.createStorageFileUrl);
router.post('/materials', lessonController.uploadMaterial);
router.post('/', lessonController.create);
router.patch('/:id', lessonController.update);
router.delete('/:id', lessonController.remove);

module.exports = router;
