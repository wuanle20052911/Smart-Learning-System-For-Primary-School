const quizAttemptModel = require('../models/quizAttemptModel');
const assignmentModel = require('../models/assignmentModel');
const submissionModel = require('../models/submissionModel');
const catalogModel = require('../models/catalogModel');
const riskAlertModel = require('../models/riskAlertModel');
const { assessStudentRisk } = require('../services/riskAssessment');
const {
  PROMPT_VERSION,
  prompt: recommendationPrompt,
  selectRecommendationModel,
  buildTeacherLearningSummary,
  validateTeacherRecommendations
} = require('../services/teacherRecommendations');

function normalizeAttempt(body = {}) {
  const score = Number(body.score);
  const total = Number(body.total);
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const incorrectAnswers = Array.isArray(body.incorrect_answers) ? body.incorrect_answers : [];
  const attempt = {
    lesson_id: typeof body.lesson_id === 'string' && body.lesson_id ? body.lesson_id : null,
    title: typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '',
    grade: typeof body.grade === 'string' && body.grade.trim() ? body.grade.trim().slice(0, 80) : 'Tiểu học',
    chapter: typeof body.chapter === 'string' && body.chapter.trim() ? body.chapter.trim().slice(0, 120) : 'Luyện tập nhanh',
    score,
    total,
    questions,
    incorrect_answers: incorrectAnswers
  };

  if (!attempt.title || !Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total
    || questions.length !== total || incorrectAnswers.length !== total - score) {
    throw new Error('Kết quả bài làm không hợp lệ.');
  }
  return attempt;
}

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền xem kết quả học sinh.' });
  }
  return next();
}

async function create(req, res) {
  try {
    return res.status(201).json({
      attempt: await quizAttemptModel.create(
        req.accessToken,
        req.user.id,
        req.profile,
        normalizeAttempt(req.body)
      )
    });
  } catch (error) {
    console.error('Could not save quiz attempt:', error);
    return res.status(400).json({ error: error.message || 'Không thể lưu kết quả bài làm.' });
  }
}

async function listMine(req, res) {
  try {
    return res.json({ attempts: await quizAttemptModel.listForStudent(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list student quiz attempts:', error);
    return res.status(500).json({ error: 'Không thể tải lịch sử làm bài.' });
  }
}

async function listForTeacher(req, res) {
  try {
    return res.json({ attempts: await quizAttemptModel.listForTeacher(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list teacher quiz attempts:', error);
    return res.status(500).json({ error: 'Không thể tải kết quả học sinh.' });
  }
}

async function competencyProfileForTeacher(req, res) {
  try {
    return res.json({
      attempts: await quizAttemptModel.listForTeacherStudent(req.accessToken, req.user.id, req.params.studentId)
    });
  } catch (error) {
    console.error('Could not load student competency profile:', error);
    return res.status(500).json({ error: 'Không thể tải hồ sơ năng lực học sinh.' });
  }
}

async function analyticsForTeacher(req, res) {
  try {
    const now = Date.now();
    const [attempts, assignments, submissions, classes] = await Promise.all([
      quizAttemptModel.listForTeacher(req.accessToken, req.user.id),
      assignmentModel.listForTeacher(req.accessToken, req.user.id),
      submissionModel.listForTeacher(req.accessToken, req.user.id),
      req.profile.role === 'admin'
        ? catalogModel.listManagedClasses(catalogModel.getSupabaseClient(req.accessToken))
        : catalogModel.listClasses(catalogModel.getSupabaseClient(req.accessToken), req.user.id)
    ]);
    const overdueAssignments = assignments.filter((assignment) => (
      assignment.published
      && assignment.class_id
      && assignment.due_at
      && new Date(assignment.due_at).getTime() < now
    ));
    const relevantClassIds = new Set(overdueAssignments.map((assignment) => assignment.class_id));
    const classRosters = await Promise.all(
      classes.filter((classItem) => relevantClassIds.has(classItem.id))
        .map(async (classItem) => [classItem.id, await catalogModel.listClassStudents(catalogModel.getSupabaseClient(req.accessToken), classItem.id)])
    );
    const rosterByClass = new Map(classRosters);
    const byStudent = new Map();
    attempts.forEach((attempt) => {
      const current = byStudent.get(attempt.student_id) || {
        student_id: attempt.student_id,
        student_name: attempt.student_name || 'Học sinh chưa cập nhật',
        student_email: attempt.student_email,
        attempts: [],
        lastAttemptAt: attempt.created_at
      };
      current.attempts.push(attempt);
      if (new Date(attempt.created_at) > new Date(current.lastAttemptAt)) current.lastAttemptAt = attempt.created_at;
      byStudent.set(attempt.student_id, current);
    });

    classRosters.forEach(([classId, students]) => {
      students.forEach((student) => {
        const studentId = student.id || student.student_id;
        if (!studentId) return;
        const current = byStudent.get(studentId) || {
          student_id: studentId,
          student_name: student.full_name || 'Học sinh chưa cập nhật',
          student_email: student.email || '',
          attempts: [],
          lastAttemptAt: null
        };
        if (!current.classIds) current.classIds = new Set();
        current.classIds.add(classId);
        byStudent.set(studentId, current);
      });
    });

    const submissionsByStudent = new Map();
    submissions.forEach((submission) => {
      if (!submissionsByStudent.has(submission.student_id)) submissionsByStudent.set(submission.student_id, new Set());
      submissionsByStudent.get(submission.student_id).add(submission.assignment_id);
    });

    const students = [...byStudent.values()].map((student) => {
      const classIds = student.classIds || new Set();
      const studentSubmissions = submissionsByStudent.get(student.student_id) || new Set();
      const studentOverdue = overdueAssignments.filter((assignment) => classIds.has(assignment.class_id));
      const completedOverdue = studentOverdue.filter((assignment) => studentSubmissions.has(assignment.id));
      const assessment = assessStudentRisk({
        attempts: student.attempts,
        overdueAssignments: studentOverdue,
        submittedOverdueAssignments: completedOverdue
      });
      const correctAnswers = student.attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0);
      const totalQuestions = student.attempts.reduce((sum, attempt) => sum + Number(attempt.total || 0), 0);
      return {
        student_id: student.student_id,
        student_name: student.student_name,
        student_email: student.student_email,
        attempts: assessment.attempts,
        averageScore: assessment.averageScore,
        accuracyRate: totalQuestions ? Math.round(correctAnswers / totalQuestions * 1000) / 10 : null,
        completionRate: assessment.completionRate,
        overdueAssignments: assessment.overdueAssignments,
        missedOverdueAssignments: assessment.missedOverdueAssignments,
        enoughData: assessment.enoughData,
        risk: assessment.risk,
        reasons: assessment.reasons,
        lastAttemptAt: student.lastAttemptAt
      };
    }).sort((a, b) => {
      const rank = { Cao: 0, 'Theo dõi': 1, 'Chưa đủ dữ liệu': 2, 'Ổn định': 3 };
      return rank[a.risk] - rank[b.risk] || (a.averageScore ?? Infinity) - (b.averageScore ?? Infinity);
    });
    const { activeAlerts, recentResolvedAlerts } = await riskAlertModel.syncTeacherRiskAlerts(
      catalogModel.getSupabaseClient(req.accessToken),
      req.user.id,
      students
    );

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.total ? (attempt.score / attempt.total) * 100 : 0), 0) / totalAttempts * 10) / 10
      : 0;
    const correctAnswers = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
    return res.json({
      overview: {
        studentCount: students.length,
        attemptCount: totalAttempts,
        averageScore,
        accuracyRate: totalQuestions ? Math.round(correctAnswers / totalQuestions * 1000) / 10 : 0,
        supportCount: students.filter((student) => student.risk === 'Cao').length,
        insufficientDataCount: students.filter((student) => !student.enoughData).length
      },
      riskAlerts: activeAlerts,
      recentResolvedAlerts,
      students,
      recentAttempts: attempts.slice(0, 20)
    });
  } catch (error) {
    console.error('Could not build teacher analytics:', error);
    return res.status(500).json({ error: 'Không thể tải dữ liệu phân tích học tập.' });
  }
}

async function recommendationsForTeacher(req, res) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const client = catalogModel.getSupabaseClient(req.accessToken);
    const [attempts, assignments, submissions, classes, topics] = await Promise.all([
      quizAttemptModel.listForTeacher(req.accessToken, req.user.id),
      assignmentModel.listForTeacher(req.accessToken, req.user.id),
      submissionModel.listForTeacher(req.accessToken, req.user.id),
      req.profile.role === 'admin'
        ? catalogModel.listManagedClasses(client)
        : catalogModel.listClasses(client, req.user.id),
      catalogModel.list(client, 'topics', 'id,name')
    ]);
    const assignedClassIds = [...new Set(assignments
      .filter((assignment) => assignment.published && assignment.class_id)
      .map((assignment) => assignment.class_id))];
    const rosters = await Promise.all(assignedClassIds.map(async (classId) => [
      classId,
      await catalogModel.listClassStudents(client, classId)
    ]));
    const learningSummary = buildTeacherLearningSummary({
      attempts,
      assignments,
      submissions,
      topics,
      classes,
      classRosters: Object.fromEntries(rosters)
    });
    if (!learningSummary.recommendationSignals.length) {
      return res.json({
        promptVersion: PROMPT_VERSION,
        model: null,
        summary: 'Dữ liệu hiện có chưa cho thấy chủ đề nào cần ưu tiên ôn tập hoặc tỷ lệ nộp bài thấp.',
        recommendations: [],
        evidence: learningSummary
      });
    }

    const modelsResponse = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!modelsResponse.ok) {
      return res.status(503).json({ error: 'Không thể kết nối Ollama để tạo đề xuất. Hãy kiểm tra dịch vụ Ollama.' });
    }
    const modelData = await modelsResponse.json();
    const installedModels = Array.isArray(modelData?.models)
      ? modelData.models.map((item) => item.name || item.model).filter((name) => typeof name === 'string')
      : [];
    const model = selectRecommendationModel(
      installedModels,
      process.env.OLLAMA_CHAT_MODEL,
      process.env.OLLAMA_MODEL
    );
    if (!model) {
      return res.status(503).json({ error: 'Chưa cài model chat Ollama. Hãy cài llama3.2:3b hoặc cấu hình OLLAMA_CHAT_MODEL.' });
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: recommendationPrompt },
          { role: 'user', content: JSON.stringify(learningSummary) }
        ],
        format: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string', enum: learningSummary.allowedTopics },
                  activity: {
                    type: 'string',
                    enum: ['guided_review', 'short_practice', 'check_questions', 'follow_up_submissions']
                  }
                },
                required: ['topic', 'activity'],
                additionalProperties: false
              }
            }
          },
          required: ['recommendations'],
          additionalProperties: false
        },
        stream: false,
        keep_alive: '10m',
        options: { temperature: 0.2, top_p: 0.8, num_predict: 250, num_ctx: 4096 }
      })
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 300);
      console.error(`Teacher recommendation model request failed (${response.status}):`, details);
      return res.status(502).json({
        error: 'Không thể tạo đề xuất AI. Hãy kiểm tra Ollama và model chat đã cài.'
      });
    }

    let generated;
    try {
      const result = await response.json();
      const content = result?.message?.content?.trim();
      if (!content) {
        throw new Error(`Ollama returned an empty response (model: ${model}, done_reason: ${result?.done_reason || 'unknown'}).`);
      }
      generated = validateTeacherRecommendations(JSON.parse(content), learningSummary.recommendationSignals);
    } catch (error) {
      console.error('Invalid teacher recommendation output:', error);
      return res.status(502).json({ error: 'AI trả về đề xuất không đúng định dạng. Vui lòng thử lại.' });
    }

    return res.json({
      promptVersion: PROMPT_VERSION,
      model,
      summary: `Có ${learningSummary.recommendationSignals.length} chỉ số cần được giáo viên xem xét dựa trên dữ liệu hiện có.`,
      recommendations: generated,
      evidence: {
        completion: learningSummary.completion,
        topicMetrics: learningSummary.topicMetrics,
        recommendationSignals: learningSummary.recommendationSignals,
        quizAttemptCount: learningSummary.quizAttemptCount,
        submissionCount: learningSummary.submissionCount
      }
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return res.status(504).json({ error: 'AI phản hồi quá lâu. Vui lòng thử lại sau.' });
    }
    console.error('Could not generate teacher recommendations:', error);
    return res.status(500).json({ error: 'Không thể tải dữ liệu để tạo đề xuất AI.' });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  create,
  listMine,
  listForTeacher,
  competencyProfileForTeacher,
  analyticsForTeacher,
  recommendationsForTeacher,
  teacherOnly
};
