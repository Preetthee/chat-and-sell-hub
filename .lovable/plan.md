## What I'll build

A warm-heritage storefront based on your selected design, powered by Lovable Cloud (database + auth).

### Pages / Routes
- `/` — Home: sticky nav with logo + profile avatar, mango hero ("All out — stay tuned next year"), electronics product grid (loaded from DB), footer with contact info. Floating WhatsApp + Messenger buttons on every page.
- `/auth` — Sign in / sign up with **Google** and **Email/password** (Facebook not natively supported on Lovable Cloud; will be omitted).
- `/profile` — Shows user's Google avatar if signed in via Google; for email users, a colored circle with their initials. Shows email, name, sign-out button.
- `/_authenticated/dev` — Admin-only page. Non-admins get redirected. Form to add a product (name, description, price, image URL, category, in-stock toggle) plus a table of existing products with delete.
- `/contact` — Simple contact page listing WhatsApp, Messenger, email, phone (also shown in footer).

### Contact info wired in
- WhatsApp: `+8801410533563` → `https://wa.me/8801410533563`
- Messenger + email: placeholders you can edit later (I'll add `# TODO` so they're easy to find)

### Auth
- Email + password and Google OAuth via Lovable Cloud.
- An `onAuthStateChange` listener at the root keeps UI in sync.
- The integration-managed `_authenticated` layout protects `/dev`.

### Database (Lovable Cloud)
- `products` table: `id`, `name`, `description`, `price_bdt`, `image_url`, `category`, `in_stock`, `created_at`. Public SELECT (anyone can view). INSERT/UPDATE/DELETE only for admins.
- `app_role` enum (`admin`, `user`) + `user_roles` table (separate from profiles — security best practice). `has_role()` security-definer function used by RLS policies and route gating.
- `profiles` table: `id` (FK auth.users), `display_name`, `avatar_url`. Auto-created via trigger on signup. RLS: users can read/update only their own row.
- Seeded with the 4 dummy electronics (RAM, monitor, fan, keyboard) shown in the design.

### How you assign devs
After you sign in once, I'll tell you exactly which SQL one-liner to run in the Cloud panel (or I can pre-seed your email if you give it to me now). Devs then see the floating "Dev Dashboard" button and can reach `/dev`.

### Design
Verbatim port of the Warm Heritage prototype: Bricolage Grotesque display + Inter body, mango `#F59E0B`, surface `#FCFAF7`, dark stone hero, white product cards with stone-200 rings, mobile-first grid (2 → 3 → 4 cols). Tokens go into `src/styles.css` as-is.

### Technical notes
- TanStack Start + Lovable Cloud (Supabase under the hood).
- Server functions for product create/delete with `requireSupabaseAuth` + `has_role('admin')` check.
- Home product list uses a public server-publishable client read (works at SSR without auth).
- Floating buttons are a single shared component mounted in `__root.tsx`.
- One migration handles the enum, tables, grants, RLS policies, trigger, and seed.

### What I won't do (and why)
- **Facebook login**: not natively supported in Lovable Cloud. If you really need it later, we'd connect Supabase directly and enable Facebook in its dashboard.
- **No checkout/cart**: per your message, customers contact you via WhatsApp/Messenger to buy. "Inquire on WhatsApp" button on each product card pre-fills a message with the product name.

After approval I'll enable Lovable Cloud, run the migration, and build all pages in one pass.