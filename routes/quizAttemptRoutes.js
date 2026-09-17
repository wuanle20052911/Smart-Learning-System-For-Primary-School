const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const quizAttemptController = require('../controllers/quizAttemptController');

const router = express.Router();

router.use(requireAuth);
router.post('/', quizAttemptController.create);
router.get('/mine', quizAttemptController.listMine);
router.get('/teacher', quizAttemptController.teacherOnly, quizAttemptController.listForTeacher);
router.get('/analytics', quizAttemptController.teacherOnly, quizAttemptController.analyticsForTeacher);

module.exports = router;
