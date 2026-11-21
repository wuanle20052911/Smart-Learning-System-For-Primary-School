const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.use(requireAuth, messageController.parentOrTeacher);
router.get('/threads', messageController.threads);
router.get('/unread', messageController.unread);
router.get('/threads/:studentId/:otherId', messageController.thread);
router.post('/threads/:studentId/:otherId', messageController.send);

module.exports = router;
