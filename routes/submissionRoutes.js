const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');

const router = express.Router();
router.use(requireAuth);
router.post('/', submissionController.create);
router.get('/mine', submissionController.listForStudent);
router.get('/teacher', assignmentController.teacherOnly, submissionController.listForTeacher);
router.get('/teacher/:id', assignmentController.teacherOnly, submissionController.getForTeacher);
router.post('/teacher/:id/feedback', assignmentController.teacherOnly, submissionController.addFeedback);
module.exports = router;
