import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("drawings.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/drawings", (req, res) => {
    const drawings = db.prepare("SELECT id, name, created_at FROM drawings ORDER BY created_at DESC").all();
    res.json(drawings);
  });

  app.get("/api/drawings/:id", (req, res) => {
    const drawing = db.prepare("SELECT * FROM drawings WHERE id = ?").get(req.params.id);
    if (drawing) {
      res.json(drawing);
    } else {
      res.status(404).json({ error: "Drawing not found" });
    }
  });

  app.post("/api/drawings", (req, res) => {
    const { name, data } = req.body;
    const info = db.prepare("INSERT INTO drawings (name, data) VALUES (?, ?)").run(name, data);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/drawings/:id", (req, res) => {
    const { name, data } = req.body;
    db.prepare("UPDATE drawings SET name = ?, data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, data, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/drawings/:id", (req, res) => {
    db.prepare("DELETE FROM drawings WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
