import { useState, useEffect } from "react";

/**
 * Quiz component
 * Walks you through 5 multiple-choice questions one at a time.
 * Tracks how long you spend so we can adapt future difficulty to suit you.
 */
export default function Quiz({ questions, adjustedLevel, onSubmit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Track active time on the quiz
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!questions || questions.length === 0) {
    return <p className="text-gray-500 text-sm">No questions were generated — please try again.</p>;
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;

  const handleSelect = (option) => setSelected(option);

  const handleNext = () => {
    if (!selected) return;
    const updated = { ...answers, [current]: selected };
    setAnswers(updated);

    if (isLast) {
      const answersArray = questions.map((_, i) => updated[i] || "");
      onSubmit({ userAnswers: answersArray, timeSpent });
    } else {
      setCurrent((prev) => prev + 1);
      setSelected(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">📝 Quick Quiz</h2>
        <div className="flex items-center gap-3">
          {adjustedLevel && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {adjustedLevel}
            </span>
          )}
          <span className="text-sm text-gray-500">
            Question {current + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-gray-900 font-medium leading-relaxed">{q.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
              selected === option
                ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Next / Submit */}
      <button
        onClick={handleNext}
        disabled={!selected}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
      >
        {isLast ? "Submit answers ✓" : "Next question →"}
      </button>
    </div>
  );
}
