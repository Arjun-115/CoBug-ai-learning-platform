import { useState } from "react";
import axios from "axios";

/**
 * GitHubExplorer — dedicated tab for analyzing a GitHub repo.
 * Shows: repo description, tech stack, file list, functions/classes,
 * AI learning topics, and lets user generate exercises from the codebase.
 */
export default function GitHubExplorer({ onUseForExercise }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [repo, setRepo] = useState(null);           // full repo data
  const [activeSection, setActiveSection] = useState("overview"); // overview | files | methods
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [generatingEx, setGeneratingEx] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setRepo(null);
    setLoadingMsg("Fetching repository files...");

    try {
      setLoadingMsg("Reading code and extracting structure...");
      // Small delay so user sees the message change
      await new Promise((r) => setTimeout(r, 400));
      setLoadingMsg("Running AI analysis on the codebase...");

      const res = await axios.post("/api/github/analyze-full", { repoUrl: url });
      setRepo(res.data);
      setActiveSection("overview");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze. Check the URL and try again.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleGenerateExercise = (type) => {
    if (!repo) return;
    setGeneratingEx(true);
    // Pass repo context up to App so it can generate an exercise
    onUseForExercise({
      repoContext: repo.context,
      owner: repo.owner,
      repoName: repo.repo,
      exerciseType: type,
      skillLevel,
    });
  };

  const difficultyColor = {
    beginner: "bg-green-100 text-green-700 border-green-200",
    intermediate: "bg-yellow-100 text-yellow-700 border-yellow-200",
    advanced: "bg-red-100 text-red-700 border-red-200",
  };

  const typeColor = {
    function: "bg-blue-100 text-blue-700",
    class: "bg-purple-100 text-purple-700",
    method: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800 mb-1">Analyze a GitHub Repository</h2>
          <p className="text-xs text-gray-500">
            Paste any public GitHub repo URL. The AI will read the code, explain what it does,
            and generate exercises based on it.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://github.com/owner/repository"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {loading ? "Analyzing..." : "🔎 Analyze"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">{loadingMsg}</p>
          <p className="text-xs text-gray-400">This may take 10–20 seconds for large repos</p>
        </div>
      )}

      {/* Results */}
      {repo && !loading && (
        <div className="space-y-4">
          {/* Repo header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-900 text-lg">
                    {repo.owner}/{repo.repo}
                  </h2>
                  {repo.aiAnalysis?.difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${difficultyColor[repo.aiAnalysis.difficulty] || difficultyColor.intermediate}`}>
                      {repo.aiAnalysis.difficulty}
                    </span>
                  )}
                  {repo.meta?.language && (
                    <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                      {repo.meta.language}
                    </span>
                  )}
                </div>
                {/* GitHub description */}
                {repo.meta?.description && (
                  <p className="text-sm text-gray-600">{repo.meta.description}</p>
                )}
                {/* AI purpose */}
                {repo.aiAnalysis?.purpose && (
                  <p className="text-sm text-gray-700 leading-relaxed mt-2">
                    {repo.aiAnalysis.purpose}
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-gray-400 shrink-0">
                <p>{repo.fileCount} files</p>
                {repo.meta?.stars > 0 && <p>⭐ {repo.meta.stars.toLocaleString()}</p>}
              </div>
            </div>

            {/* Tech stack */}
            {repo.aiAnalysis?.techStack?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {repo.aiAnalysis.techStack.map((tech, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: "overview", label: "📋 Overview" },
              { id: "files", label: `📁 Files (${repo.fileCount})` },
              { id: "methods", label: `⚙️ Functions (${repo.definitions?.length || 0})` },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeSection === s.id
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW section */}
          {activeSection === "overview" && (
            <div className="space-y-4">
              {/* Architecture */}
              {repo.aiAnalysis?.architecture && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">🏗️ How It's Built</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{repo.aiAnalysis.architecture}</p>
                </div>
              )}

              {/* Key features */}
              {repo.aiAnalysis?.keyFeatures?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">✨ Key Features</h3>
                  <ul className="space-y-1.5">
                    {repo.aiAnalysis.keyFeatures.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-indigo-500 mt-0.5">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What you can learn */}
              {repo.aiAnalysis?.learningTopics?.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-3">🎓 What You Can Learn From This Repo</h3>
                  <div className="flex flex-wrap gap-2">
                    {repo.aiAnalysis.learningTopics.map((t, i) => (
                      <span key={i} className="text-xs bg-white text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested exercises */}
              {repo.aiAnalysis?.suggestedExercises?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">💡 AI-Suggested Exercises</h3>
                  {repo.aiAnalysis.suggestedExercises.map((ex, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ex.type === "quiz" ? "bg-blue-100 text-blue-700" :
                          ex.type === "debug" ? "bg-orange-100 text-orange-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {ex.type === "quiz" ? "📝 Quiz" : ex.type === "debug" ? "🐛 Debug" : "💻 Coding"}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{ex.title}</span>
                      </div>
                      <p className="text-xs text-gray-600">{ex.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FILES section */}
          {activeSection === "files" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">{repo.fileCount} code files found</p>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {repo.fileList?.map((filePath, i) => {
                  const ext = filePath.split(".").pop();
                  const fetched = repo.fetchedFiles?.find((f) => f.path === filePath);
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono shrink-0">
                          .{ext}
                        </span>
                        <span className="text-xs text-gray-700 font-mono truncate">{filePath}</span>
                      </div>
                      {fetched && (
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {fetched.totalLines} lines
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* METHODS section */}
          {activeSection === "methods" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {repo.definitions?.length === 0 ? (
                <p className="text-sm text-gray-500 p-5">No functions or classes were extracted.</p>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500">
                      {repo.definitions?.length} functions, classes & methods found
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {repo.definitions?.map((def, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${typeColor[def.type] || "bg-gray-100 text-gray-600"}`}>
                            {def.type}
                          </span>
                          <span className="text-sm font-mono text-gray-800 font-medium">{def.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs text-gray-400 truncate max-w-32">{def.file.split("/").pop()}</p>
                          <p className="text-xs text-gray-300">line {def.line}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Generate exercise from this repo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">🚀 Generate Exercise From This Repo</h3>
            <p className="text-xs text-gray-500">
              The AI will use the actual code from <strong>{repo.owner}/{repo.repo}</strong> to create your exercise.
            </p>
            <div className="flex items-center gap-3">
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleGenerateExercise("quiz")}
                disabled={generatingEx}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-3 py-3 text-xs font-medium transition-colors"
              >
                📝 MCQ Quiz
                <p className="font-normal mt-0.5 opacity-80">from this codebase</p>
              </button>
              <button
                onClick={() => handleGenerateExercise("debug")}
                disabled={generatingEx}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-3 py-3 text-xs font-medium transition-colors"
              >
                🐛 Debug Exercise
                <p className="font-normal mt-0.5 opacity-80">based on this code</p>
              </button>
              <button
                onClick={() => handleGenerateExercise("coding")}
                disabled={generatingEx}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-3 py-3 text-xs font-medium transition-colors"
              >
                💻 Coding Task
                <p className="font-normal mt-0.5 opacity-80">inspired by this repo</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
