import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowDownWideNarrow, BookOpen, CalendarDays,
  Check, CheckCircle2, Clock3, Plus, Search, Sparkles, Trash2
} from "lucide-react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const todayString = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function daysUntil(date) {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  const today = new Date(`${todayString()}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86400000);
}

function isOverdue(task) {
  return !task.completed && daysUntil(task.dueDate) < 0;
}

function isDueToday(task) {
  return !task.completed && daysUntil(task.dueDate) === 0;
}

function priorityScore(task) {
  const days = daysUntil(task.dueDate);
  const urgency = days < 0 ? 100 : days === 0 ? 80 : days === 1 ? 65 : days <= 3 ? 45 : days <= 7 ? 25 : 10;
  return urgency + task.priority * 12 + Math.min(task.hours * 2, 20);
}

function deadlineLabel(task) {
  const days = daysUntil(task.dueDate);
  if (task.completed) return "Completed";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("smart");
  const [form, setForm] = useState({
    title: "", subject: "", dueDate: todayString(), hours: "2", priority: "2"
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/tasks`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load assignments.");
      setTasks(data);
    } catch (err) {
      setError(`${err.message}. Check that the backend is running on port 5000.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => !task.completed);
    const completed = tasks.filter((task) => task.completed);
    return {
      total: tasks.length,
      pending: pending.length,
      dueToday: pending.filter(isDueToday).length,
      completed: completed.length,
      overdue: pending.filter(isOverdue).length,
      rate: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(query) || task.subject.toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !task.completed) ||
        (filter === "completed" && task.completed) ||
        (filter === "overdue" && isOverdue(task)) ||
        (filter === "today" && isDueToday(task));
      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      if (sort === "date") return a.dueDate.localeCompare(b.dueDate);
      if (sort === "workload") return b.hours - a.hours;
      return Number(a.completed) - Number(b.completed) || priorityScore(b) - priorityScore(a);
    });
  }, [tasks, search, filter, sort]);

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function addTask(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      dueDate: form.dueDate,
      hours: Number(form.hours),
      priority: Number(form.priority)
    };

    if (!payload.title || !payload.subject) {
      setError("Please enter an assignment name and subject.");
      return;
    }
    if (payload.dueDate < todayString()) {
      setError("Choose today or a future date for a new assignment.");
      return;
    }
    if (!Number.isFinite(payload.hours) || payload.hours < 0.5 || payload.hours > 500) {
      setError("Estimated workload must be between 0.5 and 500 hours.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add assignment.");
      setTasks((current) => [...current, data]);
      setForm({ title: "", subject: "", dueDate: todayString(), hours: "2", priority: "2" });
      setSuccess("Assignment added successfully!");
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleTask(task) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update assignment.");
      setTasks((current) => current.map((item) => item.id === task.id ? data : item));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete assignment.");
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSuccess("Assignment deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Deadline Radar home">
          <span className="brand-mark"><Activity size={21} /></span>
          <span>Deadline <b>Radar</b></span>
        </a>
        <div className="today-chip"><CalendarDays size={16} /> {new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</div>
      </header>

      <main className="page">
        <section className="hero">
          <div>
            <div className="eyebrow"><Sparkles size={15} /> YOUR PERSONAL STUDY COMMAND CENTER</div>
            <h1>Hey, let's get things <span>done.</span></h1>
            <p>Know what matters, beat your deadlines, and stay on track.</p>
          </div>
          <div className="hero-orb"><CalendarDays size={39} /></div>
        </section>

        {error && <div className="message error-message" role="alert"><AlertCircle size={18} /> <span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        {success && <div className="message success-message" role="status"><CheckCircle2 size={18} /> <span>{success}</span><button onClick={() => setSuccess("")} aria-label="Dismiss message">×</button></div>}

        <section className="stats-grid" aria-label="Assignment statistics">
          <StatCard label="Total assignments" value={stats.total} note="Everything on your radar" icon={<BookOpen />} />
          <StatCard label="Pending" value={stats.pending} note="Still to be completed" icon={<Clock3 />} />
          <StatCard label="Due today" value={stats.dueToday} note={stats.overdue ? `${stats.overdue} overdue — tackle these first` : "Time to focus"} icon={<AlertCircle />} accent={stats.dueToday > 0 || stats.overdue > 0} />
          <StatCard label="Completed" value={stats.completed} note={`${stats.rate}% completion rate`} icon={<CheckCircle2 />} />
        </section>

        <div className="content-grid">
          <section className="panel form-panel">
            <div className="section-heading">
              <div className="heading-icon"><Plus size={19} /></div>
              <div><h2>Add an assignment</h2><p>Get it out of your head and onto your radar.</p></div>
            </div>
            <form onSubmit={addTask}>
              <label htmlFor="title">Assignment name <span>*</span></label>
              <input id="title" name="title" value={form.title} onChange={updateForm} maxLength="100" placeholder="e.g. DBMS end-term project" required />

              <label htmlFor="subject">Subject <span>*</span></label>
              <input id="subject" name="subject" value={form.subject} onChange={updateForm} maxLength="50" placeholder="e.g. Web Development" required />

              <label htmlFor="dueDate">Deadline <span>*</span></label>
              <input id="dueDate" type="date" name="dueDate" min={todayString()} value={form.dueDate} onChange={updateForm} required />

              <div className="two-fields">
                <div>
                  <label htmlFor="hours">Estimated hours</label>
                  <input id="hours" type="number" name="hours" min="0.5" max="500" step="0.5" value={form.hours} onChange={updateForm} required />
                </div>
                <div>
                  <label htmlFor="priority">Importance</label>
                  <select id="priority" name="priority" value={form.priority} onChange={updateForm}>
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                  </select>
                </div>
              </div>
              <button className="primary-button submit-button" type="submit"><Plus size={17} /> Add to my deadlines</button>
            </form>
            <div className="form-footnote"><Check size={15} /> Your assignments are saved by the backend.</div>
          </section>

          <section className="panel tasks-panel">
            <div className="task-heading-row">
              <div className="section-heading">
                <div className="heading-icon radar-icon"><Activity size={19} /></div>
                <div><h2>Your assignment radar</h2><p>{stats.pending} task{stats.pending === 1 ? "" : "s"} still in progress</p></div>
              </div>
              <span className="task-count">{visibleTasks.length} shown</span>
            </div>

            <div className="toolbar">
              <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments..." aria-label="Search assignments" /></div>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter assignments">
                <option value="all">All tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort assignments">
                <option value="smart">Smart priority</option>
                <option value="date">Earliest deadline</option>
                <option value="workload">Highest workload</option>
              </select>
            </div>

            {loading ? <div className="empty-state"><div className="spinner" /><h3>Loading your radar...</h3><p>Connecting to your assignments.</p></div> :
              visibleTasks.length === 0 ? <div className="empty-state"><div className="empty-icon"><CalendarDays size={27} /></div><h3>{tasks.length ? "No matching assignments" : "Your radar is clear!"}</h3><p>{tasks.length ? "Try changing your search or filters." : "Add your first assignment to start planning."}</p></div> :
              <div className="task-list">
                {visibleTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const days = daysUntil(task.dueDate);
                  const score = priorityScore(task);
                  const level = overdue || days <= 1 || score >= 100 ? "urgent" : score >= 65 ? "high" : "low";
                  const priorityName = ["", "Low", "Medium", "High"][task.priority];
                  return (
                    <article className={`task-card ${overdue ? "is-overdue" : ""} ${task.completed ? "is-completed" : ""}`} key={task.id}>
                      <div className="task-main">
                        <div className={`task-check ${task.completed ? "checked" : ""}`} aria-hidden="true">{task.completed && <Check size={14} />}</div>
                        <div className="task-details">
                          <h3>{task.title}</h3>
                          <p className="task-subject"><BookOpen size={14} /> {task.subject}</p>
                          <div className="task-meta">
                            <span className={overdue ? "overdue-text" : ""}><CalendarDays size={14} /> {task.dueDate}</span>
                            <span><Clock3 size={14} /> {task.hours}h</span>
                            <span className="score"><ArrowDownWideNarrow size={14} /> Score {score}</span>
                          </div>
                        </div>
                        <span className={`priority-badge ${task.completed ? "low" : level}`}>{task.completed ? "COMPLETED" : overdue ? "OVERDUE" : priorityName.toUpperCase()}</span>
                      </div>
                      <div className="task-bottom">
                        <span className={`deadline-label ${overdue ? "overdue-text" : ""}`}>{deadlineLabel(task)}</span>
                        <div className="task-actions">
                          <button className="complete-button" onClick={() => toggleTask(task)}>{task.completed ? "↶ Reopen" : <><Check size={14} /> Complete</>}</button>
                          <button className="delete-button" onClick={() => deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /> Delete</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            }
          </section>
        </div>
        <footer className="footer"><span>◈ Deadline Radar</span><span>Plan smarter. Stress less. ✨</span></footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, note, icon, accent = false }) {
  return (
    <article className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

export default App;
