## Changes

### 1. Fix WhatsApp button
The `wa.me` short links redirect through `api.whatsapp.com`, which your browser/network blocks (per your screenshot). Switch all WhatsApp links to `https://web.whatsapp.com/send?phone=8801410533563&text=...` — opens WhatsApp Web on desktop and the app on mobile, and isn't behind the blocked subdomain. Update the helper in `FloatingContact.tsx` accordingly.

### 2. Make preetthees@gmail.com the main admin
Lovable Cloud does not expose the service-role key, so I cannot create the auth user + password from a script on your behalf. Two‑step flow:

1. You sign up once at `/auth` with `preetthees@gmail.com` / `Justcouse3#DC` (email confirmation off, so it logs you in immediately).
2. I then run a migration that looks up that email in `auth.users` and inserts an `admin` row into `public.user_roles`. After you refresh, the `/dev` page unlocks.

I'll wait for your "done signing up" before running the role migration.

### 3. Cart system (replaces "Inquire on WhatsApp")
- New `src/lib/cart-store.ts` — tiny Zustand store (already a dep via shadcn? if not, simple React context + `useReducer`) persisted to `localStorage`. Items: `{ productId, name, price_bdt, image_url, qty }`.
- New `src/components/CartSidebar.tsx` — right-side `Sheet` (shadcn) with line items, qty +/−, remove, subtotal in ৳, and a **Checkout via WhatsApp** button that opens `web.whatsapp.com/send?phone=...&text=<formatted order summary>`.
- Header gets a cart icon button with a badge count that opens the sidebar.
- `ProductCard` button changes from "Inquire on WhatsApp" → **"Add to cart"** (disabled when `!in_stock`).

### 4. Mango as a hover-flip tile
- Seed/insert a `Mangoes` product (Rajshahi mango) in the products grid with a "Mangoes" category and `in_stock = true`.
- `ProductCard` gets an optional `hoverOverlay` slot. For the mango product (matched by category `Mangoes`), the card renders normally (image + price + Add to cart) **by default**, and on hover shows a dark overlay with **"All out — Stay tuned next year"** that disables the button. Works on desktop hover; on touch devices it falls back to a tap-to-toggle.
- Leaves the existing hero section intact.

### 5. Cleanup
- Hero text unchanged (already says "Stay tuned next year").
- Footer/contact links also updated to the new WhatsApp URL.

## Files touched
- `src/components/FloatingContact.tsx` — new `whatsappLink()` using `web.whatsapp.com`
- `src/components/ProductCard.tsx` — Add to cart + hover overlay support
- `src/components/Header.tsx` — cart icon w/ badge
- `src/components/CartSidebar.tsx` (new)
- `src/lib/cart-store.ts` (new)
- `src/routes/__root.tsx` — mount `<CartSidebar />`
- migration: insert Mango product; (after your signup) insert admin role

## Not doing
- No real checkout / payment — order still goes out via WhatsApp message, just bundled.
