import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["pending", "in_progress", "done", "blocked"]);
const sourceEnum = z.enum(["user", "auto"]);
const priorityEnum = z.enum(["p0", "p1", "p2", "p3"]);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const listDevTodos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dev_todos")
      .select("id, title, details, status, source, priority, sort_order, created_at, updated_at")
      .order("status", { ascending: true })
      .order("priority", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDevTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().min(1).max(300),
        details: z.string().max(4000).optional().nullable(),
        source: sourceEnum.optional(),
        priority: priorityEnum.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("dev_todos")
      .insert({
        title: data.title,
        details: data.details || null,
        source: data.source ?? "user",
        priority: data.priority ?? "p2",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDevTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        details: z.string().max(4000).optional().nullable(),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: {
      title?: string;
      details?: string | null;
      status?: "pending" | "in_progress" | "done" | "blocked";
      priority?: "p0" | "p1" | "p2" | "p3";
      sort_order?: number;
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.details !== undefined) patch.details = data.details;
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
    const { error } = await context.supabase
      .from("dev_todos")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDevTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dev_todos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enhanceDevTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().min(1).max(300),
        details: z.string().max(4000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured (LOVABLE_API_KEY missing)");

    const system = [
      "You are a senior product engineer helping a solo founder plan build tasks for an e-commerce site called Deshi Cart (Bangladesh, Rajshahi mangoes + tech).",
      "Given a rough todo, output STRICT JSON: {\"title\": string, \"details\": string}.",
      "Rules:",
      "- title: 4-10 words, imperative voice, concrete, no fluff, no emoji.",
      "- details: markdown-free plain text, 3-8 short bullet lines starting with '- ' covering: goal, key sub-steps, acceptance criteria, and any edge cases.",
      "- Keep the same intent as the user's input; do not invent unrelated scope.",
      "- Do NOT wrap the JSON in backticks or add prose.",
    ].join("\n");

    const userPrompt =
      `Rough title: ${data.title}\n` +
      (data.details ? `Existing notes:\n${data.details}\n` : "") +
      `Return the improved JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
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
    let parsed: { title?: string; details?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to salvage a fenced JSON block
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
      title: (parsed.title ?? data.title).toString().slice(0, 300),
      details: (parsed.details ?? data.details ?? "").toString().slice(0, 4000),
    };
  });