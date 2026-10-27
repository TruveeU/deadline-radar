# Deadline Radar

A student assignment planner built with React, Vite, Node.js and Express.

## Features
- Add assignments with a subject, deadline, estimated workload and importance.
- View total, pending, due-today and completed statistics.
- Search and filter assignments.
- Sort by smart priority, deadline or workload.
- Complete, reopen and delete assignments.
- Store tasks in a JSON file through the backend API.
- Validate inputs and display API errors in the UI.

## Requirements
Node.js and npm.

## Run locally

### 1. Start the backend
Open a terminal in the project root:

```bash
cd server
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

### 2. Start the frontend
Open a second terminal in the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## API routes
- `GET /api/health` — health check
- `GET /api/tasks` — list assignments
- `POST /api/tasks` — create an assignment
- `PATCH /api/tasks/:id` — update completion status
- `DELETE /api/tasks/:id` — delete an assignment

## Storage note
This starter project stores tasks in `server/data/tasks.json`. It is suitable for a local demo, not a multi-user production deployment. A deployed server with an ephemeral filesystem may lose changes on restart; use a database for durable production storage.

## Stack
React, Vite, JavaScript, CSS, Node.js, Express, CORS, JSON file storage.
