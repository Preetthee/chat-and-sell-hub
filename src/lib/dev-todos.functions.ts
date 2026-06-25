import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["pending", "in_progress", "done", "blocked"]);
const sourceEnum = z.enum(["user", "auto"]);

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
      .select("id, title, details, status, source, sort_order, created_at, updated_at")
      .order("status", { ascending: true })
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
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: {
      title?: string;
      details?: string | null;
      status?: "pending" | "in_progress" | "done" | "blocked";
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.details !== undefined) patch.details = data.details;
    if (data.status !== undefined) patch.status = data.status;
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