const express = require('express');
const { login, registerStudent, createTeacher, listManagedUsers, setManagedUserDisabled, updateProfile, getProfile, getOAuthConfig } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', login);
router.post('/register', registerStudent);
router.get('/config', getOAuthConfig);
router.post('/teachers', requireAuth, createTeacher);
router.get('/users', requireAuth, listManagedUsers);
router.patch('/users/:id/status', requireAuth, setManagedUserDisabled);
router.put('/profile', requireAuth, updateProfile);
router.get('/profile', requireAuth, getProfile);

module.exports = router;
