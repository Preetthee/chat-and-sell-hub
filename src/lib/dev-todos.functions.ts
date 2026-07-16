import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["pending", "in_progress", "done", "blocked"]);
const sourceEnum = z.enum(["user", "auto"]);
const priorityEnum = z.enum(["p0", "p1", "p2", "p3"]);
const effortEnum = z.enum(["xs", "s", "m", "l", "xl"]);

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
      .select("id, title, details, status, source, priority, effort, sort_order, created_at, updated_at")
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
        effort: effortEnum.optional().nullable(),
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
      effort?: "xs" | "s" | "m" | "l" | "xl" | null;
      sort_order?: number;
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.details !== undefined) patch.details = data.details;
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.effort !== undefined) patch.effort = data.effort;
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

async function callGatewayJson(system: string, user: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured (LOVABLE_API_KEY missing)");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI is busy — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json: any = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

export const analyzeTodoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: todos, error } = await context.supabase
      .from("dev_todos")
      .select("id, title, details, status, priority")
      .in("status", ["pending", "in_progress", "blocked"]);
    if (error) throw new Error(error.message);
    const list = (todos ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      details: (t.details ?? "").toString().slice(0, 400),
      priority: t.priority ?? "p2",
      status: t.status,
    }));
    if (list.length === 0) return { merges: [], splits: [], perTodo: {} };

    const system = [
      "You are a senior product engineer triaging a solo founder's build backlog for Deshi Cart.",
      "You receive open todos as JSON. Return STRICT JSON with this shape:",
      `{"merges":[{"ids":["uuid",...],"title":"...","details":"- ...","reason":"..."}],`,
      `"splits":[{"id":"uuid","parts":[{"title":"...","details":"- ..."}],"reason":"..."}],`,
      `"perTodo":{"<uuid>":{"action":"merge_with"|"split"|"start"|"none","targetIds":["uuid"],"hint":"one short sentence"}}}`,
      "Rules:",
      "- Consider a task 'small' when it is a single-file/copy/config change or under ~1 hour.",
      "- Consider a task 'big' when it spans multiple concerns (schema + UI + server) or would take a day.",
      "- Merge ONLY tasks that share a surface (same page, same domain, same file) AND are both small. Group 2-4 max.",
      "- Split ONLY tasks that clearly have >=2 independent deliverables. Produce 2-4 parts.",
      "- perTodo must include EVERY input id exactly once.",
      "- action='start' when the task is already right-sized and ready to build.",
      "- action='none' when nothing to suggest.",
      "- titles: 4-10 words imperative, no emoji, no fluff.",
      "- details: 2-6 bullet lines starting with '- '.",
      "- Never invent uuids; only reuse ids from the input.",
      "- Do NOT wrap the JSON in backticks or add prose.",
    ].join("\n");

    const parsed = await callGatewayJson(system, `Open todos:\n${JSON.stringify(list)}`);
    const ids = new Set(list.map((t) => t.id));
    const merges = Array.isArray(parsed?.merges) ? parsed.merges : [];
    const splits = Array.isArray(parsed?.splits) ? parsed.splits : [];
    const perTodo: Record<string, any> = {};
    const rawPer = parsed?.perTodo && typeof parsed.perTodo === "object" ? parsed.perTodo : {};
    for (const id of ids) {
      const p = rawPer[id];
      perTodo[id] = p && typeof p === "object" ? p : { action: "none", hint: "" };
    }
    return {
      merges: merges
        .filter((m: any) => Array.isArray(m?.ids) && m.ids.every((x: string) => ids.has(x)) && m.ids.length >= 2)
        .slice(0, 8),
      splits: splits
        .filter((s: any) => typeof s?.id === "string" && ids.has(s.id) && Array.isArray(s?.parts) && s.parts.length >= 2)
        .slice(0, 8),
      perTodo,
    };
  });

export const mergeTodos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(2).max(8),
        title: z.string().min(1).max(300),
        details: z.string().max(4000).optional().nullable(),
        priority: priorityEnum.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: sources, error: fetchErr } = await context.supabase
      .from("dev_todos")
      .select("id, title, details")
      .in("id", data.ids);
    if (fetchErr) throw new Error(fetchErr.message);
    const originals = (sources ?? []) as { id: string; title: string; details: string | null }[];
    const mergedFrom = originals.map((s) => `- ${s.title}`).join("\n");
    const details = [data.details?.trim() || "", "", "Merged from:", mergedFrom].filter(Boolean).join("\n");
    const { data: created, error: insErr } = await context.supabase
      .from("dev_todos")
      .insert({
        title: data.title,
        details,
        source: "auto",
        priority: data.priority ?? "p2",
        created_by: context.userId,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    const { error: updErr } = await context.supabase
      .from("dev_todos")
      .update({ status: "done" })
      .in("id", data.ids);
    if (updErr) throw new Error(updErr.message);
    return { id: created.id };
  });

export const splitTodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        parts: z
          .array(
            z.object({
              title: z.string().min(1).max(300),
              details: z.string().max(4000).optional().nullable(),
            }),
          )
          .min(2)
          .max(8),
        priority: priorityEnum.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: original, error: fetchErr } = await context.supabase
      .from("dev_todos")
      .select("id, title, priority")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!original) throw new Error("Todo not found");
    const parentTitle = original.title as string;
    const priority = data.priority ?? (original.priority as any) ?? "p2";
    const rows = data.parts.map((p) => ({
      title: p.title,
      details: [p.details?.trim() || "", "", `Split from: ${parentTitle}`].filter(Boolean).join("\n"),
      source: "auto" as const,
      priority,
      created_by: context.userId,
    }));
    const { error: insErr } = await context.supabase.from("dev_todos").insert(rows);
    if (insErr) throw new Error(insErr.message);
    const { error: updErr } = await context.supabase
      .from("dev_todos")
      .update({ status: "done" })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const estimateEffort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ onlyMissing: z.boolean().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("dev_todos")
      .select("id, title, details, effort")
      .in("status", ["pending", "in_progress", "blocked"]);
    if (data.onlyMissing) query = query.is("effort", null);
    const { data: todos, error } = await query;
    if (error) throw new Error(error.message);
    const list = (todos ?? []) as { id: string; title: string; details: string | null; effort: string | null }[];
    if (list.length === 0) return { updated: 0 };

    const system = [
      "You are a senior engineer estimating build effort for a solo founder on Deshi Cart (React + TanStack Start + Supabase).",
      "Given todos as JSON, return STRICT JSON: {\"estimates\":[{\"id\":\"uuid\",\"effort\":\"xs\"|\"s\"|\"m\"|\"l\"|\"xl\"}]}.",
      "Scale (rough dev time):",
      "- xs: <30 min (copy tweak, config, one-line fix)",
      "- s: 30-90 min (single small component or server fn)",
      "- m: 2-4 hrs (feature touching 2-3 files)",
      "- l: 0.5-1 day (schema + UI + server, multi-file)",
      "- xl: >1 day (subsystem, migrations + several routes)",
      "Include EVERY input id exactly once. Reuse only provided ids.",
      "Do NOT wrap in backticks.",
    ].join("\n");

    const input = list.map((t) => ({
      id: t.id,
      title: t.title,
      details: (t.details ?? "").toString().slice(0, 300),
    }));
    const parsed = await callGatewayJson(system, `Todos:\n${JSON.stringify(input)}`);
    const ids = new Set(list.map((t) => t.id));
    const valid = new Set(["xs", "s", "m", "l", "xl"]);
    const estimates: { id: string; effort: string }[] = Array.isArray(parsed?.estimates)
      ? parsed.estimates.filter((e: any) => ids.has(e?.id) && valid.has(e?.effort))
      : [];
    let updated = 0;
    for (const e of estimates) {
      const { error: uErr } = await context.supabase
        .from("dev_todos")
        .update({ effort: e.effort as "xs" | "s" | "m" | "l" | "xl" })
        .eq("id", e.id);
      if (!uErr) updated++;
    }
    return { updated };
  });