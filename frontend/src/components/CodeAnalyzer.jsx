import { useState } from "react";
import axios from "axios";

/**
 * CodeAnalyzer — paste code, get beginner-friendly bug analysis.
 * Shows: what's wrong, why it matters, how to fix it, corrected code, concepts to study.
 */
export default function CodeAnalyzer() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("auto-detect");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showFixed, setShowFixed] = useState(false);
  const [expandedBug, setExpandedBug] = useState(null); // which bug card is expanded

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setShowFixed(false);
    setExpandedBug(null);

    try {
      const res = await axios.post("/api/github/analyze-code", { code, language });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode("");
    setResult(null);
    setError("");
    setShowFixed(false);
    setExpandedBug(null);
  };

  // Color scheme per bug type
  const bugStyle = (type = "") => {
    const t = type.toLowerCase();
    if (t.includes("syntax"))  return { border: "border-red-200",    bg: "bg-red-50",    badge: "bg-red-100 text-red-700",    icon: "🔴", label: "Syntax Error" };
    if (t.includes("logic"))   return { border: "border-orange-200", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", icon: "🟠", label: "Logic Error" };
    if (t.includes("runtime")) return { border: "border-yellow-200", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", icon: "🟡", label: "Runtime Error" };
    if (t.includes("warning")) return { border: "border-blue-200",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",   icon: "🔵", label: "Warning" };
    return                             { border: "border-purple-200", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700", icon: "🟣", label: "Bad Practice" };
  };

  return (
    <div className="space-y-4">

      {/* ── INPUT PANEL ── */}
      {!result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">Paste Your Code</p>
              <p className="text-xs text-gray-500 mt-0.5">AI will find bugs and explain them in plain English</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="auto-detect">🔍 Auto-detect language</option>
              {["JavaScript", "Python", "Java", "C++", "TypeScript", "Go", "Rust", "Ruby", "PHP", "C#"].map(
                (l) => <option key={l} value={l}>{l}</option>
              )}
            </select>
          </div>

          {/* Code editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder={"// Paste your code here...\n// Example:\nfunction greet(name) {\n  console.log('Hello ' + nam)  // bug: typo in variable name\n}"}
            className="w-full h-72 p-4 font-mono text-sm bg-gray-900 text-green-300 focus:outline-none resize-none placeholder-gray-600"
          />

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t border-gray-100">
            <button
              onClick={handleAnalyze}
              disabled={loading || !code.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing your code...
                </span>
              ) : "🔍 Analyze My Code"}
            </button>
            {code && (
              <button
                onClick={() => setCode("")}
                className="px-4 border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg text-sm transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && (
        <div className="space-y-4">

          {/* Status banner */}
          <div className={`rounded-xl border p-5 ${result.hasBugs ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{result.hasBugs ? "🐛" : "✅"}</span>
                  <span className={`font-semibold text-base ${result.hasBugs ? "text-red-800" : "text-green-800"}`}>
                    {result.hasBugs
                      ? `${result.bugs?.length} issue${result.bugs?.length !== 1 ? "s" : ""} found in your code`
                      : "Your code looks good!"}
                  </span>
                  <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {result.language}
                  </span>
                </div>
                {/* What the code does */}
                <p className={`text-sm leading-relaxed ${result.hasBugs ? "text-red-700" : "text-green-700"}`}>
                  <strong>What your code does:</strong> {result.summary}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                ← Try another
              </button>
            </div>
          </div>

          {/* What you did well */}
          {result.goodParts?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">👍 What You Did Well</p>
              <ul className="space-y-1">
                {result.goodParts.map((g, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="mt-0.5">✓</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bug cards */}
          {result.bugs?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                🔍 Issues Explained — Click each one to learn more
              </h3>
              {result.bugs.map((bug, i) => {
                const style = bugStyle(bug.type);
                const isOpen = expandedBug === i;
                return (
                  <div key={i} className={`rounded-xl border ${style.border} overflow-hidden`}>
                    {/* Bug header — always visible, click to expand */}
                    <button
                      onClick={() => setExpandedBug(isOpen ? null : i)}
                      className={`w-full text-left px-4 py-3 ${style.bg} flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{style.icon}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge} shrink-0`}>
                          {bug.type}
                        </span>
                        {bug.line && (
                          <span className="text-xs text-gray-500 shrink-0">Line {bug.line}</span>
                        )}
                        <span className="text-sm font-medium text-gray-800 truncate">{bug.title}</span>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">{isOpen ? "▲ Less" : "▼ More"}</span>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-4 py-4 bg-white space-y-4 border-t border-gray-100">

                        {/* What's wrong */}
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">❓ What's Wrong</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{bug.description}</p>
                        </div>

                        {/* Why it matters */}
                        {bug.whyItMatters && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1">⚡ Why This Causes a Problem</p>
                            <p className="text-sm text-yellow-800 leading-relaxed">{bug.whyItMatters}</p>
                          </div>
                        )}

                        {/* How to fix */}
                        {bug.howToFix && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">🔧 How To Fix It</p>
                            <p className="text-sm text-blue-800 leading-relaxed">{bug.howToFix}</p>
                          </div>
                        )}

                        {/* Fixed line */}
                        {bug.fixedLine && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">✅ Corrected Code</p>
                            <pre className="bg-gray-900 text-green-300 font-mono text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {bug.fixedLine}
                            </pre>
                          </div>
                        )}

                        {/* Learn more */}
                        {bug.learnMore && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">📚 Learn More</p>
                            <p className="text-sm text-purple-800 leading-relaxed">{bug.learnMore}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Overall explanation */}
          {result.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-blue-800 mb-2">💡 Overall Explanation</p>
              <p className="text-sm text-blue-900 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Concepts to study */}
          {result.concepts?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">📖 Concepts to Study Next</p>
              <div className="flex flex-wrap gap-2">
                {result.concepts.map((c, i) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Corrected code toggle */}
          {result.correctedCode && result.hasBugs && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowFixed(!showFixed)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>✅ View Full Corrected Code</span>
                <span className="text-gray-400 text-xs">{showFixed ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showFixed && (
                <pre className="p-4 bg-gray-900 text-green-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap border-t border-gray-100">
                  {result.correctedCode}
                </pre>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
