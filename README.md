# CoBug

A learning platform that uses AI to generate exercises from any topic or GitHub repository. Built with React, Node.js, and Groq.

---

## The idea

Most learning tools give you static content. CoBug generates fresh exercises every time — quizzes, debugging challenges, and coding tasks — based on what you want to learn and how well you're doing. You can also drop in a GitHub repo URL and it'll read the actual code to build exercises from it.

---

## What's inside

**Practice** — Pick a topic, language, and skill level. Get a quiz, a buggy code snippet to fix, or a coding problem to solve. Submit your answer and get feedback. The difficulty adjusts based on your recent scores.

**Learn a Language** — Pick any language and the AI builds a full curriculum for you. Each topic has a proper lesson — explanation, code examples, common mistakes. Navigate through topics with prev/next, mark them done, track your progress.

**GitHub Repo** — Paste a public GitHub URL. The platform reads the code, lists every file and function it found, explains what the project does, and lets you generate exercises based on that codebase.

**Code Analyzer** — Paste any code. Get a breakdown of every bug — what's wrong, why it breaks, how to fix it, and what concept to study. Aimed at beginners who want to actually understand their errors, not just see a red squiggle.

---

## Stack

- React 18 + Vite + Tailwind CSS
- Node.js + Express
- Groq API (llama-3.3-70b-versatile)
- SQLite via sql.js

---

## Setup

You need Node.js 18+ and a Groq API key. Groq is free — get a key at [console.groq.com](https://console.groq.com).

```bash
git clone https://github.com/Arjun-115/CoBug-ai-learning-platform.git
cd CoBug-ai-learning-platform
```

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# add your GROQ_API_KEY to .env
npm run dev
```

**Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Environment variables

Only one is required. Everything else is optional.

```env
GROQ_API_KEY=gsk_...        # required
GITHUB_TOKEN=ghp_...        # optional, raises GitHub rate limit
PORT=5000                   # optional, defaults to 5000
```

---

## Project layout

```
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   ├── aiRoutes.js
│   │   └── githubRoutes.js
│   └── services/
│       ├── openaiService.js
│       └── githubService.js
│
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── Quiz.jsx
            ├── DebugExercise.jsx
            ├── Result.jsx
            ├── CodeAnalyzer.jsx
            ├── GitHubExplorer.jsx
            └── LanguageLearning.jsx
```

---

## Running on Google Colab

If you don't want to run it locally, the included `CoBug_AI_Learning_Platform.ipynb` sets everything up in Colab and gives you a public URL via ngrok.

1. Upload the notebook to [colab.research.google.com](https://colab.research.google.com)
2. Fill in your Groq key and ngrok token in Cell 3
3. Run cells top to bottom
4. Cell 6 prints the URL

Get a free ngrok token at [dashboard.ngrok.com](https://dashboard.ngrok.com).

---

## Notes

- No login system. Each browser session gets a random ID for score tracking.
- GitHub analysis only works on public repos.
- The database file (`learning.db`) is created automatically on first run and is excluded from git.
- Groq's free tier has rate limits. If a request fails, wait a moment and retry.

---

Built by [Arjun](https://github.com/Arjun-115)
