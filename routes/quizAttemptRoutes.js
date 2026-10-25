const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const quizAttemptController = require('../controllers/quizAttemptController');

const router = express.Router();

router.use(requireAuth);
router.post('/', quizAttemptController.create);
router.post('/study-plan', quizAttemptController.studyPlan);
router.get('/mine', quizAttemptController.listMine);
router.get('/teacher', quizAttemptController.teacherOnly, quizAttemptController.listForTeacher);
router.get('/teacher/students/:studentId', quizAttemptController.teacherOnly, quizAttemptController.competencyProfileForTeacher);
router.get('/analytics', quizAttemptController.teacherOnly, quizAttemptController.analyticsForTeacher);
router.get('/recommendations', quizAttemptController.teacherOnly, quizAttemptController.recommendationsForTeacher);

module.exports = router;
