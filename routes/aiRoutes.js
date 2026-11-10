const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-quiz', requireAuth, aiController.generateQuiz);
router.post('/ai-chat', requireAuth, aiController.chat);

module.exports = router;
