const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const lessonController = require('../controllers/lessonController');

const router = express.Router();

router.get('/published', requireAuth, lessonController.listPublished);
router.use(requireAuth, lessonController.teacherOnly);
router.get('/mine', lessonController.listMine);
router.post('/', lessonController.create);
router.patch('/:id', lessonController.update);
router.delete('/:id', lessonController.remove);

module.exports = router;
