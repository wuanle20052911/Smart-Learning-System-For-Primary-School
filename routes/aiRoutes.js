const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const aiController = require('../controllers/aiController');
const storyAdventureController = require('../controllers/storyAdventureController');

const router = express.Router();

router.post('/generate-quiz', requireAuth, aiController.generateQuiz);
router.post('/generate-story-adventure', requireAuth, storyAdventureController.generate);
router.post('/ai-chat', requireAuth, aiController.chat);

module.exports = router;
