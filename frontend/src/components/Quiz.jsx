import { useState } from "react";

/**
 * Quiz component
 * Displays 5 MCQ questions one at a time and collects answers.
 * Calls onSubmit(userAnswers) when all questions are answered.
 */
export default function Quiz({ questions, adjustedLevel, onSubmit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: selectedOption }
  const [selected, setSelected] = useState(null);

  if (!questions || questions.length === 0) {
    return <p className="text-gray-500 text-sm">No questions generated.</p>;
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;

  const handleSelect = (option) => {
    setSelected(option);
  };

  const handleNext = () => {
    if (!selected) return;
    const updated = { ...answers, [current]: selected };
    setAnswers(updated);

    if (isLast) {
      // Build ordered array of answers
      const answersArray = questions.map((_, i) => updated[i] || "");
      onSubmit(answersArray);
    } else {
      setCurrent((prev) => prev + 1);
      setSelected(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">MCQ Quiz</h2>
        <div className="flex items-center gap-3">
          {adjustedLevel && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {adjustedLevel}
            </span>
          )}
          <span className="text-sm text-gray-500">
            {current + 1} / {questions.length}
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
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
              selected === option
                ? "border-blue-500 bg-blue-50 text-blue-800"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Next / Submit button */}
      <button
        onClick={handleNext}
        disabled={!selected}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {isLast ? "Submit Quiz" : "Next Question "}
      </button>
    </div>
  );
}
