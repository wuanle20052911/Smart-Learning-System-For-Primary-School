const express = require('express');
const { login, register, updateProfile, getProfile } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.put('/profile', requireAuth, updateProfile);
router.get('/profile', requireAuth, getProfile);

module.exports = router;
