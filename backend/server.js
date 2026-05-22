require("dotenv").config();
const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
const githubRoutes = require("./routes/githubRoutes");
const { initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ai", aiRoutes);
app.use("/api/github", githubRoutes);

// Health check
app.get("/", (req, res) => res.json({ status: "AI Learning Platform API running" }));

// Initialize DB first, then start the server
// (sql.js requires async initialization)
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
