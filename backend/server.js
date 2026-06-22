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

// Quick health check so the frontend can confirm the API is alive
app.get("/api/health", (req, res) => res.json({ status: "CoBug API is up and running! 🐛" }));

// When deployed, the built React app lives in /public — serve it statically
// (in Colab, Cell 3 copies frontend/dist here before starting the server)
const path = require("path");
const PUBLIC_DIR = path.join(__dirname, "public");
if (require("fs").existsSync(PUBLIC_DIR)) {
  app.use(require("express").static(PUBLIC_DIR));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(PUBLIC_DIR, "index.html"));
    }
  });
}

// Start up — init the DB first, then open the port
initDb().then(() => {
  app.listen(PORT, () => console.log(`🐛 CoBug server is ready at http://localhost:${PORT}`));
}).catch((err) => {
  console.error("Failed to initialise the database:", err);
  process.exit(1);
});
