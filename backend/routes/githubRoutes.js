const express = require("express");
const router = express.Router();
const { analyzeRepo } = require("../services/githubService");
const { analyzeCode, analyzeRepoWithAI } = require("../services/openaiService");

// POST /api/github/analyze — fetches the repo file tree and code content
router.post("/analyze", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Please provide a valid GitHub repository URL so I can check it out!" });
    }

    const result = await analyzeRepo(repoUrl);
    res.json(result);
  } catch (err) {
    console.error("GitHub analysis error:", err.message);
    res.status(500).json({ 
      error: "Whoops, I couldn't analyze this repository right now. Please check the link and try again.", 
      details: err.message 
    });
  }
});

// POST /api/github/analyze-full — fetches the repo then runs AI analysis on top of it
router.post("/analyze-full", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Please provide a valid GitHub repository URL so I can run the analysis." });
    }

    // Step 1: pull repo structure + code
    const repoData = await analyzeRepo(repoUrl);
    // Step 2: send it through the AI for explanation and exercise ideas
    const aiAnalysis = await analyzeRepoWithAI({
      owner: repoData.owner,
      repo: repoData.repo,
      context: repoData.context,
      definitions: repoData.definitions,
    });

    res.json({ ...repoData, aiAnalysis });
  } catch (err) {
    console.error("Full repo analysis error:", err.message);
    res.status(500).json({ 
      error: "Whoops, I couldn't run the full analysis on this repository. Please make sure it's public and try again.", 
      details: err.message 
    });
  }
});

// POST /api/github/analyze-code — paste raw code, get beginner-friendly bug feedback
router.post("/analyze-code", async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Please paste some code first so I can take a look at it!" });
    }

    const result = await analyzeCode({ code, language: language || "auto-detect" });
    res.json(result);
  } catch (err) {
    console.error("Code analysis error:", err.message);
    res.status(500).json({ 
      error: "Whoops, I ran into an issue while checking your code. Let's try that one more time.", 
      details: err.message 
    });
  }
});

module.exports = router;
