import { useState } from "react";
import axios from "axios";

/**
 * GitHubInput component
 * Lets the user enter a GitHub repo URL and triggers analysis.
 * Calls onAnalyzed(data) when the repo is successfully processed.
 */
export default function GitHubInput({ onAnalyzed }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setAnalyzed(false);

    try {
      const res = await axios.post("/api/github/analyze", { repoUrl: url });
      onAnalyzed(res.data);
      setAnalyzed(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze repository. Check the URL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        GitHub Repository URL{" "}
        <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Analyzing..." : analyzed ? " Done" : "Analyze"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {analyzed && (
        <p className="text-xs text-green-600 mt-1">Repository analyzed successfully.</p>
      )}
    </div>
  );
}
