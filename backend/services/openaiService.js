const OpenAI = require("openai");

// Groq is OpenAI-API-compatible — same SDK, just different baseURL + key
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.3-70b-versatile";

/**
 * Helper: parse JSON from a model response that may wrap it in markdown fences.
 */
function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// QUIZ
// ─────────────────────────────────────────────
async function generateQuiz({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Base the questions on this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are an expert programming tutor. Generate 5 multiple-choice quiz questions.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Return ONLY a raw JSON array (no markdown). Each item must have:
- "question": string
- "options": array of exactly 4 strings (e.g. "A. ...", "B. ...", "C. ...", "D. ...")
- "answer": the correct option string (must match one of the options exactly)
- "explanation": brief explanation of the correct answer
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const parsed = parseJson(response.choices[0].message.content);
  return Array.isArray(parsed) ? parsed : parsed.questions || parsed[Object.keys(parsed)[0]];
}

// ─────────────────────────────────────────────
// DEBUG EXERCISE
// ─────────────────────────────────────────────
async function generateDebugExercise({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Use code patterns from this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are an expert programming tutor. Create a debugging exercise.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Inject 2-3 realistic bugs into a working code snippet.
Return ONLY a raw JSON object (no markdown) with:
- "description": what the code is supposed to do
- "buggyCode": the code with bugs injected (as a string)
- "correctCode": the fixed version (as a string)
- "bugs": array of strings describing each bug
- "hint": a helpful hint without giving away the answer
- "expectedOutput": what the correct code should output
- "difficulty": "${skillLevel}"
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// CODING EXERCISE
// ─────────────────────────────────────────────
async function generateCodingExercise({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Relate the task to this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are an expert programming tutor. Create a coding exercise.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Return ONLY a raw JSON object (no markdown) with:
- "title": short task title
- "description": clear problem statement
- "starterCode": starter code with TODO comments (as a string)
- "sampleInput": example input (string)
- "sampleOutput": expected output for the sample input (string)
- "hints": array of 2-3 progressive hints
- "solution": the complete solution code (as a string)
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// QUIZ EVALUATION
// ─────────────────────────────────────────────
async function evaluateQuiz({ questions, userAnswers }) {
  let score = 0;
  const results = questions.map((q, i) => {
    const isCorrect = userAnswers[i] === q.answer;
    if (isCorrect) score++;
    return {
      question: q.question,
      userAnswer: userAnswers[i],
      correctAnswer: q.answer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const wrongQuestions = results
    .filter((r) => !r.isCorrect)
    .map((r) => r.question)
    .join("; ");

  const prompt = `
A student scored ${score} out of ${questions.length} on a programming quiz.
${wrongQuestions ? `Questions they got wrong: ${wrongQuestions}` : "They got everything correct!"}

Write 2-3 sentences of encouraging, constructive feedback and suggest what to study next.
`;

  const feedbackResponse = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  return {
    score,
    total: questions.length,
    results,
    feedback: feedbackResponse.choices[0].message.content.trim(),
  };
}

// ─────────────────────────────────────────────
// DEBUG EVALUATION
// ─────────────────────────────────────────────
async function evaluateDebugExercise({ exercise, userCode }) {
  const prompt = `
A student was given this buggy code to fix:
${exercise.buggyCode}

The bugs were: ${(exercise.bugs || []).join(", ")}
The correct solution is:
${exercise.correctCode}

The student submitted:
${userCode}

Evaluate their solution. Return ONLY a raw JSON object (no markdown) with:
- "isCorrect": boolean
- "score": number from 0 to 100
- "feedback": detailed explanation of what they got right and wrong
- "missedBugs": array of bugs they didn't fix (empty array if all fixed)
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// CODE ANALYZER (paste & debug)
// ─────────────────────────────────────────────
async function analyzeCode({ code, language }) {
  const prompt = `
You are a friendly programming teacher helping a beginner understand their code errors.

Language: ${language}

Code to analyze:
\`\`\`
${code}
\`\`\`

Analyze this code carefully and return ONLY a raw JSON object (no markdown) with these fields:

- "language": the detected or provided programming language
- "summary": A simple 1-2 sentence description of what this code is trying to do. Use plain English, no jargon.
- "hasBugs": boolean — true if any bugs or issues were found
- "overallStatus": one of "clean", "has_bugs", "has_warnings"
- "bugs": array of bug objects. For each bug include:
    - "line": approximate line number (integer, or null)
    - "type": one of "Syntax Error", "Logic Error", "Runtime Error", "Bad Practice", "Warning"
    - "title": short name of the issue (e.g. "Missing closing bracket")
    - "description": What is wrong — explain it like you're talking to a beginner. Be specific about what the code is doing wrong.
    - "whyItMatters": Why does this cause a problem? What will happen when the code runs?
    - "howToFix": Step-by-step plain English instructions to fix it.
    - "fixedLine": The corrected version of just that line or snippet (as a string)
    - "learnMore": One sentence explaining the concept behind this error so the student learns something.
- "correctedCode": The complete corrected version of the entire code as a string.
- "explanation": A friendly paragraph (3-5 sentences) summarizing all the issues found and what was fixed. Write as if explaining to a student who is just learning.
- "goodParts": array of strings — things the student did well or correctly (encouragement). At least 1 item even if code has bugs.
- "concepts": array of programming concept names the student should study based on the errors found (e.g. ["variable scope", "off-by-one errors"])
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// GITHUB REPO AI SUMMARY
// ─────────────────────────────────────────────
async function analyzeRepoWithAI({ owner, repo, context, definitions }) {
  const defSummary = definitions
    .slice(0, 30)
    .map((d) => `${d.type} "${d.name}" in ${d.file}`)
    .join(", ");

  const prompt = `
You are analyzing a GitHub repository to help a student learn from it.

Repository: ${owner}/${repo}
Functions/Classes found: ${defSummary || "none extracted"}

Here is the code from the repository:
${context}

Return ONLY a raw JSON object (no markdown) with:
- "purpose": 2-3 sentence plain English description of what this project does and what problem it solves
- "techStack": array of technologies/libraries detected (e.g. ["Express.js", "React", "SQLite"])
- "architecture": 2-3 sentences describing how the code is structured (e.g. MVC, REST API, etc.)
- "keyFeatures": array of 3-5 strings describing the main features of the project
- "learningTopics": array of 4-6 programming topics a student can learn from this repo (e.g. ["REST APIs", "async/await", "database queries"])
- "difficulty": one of "beginner", "intermediate", "advanced" — how complex is this codebase?
- "suggestedExercises": array of 3 exercise ideas based on this codebase, each with:
    - "title": short exercise title
    - "description": what the student should build or do
    - "type": one of "quiz", "debug", "coding"
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// CURRICULUM GENERATOR
// ─────────────────────────────────────────────
async function generateCurriculum({ language, skillLevel }) {
  const prompt = `
You are an expert programming educator. Create a complete, structured learning curriculum for ${language} at ${skillLevel} level.

Return ONLY a raw JSON object (no markdown) with:
- "language": "${language}"
- "skillLevel": "${skillLevel}"
- "description": 2-sentence overview of what the student will learn
- "totalTopics": total number of topics
- "estimatedHours": estimated total study hours (integer)
- "modules": array of module objects. Each module has:
    - "id": unique string like "mod-1"
    - "title": module name (e.g. "Getting Started", "Functions & Scope")
    - "description": one sentence about this module
    - "topics": array of topic objects. Each topic has:
        - "id": unique string like "mod-1-topic-1"
        - "title": topic name (e.g. "Variables and Data Types")
        - "description": one sentence about this topic
        - "estimatedMinutes": estimated time in minutes (integer, 10-45)
        - "difficulty": "easy", "medium", or "hard"

Generate 4-6 modules with 3-5 topics each. Cover the language thoroughly from basics to the skill level specified.
For beginner: cover syntax, variables, control flow, functions, basic data structures.
For intermediate: cover OOP, error handling, modules, async, common patterns.
For advanced: cover performance, design patterns, internals, advanced features.
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return parseJson(response.choices[0].message.content);
}

// ─────────────────────────────────────────────
// LESSON GENERATOR
// ─────────────────────────────────────────────
async function generateLesson({ topic, language, skillLevel }) {
  const prompt = `
You are an expert programming teacher. Write a complete, beginner-friendly lesson.

Topic: ${topic}
Language: ${language}
Level: ${skillLevel}

Return ONLY a raw JSON object (no markdown) with:
- "title": lesson title
- "objective": one sentence — what the student will be able to do after this lesson
- "introduction": 2-3 paragraph plain English introduction to the concept. No jargon. Explain it like the student has never seen it before.
- "keyConcepts": array of concept objects, each with:
    - "name": concept name
    - "explanation": clear plain English explanation (2-4 sentences)
    - "codeExample": a short, working code example in ${language} (as a string)
    - "codeExplanation": line-by-line explanation of the code example
- "commonMistakes": array of strings — mistakes beginners commonly make with this topic
- "summary": 2-3 sentence recap of what was covered
- "practicePrompt": a short coding challenge the student can try right now (just the description, no solution)
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return parseJson(response.choices[0].message.content);
}

module.exports = {
  generateQuiz,
  generateDebugExercise,
  generateCodingExercise,
  evaluateQuiz,
  evaluateDebugExercise,
  analyzeCode,
  analyzeRepoWithAI,
  generateCurriculum,
  generateLesson,
};
