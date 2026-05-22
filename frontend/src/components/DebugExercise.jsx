import { useState } from "react";

/**
 * DebugExercise component
 * Used for both debugging exercises and coding tasks.
 * Shows the buggy/starter code in an editable textarea.
 * Calls onSubmit(userCode) when the user submits.
 */
export default function DebugExercise({ exercise, onSubmit, isCodingTask }) {
  const [userCode, setUserCode] = useState(exercise.buggyCode || "");
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Support both single hint string and hints array (coding tasks)
  const hints = exercise.hints || (exercise.hint ? [exercise.hint] : []);

  const handleShowNextHint = () => {
    if (!showHint) {
      setShowHint(true);
    } else if (hintIndex < hints.length - 1) {
      setHintIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            {isCodingTask ? ` ${exercise.title || "Coding Task"}` : " Debug Exercise"}
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
              <p className="font-medium text-gray-600 mb-1">Sample Input</p>
              <code className="text-gray-800">{exercise.sampleInput}</code>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">Expected Output</p>
              <code className="text-gray-800">{exercise.expectedOutput}</code>
            </div>
          </div>
        )}

        {/* Expected output for debug tasks */}
        {!isCodingTask && exercise.expectedOutput && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-600 mb-1">Expected Output</p>
            <code className="text-gray-800">{exercise.expectedOutput}</code>
          </div>
        )}
      </div>

      {/* Code editor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {isCodingTask ? "Write your solution below" : "Fix the bugs in the code below"}
          </span>
          <button
            onClick={() => setUserCode(exercise.buggyCode || "")}
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
            className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {!showHint ? " Show Hint" : hintIndex < hints.length - 1 ? " Next Hint" : " Hint Shown"}
          </button>
        )}
        <button
          onClick={() => onSubmit(userCode)}
          disabled={!userCode.trim()}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Submit Solution
        </button>
      </div>

      {/* Hint display */}
      {showHint && hints[hintIndex] && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <strong>Hint {hints.length > 1 ? `${hintIndex + 1}/${hints.length}` : ""}:</strong>{" "}
          {hints[hintIndex]}
        </div>
      )}
    </div>
  );
}
