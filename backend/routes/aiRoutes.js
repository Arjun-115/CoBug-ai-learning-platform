const express = require("express");
const router = express.Router();
const {
  generateQuiz,
  generateDebugExercise,
  generateCodingExercise,
  evaluateQuiz,
  evaluateDebugExercise,
  generateCurriculum,
  generateLesson,
} = require("../services/openaiService");
const { saveScore, getRecentScores } = require("../db");

/**
 * POST /api/ai/quiz
 * Generate MCQ quiz questions.
 * Body: { topic, language, skillLevel, repoContext?, userId? }
 */
router.post("/quiz", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext, userId } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "topic, language, and skillLevel are required" });
    }

    // Check recent scores to optionally adjust difficulty hint
    let adjustedSkillLevel = skillLevel;
    if (userId) {
      const recent = getRecentScores(userId);
      if (recent.length >= 3) {
        const avgPercent = recent.reduce((sum, r) => sum + r.score / r.total, 0) / recent.length;
        // If consistently scoring > 85%, nudge difficulty up
        if (avgPercent > 0.85 && skillLevel === "beginner") adjustedSkillLevel = "intermediate";
        if (avgPercent > 0.85 && skillLevel === "intermediate") adjustedSkillLevel = "advanced";
        // If consistently scoring < 40%, nudge difficulty down
        if (avgPercent < 0.4 && skillLevel === "advanced") adjustedSkillLevel = "intermediate";
        if (avgPercent < 0.4 && skillLevel === "intermediate") adjustedSkillLevel = "beginner";
      }
    }

    const questions = await generateQuiz({ topic, language, skillLevel: adjustedSkillLevel, repoContext });
    res.json({ questions, adjustedSkillLevel });
  } catch (err) {
    console.error("Quiz generation error:", err.message);
    res.status(500).json({ error: "Failed to generate quiz", details: err.message });
  }
});

/**
 * POST /api/ai/debug
 * Generate a debugging exercise.
 * Body: { topic, language, skillLevel, repoContext? }
 */
router.post("/debug", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "topic, language, and skillLevel are required" });
    }

    const exercise = await generateDebugExercise({ topic, language, skillLevel, repoContext });
    res.json({ exercise });
  } catch (err) {
    console.error("Debug exercise error:", err.message);
    res.status(500).json({ error: "Failed to generate debug exercise", details: err.message });
  }
});

/**
 * POST /api/ai/coding
 * Generate a coding task.
 * Body: { topic, language, skillLevel, repoContext? }
 */
router.post("/coding", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "topic, language, and skillLevel are required" });
    }

    const exercise = await generateCodingExercise({ topic, language, skillLevel, repoContext });
    res.json({ exercise });
  } catch (err) {
    console.error("Coding exercise error:", err.message);
    res.status(500).json({ error: "Failed to generate coding exercise", details: err.message });
  }
});

/**
 * POST /api/ai/evaluate/quiz
 * Evaluate quiz answers and return score + feedback.
 * Body: { questions, userAnswers, userId?, topic?, language?, skillLevel? }
 */
router.post("/evaluate/quiz", async (req, res) => {
  try {
    const { questions, userAnswers, userId, topic, language, skillLevel } = req.body;
    if (!questions || !userAnswers) {
      return res.status(400).json({ error: "questions and userAnswers are required" });
    }

    const result = await evaluateQuiz({ questions, userAnswers });

    // Persist score if userId provided
    if (userId && topic && language && skillLevel) {
      saveScore({
        userId,
        topic,
        language,
        skillLevel,
        score: result.score,
        total: result.total,
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Quiz evaluation error:", err.message);
    res.status(500).json({ error: "Failed to evaluate quiz", details: err.message });
  }
});

/**
 * POST /api/ai/evaluate/debug
 * Evaluate a debugging exercise submission.
 * Body: { exercise, userCode }
 */
router.post("/evaluate/debug", async (req, res) => {
  try {
    const { exercise, userCode } = req.body;
    if (!exercise || !userCode) {
      return res.status(400).json({ error: "exercise and userCode are required" });
    }

    const result = await evaluateDebugExercise({ exercise, userCode });
    res.json(result);
  } catch (err) {
    console.error("Debug evaluation error:", err.message);
    res.status(500).json({ error: "Failed to evaluate debug exercise", details: err.message });
  }
});

/**
 * POST /api/ai/curriculum
 * Generate a full structured curriculum for a language.
 * Body: { language, skillLevel }
 */
router.post("/curriculum", async (req, res) => {
  try {
    const { language, skillLevel } = req.body;
    if (!language || !skillLevel) {
      return res.status(400).json({ error: "language and skillLevel are required" });
    }
    const curriculum = await generateCurriculum({ language, skillLevel });
    res.json(curriculum);
  } catch (err) {
    console.error("Curriculum error:", err.message);
    res.status(500).json({ error: "Failed to generate curriculum", details: err.message });
  }
});

/**
 * POST /api/ai/lesson
 * Generate a full lesson for a specific topic.
 * Body: { topic, language, skillLevel }
 */
router.post("/lesson", async (req, res) => {
  try {
    const { topic, language, skillLevel } = req.body;
    if (!topic || !language) {
      return res.status(400).json({ error: "topic and language are required" });
    }
    const lesson = await generateLesson({ topic, language, skillLevel: skillLevel || "beginner" });
    res.json(lesson);
  } catch (err) {
    console.error("Lesson error:", err.message);
    res.status(500).json({ error: "Failed to generate lesson", details: err.message });
  }
});

module.exports = router;
