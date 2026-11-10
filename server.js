require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateQuizHTML, generateQuizTXT } = require('./quiz-generator');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const parentRoutes = require('./routes/parentRoutes');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_MODEL = 'deepseek-r1:8b';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', aiRoutes);
app.get('/api/profile-avatars', async (req, res) => {
  try {
    const avatarDirectory = path.join(__dirname, 'public', 'img', 'avt');
    const files = await fs.promises.readdir(avatarDirectory);
    const avatars = files
      .filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file))
      .sort()
      .map((file) => `/public/img/avt/${file}`);
    return res.json({ avatars });
  } catch (error) {
    console.error('Could not list profile avatars:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách avatar.' });
  }
});
app.use('/api/lessons', lessonRoutes);
app.use('/api/attempts', quizAttemptRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/questions', questionBankRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', ollama: OLLAMA_BASE_URL, model: OLLAMA_MODEL });
});

// New endpoint to download quiz as file
app.post('/api/download-quiz', requireAuth, (req, res) => {
  const { quiz, format = 'html', filename = 'de-on-tap' } = req.body;

  if (!quiz || !Array.isArray(quiz)) {
    return res.status(400).json({ error: 'Invalid quiz data' });
  }

  try {
    let content, contentType, fileExtension;

    if (format === 'txt') {
      content = generateQuizTXT(quiz);
      contentType = 'text/plain; charset=utf-8';
      fileExtension = '.txt';
    } else {
      content = generateQuizHTML(quiz);
      contentType = 'text/html; charset=utf-8';
      fileExtension = '.html';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}${fileExtension}"`);
    res.send(content);
  } catch (error) {
    console.error('Download failed:', error);
    res.status(500).json({ error: 'Failed to generate file', details: error.message });
  }
});

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/auth', (req, res) => {
  res.redirect('/');
});

app.get('/auth/callback', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/learn', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/meteor-game', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get(['/profile', '/history'], (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`SmartLearning server running at http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_BASE_URL}`);
  console.log(`Model: ${OLLAMA_MODEL}`);
});
