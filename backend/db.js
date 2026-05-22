const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "learning.db");

// sql.js database instance (initialized once)
let db = null;

/**
 * Initialize the SQLite database using sql.js (pure JS, no native build needed).
 * Loads existing DB from disk if it exists, otherwise creates a fresh one.
 */
async function initDb() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    // Load existing database from disk
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    // Create a new empty database
    db = new SQL.Database();
  }

  // Create scores table if it doesn't exist
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

  // Persist the initial schema to disk
  persistDb();
  console.log("Database initialized");
}

/**
 * Write the in-memory database back to disk.
 * Called after every write operation.
 */
function persistDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Save a quiz/exercise score for a user.
 */
function saveScore({ userId, topic, language, skillLevel, score, total }) {
  if (!db) return;
  db.run(
    `INSERT INTO scores (user_id, topic, language, skill_level, score, total)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, topic, language, skillLevel, score, total]
  );
  persistDb();
}

/**
 * Get the last N scores for a user to determine difficulty adjustment.
 */
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

module.exports = { initDb, saveScore, getRecentScores };
