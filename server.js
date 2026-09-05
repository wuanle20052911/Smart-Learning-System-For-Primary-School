require('dotenv').config();

const express = require('express');
const path = require('path');
const { generateQuizHTML, generateQuizTXT } = require('./quiz-generator');
const authRoutes = require('./routes/authRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_MODEL = 'deepseek-r1:8b';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

async function getInstalledModels() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data?.models)) {
      return [];
    }

    return data.models
      .map((model) => model.name || model.model)
      .filter(Boolean);
  } catch (error) {
    console.warn('Could not fetch installed Ollama models:', error.message);
    return [];
  }
}

async function resolveModelName() {
  const installedModels = await getInstalledModels();

  if (installedModels.includes(OLLAMA_MODEL)) {
    return OLLAMA_MODEL;
  }

  if (installedModels.includes(DEFAULT_MODEL)) {
    return DEFAULT_MODEL;
  }

  if (installedModels.length > 0) {
    return installedModels[0];
  }

  return OLLAMA_MODEL;
}

function isValidQuestion(q) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) return false;
  const type = q.type || 'multiple-choice';

  if (type === 'multiple-choice' || type === 'true-false') {
    return Array.isArray(q.options)
      && q.options.length >= 2
      && Number.isInteger(q.correctIndex)
      && q.correctIndex >= 0
      && q.correctIndex < q.options.length
      && (type !== 'true-false' || q.options.length === 2);
  }

  if (type === 'fill-blank' || type === 'short-answer') {
    return typeof q.answer === 'string' && q.answer.trim().length > 0;
  }

  if (type === 'matching') {
    return Array.isArray(q.pairs)
      && q.pairs.length > 0
      && q.pairs.every(pair => pair && typeof pair.left === 'string' && typeof pair.right === 'string')
      && Array.isArray(q.correctMatches)
      && q.correctMatches.length === q.pairs.length
      && q.correctMatches.every(index => Number.isInteger(index) && index >= 0 && index < q.pairs.length);
  }

  return false;
}

app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', ollama: OLLAMA_BASE_URL, model: OLLAMA_MODEL });
});

app.post('/api/generate-quiz', requireAuth, async (req, res) => {
  const { systemPrompt, userPrompt } = req.body || {};

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({
      error: 'Missing required fields: systemPrompt and userPrompt.'
    });
  }

  try {
    const activeModel = await resolveModelName();
    const qCountMatch = userPrompt.match(/Tạo (\d+) câu hỏi/);
    const requestedCount = qCountMatch ? parseInt(qCountMatch[1]) : 5;

    if (!activeModel || activeModel === OLLAMA_MODEL) {
      const installedModels = await getInstalledModels();
      if (installedModels.length === 0) {
        return res.status(500).json({
          error: 'Ollama chưa có model nào được cài đặt. Hãy chạy: `ollama pull ' + DEFAULT_MODEL + '`',
          details: 'Model hiện tại: ' + OLLAMA_MODEL
        });
      }
    }

    let allQuestions = [];
    let attempts = 0;
    const maxAttempts = Math.ceil(requestedCount / 2);

    while (allQuestions.length < requestedCount && attempts < maxAttempts) {
      attempts++;

      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: activeModel,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.2 + (attempts * 0.1),
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(500).json({
          error: 'Ollama request failed.',
          details: text
        });
      }

      const data = await response.json();
      let text = data?.response || '';
      
      // Try to parse the response to ensure it's valid JSON
      let parsedJSON;
      try {
        parsedJSON = JSON.parse(text);
        
        // If it's a single object (not array), wrap it in array
        if (parsedJSON && typeof parsedJSON === 'object' && !Array.isArray(parsedJSON)) {
          // If it has a questions key with array, extract that
          if (Array.isArray(parsedJSON.questions)) {
            parsedJSON = parsedJSON.questions;
          } 
          // Otherwise wrap the single object in an array
          else if (parsedJSON.question) {
            parsedJSON = [parsedJSON];
          }
        }
        
        if (Array.isArray(parsedJSON)) {
          const validQuestions = parsedJSON.filter(isValidQuestion);
          
          allQuestions.push(...validQuestions);
        }
      } catch (parseErr) {
        // If JSON parsing fails, try to extract JSON from text
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedJSON = JSON.parse(jsonMatch[0]);
            if (parsedJSON && !Array.isArray(parsedJSON) && parsedJSON.question) {
              parsedJSON = [parsedJSON];
            }
            
            if (Array.isArray(parsedJSON)) {
              const validQuestions = parsedJSON.filter(isValidQuestion);
              allQuestions.push(...validQuestions);
            }
          } catch (innerErr) {
            console.error('Failed to parse retry JSON:', innerErr);
          }
        }
      }
    }

    // Return at least the requested count or what we got
    const finalQuestions = allQuestions.slice(0, requestedCount);
    
    if (finalQuestions.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate valid questions from Ollama.'
      });
    }

    return res.json({
      content: [{ type: 'text', text: JSON.stringify(finalQuestions) }],
      raw: { questionsGenerated: finalQuestions.length, requestedCount }
    });
  } catch (error) {
    console.error('Ollama call failed:', error);
    return res.status(500).json({
      error: 'Không thể kết nối tới Ollama. Hãy chạy `ollama serve` và `ollama pull ' + OLLAMA_MODEL + '` trước khi dùng.',
      details: error.message
    });
  }
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

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'views', 'auth.html'));
});

app.get('/auth', (req, res) => {
  res.redirect('/');
});

app.get('/learn', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'quiz-generator.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'teacher.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`SmartLearning server running at http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_BASE_URL}`);
  console.log(`Model: ${OLLAMA_MODEL}`);
});
