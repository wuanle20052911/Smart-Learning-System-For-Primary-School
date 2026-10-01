const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/questionBankController');

const router = express.Router();
router.use(requireAuth);
router.get('/lesson/:lessonId', controller.studentOnly, controller.listForLesson);
router.use(controller.teacherOnly);
router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

module.exports = router;
