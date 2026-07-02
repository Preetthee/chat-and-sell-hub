import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const productInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price_bdt: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  category: z.string().min(1).max(80),
  in_stock: z.boolean(),
});

const productUpdateInput = productInput.partial().extend({
  id: z.string().uuid(),
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

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      patch[k] = k === "image_url" && v === "" ? null : v;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error, data: row } = await context.supabase
      .from("products")
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supa = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supa
      .from("products")
      .select("id, name, description, price_bdt, image_url, category, in_stock")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
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

export const enhanceProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        category: z.string().max(80).optional().nullable(),
        price_bdt: z.number().int().nonnegative().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured (LOVABLE_API_KEY missing)");

    const system = [
      "You rewrite product listings for Deshi Cart, a Bangladesh e-commerce store (Rajshahi mangoes + consumer tech).",
      'Output STRICT JSON only: {"name": string, "description": string}.',
      "Rules:",
      "- name: 3-8 words, natural, benefit-forward, no ALL CAPS, no emoji, no price.",
      "- description: 1-3 short sentences (max ~280 chars), plain text, no markdown, no bullets, no emoji.",
      "- Keep the same product intent and category. Never invent specs, warranty, or shipping claims.",
      "- Write in clear friendly English suitable for a BD audience.",
      "- Do NOT wrap the JSON in backticks or add prose.",
    ].join("\n");

    const userPrompt =
      `Category: ${data.category ?? "unknown"}\n` +
      (data.price_bdt != null ? `Price: ৳${data.price_bdt}\n` : "") +
      `Current name: ${data.name}\n` +
      (data.description ? `Current description: ${data.description}\n` : "") +
      `Return the improved JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI is busy — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json: any = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: { name?: string; description?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }
    return {
      name: (parsed.name ?? data.name).toString().slice(0, 200),
      description: (parsed.description ?? data.description ?? "").toString().slice(0, 1000),
    };
  });