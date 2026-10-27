import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "50kb" }));

async function readTasks() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(DATA_FILE, "[]\n", "utf8");
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2) + "\n", "utf8");
}

function validateTask(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : "";
  const hours = Number(body.hours);
  const priority = Number(body.priority);

  if (!title || title.length > 100) return "Title is required and must be 100 characters or fewer.";
  if (!subject || subject.length > 50) return "Subject is required and must be 50 characters or fewer.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`))) {
    return "Please provide a valid deadline.";
  }
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 500) {
    return "Estimated hours must be between 0.5 and 500.";
  }
  if (![1, 2, 3].includes(priority)) return "Priority must be 1, 2, or 3.";
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Deadline Radar API is running." });
});

app.get("/api/tasks", async (_req, res, next) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const validationError = validateTask(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const tasks = await readTasks();
    const task = {
      id: randomUUID(),
      title: req.body.title.trim(),
      subject: req.body.subject.trim(),
      dueDate: req.body.dueDate,
      hours: Number(req.body.hours),
      priority: Number(req.body.priority),
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.push(task);
    await writeTasks(tasks);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  try {
    if (typeof req.body.completed !== "boolean") {
      return res.status(400).json({ error: "completed must be true or false." });
    }

    const tasks = await readTasks();
    const task = tasks.find((item) => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: "Assignment not found." });

    task.completed = req.body.completed;
    await writeTasks(tasks);
    res.json(task);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex((item) => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Assignment not found." });

    tasks.splice(index, 1);
    await writeTasks(tasks);
    res.json({ message: "Assignment deleted." });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`Deadline Radar API running at http://localhost:${PORT}`);
});
