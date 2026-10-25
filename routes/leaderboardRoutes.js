const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const leaderboardController = require('../controllers/leaderboardController');

const router = express.Router();

router.use(requireAuth);
router.get('/class', leaderboardController.getClassLeaderboard);
router.post('/complete-lesson', leaderboardController.completeLesson);

module.exports = router;
