const OpenAI = require("openai");

// Using Groq's API — it's OpenAI-compatible so the same SDK works, just a different base URL
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.3-70b-versatile";

// The model sometimes wraps its response in markdown code fences or adds extra text.
// This strips all that out and gives us clean JSON.
function parseJson(text) {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const firstObject = text.indexOf("{");
    const firstArray = text.indexOf("[");
    let startIdx = -1;
    let endIdx = -1;

    if (firstObject !== -1 && (firstArray === -1 || firstObject < firstArray)) {
      startIdx = firstObject;
      endIdx = text.lastIndexOf("}");
    } else if (firstArray !== -1) {
      startIdx = firstArray;
      endIdx = text.lastIndexOf("]");
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const jsonStr = text.slice(startIdx, endIdx + 1);
        return JSON.parse(jsonStr);
      } catch (innerErr) {
        throw new Error(`Failed to parse extracted JSON: ${innerErr.message}. Raw: ${text}`);
      }
    }
    throw new Error(`No valid JSON structure found in text: ${text}`);
  }
}

// ── Quiz generator ───────────────────────────────────────────
async function generateQuiz({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Base the questions on this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are a friendly and encouraging programming tutor. Generate 5 multiple-choice quiz questions for a student.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Write questions in a clear, conversational tone — as if you're sitting next to the student.
Avoid overly technical jargon unless it's necessary for the topic.

Return ONLY a raw JSON array (no markdown). Each item must have:
- "question": string — the question, phrased naturally
- "options": array of exactly 4 strings (e.g. "A. ...", "B. ...", "C. ...", "D. ...")
- "answer": the correct option string (must match one of the options exactly)
- "explanation": brief, plain-English explanation of why the answer is correct
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const parsed = parseJson(response.choices[0].message.content);
  return Array.isArray(parsed) ? parsed : parsed.questions || parsed[Object.keys(parsed)[0]];
}

// ── Debug exercise generator ─────────────────────────────────
async function generateDebugExercise({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Use code patterns from this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are a friendly programming tutor creating a debugging exercise for a student.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Inject 2-3 realistic bugs into a working code snippet — the kind of bugs real developers make.
Return ONLY a raw JSON object (no markdown) with:
- "description": what the code is supposed to do, explained in plain English
- "buggyCode": the code with bugs injected (as a string)
- "correctCode": the fully fixed version (as a string)
- "bugs": array of strings, each describing one bug in plain English
- "hint": a helpful nudge that points the student in the right direction without giving the answer away
- "expectedOutput": what the correct code should produce
- "difficulty": "${skillLevel}"
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return parseJson(response.choices[0].message.content);
}

// ── Coding exercise generator ────────────────────────────────
async function generateCodingExercise({ topic, language, skillLevel, repoContext = "" }) {
  const contextNote = repoContext
    ? `Relate the task to this repository context:\n${repoContext}\n`
    : "";

  const prompt = `
You are a friendly programming tutor creating a coding challenge for a student.

Topic: ${topic}
Language: ${language}
Skill Level: ${skillLevel}
${contextNote}

Return ONLY a raw JSON object (no markdown) with:
- "title": a short, engaging task title
- "description": a clear, friendly problem statement written as if you're talking directly to the student
- "starterCode": starter code with TODO comments to guide them (as a string)
- "sampleInput": a concrete example input (string)
- "sampleOutput": the expected output for that sample input (string)
- "hints": array of 2-3 progressive hints — from gentle nudge to more specific guidance
- "solution": the complete, well-commented solution code (as a string)
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return parseJson(response.choices[0].message.content);
}

// ── Quiz evaluator ───────────────────────────────────────────
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
${wrongQuestions
  ? `They struggled with: ${wrongQuestions}`
  : "They got every question right — fantastic!"}

Write 2-3 sentences of warm, encouraging, constructive feedback.
Acknowledge what they did well, gently point out any areas to work on, and suggest what to study next.
Write directly to the student — use "you" and keep the tone friendly and supportive.
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

// ── Debug exercise evaluator ─────────────────────────────────
async function evaluateDebugExercise({ exercise, userCode }) {
  const prompt = `
A student was given this buggy code to fix:
${exercise.buggyCode}

The bugs were: ${(exercise.bugs || []).join(", ")}
The correct solution is:
${exercise.correctCode}

The student submitted:
${userCode}

Evaluate their solution fairly and kindly. Return ONLY a raw JSON object (no markdown) with:
- "isCorrect": boolean — true if they fixed all the bugs
- "score": number from 0 to 100
- "feedback": a warm, detailed explanation of what they got right and what they missed — written directly to the student
- "missedBugs": array of bugs they didn't fix (empty array if all fixed)
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return parseJson(response.choices[0].message.content);
}

// ── Code analyser ────────────────────────────────────────────
async function analyzeCode({ code, language }) {
  const prompt = `
You are a warm, patient programming teacher helping a student understand errors in their code.
Your goal is to teach, not just list problems — explain things the way a good friend would.

Language: ${language}

Code to analyse:
\`\`\`
${code}
\`\`\`

Analyse this code carefully and return ONLY a raw JSON object (no markdown) with these fields:

- "language": the detected or provided programming language
- "summary": 1-2 sentence plain-English description of what this code is trying to do
- "hasBugs": boolean — true if any bugs or problems were found
- "overallStatus": one of "clean", "has_bugs", "has_warnings"
- "bugs": array of bug objects. For each bug include:
    - "line": approximate line number (integer, or null)
    - "type": one of "Syntax Error", "Logic Error", "Runtime Error", "Bad Practice", "Warning"
    - "title": short name of the issue (e.g. "Typo in variable name")
    - "description": what is wrong — explain it like you're talking to a beginner. Be specific and friendly.
    - "whyItMatters": what problem will this cause when the code runs?
    - "howToFix": step-by-step plain-English instructions to fix it
    - "fixedLine": the corrected version of just that line or snippet (as a string)
    - "learnMore": one sentence explaining the concept so the student learns something, not just fixes it
- "correctedCode": the complete corrected version of the entire code as a string
- "explanation": a warm, friendly paragraph (3-5 sentences) summarising all the issues and what was fixed. Write as if you're explaining to someone who is just learning.
- "goodParts": array of strings — things the student did well or correctly. Always include at least one. Be genuine.
- "concepts": array of programming concept names the student should study based on the errors found (e.g. ["variable scope", "off-by-one errors"])
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return parseJson(response.choices[0].message.content);
}

// ── GitHub repo AI summary ───────────────────────────────────
async function analyzeRepoWithAI({ owner, repo, context, definitions }) {
  const defSummary = definitions
    .slice(0, 30)
    .map((d) => `${d.type} "${d.name}" in ${d.file}`)
    .join(", ");

  const prompt = `
You are helping a student learn from a real GitHub repository.
Explain everything clearly, like you're showing it to a curious beginner.

Repository: ${owner}/${repo}
Functions/Classes found: ${defSummary || "none extracted"}

Here is the code from the repository:
${context}

Return ONLY a raw JSON object (no markdown) with:
- "purpose": 2-3 sentence plain-English description of what this project does and what problem it solves
- "techStack": array of technologies/libraries detected (e.g. ["Express.js", "React", "SQLite"])
- "architecture": 2-3 sentences describing how the code is structured in plain English (e.g. REST API with frontend/backend split)
- "keyFeatures": array of 3-5 strings describing the main things this project can do
- "learningTopics": array of 4-6 programming topics a student can learn from this repo (e.g. ["REST APIs", "async/await", "database queries"])
- "difficulty": one of "beginner", "intermediate", "advanced" — how complex is this codebase for a learner?
- "suggestedExercises": array of 3 exercise ideas based on this codebase, each with:
    - "title": short, engaging exercise title
    - "description": what the student should build or explore, written in a friendly way
    - "type": one of "quiz", "debug", "coding"
`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return parseJson(response.choices[0].message.content);
}

// ── Curriculum generator ─────────────────────────────────────
async function generateCurriculum({ language, skillLevel }) {
  const prompt = `
You are an experienced and enthusiastic programming educator building a curriculum for a student.
Make it feel structured but welcoming — like a course a friendly mentor would design.

Language: ${language}
Level: ${skillLevel}

Return ONLY a raw JSON object (no markdown) with:
- "language": "${language}"
- "skillLevel": "${skillLevel}"
- "description": 2-sentence overview of what the student will learn and be able to do by the end
- "totalTopics": total number of topics across all modules
- "estimatedHours": estimated total study hours (integer)
- "modules": array of module objects. Each module has:
    - "id": unique string like "mod-1"
    - "title": module name (e.g. "Getting Started", "Functions & Scope")
    - "description": one friendly sentence about what this module covers
    - "topics": array of topic objects. Each topic has:
        - "id": unique string like "mod-1-topic-1"
        - "title": topic name (e.g. "Variables and Data Types")
        - "description": one sentence about what the student will learn
        - "estimatedMinutes": estimated time in minutes (integer, 10-45)
        - "difficulty": "easy", "medium", or "hard"

Generate 4-6 modules with 3-5 topics each. Cover the language thoroughly up to the skill level specified.
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

// ── Lesson generator ─────────────────────────────────────────
async function generateLesson({ topic, language, skillLevel }) {
  const prompt = `
You are a warm, patient programming teacher writing a lesson for a student.
Write as if you're sitting next to them, guiding them through the topic step by step.
Use plain language. Avoid unnecessary jargon. Make it feel encouraging and approachable.

Topic: ${topic}
Language: ${language}
Level: ${skillLevel}

Return ONLY a raw JSON object (no markdown) with:
- "title": lesson title
- "objective": one sentence — what the student will be able to do after this lesson
- "introduction": 2-3 paragraphs introducing the concept. Write as if the student has never seen it before. Use analogies if helpful.
- "keyConcepts": array of concept objects, each with:
    - "name": concept name
    - "explanation": clear, friendly explanation in 2-4 sentences
    - "codeExample": a short, working code example in ${language} (as a string)
    - "codeExplanation": plain-English explanation of what each part of the code does
- "commonMistakes": array of strings — mistakes beginners commonly make with this topic, written as gentle warnings
- "summary": 2-3 sentence recap of the key things covered in this lesson
- "practicePrompt": a short, friendly coding challenge the student can try right now (description only, no solution)
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
