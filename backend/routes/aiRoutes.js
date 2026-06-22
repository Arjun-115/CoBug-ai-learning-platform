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
const { saveScore, getRecentScores, getAllScores } = require("../db");

// GET /api/ai/scores/:userId
// Returns the full score history for a session — used by the progress dashboard
router.get("/scores/:userId", (req, res) => {
  try {
    const scores = getAllScores(req.params.userId);
    const total = scores.length;
    const avgPercent = total > 0
      ? scores.reduce((sum, s) => sum + s.score / s.total, 0) / total
      : 0;
    res.json({ scores, total, avgPercent: Math.round(avgPercent * 100) });
  } catch (err) {
    res.status(500).json({ error: "Couldn't load your scores right now. Please try again.", details: err.message });
  }
});

// POST /api/ai/quiz
// Generates a 5-question MCQ quiz. Difficulty auto-adjusts based on recent scores.
router.post("/quiz", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext, userId } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "Please provide a topic, language, and skill level." });
    }

    // Look at recent scores and nudge the difficulty up or down if needed
    let adjustedSkillLevel = skillLevel;
    if (userId) {
      const recent = getRecentScores(userId);
      if (recent.length >= 3) {
        const avgPercent = recent.reduce((sum, r) => sum + r.score / r.total, 0) / recent.length;
        // Doing really well? Let's challenge you a bit more
        if (avgPercent > 0.85 && skillLevel === "beginner")     adjustedSkillLevel = "intermediate";
        if (avgPercent > 0.85 && skillLevel === "intermediate") adjustedSkillLevel = "advanced";
        // Struggling a bit? Let's ease back in
        if (avgPercent < 0.4 && skillLevel === "advanced")      adjustedSkillLevel = "intermediate";
        if (avgPercent < 0.4 && skillLevel === "intermediate")  adjustedSkillLevel = "beginner";
      }
    }

    const questions = await generateQuiz({ topic, language, skillLevel: adjustedSkillLevel, repoContext });
    res.json({ questions, adjustedSkillLevel });
  } catch (err) {
    console.error("Quiz generation error:", err.message);
    res.status(500).json({ error: "Couldn't generate a quiz right now. Please try again.", details: err.message });
  }
});

// POST /api/ai/debug — generates a buggy code snippet for the student to fix
router.post("/debug", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "Please provide a topic, language, and skill level." });
    }

    const exercise = await generateDebugExercise({ topic, language, skillLevel, repoContext });
    res.json({ exercise });
  } catch (err) {
    console.error("Debug exercise error:", err.message);
    res.status(500).json({ error: "Couldn't generate a debug exercise. Please try again.", details: err.message });
  }
});

// POST /api/ai/coding — generates an open-ended coding challenge
router.post("/coding", async (req, res) => {
  try {
    const { topic, language, skillLevel, repoContext } = req.body;
    if (!topic || !language || !skillLevel) {
      return res.status(400).json({ error: "Please provide a topic, language, and skill level." });
    }

    const exercise = await generateCodingExercise({ topic, language, skillLevel, repoContext });
    res.json({ exercise });
  } catch (err) {
    console.error("Coding exercise error:", err.message);
    res.status(500).json({ error: "Couldn't generate a coding challenge. Please try again.", details: err.message });
  }
});

// Works out what kind of learner the student is based on their score, time, and hint usage
function profileStudentBehavior(score, total, timeSpent, hintsUsed) {
  const percentage = (score / total) * 100;
  let behaviorTag = "Steady Learner";
  let recommendedAction = "Keep going at your current pace — you're doing great!";

  if (percentage >= 80) {
    if (timeSpent < 45) {
      behaviorTag = "Fast Learner";
      recommendedAction = "You picked this up really quickly! Try bumping up the difficulty or moving on to the next topic.";
    } else {
      behaviorTag = "Persistent Learner";
      recommendedAction = "You put in the effort and it paid off. You're ready for more advanced practice.";
    }
  } else if (percentage >= 50) {
    if (hintsUsed > 1) {
      behaviorTag = "Assisted Learner";
      recommendedAction = "You're using hints well to think through problems. Try a similar topic to build more independence.";
    } else {
      behaviorTag = "Steady Learner";
      recommendedAction = "You're making solid progress! Keep reinforcing the core ideas and you'll get there.";
    }
  } else {
    if (timeSpent < 30) {
      behaviorTag = "Careless Responder";
      recommendedAction = "You answered very quickly — try slowing down and reading each question carefully next time.";
    } else {
      behaviorTag = "Struggling Learner";
      recommendedAction = "This topic is giving you a bit of trouble, and that's completely normal! Try revisiting the lesson or dropping to an easier level first.";
    }
  }

  return { behaviorTag, recommendedAction };
}

// POST /api/ai/evaluate/quiz — marks the quiz and returns score + feedback
router.post("/evaluate/quiz", async (req, res) => {
  try {
    const { 
      questions, 
      userAnswers, 
      userId, 
      topic, 
      language, 
      skillLevel, 
      timeSpent = 0, 
      hintsUsed = 0 
    } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ error: "Questions and answers are both required to evaluate the quiz." });
    }

    const result = await evaluateQuiz({ questions, userAnswers });
    
    // Tag the learner and save if we have session info
    if (userId && topic && language && skillLevel) {
      const { behaviorTag, recommendedAction } = profileStudentBehavior(
        result.score,
        result.total,
        timeSpent,
        hintsUsed
      );

      saveScore({
        userId,
        topic,
        language,
        skillLevel,
        score: result.score,
        total: result.total,
        timeSpent,
        hintsUsed,
        behaviorTag,
        recommendedAction,
      });

      result.behaviorTag = behaviorTag;
      result.recommendedAction = recommendedAction;
    }

    res.json(result);
  } catch (err) {
    console.error("Quiz evaluation error:", err.message);
    res.status(500).json({ error: "Couldn't mark your quiz right now. Please try submitting again.", details: err.message });
  }
});

// POST /api/ai/evaluate/debug — checks a debug/coding submission and returns feedback
router.post("/evaluate/debug", async (req, res) => {
  try {
    const { 
      exercise, 
      userCode, 
      userId, 
      topic, 
      language, 
      skillLevel, 
      timeSpent = 0, 
      hintsUsed = 0 
    } = req.body;

    if (!exercise || !userCode) {
      return res.status(400).json({ error: "The exercise and your submitted code are both required." });
    }

    const result = await evaluateDebugExercise({ exercise, userCode });

    // Save progress if we have session info
    if (userId && topic && language && skillLevel) {
      const normalizedScore = Math.round((result.score || 0) / 20); // Scale 0-100 → 0-5
      const { behaviorTag, recommendedAction } = profileStudentBehavior(
        normalizedScore,
        5,
        timeSpent,
        hintsUsed
      );

      saveScore({
        userId,
        topic,
        language,
        skillLevel,
        score: normalizedScore,
        total: 5,
        timeSpent,
        hintsUsed,
        behaviorTag,
        recommendedAction
      });

      result.behaviorTag = behaviorTag;
      result.recommendedAction = recommendedAction;
    }

    res.json(result);
  } catch (err) {
    console.error("Debug evaluation error:", err.message);
    res.status(500).json({ error: "Couldn't check your solution right now. Please try again.", details: err.message });
  }
});

// POST /api/ai/curriculum — builds a full language curriculum for a given level
router.post("/curriculum", async (req, res) => {
  try {
    const { language, skillLevel } = req.body;
    if (!language || !skillLevel) {
      return res.status(400).json({ error: "Please specify a language and skill level." });
    }
    const curriculum = await generateCurriculum({ language, skillLevel });
    res.json(curriculum);
  } catch (err) {
    console.error("Curriculum error:", err.message);
    res.status(500).json({ error: "Couldn't build a curriculum right now. Please try again.", details: err.message });
  }
});

// POST /api/ai/lesson — generates a lesson for a specific topic
router.post("/lesson", async (req, res) => {
  try {
    const { topic, language, skillLevel } = req.body;
    if (!topic || !language) {
      return res.status(400).json({ error: "Please specify a topic and language." });
    }
    const lesson = await generateLesson({ topic, language, skillLevel: skillLevel || "beginner" });
    res.json(lesson);
  } catch (err) {
    console.error("Lesson error:", err.message);
    res.status(500).json({ error: "Couldn't write this lesson right now. Please try again.", details: err.message });
  }
});

module.exports = router;
