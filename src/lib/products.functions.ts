import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price_bdt: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  category: z.string().min(1).max(80),
  in_stock: z.boolean(),
});

const listProductsInput = z.object({
  category: z.string().max(80).optional(),
  sort: z.enum(["featured", "price_asc", "price_desc"]).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listProductsInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("products")
      .select("id, name, description, price_bdt, image_url, category, in_stock");
    if (data.category) q = q.eq("category", data.category);
    if (typeof data.minPrice === "number") q = q.gte("price_bdt", data.minPrice);
    if (typeof data.maxPrice === "number") q = q.lte("price_bdt", data.maxPrice);
    if (data.sort === "price_asc") q = q.order("price_bdt", { ascending: true });
    else if (data.sort === "price_desc") q = q.order("price_bdt", { ascending: false });
    else q = q.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProductPriceBounds = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("products")
    .select("price_bdt");
  if (error) throw new Error(error.message);
  const prices = (data ?? []).map((r: any) => r.price_bdt as number);
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error, data: row } = await context.supabase
      .from("products")
      .insert({
        name: data.name,
        description: data.description || null,
        price_bdt: data.price_bdt,
        image_url: data.image_url || null,
        category: data.category,
        in_stock: data.in_stock,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProductStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), in_stock: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("products")
      .update({ in_stock: data.in_stock })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id, in_stock: data.in_stock };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });