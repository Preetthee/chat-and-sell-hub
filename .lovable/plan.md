## Goal
Expand profile, products management, and catalog with filtering + 100+ seeded products.

## 1. Profile avatar support
- Create a Cloud storage bucket `avatars` (public read, owner write) via migration.
- In `src/routes/_authenticated/profile.tsx` add an avatar block: shows current `avatar_url`, "Upload" button uploads to `avatars/{user_id}.{ext}`, then saves the public URL onto `profiles.avatar_url`. "Remove" clears it.
- Header already shows avatar from profile — no change needed there.

## 2. Developer products page
- Split product management out of `/dev` into a dedicated `/dev/products` route (`src/routes/_authenticated/dev.products.tsx`) with the inventory table + add form, kept admin-gated via `checkIsAdmin`.
- `/dev` becomes a small dashboard landing with a link card to "Manage products".

## 3. Product availability toggle
- On the dev products page, replace the static "In stock / Out" badge with a clickable switch that calls a new `toggleProductStock` server function (admin-gated, updates `in_stock`).
- Add `updateProduct` server function for future use (used by the toggle).

## 4. Category filter on the homepage
- In `src/routes/index.tsx`, derive the unique category list from products and render a horizontal chip row ("All" + each category).
- Use URL search param `?category=` via `validateSearch` so the filter is shareable; filter the rendered grid client-side from the existing query data.

## 5. Seed 100+ dummy products
- Single migration that inserts ~110 products across categories: Electronics, Audio, Wearables, Accessories, Home, Gaming, Cameras, Mobile, Computing, Lighting.
- Each row gets name, short description, realistic BDT price, a category, `in_stock` (mostly true, a handful false to exercise the toggle/badge), `sort_order`, and an `image_url` pointing at Unsplash `source.unsplash.com` keyword URLs so cards render without manual asset work.

## Technical notes
- New file: `src/lib/products.functions.ts` gains `toggleProductStock` and `updateProduct` (both `requireSupabaseAuth` + `has_role(_, 'admin')` check, mirroring `createProduct`/`deleteProduct`).
- Storage: migration creates `avatars` bucket with policies — public SELECT, INSERT/UPDATE/DELETE restricted to `auth.uid()::text = (storage.foldername(name))[1]` or filename prefix match.
- Seed migration is data-only `INSERT`s into `public.products`; safe to re-run guarded by `ON CONFLICT DO NOTHING` on name (add a one-off unique index in the same migration, or use `WHERE NOT EXISTS`).
- Homepage filter uses Zod via `@tanstack/zod-adapter` for `validateSearch({ category: z.string().optional() })`; no extra DB round-trip — filter the existing `["products"]` query in memory.

## Out of scope
- Image cropping / resizing for avatars (raw upload only).
- Pagination on homepage (110 cards in a responsive grid is fine; can revisit).
