## Dev Todo List Feature

A persistent task tracker visible only to developers (admins). You add items, I update statuses, and on "continue with the work" I implement the open items.

### 1. Grant dev access to preetthees@gmail.com
- Migration: insert an `admin` row into `user_roles` for the user matching that email in `auth.users` (idempotent: `ON CONFLICT DO NOTHING`).
- If that email hasn't signed up yet, the migration will no-op; we'll re-run after first sign-in.

### 2. Database — `dev_todos` table
Columns (besides id/created_at/updated_at):
- `title` (text, required)
- `details` (text, nullable) — for the "rest that wasn't built" notes
- `status` (enum: `pending` | `in_progress` | `done` | `blocked`, default `pending`)
- `source` (enum: `user` | `auto`, default `user`) — `auto` = added by me when a build stops mid-way
- `sort_order` (int, default 0)
- `created_by` (uuid, nullable)

RLS: only `has_role(auth.uid(), 'admin')` can SELECT / INSERT / UPDATE / DELETE. GRANTs to `authenticated` + `service_role`. `updated_at` trigger.

### 3. Server functions (`src/lib/dev-todos.functions.ts`)
All admin-gated (`requireSupabaseAuth` + `has_role` check):
- `listDevTodos`
- `createDevTodo({ title, details? })`
- `updateDevTodoStatus({ id, status })`
- `updateDevTodo({ id, title?, details? })`
- `deleteDevTodo({ id })`

### 4. UI — `/dev/todos` route (admin-gated, like `/dev/products`)
- Table/list of todos grouped or sorted by status.
- Each row: checkbox to toggle done (strike-through when done), status dropdown (pending/in progress/done/blocked), inline edit title, delete.
- "Add todo" form at top (title + optional details).
- Add a "Todo list" card on `/dev` dashboard linking here.

### 5. Workflow behavior (how I use the list)
- When you say **"continue with the work"**, I read open todos (`pending` + `in_progress` + `blocked`), pick the next actionable one(s), and implement. I mark items `done` as they complete and add any leftover scope as new `auto` todos (e.g. "Taskbar backend wiring — UI shipped, persistence pending").
- If a build stops mid-feature in any future turn, I'll append the unfinished parts as `auto` todos so nothing is lost.
- You can cross things out yourself via the UI; I'll also flip status from the server side as work lands.

### Out of scope
- Sharing todos with non-admin users.
- Notifications / email digests.
- Multiple lists / projects / tags (single global dev list for now).
