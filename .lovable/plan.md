Tackle the seven open dev todos in one pass. Mark each in the dev todo list as the work lands.

## 1. Continue command + build-step tracking (dev)
- Already partially built (the `/dev/todos` page accepts "continue" by you typing it to me). Formalize:
  - Add a "Continue work" button on `/dev/todos` that copies the canonical phrase and shows a tooltip explaining what it does.
  - When I finish a build pass, append any unfinished sub-steps as `source = 'auto'` todos (this is a workflow rule I'll follow going forward — no code needed beyond the existing `auto` badge).

## 2. Harden dev access — admin management UI
- New page `/dev/admins`:
  - Lists current admins (email + granted date) by joining `user_roles` (role='admin') with `profiles`.
  - "Grant admin by email" form and "Revoke" button per row (cannot revoke yourself).
- New server functions in `src/lib/admins.functions.ts` (all `requireSupabaseAuth` + `assertAdmin`):
  - `listAdmins`, `grantAdminByEmail(email)`, `revokeAdmin(userId)`.
  - Lookup uses `supabaseAdmin` loaded inside the handler (auth.admin.listUsers / getUserByEmail) — admin-gated, so safe.
- Audit log: insert into a new `admin_audit_log` table on each grant/revoke (who, target, action, timestamp).
- Add card on `/dev` dashboard linking to `/dev/admins`.

## 3. Todo improvements — priority (P0/P1/P2/P3) + better controls
- DB: add `priority` enum `dev_todo_priority` (`p0`,`p1`,`p2`,`p3`, default `p2`) column on `dev_todos`.
- Server fns: extend create/update to accept `priority`. Default ordering becomes status → priority → sort_order.
- UI on `/dev/todos`:
  - Priority dropdown on add form and inline on each row (color-coded chip: P0 red, P1 orange, P2 blue, P3 gray).
  - Drag handle removed; instead use up/down arrows for sort within status.
  - Filter chips: All / Pending / In progress / Blocked / Done.

## 4. Facebook / Messenger link
- Messenger: `https://m.me/1222478777607742` (provided).
- Facebook page URL not provided — I'll only wire Messenger for now and add a follow-up `auto` todo to capture the FB page URL when you have it.
- Placement: footer of the public site (`src/routes/__root.tsx` or shared footer component) as an icon button, plus a "Message us" button on the homepage hero.

## 5. Product sorting (price asc / desc)
- `src/routes/index.tsx`: add `sort` search param via zod validator (`featured` | `price_asc` | `price_desc`).
- `listProducts` server fn accepts `sort` and applies `.order('price_bdt', { ascending })` accordingly.
- UI: a `Select` next to the category chips with "Featured / Price: Low → High / Price: High → Low".

## 6. Price range slider
- Add `minPrice` / `maxPrice` to the same search params (numeric, clamped).
- `listProducts` applies `.gte('price_bdt', min).lte('price_bdt', max)`.
- UI: shadcn `Slider` (dual-thumb) above the grid, with current min/max in BDT shown. Computes the full range once from `getProductPriceBounds` server fn.

## Technical summary
- **Migrations (1 file):** add `dev_todo_priority` enum + column; create `admin_audit_log` table with grants, RLS (admin-only via `has_role`), and updated_at trigger.
- **New server fn files:** `src/lib/admins.functions.ts` (admin CRUD + audit), extension of `src/lib/dev-todos.functions.ts` (priority), extension of `src/lib/products.functions.ts` (sort + price range + bounds).
- **New routes:** `src/routes/_authenticated/dev.admins.tsx`.
- **Edited routes:** `src/routes/_authenticated/dev.index.tsx` (add Admins card, link to Todos), `src/routes/_authenticated/dev.todos.tsx` (priority UI, filters), `src/routes/index.tsx` (sort dropdown, price slider, search-param wiring), `src/routes/__root.tsx` or shared footer (Messenger link).
- **Types:** regenerated Supabase types after migration.

## Out of scope
- Facebook page URL (waiting on you; auto-todo will be added).
- Drag-and-drop reordering of todos (using up/down arrows instead).
- Saved filter presets / per-user defaults.
