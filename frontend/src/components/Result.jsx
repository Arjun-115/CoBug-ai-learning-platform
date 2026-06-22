/**
 * Result component
 * Shows your score, your learning-style profile, AI feedback, and
 * a breakdown of every question so you can learn from any mistakes.
 */
export default function Result({ result, mode, onReset }) {
  if (!result) return null;

  const isQuiz = mode === "quiz";
  const percent = isQuiz ? Math.round((result.score / result.total) * 100) : result.score;

  const scoreColor =
    percent >= 80 ? "text-emerald-600" : percent >= 50 ? "text-amber-500" : "text-red-500";

  const scoreMessage =
    percent >= 80 ? "Excellent — you nailed it!" :
    percent >= 50 ? "Good effort, you're getting there!" :
                    "Don't worry — every mistake is a step forward. Keep going!";

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-2 shadow-sm">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Your result</p>
        <p className={`text-5xl font-bold ${scoreColor}`}>
          {isQuiz ? `${result.score}/${result.total}` : `${percent}/100`}
        </p>
        <p className={`text-base font-medium ${scoreColor}`}>{scoreMessage}</p>
      </div>

      {/* Learner profile highlight */}
      {result.behaviorTag && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div>
              <p className="text-2xs text-indigo-500 uppercase tracking-wider font-semibold">Your learning style this session</p>
              <p className="text-sm font-bold text-indigo-900 leading-tight">{result.behaviorTag}</p>
            </div>
          </div>
          <div className="text-xs text-indigo-800 max-w-xs border-l border-indigo-200 pl-3">
            <strong>What to try next:</strong> {result.recommendedAction}
          </div>
        </div>
      )}

      {/* AI Feedback */}
      {result.feedback && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-800 mb-2">Feedback from your AI tutor</p>
          <p className="text-sm text-blue-900 leading-relaxed">{result.feedback}</p>
        </div>
      )}

      {/* Bugs you missed (debug exercise) */}
      {result.missedBugs && result.missedBugs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-orange-800 mb-2">Bugs you didn't catch</p>
          <ul className="list-disc list-inside space-y-1">
            {result.missedBugs.map((bug, i) => (
              <li key={i} className="text-sm text-orange-900">{bug}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-question breakdown (quiz only) */}
      {isQuiz && result.results && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Question by question</h3>
          {result.results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 border text-sm space-y-1 ${
                r.isCorrect
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="font-medium text-gray-800">
                Q{i + 1}: {r.question}
              </p>
              {!r.isCorrect && (
                <>
                  <p className="text-red-700">Your answer: {r.userAnswer || "Not answered"}</p>
                  <p className="text-emerald-700">Correct answer: {r.correctAnswer}</p>
                </>
              )}
              <p className="text-gray-600 italic">{r.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Try again */}
      <button
        onClick={onReset}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-medium transition-all hover:shadow-sm"
      >
        Try another exercise →
      </button>
    </div>
  );
}
