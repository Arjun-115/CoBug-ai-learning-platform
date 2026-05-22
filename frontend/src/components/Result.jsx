/**
 * Result component
 * Displays the evaluation result after quiz or debug exercise submission.
 * Shows score, per-question breakdown (for quiz), AI feedback, and a retry button.
 */
export default function Result({ result, mode, onReset }) {
  if (!result) return null;

  const isQuiz = mode === "quiz";
  const percent = isQuiz ? Math.round((result.score / result.total) * 100) : result.score;

  // Color the score based on performance
  const scoreColor =
    percent >= 80 ? "text-green-600" : percent >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-2">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Your Score</p>
        <p className={`text-5xl font-bold ${scoreColor}`}>
          {isQuiz ? `${result.score}/${result.total}` : `${percent}/100`}
        </p>
        <p className={`text-lg font-medium ${scoreColor}`}>
          {percent >= 80 ? "Excellent work!" : percent >= 50 ? "Good effort!" : "Keep practicing!"}
        </p>
      </div>

      {/* AI Feedback */}
      {result.feedback && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-blue-800 mb-2">AI Feedback</p>
          <p className="text-sm text-blue-900 leading-relaxed">{result.feedback}</p>
        </div>
      )}

      {/* Missed bugs (debug exercise) */}
      {result.missedBugs && result.missedBugs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-orange-800 mb-2">Bugs You Missed</p>
          <ul className="list-disc list-inside space-y-1">
            {result.missedBugs.map((bug, i) => (
              <li key={i} className="text-sm text-orange-900">{bug}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-question breakdown (quiz only) */}
      {isQuiz && result.results && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Question Breakdown</h3>
          {result.results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 border text-sm space-y-1 ${
                r.isCorrect
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="font-medium text-gray-800">
                {r.isCorrect ? "" : ""} Q{i + 1}: {r.question}
              </p>
              {!r.isCorrect && (
                <>
                  <p className="text-red-700">Your answer: {r.userAnswer || "Not answered"}</p>
                  <p className="text-green-700">Correct: {r.correctAnswer}</p>
                </>
              )}
              <p className="text-gray-600 italic">{r.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Try again button */}
      <button
        onClick={onReset}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-medium transition-colors"
      >
        Try Another Exercise
      </button>
    </div>
  );
}
