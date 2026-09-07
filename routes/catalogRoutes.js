const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/catalogController');

const router = express.Router();
router.use(requireAuth);
router.get('/subjects', controller.listSubjects);
router.get('/topics', controller.listTopics);
router.get('/skills', controller.listSkills);
router.get('/classes', controller.listClasses);
router.get('/management/options', controller.adminOnly, controller.listManagementOptions);
router.post('/subjects', controller.teacherOnly, controller.createSubject);
router.post('/topics', controller.teacherOnly, controller.createTopic);
router.post('/skills', controller.teacherOnly, controller.createSkill);
router.post('/classes', controller.adminOnly, controller.createClass);
router.post('/classes/members', controller.adminOnly, controller.addClassMember);
module.exports = router;
