import { useEffect, useState } from "react";
import axios from "axios";

/**
 * Dashboard — shows how you're doing, what kind of learner you are,
 * and where to focus next. Updated every time you complete an exercise.
 */
export default function Dashboard({ userId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!userId) return;
    axios
      .get(`/api/ai/scores/${userId}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load your progress history — please refresh and try again.");
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading your learning journey…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        ⚠️ {error}
      </div>
    );
  }

  const scores = data?.scores || [];
  const total = data?.total || 0;
  const avgPct = data?.avgPercent || 0;

  // Work out how you've been spending your study time
  let totalTime = 0;
  let totalHints = 0;
  const behaviorCounts = {};

  scores.forEach((s) => {
    totalTime += s.time_spent || 0;
    totalHints += s.hints_used || 0;
    const tag = s.behavior_tag || "Steady Learner";
    behaviorCounts[tag] = (behaviorCounts[tag] || 0) + 1;
  });

  const avgTime = total > 0 ? Math.round(totalTime / total) : 0;
  const avgHints = total > 0 ? (totalHints / total).toFixed(1) : "0.0";

  // Find your most common learner style
  let dominantProfile = "Steady Learner";
  let maxCount = 0;
  Object.entries(behaviorCounts).forEach(([profile, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantProfile = profile;
    }
  });

  // Each profile gets its own personality
  const profileMetadata = {
    "Fast Learner":      { icon: "⚡", color: "bg-emerald-50 text-emerald-800 border-emerald-200", desc: "You breeze through material quickly — a real speed merchant!" },
    "Persistent Learner":{ icon: "🔥", color: "bg-blue-50 text-blue-800 border-blue-200",     desc: "You stick with things even when they're tough — that's a superpower." },
    "Assisted Learner":  { icon: "💡", color: "bg-indigo-50 text-indigo-800 border-indigo-200",  desc: "You use hints wisely to build your logic step by step. Smart!" },
    "Steady Learner":    { icon: "📈", color: "bg-teal-50 text-teal-800 border-teal-200",        desc: "Consistent and methodical — slow and steady wins the race." },
    "Careless Responder":{ icon: "⚠️", color: "bg-orange-50 text-orange-800 border-orange-200", desc: "You answered fast — try slowing down a little and reading carefully." },
    "Struggling Learner":{ icon: "🧩", color: "bg-red-50 text-red-800 border-red-200",          desc: "Some concepts feel tricky right now — that's completely normal at this stage!" },
  };

  const meta = profileMetadata[dominantProfile] || profileMetadata["Steady Learner"];

  // Per-topic performance summary
  const topicMap = {};
  scores.forEach((s) => {
    const key = `${s.topic} (${s.language})`;
    if (!topicMap[key]) topicMap[key] = { attempts: 0, totalScore: 0, totalPossible: 0 };
    topicMap[key].attempts++;
    topicMap[key].totalScore += Number(s.score);
    topicMap[key].totalPossible += Number(s.total);
  });

  const topicRows = Object.entries(topicMap).map(([label, v]) => ({
    label,
    attempts: v.attempts,
    pct: Math.round((v.totalScore / v.totalPossible) * 100),
  }));

  // Bar chart — your last 10 exercises
  const chartScores = scores.slice(-10);
  const chartMax = 100;

  const getScoreColor = (pct) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Your Learning Progress</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Here's a snapshot of how you've been doing. Keep practising to watch these grow!
        </p>
      </div>

      {total === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400">
          <p className="font-semibold text-gray-600 text-base">No exercises completed yet</p>
          <p className="text-sm mt-2 max-w-xs mx-auto">
            Head over to the <strong>Practice</strong> tab, complete a quiz or debugging challenge, and your progress will show up right here!
          </p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Exercises Done" value={total} color="bg-blue-50 border-blue-200 text-blue-900" />
            <StatCard label="Avg. Score" value={`${avgPct}%`} color="bg-purple-50 border-purple-200 text-purple-900" />
            <StatCard label="Avg. Time" value={`${avgTime}s`} color="bg-orange-50 border-orange-200 text-orange-900" />
            <StatCard label="Avg. Hints" value={avgHints} color="bg-amber-50 border-amber-200 text-amber-900" />
          </div>

          {/* Your learner style spotlight */}
          <div className={`border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${meta.color}`}>
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wider opacity-70">Your Learning Style</h3>
                <p className="text-xl font-bold mt-0.5">{dominantProfile}</p>
                <p className="text-xs mt-1 opacity-80">{meta.desc}</p>
              </div>
            </div>
            <div className="bg-white bg-opacity-60 px-4 py-3 rounded-xl text-xs md:max-w-xs border border-current border-opacity-10">
              <strong>What to do next:</strong>
              <p className="mt-1 text-gray-700 font-medium leading-relaxed">
                {scores[scores.length - 1]?.recommended_action || "Keep going — you're building great habits! 🚀"}
              </p>
            </div>
          </div>

          {/* Score history chart + profile breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score history bar chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Your last {chartScores.length} exercise{chartScores.length !== 1 ? "s" : ""} at a glance
              </h3>
              <div className="flex items-end gap-2 h-36">
                {chartScores.map((s, i) => {
                  const pct = Math.round((Number(s.score) / Number(s.total)) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2.5 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                        <span className="font-semibold">{s.topic}</span>
                        <br />
                        {s.score}/{s.total} ({pct}%) · {s.time_spent}s
                      </div>
                      <div
                        className={`w-full rounded-t-md transition-all ${getScoreColor(pct)}`}
                        style={{ height: `${(pct / chartMax) * 120}px` }}
                      />
                      <span className="text-2xs text-gray-500 font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Mastered (≥80%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Building (50–79%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Needs work (&lt;50%)</span>
              </div>
            </div>

            {/* Learner style breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Style Breakdown</h3>
              <div className="space-y-2">
                {Object.keys(profileMetadata).map((tag) => {
                  const count = behaviorCounts[tag] || 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={tag} className="text-xs">
                      <div className="flex justify-between font-medium text-gray-700 mb-1">
                        <span>{tag}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Topic performance */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">How you're doing by topic</h3>
            <div className="space-y-3">
              {topicRows.map((row, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium truncate max-w-[70%]">{row.label}</span>
                    <span className="text-gray-500 text-xs">{row.attempts} attempt{row.attempts > 1 ? "s" : ""} · {row.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreColor(row.pct)}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full history log */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Full session history</h3>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Topic</th>
                  <th className="pb-2 font-medium">Language</th>
                  <th className="pb-2 font-medium">Level</th>
                  <th className="pb-2 font-medium text-center">Time</th>
                  <th className="pb-2 font-medium text-center">Hints</th>
                  <th className="pb-2 font-medium">Style</th>
                  <th className="pb-2 font-medium text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {[...scores].reverse().map((s, i) => {
                  const pct = Math.round((Number(s.score) / Number(s.total)) * 100);
                  const logIndex = scores.length - i;
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 text-xs">
                      <td className="py-2 text-gray-400">{logIndex}</td>
                      <td className="py-2 text-gray-700 font-medium max-w-[140px] truncate">{s.topic}</td>
                      <td className="py-2 text-gray-500">{s.language}</td>
                      <td className="py-2 text-gray-400 capitalize">{s.skill_level}</td>
                      <td className="py-2 text-center text-gray-600">{s.time_spent || 0}s</td>
                      <td className="py-2 text-center text-gray-600">{s.hints_used || 0}</td>
                      <td className="py-2 text-gray-600 font-medium">
                        <span className="inline-flex items-center gap-1">
                          {s.behavior_tag || "Steady Learner"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            pct >= 80
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : pct >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {s.score}/{s.total} ({pct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`border rounded-xl p-4 shadow-sm hover-lift ${color}`}>
      <div className="text-xs opacity-70 font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
