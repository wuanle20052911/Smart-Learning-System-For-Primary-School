const express = require('express');
const { login, registerStudent, createTeacher, updateProfile, getProfile, getOAuthConfig } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', login);
router.post('/register', registerStudent);
router.get('/config', getOAuthConfig);
router.post('/teachers', requireAuth, createTeacher);
router.put('/profile', requireAuth, updateProfile);
router.get('/profile', requireAuth, getProfile);

module.exports = router;
