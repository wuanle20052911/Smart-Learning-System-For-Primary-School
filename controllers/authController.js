const userModel = require('../models/userModel');

function validateCredentials(email, password) {
  if (!email || !password) return 'Email and password are required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (password.length < 6) return 'Password must contain at least 6 characters.';
  return null;
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const data = await userModel.signIn(email.trim().toLowerCase(), password);
    return res.json({ user: data.user, profile: data.profile, session: data.session });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unable to sign in.' });
  }
}

async function register(req, res) {
  const { email, password, fullName, role = 'student' } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }
  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid account role.' });
  }

  try {
    const data = await userModel.register(email.trim().toLowerCase(), password, fullName.trim(), role);
    return res.status(201).json({
      user: data.user,
      session: data.session,
      message: data.session ? 'Account created successfully.' : 'Check your email to confirm your account.'
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create your account.' });
  }
}

module.exports = { login, register };
