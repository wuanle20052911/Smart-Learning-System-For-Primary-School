const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');

const router = express.Router();
router.use(requireAuth);
router.post('/', submissionController.create);
router.get('/teacher', assignmentController.teacherOnly, submissionController.listForTeacher);
module.exports = router;
