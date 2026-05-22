# CoBug AI Learning Platform

An AI-powered learning platform that generates personalized quizzes, debugging exercises, and coding tasks — either from a topic you choose or directly from a real GitHub repository.

Built as an internship-level full-stack project using React, Node.js, and the Groq AI API.

---

## What It Does

- **Learn by topic** — pick a topic, language, and skill level. The AI generates exercises tailored to you.
- **Learn from a GitHub repo** — paste any public repo URL. The AI reads the code, explains what the project does, lists all files and functions, and generates exercises based on the actual codebase.
- **Analyze your own code** — paste any code snippet. The AI finds bugs, explains each one in plain English (what's wrong, why it matters, how to fix it), and shows the corrected version.
- **Adaptive difficulty** — your quiz scores are saved. If you consistently score high, the next quiz gets harder. Score low, it gets easier.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS        |
| Backend   | Node.js, Express                    |
| AI        | Groq API (llama-3.3-70b-versatile)  |
| Database  | SQLite via sql.js (pure JavaScript) |
| HTTP      | Axios                               |

---

## Project Structure

```
ai-learning-platform/
│
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── db.js                      # SQLite database (scores table)
│   ├── .env                       # Your API keys (not committed)
│   ├── .env.example               # Template for environment variables
│   ├── package.json
│   │
│   ├── routes/
│   │   ├── aiRoutes.js            # /api/ai/* — exercise generation & evaluation
│   │   └── githubRoutes.js        # /api/github/* — repo analysis & code analysis
│   │
│   └── services/
│       ├── openaiService.js       # All Groq/AI prompt logic
│       └── githubService.js       # GitHub API fetching & code parsing
│
└── frontend/
    ├── index.html
    ├── vite.config.js             # Dev server + proxy to backend
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    │
    └── src/
        ├── main.jsx               # React entry point
        ├── index.css              # Global styles + font imports
        ├── App.jsx                # Root component — tab routing & state
        │
        └── components/
            ├── Quiz.jsx           # MCQ quiz with progress bar
            ├── DebugExercise.jsx  # Code editor for debug & coding tasks
            ├── Result.jsx         # Score display + AI feedback
            ├── CodeAnalyzer.jsx   # Paste code → bug analysis
            └── GitHubExplorer.jsx # GitHub repo explorer + exercise generator
```

---

## Setup & Running

### 1. Clone or open the project

```
ai-learning-platform/
├── backend/
└── frontend/
```

### 2. Add your Groq API key

Open `backend/.env` and set your key:

```env
GROQ_API_KEY=gsk_your_key_here
```

Get a free key at [console.groq.com](https://console.groq.com). No credit card needed.

Optionally add a GitHub token to increase the GitHub API rate limit from 60 to 5000 requests/hour (useful for analyzing many repos):

```env
GITHUB_TOKEN=ghp_your_token_here
```

Get one at [github.com/settings/tokens](https://github.com/settings/tokens) — no special scopes needed for public repos.

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run the backend

```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### 5. Run the frontend

Open a second terminal:

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

Open your browser at **http://localhost:3000**

---

## Full Workflow

### Tab 1 — Learn

This is the main exercise generator.

```
User fills in:
  - Topic (e.g. "async/await", "binary trees")
  - Language (JavaScript, Python, Java, etc.)
  - Skill level (Beginner / Intermediate / Advanced)

User clicks one of three buttons:
  - MCQ Quiz
  - Debug Exercise
  - Coding Task
```

**What happens:**

1. Frontend sends a POST request to the backend with topic, language, skill level, and optional repo context.
2. Backend checks the user's recent scores in SQLite. If they've been scoring above 85% consistently, it bumps the difficulty up one level. Below 40%, it drops it down.
3. Backend sends a structured prompt to the Groq API.
4. Groq returns a JSON response with the exercise.
5. Frontend renders the exercise.
6. User submits their answer.
7. Backend sends the answer + correct answer to Groq for evaluation.
8. Groq returns a score and written feedback.
9. Score is saved to SQLite for future difficulty adjustment.
10. Result screen shows score, per-question breakdown, and AI feedback.

---

### Tab 2 — GitHub Repo

Analyze any public GitHub repository and generate exercises from its actual code.

```
User pastes a GitHub URL:
  https://github.com/owner/repository
```

**What happens:**

1. Frontend sends the URL to `POST /api/github/analyze-full`.
2. Backend calls the GitHub API to fetch the full file tree.
3. Backend filters out `node_modules`, `dist`, `build`, and binary files.
4. Backend fetches the README + up to 8 source files (smallest files first to avoid hitting token limits).
5. Backend runs a regex pass over each file to extract all function names, class names, and method names with their line numbers.
6. All of this is sent to Groq with a prompt asking it to:
   - Describe what the project does in plain English
   - Identify the tech stack
   - Describe the architecture
   - List key features
   - Suggest what a student can learn from this repo
   - Suggest 3 exercises based on the codebase
7. Frontend displays:
   - Repo name, description, stars, primary language
   - AI-written purpose and architecture explanation
   - Tech stack badges
   - Key features list
   - "What you can learn" topics
   - Three sub-tabs: Overview / Files / Functions
   - Files tab: full list of all code files with line counts
   - Functions tab: every function and class found, with file name and line number
   - "Generate Exercise From This Repo" section at the bottom

**Generating an exercise from the repo:**

User picks a skill level and clicks Quiz / Debug / Coding. The repo's code is passed as context to the AI prompt, so the generated exercise is based on the actual patterns and code in that repository. The user is taken to the Learn tab where the exercise loads automatically.

---

### Tab 3 — Analyze Code

Paste any code snippet and get a detailed, beginner-friendly bug report.

```
User pastes code into the editor
User selects language (or leaves it on auto-detect)
User clicks "Analyze My Code"
```

**What happens:**

1. Frontend sends the code and language to `POST /api/github/analyze-code`.
2. Backend sends it to Groq with a detailed prompt asking for:
   - A plain English summary of what the code does
   - Every bug found, with type, line number, title, description, why it matters, how to fix it, the corrected line, and a learning note
   - The fully corrected version of the entire code
   - An overall explanation paragraph
   - Things the student did well (encouragement)
   - Concepts the student should study based on the errors found
3. Frontend renders each bug as a collapsible card. Clicking a card expands it to show:
   - What's wrong (plain English)
   - Why it causes a problem
   - Step-by-step fix instructions
   - The corrected code snippet
   - A "learn more" note explaining the underlying concept
4. At the bottom: full corrected code toggle + concepts to study chips.

---

## API Reference

### AI Routes — `/api/ai`

| Method | Endpoint              | Body                                              | Returns                              |
|--------|-----------------------|---------------------------------------------------|--------------------------------------|
| POST   | `/quiz`               | `{ topic, language, skillLevel, repoContext? }`   | `{ questions[], adjustedSkillLevel }` |
| POST   | `/debug`              | `{ topic, language, skillLevel, repoContext? }`   | `{ exercise }`                       |
| POST   | `/coding`             | `{ topic, language, skillLevel, repoContext? }`   | `{ exercise }`                       |
| POST   | `/evaluate/quiz`      | `{ questions[], userAnswers[], userId?, ... }`    | `{ score, total, results[], feedback }` |
| POST   | `/evaluate/debug`     | `{ exercise, userCode }`                          | `{ isCorrect, score, feedback, missedBugs[] }` |

### GitHub Routes — `/api/github`

| Method | Endpoint          | Body           | Returns                                              |
|--------|-------------------|----------------|------------------------------------------------------|
| POST   | `/analyze`        | `{ repoUrl }`  | Raw repo data: file list, definitions, code context  |
| POST   | `/analyze-full`   | `{ repoUrl }`  | Raw data + AI analysis (purpose, tech stack, etc.)   |
| POST   | `/analyze-code`   | `{ code, language? }` | Bug report with explanations + corrected code |

---

## Database

SQLite database stored at `backend/learning.db` (auto-created on first run).

**Table: `scores`**

| Column      | Type    | Description                        |
|-------------|---------|------------------------------------|
| id          | INTEGER | Auto-increment primary key         |
| user_id     | TEXT    | Random session ID from the browser |
| topic       | TEXT    | Topic of the exercise              |
| language    | TEXT    | Programming language               |
| skill_level | TEXT    | beginner / intermediate / advanced |
| score       | INTEGER | Number of correct answers          |
| total       | INTEGER | Total questions                    |
| created_at  | DATETIME| Timestamp                          |

The `user_id` is generated randomly in the browser on page load (`user_abc123`). It persists for the session. No login or authentication is needed.

---

## Environment Variables

All environment variables live in `backend/.env`.

| Variable      | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| `GROQ_API_KEY`| Yes      | Your Groq API key from console.groq.com          |
| `GITHUB_TOKEN`| No       | GitHub PAT to increase API rate limit            |
| `PORT`        | No       | Backend port (default: 5000)                     |

---

## How the AI Prompts Work

The platform uses **prompt-based generation only** — no agents, no embeddings, no vector databases. Every AI call is a single structured prompt sent to Groq's `llama-3.3-70b-versatile` model.

Each prompt:
- Specifies the exact JSON structure expected in the response
- Asks for raw JSON with no markdown wrapping
- Includes a `parseJson()` helper on the backend that strips any accidental markdown fences before parsing

This keeps the AI integration simple, fast, and easy to modify.

---

## Known Limitations

- No user accounts — session ID resets on page refresh
- GitHub analysis only works on public repositories
- Large repositories (500+ files) may be slow to analyze — only the first 8 source files are read
- The Groq free tier has rate limits — if you hit them, wait a minute and try again
- sql.js stores the database in memory and writes to disk on every save — not suitable for production scale, but fine for local use

---

## Built With

- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Express](https://expressjs.com)
- [Groq API](https://console.groq.com)
- [sql.js](https://sql.js.org)
- [Axios](https://axios-http.com)
