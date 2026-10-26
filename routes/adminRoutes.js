const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const aiUsageController = require('../controllers/aiUsageController');

const router = express.Router();
router.use(requireAuth);
router.get('/ai-usage/stream', aiUsageController.streamSummary);
router.get('/ai-usage', aiUsageController.getSummary);

module.exports = router;
