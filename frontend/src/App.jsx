import { useState } from "react";
import axios from "axios";
import Quiz from "./components/Quiz.jsx";
import DebugExercise from "./components/DebugExercise.jsx";
import Result from "./components/Result.jsx";
import CodeAnalyzer from "./components/CodeAnalyzer.jsx";
import GitHubExplorer from "./components/GitHubExplorer.jsx";
import LanguageLearning from "./components/LanguageLearning.jsx";

const SESSION_USER_ID = `user_${Math.random().toString(36).slice(2, 9)}`;

const TABS = [
  { id: "learn",    label: "Practice" },
  { id: "language", label: "Learn a Language" },
  { id: "github",   label: "GitHub Repo" },
  { id: "analyze",  label: "Analyze Code" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("learn");

  // ── Learn tab state ──
  const [form, setForm] = useState({ topic: "", language: "JavaScript", skillLevel: "beginner" });
  const [mode, setMode]       = useState(null);
  const [step, setStep]       = useState("setup"); // setup | loading | exercise | result
  const [repoContext, setRepoContext] = useState(null); // { context, owner, repoName }
  const [exercise, setExercise] = useState(null);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Called from LanguageLearning when user clicks "Practice This Topic"
  const handlePracticeFromLesson = ({ topic, language, skillLevel }) => {
    setForm({ topic, language, skillLevel });
    setActiveTab("learn");
    generateExercise("coding", { topic, language, skillLevel, repoContext: "" });
  };

  // Called from GitHubExplorer when user clicks "Generate Exercise from this repo"
  const handleUseRepoForExercise = ({ repoContext: ctx, owner, repoName, exerciseType, skillLevel }) => {
    setRepoContext({ context: ctx, owner, repoName });
    setForm((prev) => ({ ...prev, skillLevel, topic: `${repoName} codebase` }));
    setActiveTab("learn");
    // Trigger generation immediately
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
        const res = await axios.post("/api/ai/quiz", payload);
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
      setError(err.response?.data?.error || "Something went wrong. Try again.");
      setStep("setup");
    }
  };

  const handleGenerate = (selectedMode) => {
    if (!form.topic.trim()) { setError("Please enter a topic."); return; }
    generateExercise(selectedMode);
  };

  const handleQuizSubmit = async (userAnswers) => {
    setStep("loading");
    try {
      const res = await axios.post("/api/ai/evaluate/quiz", {
        questions: exercise.questions,
        userAnswers,
        userId: SESSION_USER_ID,
        topic: form.topic,
        language: form.language,
        skillLevel: form.skillLevel,
      });
      setResult(res.data);
      setStep("result");
    } catch {
      setError("Failed to evaluate quiz.");
      setStep("exercise");
    }
  };

  const handleDebugSubmit = async (userCode) => {
    setStep("loading");
    try {
      const res = await axios.post("/api/ai/evaluate/debug", { exercise, userCode });
      setResult(res.data);
      setStep("result");
    } catch {
      setError("Failed to evaluate submission.");
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CoBug AI Learning Platform</h1>
            <p className="text-sm text-gray-500">Learn from code · Analyze bugs · Practice exercises</p>
          </div>
          {activeTab === "learn" && step !== "setup" && (
            <button onClick={handleReset} className="text-sm text-blue-600 hover:underline">
              ← Start Over
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mt-4 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "learn") handleReset(); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ── LANGUAGE LEARNING TAB ── */}
        {activeTab === "language" && (
          <LanguageLearning onPractice={handlePracticeFromLesson} />
        )}

        {/* ── GITHUB REPO TAB ── */}
        {activeTab === "github" && (
          <GitHubExplorer onUseForExercise={handleUseRepoForExercise} />
        )}

        {/* ── ANALYZE CODE TAB ── */}
        {activeTab === "analyze" && <CodeAnalyzer />}

        {/* ── LEARN TAB ── */}
        {activeTab === "learn" && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* SETUP */}
            {step === "setup" && (
              <div className="space-y-6">
                {/* Repo context badge — if coming from GitHub tab */}
                {repoContext && (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div className="text-sm text-indigo-800">
                      🐙 Using repo: <strong>{repoContext.owner}/{repoContext.repoName}</strong>
                      <span className="text-indigo-500 ml-2 text-xs">Exercises will be based on this codebase</span>
                    </div>
                    <button
                      onClick={() => setRepoContext(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-600"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-800">Configure Your Session</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <input
                      type="text"
                      name="topic"
                      value={form.topic}
                      onChange={handleFormChange}
                      placeholder="e.g. React hooks, async/await, binary trees"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                      <select
                        name="skillLevel"
                        value={form.skillLevel}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Choose exercise type:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleGenerate("quiz")}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-4 text-sm font-medium transition-colors"
                    >
                      📝 MCQ Quiz
                      <p className="text-xs font-normal mt-1 opacity-80">5 multiple choice questions</p>
                    </button>
                    <button
                      onClick={() => handleGenerate("debug")}
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-4 text-sm font-medium transition-colors"
                    >
                      🐛 Debug Exercise
                      <p className="text-xs font-normal mt-1 opacity-80">Find & fix injected bugs</p>
                    </button>
                    <button
                      onClick={() => handleGenerate("coding")}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-4 text-sm font-medium transition-colors"
                    >
                      💻 Coding Task
                      <p className="text-xs font-normal mt-1 opacity-80">Write code from scratch</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LOADING */}
            {step === "loading" && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm">Generating your exercise with AI...</p>
                {repoContext && (
                  <p className="text-xs text-gray-400 mt-1">Using {repoContext.owner}/{repoContext.repoName} as context</p>
                )}
              </div>
            )}

            {/* EXERCISE */}
            {step === "exercise" && mode === "quiz" && (
              <Quiz questions={exercise.questions} adjustedLevel={exercise.adjustedSkillLevel} onSubmit={handleQuizSubmit} />
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
