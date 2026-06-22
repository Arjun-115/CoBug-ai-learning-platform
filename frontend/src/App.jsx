import { useState } from "react";
import axios from "axios";
import Quiz from "./components/Quiz.jsx";
import DebugExercise from "./components/DebugExercise.jsx";
import Result from "./components/Result.jsx";
import CodeAnalyzer from "./components/CodeAnalyzer.jsx";
import GitHubExplorer from "./components/GitHubExplorer.jsx";
import LanguageLearning from "./components/LanguageLearning.jsx";
import Dashboard from "./components/Dashboard.jsx";

// Each session gets a unique learner ID so scores are tracked across exercises
const SESSION_USER_ID = `learner_${Math.random().toString(36).slice(2, 9)}`;

const SKILL_LEVEL_VALUES = { beginner: 1, intermediate: 2, advanced: 3 };

const TABS = [
  { id: "learn",     label: "Practice",       hint: "Get quizzes, debug challenges & coding tasks" },
  { id: "language",  label: "Learn",          hint: "Pick a language and explore a full curriculum" },
  { id: "github",    label: "Explore Repo",   hint: "Drop in a GitHub link and learn from real code" },
  { id: "analyze",   label: "Check My Code",  hint: "Paste your code and get beginner-friendly feedback" },
  { id: "dashboard", label: "My Progress",    hint: "See how you're doing and where to focus next" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("learn");

  // ── Practice tab state ──
  const [form, setForm] = useState({ topic: "", language: "JavaScript", skillLevel: "beginner" });
  const [mode, setMode]       = useState(null);
  const [step, setStep]       = useState("setup"); // setup | loading | exercise | result
  const [repoContext, setRepoContext] = useState(null); // { context, owner, repoName }
  const [exercise, setExercise] = useState(null);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Jump straight into a coding challenge when learner clicks "Practice This Topic" in a lesson
  const handlePracticeFromLesson = ({ topic, language, skillLevel }) => {
    setForm({ topic, language, skillLevel });
    setActiveTab("learn");
    generateExercise("coding", { topic, language, skillLevel, repoContext: "" });
  };

  // Build an exercise using the real code from a GitHub repo
  const handleUseRepoForExercise = ({ repoContext: ctx, owner, repoName, exerciseType, skillLevel }) => {
    setRepoContext({ context: ctx, owner, repoName });
    setForm((prev) => ({ ...prev, skillLevel, topic: `${repoName} codebase` }));
    setActiveTab("learn");
    generateExercise(exerciseType, { topic: `${repoName} codebase`, language: "auto-detect", skillLevel, repoContext: ctx });
  };

  const generateExercise = async (selectedMode, overrides = {}) => {
    const payload = {
      topic:      overrides.topic      || form.topic || "general programming",
      language:   overrides.language   || form.language,
      skillLevel: overrides.skillLevel || form.skillLevel,
      repoContext: overrides.repoContext || repoContext?.context || "",
    };

    setError("");
    setMode(selectedMode);
    setStep("loading");

    try {
      let data;
      if (selectedMode === "quiz") {
        const res = await axios.post("/api/ai/quiz", { ...payload, userId: SESSION_USER_ID });
        data = res.data;
      } else if (selectedMode === "debug") {
        const res = await axios.post("/api/ai/debug", payload);
        data = res.data.exercise;
      } else if (selectedMode === "coding") {
        const res = await axios.post("/api/ai/coding", payload);
        data = res.data.exercise;
      }
      setExercise(data);
      setStep("exercise");
    } catch (err) {
      setError(err.response?.data?.error || "Hmm, something went wrong — give it another go!");
      setStep("setup");
    }
  };

  const handleGenerate = (selectedMode) => {
    if (!form.topic.trim()) { setError("What topic do you want to practise? Type something above 👆"); return; }
    generateExercise(selectedMode);
  };

  const handleQuizSubmit = async ({ userAnswers, timeSpent }) => {
    setStep("loading");
    try {
      const res = await axios.post("/api/ai/evaluate/quiz", {
        questions: exercise.questions,
        userAnswers,
        userId: SESSION_USER_ID,
        topic: form.topic,
        language: form.language,
        skillLevel: form.skillLevel,
        timeSpent,
        hintsUsed: 0,
      });
      setResult(res.data);
      setStep("result");
    } catch {
      setError("Couldn't mark your quiz — please try submitting again.");
      setStep("exercise");
    }
  };

  const handleDebugSubmit = async ({ userCode, timeSpent, hintsUsed }) => {
    setStep("loading");
    try {
      const res = await axios.post("/api/ai/evaluate/debug", {
        exercise,
        userCode,
        userId: SESSION_USER_ID,
        topic: form.topic,
        language: form.language,
        skillLevel: form.skillLevel,
        timeSpent,
        hintsUsed,
      });
      setResult(res.data);
      setStep("result");
    } catch {
      setError("Couldn't check your solution — please try again.");
      setStep("exercise");
    }
  };

  const handleReset = () => {
    setStep("setup");
    setMode(null);
    setExercise(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">CoBug AI Learning Platform</h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Your personal AI coding tutor — learn, practise & grow at your own pace
            </p>
          </div>
          {activeTab === "learn" && step !== "setup" && (
            <button onClick={handleReset} className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
              ← Start over
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mt-4 flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              title={tab.hint}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "learn") handleReset(); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ── MY PROGRESS TAB ── */}
        {activeTab === "dashboard" && (
          <Dashboard userId={SESSION_USER_ID} />
        )}

        {/* ── LEARN A LANGUAGE TAB ── */}
        {activeTab === "language" && (
          <LanguageLearning onPractice={handlePracticeFromLesson} />
        )}

        {/* ── EXPLORE REPO TAB ── */}
        {activeTab === "github" && (
          <GitHubExplorer onUseForExercise={handleUseRepoForExercise} />
        )}

        {/* ── CHECK MY CODE TAB ── */}
        {activeTab === "analyze" && <CodeAnalyzer />}

        {/* ── PRACTICE TAB ── */}
        {activeTab === "learn" && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                <span className="shrink-0">⚠️</span> {error}
              </div>
            )}

            {/* SETUP */}
            {step === "setup" && (
              <div className="space-y-6">
                {/* Repo context badge — if coming from GitHub tab */}
                {repoContext && (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div className="text-sm text-indigo-800">
                      Practising from: <strong>{repoContext.owner}/{repoContext.repoName}</strong>
                      <span className="text-indigo-500 ml-2 text-xs">(exercises based on this codebase)</span>
                    </div>
                    <button
                      onClick={() => setRepoContext(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-600"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
                  <div>
                    <h2 className="font-semibold text-gray-800">What do you want to practise today?</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Fill in a topic, pick your language and level — then choose an exercise type below.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <input
                      type="text"
                      name="topic"
                      value={form.topic}
                      onChange={handleFormChange}
                      placeholder="e.g. React hooks, async/await, binary trees, loops…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select
                        name="language"
                        value={form.language}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {["JavaScript", "Python", "Java", "C++", "TypeScript", "Go", "Rust", "Ruby"].map(
                          (l) => <option key={l}>{l}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your skill level</label>
                      <select
                        name="skillLevel"
                        value={form.skillLevel}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="beginner">Beginner — just starting out</option>
                        <option value="intermediate">Intermediate — getting comfortable</option>
                        <option value="advanced">Advanced — ready for a challenge</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Now, how do you want to practise?</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleGenerate("quiz")}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-5 text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      Quick Quiz
                      <p className="text-xs font-normal mt-1.5 opacity-80">5 multiple-choice questions</p>
                    </button>
                    <button
                      onClick={() => handleGenerate("debug")}
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-5 text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      Find the Bug
                      <p className="text-xs font-normal mt-1.5 opacity-80">Spot & fix injected bugs</p>
                    </button>
                    <button
                      onClick={() => handleGenerate("coding")}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-5 text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      Write Code
                      <p className="text-xs font-normal mt-1.5 opacity-80">Build something from scratch</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LOADING */}
            {step === "loading" && (
              <div className="flex flex-col items-center justify-center py-28 text-gray-500">
                <div className="relative mb-5">
                  <div className="w-12 h-12 border-4 border-blue-200 rounded-full" />
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                </div>
                <p className="text-sm font-medium text-gray-700">Preparing your exercise…</p>
                {repoContext && (
                  <p className="text-xs text-gray-400 mt-1.5">Using {repoContext.owner}/{repoContext.repoName} as context</p>
                )}
              </div>
            )}

            {/* EXERCISE */}
            {step === "exercise" && mode === "quiz" && (
              <>
                {exercise.adjustedSkillLevel && exercise.adjustedSkillLevel !== form.skillLevel && (
                  <div className="mb-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs text-indigo-700">
                    <span className="text-base">
                      {SKILL_LEVEL_VALUES[exercise.adjustedSkillLevel] > SKILL_LEVEL_VALUES[form.skillLevel] ? "⬆️" : "⬇️"}
                    </span>
                    <span>
                      <strong>Adapting to your level:</strong> Based on your recent scores, I've bumped this quiz to{" "}
                      <strong>{exercise.adjustedSkillLevel}</strong> level to keep you challenged.
                    </span>
                  </div>
                )}
                <Quiz questions={exercise.questions} adjustedLevel={exercise.adjustedSkillLevel} onSubmit={handleQuizSubmit} />
              </>
            )}
            {step === "exercise" && mode === "debug" && (
              <DebugExercise exercise={exercise} onSubmit={handleDebugSubmit} />
            )}
            {step === "exercise" && mode === "coding" && (
              <DebugExercise
                exercise={{
                  description: exercise.description,
                  buggyCode: exercise.starterCode,
                  hint: exercise.hints?.[0] || "",
                  expectedOutput: exercise.sampleOutput,
                  difficulty: form.skillLevel,
                  isCodingTask: true,
                  title: exercise.title,
                  sampleInput: exercise.sampleInput,
                  hints: exercise.hints,
                }}
                onSubmit={handleDebugSubmit}
                isCodingTask
              />
            )}

            {/* RESULT */}
            {step === "result" && (
              <Result result={result} mode={mode} onReset={handleReset} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
