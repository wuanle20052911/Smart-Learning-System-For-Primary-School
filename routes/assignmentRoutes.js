const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/assignmentController');

const router = express.Router();
router.use(requireAuth);
router.get('/published', controller.listPublished);
router.get('/mine', controller.teacherOnly, controller.listMine);
router.get('/:id', controller.getOne);
router.post('/', controller.teacherOnly, controller.create);
module.exports = router;
