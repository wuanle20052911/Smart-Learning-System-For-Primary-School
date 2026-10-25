const fs = require('fs');
const path = require('path');

const PROMPT_VERSION = 'teacher-recommendations-v1';
const RECOMMENDATION_MODEL_FALLBACKS = ['llama3.2:3b', 'qwen2.5:7b', 'qwen2.5:3b', 'deepseek-r1:8b'];
const prompt = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', `${PROMPT_VERSION}.txt`),
  'utf8'
).trim();

function selectRecommendationModel(installedModels, configuredChatModel, configuredModel) {
  const installed = new Set(installedModels.filter((model) => !/embed/i.test(model)));
  const preferred = [
    configuredChatModel,
    ...RECOMMENDATION_MODEL_FALLBACKS,
    configuredModel
  ].filter(Boolean);
  return preferred.find((model) => installed.has(model)) || [...installed][0] || null;
}

function buildTeacherLearningSummary({ attempts, assignments, submissions, topics, classes, classRosters }) {
  const topicNames = new Map(topics.map((topic) => [topic.id, topic.name]));
  const knownTopicNames = [...new Set(topics.map((topic) => topic.name).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  const canonicalTopic = (value) => {
    const normalized = String(value || '').trim().toLocaleLowerCase('vi');
    return knownTopicNames.find((name) => normalized.includes(name.toLocaleLowerCase('vi'))) || 'Chưa phân chủ đề';
  };
  const topicResults = new Map();
  const addResult = (topic, correct, total) => {
    const name = String(topic || '').trim() || 'Chưa phân chủ đề';
    const result = topicResults.get(name) || { topic: name, attempts: 0, correct: 0, total: 0 };
    result.attempts += 1;
    result.correct += Number(correct) || 0;
    result.total += Number(total) || 0;
    topicResults.set(name, result);
  };

  attempts.forEach((attempt) => {
    addResult(canonicalTopic(attempt.chapter), attempt.score, attempt.total);
  });

  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  submissions.forEach((submission) => {
    const assignment = assignmentById.get(submission.assignment_id);
    if (!assignment?.published) return;
    addResult(
      canonicalTopic(topicNames.get(assignment.topic_id)),
      submission.correct_count,
      submission.total_questions
    );
  });

  const publishedAssignments = assignments.filter((assignment) => assignment.published && assignment.class_id);
  const assignmentCounts = publishedAssignments.reduce((counts, assignment) => {
    const roster = classRosters[assignment.class_id] || [];
    const rosterIds = new Set(roster.map((student) => student.id || student.student_id).filter(Boolean));
    const submittedIds = new Set(submissions
      .filter((submission) => submission.assignment_id === assignment.id && rosterIds.has(submission.student_id))
      .map((submission) => submission.student_id));
    counts.expected += rosterIds.size;
    counts.submitted += submittedIds.size;
    return counts;
  }, { expected: 0, submitted: 0 });

  const topicMetrics = [...topicResults.values()]
    .map((result) => ({
      topic: result.topic,
      attempts: result.attempts,
      accuracy: result.total ? Math.round(result.correct / result.total * 100) : null,
      answeredQuestions: result.total
    }))
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101))
    .slice(0, 10);
  const recommendationSignals = topicMetrics
    .filter((item) => item.accuracy !== null && item.accuracy < 70)
    .map((item) => ({ ...item, kind: 'accuracy' }));
  if (assignmentCounts.expected) {
    const completionRate = Math.round(assignmentCounts.submitted / assignmentCounts.expected * 100);
    if (completionRate < 70) {
      recommendationSignals.push({
        topic: 'Tỷ lệ nộp bài',
        kind: 'completion',
        accuracy: completionRate,
        attempts: assignmentCounts.expected,
        answeredQuestions: assignmentCounts.submitted,
        submitted: assignmentCounts.submitted,
        expected: assignmentCounts.expected
      });
    }
  }

  return {
    classCount: classes.length,
    quizAttemptCount: attempts.length,
    publishedAssignmentCount: publishedAssignments.length,
    submissionCount: submissions.length,
    completion: assignmentCounts.expected
      ? {
        submitted: assignmentCounts.submitted,
        expected: assignmentCounts.expected,
        rate: Math.round(assignmentCounts.submitted / assignmentCounts.expected * 100)
      }
      : null,
    topicMetrics,
    recommendationSignals,
    allowedTopics: recommendationSignals.map((item) => item.topic)
  };
}

const ACTIVITY_LABELS = {
  guided_review: 'Ôn tập có hướng dẫn',
  short_practice: 'Luyện tập ngắn',
  check_questions: 'Kiểm tra nhanh',
  follow_up_submissions: 'Theo dõi và nhắc nộp bài'
};

function validateTeacherRecommendations(value, signals) {
  if (!value || typeof value !== 'object'
    || !Array.isArray(value.recommendations) || value.recommendations.length > 3) {
    throw new Error('AI returned an invalid recommendations response.');
  }

  const signalByTopic = new Map(signals.map((signal) => [signal.topic, signal]));
  const seenTopics = new Set();
  const recommendations = value.recommendations.map((item) => {
    if (!item || typeof item !== 'object'
      || typeof item.topic !== 'string' || !signalByTopic.has(item.topic)
      || !Object.hasOwn(ACTIVITY_LABELS, item.activity)
      || seenTopics.has(item.topic)) {
      throw new Error('AI returned a recommendation outside the validated schema.');
    }
    const signal = signalByTopic.get(item.topic);
    const allowedActivities = signal.kind === 'completion'
      ? ['follow_up_submissions', 'short_practice']
      : ['guided_review', 'short_practice', 'check_questions'];
    if (!allowedActivities.includes(item.activity)) {
      throw new Error('AI selected an activity that does not match the evidence.');
    }
    seenTopics.add(item.topic);
    const priority = signal.accuracy < 50 ? 'high' : 'medium';
    return {
      topic: signal.topic,
      kind: signal.kind,
      title: signal.kind === 'completion' ? 'Theo dõi bài tập chưa nộp' : `${ACTIVITY_LABELS[item.activity]}: ${signal.topic}`,
      reason: signal.kind === 'completion'
        ? `Đã nộp ${signal.submitted}/${signal.expected} lượt bài tập được giao (${signal.accuracy}%).`
        : `Độ chính xác ${signal.accuracy}% qua ${signal.attempts} lượt, gồm ${signal.answeredQuestions} câu trả lời.`,
      action: signal.kind === 'completion'
        ? 'Nhắc học sinh chưa nộp và kiểm tra lại trạng thái bài tập.'
        : item.activity === 'guided_review'
          ? `Ôn lại từng bước về ${signal.topic} cùng học sinh.`
          : item.activity === 'check_questions'
            ? `Dùng vài câu hỏi nhanh về ${signal.topic} để kiểm tra lại mức độ hiểu bài.`
            : `Giao một bài luyện tập ngắn về ${signal.topic}, sau đó xem lại kết quả.`,
      priority
    };
  });

  return recommendations;
}

module.exports = {
  PROMPT_VERSION,
  prompt,
  selectRecommendationModel,
  buildTeacherLearningSummary,
  ACTIVITY_LABELS,
  validateTeacherRecommendations
};
