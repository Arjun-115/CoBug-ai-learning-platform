import { useState, useEffect } from "react";

/**
 * Formats a single-line or poorly-indented code string into readable multi-line code.
 * Works for C-style languages (JS, Python-ish, Java, etc.).
 */
function formatCode(raw = "") {
  // If the code already has newlines and indentation, leave it as-is
  if ((raw.match(/\n/g) || []).length > 3) return raw;

  let result = "";
  let indent = 0;
  const TAB = "  "; // 2-space indent
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === "{" || ch === "[" || ch === "(") {
      result += ch + "\n" + TAB.repeat(indent + 1);
      indent++;
    } else if (ch === "}" || ch === "]" || ch === ")") {
      indent = Math.max(0, indent - 1);
      // trim trailing spaces from current line before closing brace
      result = result.trimEnd() + "\n" + TAB.repeat(indent) + ch;
    } else if (ch === ";") {
      result += ch + "\n" + TAB.repeat(indent);
    } else if (ch === " " && result.endsWith("\n" + TAB.repeat(indent))) {
      // skip leading spaces that would double-indent
    } else {
      result += ch;
    }
    i++;
  }

  // Clean up excessive blank lines
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * DebugExercise component
 * Used for both debugging exercises ("find the bug") and open-ended coding tasks.
 * Tracks time spent and how many hints you asked for — both are used to profile your learning style.
 */
export default function DebugExercise({ exercise, onSubmit, isCodingTask }) {
  const [userCode, setUserCode] = useState(formatCode(exercise.buggyCode || ""));
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Start timer as soon as the exercise loads
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Support both a single hint string and an array of progressive hints
  const hints = exercise.hints || (exercise.hint ? [exercise.hint] : []);

  const handleShowNextHint = () => {
    if (!showHint) {
      setShowHint(true);
      setHintsUsed(1);
    } else if (hintIndex < hints.length - 1) {
      setHintIndex((prev) => prev + 1);
      setHintsUsed((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Task description card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            {isCodingTask ? exercise.title || "Coding Task" : "Find the Bug"}
          </h2>
          <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full capitalize">
            {exercise.difficulty}
          </span>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">{exercise.description}</p>

        {/* Sample I/O for coding tasks */}
        {isCodingTask && exercise.sampleInput && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">Sample input</p>
              <code className="text-gray-800">{exercise.sampleInput}</code>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">Expected output</p>
              <code className="text-gray-800">{exercise.expectedOutput}</code>
            </div>
          </div>
        )}

        {/* Expected output for debug tasks */}
        {!isCodingTask && exercise.expectedOutput && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-600 mb-1">What the fixed code should output</p>
            <code className="text-gray-800">{exercise.expectedOutput}</code>
          </div>
        )}
      </div>

      {/* Code editor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {isCodingTask ? "Write your solution below 👇" : "Find and fix the bugs in the code below 👇"}
          </span>
          <button
            onClick={() => setUserCode(formatCode(exercise.buggyCode || ""))}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
        <textarea
          value={userCode}
          onChange={(e) => setUserCode(e.target.value)}
          spellCheck={false}
          className="w-full h-72 p-4 font-mono text-sm bg-gray-900 text-green-300 focus:outline-none resize-none"
        />
      </div>

      {/* Hint + Submit row */}
      <div className="flex gap-3">
        {hints.length > 0 && (
          <button
            onClick={handleShowNextHint}
            className="flex-1 border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            {!showHint
              ? "I need a hint"
              : hintIndex < hints.length - 1
              ? `Another hint (${hintIndex + 2}/${hints.length})`
              : "No more hints"}
          </button>
        )}
        <button
          onClick={() => onSubmit({ userCode, timeSpent, hintsUsed })}
          disabled={!userCode.trim()}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
        >
          Submit my solution →
        </button>
      </div>

      {/* Hint display */}
      {showHint && hints[hintIndex] && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>Hint{hints.length > 1 ? ` ${hintIndex + 1} of ${hints.length}` : ""}:</strong>{" "}
          {hints[hintIndex]}
        </div>
      )}
    </div>
  );
}
