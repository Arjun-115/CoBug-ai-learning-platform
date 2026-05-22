import { useState } from "react";
import axios from "axios";

const LANGUAGES = [
  { name: "JavaScript", icon: "JS",  color: "bg-yellow-400 text-black" },
  { name: "Python",     icon: "PY",  color: "bg-blue-500 text-white" },
  { name: "Java",       icon: "JV",  color: "bg-orange-500 text-white" },
  { name: "C++",        icon: "C++", color: "bg-blue-700 text-white" },
  { name: "TypeScript", icon: "TS",  color: "bg-blue-600 text-white" },
  { name: "Go",         icon: "GO",  color: "bg-cyan-500 text-white" },
  { name: "Rust",       icon: "RS",  color: "bg-orange-700 text-white" },
  { name: "Ruby",       icon: "RB",  color: "bg-red-600 text-white" },
  { name: "PHP",        icon: "PHP", color: "bg-indigo-600 text-white" },
  { name: "Swift",      icon: "SW",  color: "bg-orange-400 text-white" },
  { name: "Kotlin",     icon: "KT",  color: "bg-purple-600 text-white" },
  { name: "C#",         icon: "C#",  color: "bg-green-700 text-white" },
];

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];

const STORAGE_KEY = "cobug_completed_topics";
function loadCompleted() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveCompleted(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const difficultyStyle = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard:   "bg-red-100 text-red-700",
};

export default function LanguageLearning({ onPractice }) {
  const [screen, setScreen]             = useState("pick");
  const [selectedLang, setSelectedLang] = useState(null);
  const [skillLevel, setSkillLevel]     = useState("beginner");
  const [curriculum, setCurriculum]     = useState(null);
  const [loadingCurr, setLoadingCurr]   = useState(false);
  const [lesson, setLesson]             = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [activeTopic, setActiveTopic]   = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);
  const [completed, setCompleted]       = useState(loadCompleted);
  const [error, setError]               = useState("");

  // ── Flat ordered list of all topics across all modules ──
  const allTopics = curriculum
    ? curriculum.modules.flatMap((mod) =>
        mod.topics.map((t) => ({ ...t, moduleTitle: mod.title }))
      )
    : [];

  const activeIndex = activeTopic
    ? allTopics.findIndex((t) => t.id === activeTopic.id)
    : -1;

  const prevTopic = activeIndex > 0 ? allTopics[activeIndex - 1] : null;
  const nextTopic = activeIndex >= 0 && activeIndex < allTopics.length - 1
    ? allTopics[activeIndex + 1]
    : null;

  // ── Load curriculum ──
  const handleSelectLanguage = async (lang) => {
    setSelectedLang(lang);
    setScreen("curriculum");
    setCurriculum(null);
    setLesson(null);
    setActiveTopic(null);
    setExpandedModule(null);
    setError("");
    setLoadingCurr(true);
    try {
      const res = await axios.post("/api/ai/curriculum", { language: lang.name, skillLevel });
      setCurriculum(res.data);
      if (res.data.modules?.length > 0) setExpandedModule(res.data.modules[0].id);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate curriculum. Try again.");
    } finally {
      setLoadingCurr(false);
    }
  };

  // ── Load a lesson ──
  const handleOpenTopic = async (topic, moduleTitle) => {
    const topicWithModule = { ...topic, moduleTitle };
    setActiveTopic(topicWithModule);
    setScreen("lesson");
    setLesson(null);
    setError("");
    setLoadingLesson(true);
    try {
      const res = await axios.post("/api/ai/lesson", {
        topic: topic.title,
        language: selectedLang.name,
        skillLevel,
      });
      setLesson(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load lesson. Try again.");
    } finally {
      setLoadingLesson(false);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Mark complete and optionally go to next ──
  const markComplete = (thenNext = false) => {
    if (!activeTopic) return;
    const key = `${selectedLang.name}-${skillLevel}`;
    const updated = {
      ...completed,
      [key]: [...new Set([...(completed[key] || []), activeTopic.id])],
    };
    setCompleted(updated);
    saveCompleted(updated);
    if (thenNext && nextTopic) {
      handleOpenTopic(nextTopic, nextTopic.moduleTitle);
    }
  };

  const isCompleted = (topicId) => {
    const key = `${selectedLang?.name}-${skillLevel}`;
    return (completed[key] || []).includes(topicId);
  };

  const getProgress = () => {
    if (!curriculum || !selectedLang) return { done: 0, total: 0, pct: 0 };
    const key = `${selectedLang.name}-${skillLevel}`;
    const done = (completed[key] || []).length;
    const total = curriculum.totalTopics || 0;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  // ════════════════════════════════════════
  // PICK LANGUAGE SCREEN
  // ════════════════════════════════════════
  if (screen === "pick") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Learn a Language</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pick a language and skill level. The AI builds a full curriculum with lessons and practice exercises.
          </p>
        </div>

        <div className="flex gap-2">
          {SKILL_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setSkillLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
                skillLevel === level
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => {
            const key = `${lang.name}-${skillLevel}`;
            const done = (completed[key] || []).length;
            return (
              <button
                key={lang.name}
                onClick={() => handleSelectLanguage(lang)}
                className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${lang.color}`}>
                    {lang.icon}
                  </span>
                  <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                    {lang.name}
                  </span>
                </div>
                {done > 0 && (
                  <p className="text-xs text-green-600">{done} topics completed</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // CURRICULUM SCREEN
  // ════════════════════════════════════════
  if (screen === "curriculum") {
    const progress = getProgress();
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("pick")} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedLang.color}`}>
              {selectedLang.icon}
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 leading-none">{selectedLang.name}</h2>
              <p className="text-xs text-gray-400 capitalize">{skillLevel} curriculum</p>
            </div>
          </div>
        </div>

        {loadingCurr && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Building your curriculum...</p>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {curriculum && !loadingCurr && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">{curriculum.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{curriculum.totalTopics} topics</span>
                <span>~{curriculum.estimatedHours}h total</span>
                <span className="capitalize">{skillLevel} level</span>
              </div>
              {progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{progress.done} / {progress.total} topics completed</span>
                    <span>{progress.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {curriculum.modules?.map((mod, modIdx) => (
                <div key={mod.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {modIdx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{mod.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{mod.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-gray-400">{mod.topics?.length} topics</span>
                      <span className="text-gray-300 text-xs">{expandedModule === mod.id ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {expandedModule === mod.id && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {mod.topics?.map((topic) => {
                        const done = isCompleted(topic.id);
                        return (
                          <button
                            key={topic.id}
                            onClick={() => handleOpenTopic(topic, mod.title)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-blue-50 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-blue-400"
                              }`}>
                                {done && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${done ? "text-gray-400 line-through" : "text-gray-700 group-hover:text-blue-700"}`}>
                                  {topic.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{topic.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyStyle[topic.difficulty] || difficultyStyle.easy}`}>
                                {topic.difficulty}
                              </span>
                              <span className="text-xs text-gray-400">{topic.estimatedMinutes}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // LESSON SCREEN
  // ════════════════════════════════════════
  if (screen === "lesson") {
    const done = activeTopic ? isCompleted(activeTopic.id) : false;
    const progress = getProgress();

    return (
      <div className="space-y-4">

        {/* Top nav bar */}
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <button onClick={() => setScreen("pick")} className="text-gray-400 hover:text-gray-600 shrink-0">
              {selectedLang.name}
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => setScreen("curriculum")} className="text-gray-400 hover:text-gray-600 truncate max-w-24">
              {activeTopic?.moduleTitle}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium truncate">{activeTopic?.title}</span>
          </div>

          {/* Topic counter */}
          {allTopics.length > 0 && (
            <span className="text-xs text-gray-400 shrink-0 ml-2">
              {activeIndex + 1} / {allTopics.length}
            </span>
          )}
        </div>

        {/* Mini progress bar */}
        {progress.total > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        )}

        {/* Prev / Next quick nav */}
        <div className="flex gap-2">
          <button
            onClick={() => prevTopic && handleOpenTopic(prevTopic, prevTopic.moduleTitle)}
            disabled={!prevTopic}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← {prevTopic ? prevTopic.title : "Previous"}
          </button>
          <button
            onClick={() => nextTopic && handleOpenTopic(nextTopic, nextTopic.moduleTitle)}
            disabled={!nextTopic}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto"
          >
            {nextTopic ? nextTopic.title : "Next"} →
          </button>
        </div>

        {/* Loading */}
        {loadingLesson && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading lesson...</p>
          </div>
        )}

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {lesson && !loadingLesson && (
          <>
            {/* Lesson header */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{lesson.title}</h2>
                  <p className="text-sm text-blue-600 mt-1">{lesson.objective}</p>
                </div>
                {done && (
                  <span className="shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
                    ✓ Completed
                  </span>
                )}
              </div>
            </div>

            {/* Introduction */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Introduction</h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                {lesson.introduction?.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Key concepts */}
            {lesson.keyConcepts?.map((concept, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold text-gray-800">{concept.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{concept.explanation}</p>
                </div>
                {concept.codeExample && (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                      <span className="text-xs text-gray-400 font-mono">{selectedLang.name}</span>
                      <span className="text-xs text-gray-500">Example</span>
                    </div>
                    <pre className="p-4 bg-gray-900 text-green-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                      {concept.codeExample}
                    </pre>
                    {concept.codeExplanation && (
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">What this code does:</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{concept.codeExplanation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Common mistakes */}
            {lesson.commonMistakes?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-orange-800 mb-3">Common Mistakes to Avoid</h3>
                <ul className="space-y-2">
                  {lesson.commonMistakes.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                      <span className="mt-0.5 shrink-0 text-orange-400">✕</span> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {lesson.summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Summary</h3>
                <p className="text-sm text-blue-900 leading-relaxed">{lesson.summary}</p>
              </div>
            )}

            {/* Practice challenge */}
            {lesson.practicePrompt && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Practice Challenge</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{lesson.practicePrompt}</p>
                <button
                  onClick={() => onPractice({ topic: activeTopic.title, language: selectedLang.name, skillLevel })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Practice This Topic →
                </button>
              </div>
            )}

            {/* Bottom action bar */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              {/* Mark complete row */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                {!done ? (
                  <>
                    <p className="text-sm text-gray-600">Done reading? Mark this lesson complete.</p>
                    <button
                      onClick={() => markComplete(false)}
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark Complete
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-green-700 font-medium">✓ Lesson completed</p>
                )}
              </div>

              {/* Prev / Next full buttons */}
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <button
                  onClick={() => prevTopic && handleOpenTopic(prevTopic, prevTopic.moduleTitle)}
                  disabled={!prevTopic}
                  className="flex flex-col items-start px-5 py-4 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-xs text-gray-400 mb-0.5">← Previous</span>
                  <span className="text-sm font-medium text-gray-700 truncate w-full">
                    {prevTopic ? prevTopic.title : "—"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (!done) markComplete(false);
                    if (nextTopic) handleOpenTopic(nextTopic, nextTopic.moduleTitle);
                  }}
                  disabled={!nextTopic}
                  className="flex flex-col items-end px-5 py-4 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-xs text-gray-400 mb-0.5">Next →</span>
                  <span className="text-sm font-medium text-gray-700 truncate w-full text-right">
                    {nextTopic ? nextTopic.title : "—"}
                  </span>
                </button>
              </div>
            </div>

            {/* Back to curriculum link */}
            <button
              onClick={() => setScreen("curriculum")}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              ← Back to full curriculum
            </button>

          </>
        )}
      </div>
    );
  }
}
