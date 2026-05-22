const express = require("express");
const router = express.Router();
const { analyzeRepo } = require("../services/githubService");
const { analyzeCode, analyzeRepoWithAI } = require("../services/openaiService");

/**
 * POST /api/github/analyze
 * Fetch repo file tree + code content. Returns raw structured data.
 * Body: { repoUrl }
 */
router.post("/analyze", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

    const result = await analyzeRepo(repoUrl);
    res.json(result);
  } catch (err) {
    console.error("GitHub analysis error:", err.message);
    res.status(500).json({ error: "Failed to analyze repository", details: err.message });
  }
});

/**
 * POST /api/github/analyze-full
 * Fetch repo + run AI analysis: purpose, tech stack, learning topics, suggested exercises.
 * Body: { repoUrl }
 */
router.post("/analyze-full", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

    // Step 1: fetch repo structure and code
    const repoData = await analyzeRepo(repoUrl);

    // Step 2: run AI analysis on the fetched code
    const aiAnalysis = await analyzeRepoWithAI({
      owner: repoData.owner,
      repo: repoData.repo,
      context: repoData.context,
      definitions: repoData.definitions,
    });

    res.json({ ...repoData, aiAnalysis });
  } catch (err) {
    console.error("Full repo analysis error:", err.message);
    res.status(500).json({ error: "Failed to analyze repository", details: err.message });
  }
});

/**
 * POST /api/github/analyze-code
 * Paste raw code → AI finds bugs, explains errors in beginner-friendly way.
 * Body: { code, language }
 */
router.post("/analyze-code", async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: "code is required" });

    const result = await analyzeCode({ code, language: language || "auto-detect" });
    res.json(result);
  } catch (err) {
    console.error("Code analysis error:", err.message);
    res.status(500).json({ error: "Failed to analyze code", details: err.message });
  }
});

module.exports = router;
