const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "learning.db");

// sql.js keeps the database in memory — this writes it out to disk so data survives restarts
let db = null;

// Boot the database. If a file already exists on disk, load it. Otherwise start fresh.
async function initDb() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create base scores table
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      language TEXT NOT NULL,
      skill_level TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add the behaviour tracking columns if they're not there yet (handles existing DBs)
  const columns = [
    { name: "time_spent", type: "INTEGER DEFAULT 0" },
    { name: "hints_used", type: "INTEGER DEFAULT 0" },
    { name: "behavior_tag", type: "TEXT DEFAULT 'Unknown'" },
    { name: "recommended_action", type: "TEXT DEFAULT 'None'" }
  ];

  for (const col of columns) {
    try {
      db.run(`ALTER TABLE scores ADD COLUMN ${col.name} ${col.type};`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  persistDb();
  console.log("Database ready — all behaviour tracking columns are in place.");
}

// Flush the in-memory DB to disk
function persistDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Store one exercise result for a learner
function saveScore({
  userId,
  topic,
  language,
  skillLevel,
  score,
  total,
  timeSpent = 0,
  hintsUsed = 0,
  behaviorTag = "Unknown",
  recommendedAction = "None"
}) {
  if (!db) return;
  db.run(
    `INSERT INTO scores (
      user_id, topic, language, skill_level, score, total, 
      time_spent, hints_used, behavior_tag, recommended_action
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      topic,
      language,
      skillLevel,
      score,
      total,
      timeSpent,
      hintsUsed,
      behaviorTag,
      recommendedAction
    ]
  );
  persistDb();
}

// Pull the last N scores for a user — used to decide whether to bump difficulty up or down
function getRecentScores(userId, limit = 5) {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT score, total, skill_level FROM scores
     WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  );
  stmt.bind([userId, limit]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Get the full history for a user — feeds the progress dashboard
function getAllScores(userId) {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT 
      topic, language, skill_level, score, total, 
      time_spent, hints_used, behavior_tag, recommended_action, created_at
     FROM scores WHERE user_id = ? ORDER BY created_at ASC`
  );
  stmt.bind([userId]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { initDb, saveScore, getRecentScores, getAllScores };
