import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { checkIsAdmin } from "@/lib/products.functions";
import {
  listDevTodos,
  createDevTodo,
  updateDevTodo,
  deleteDevTodo,
} from "@/lib/dev-todos.functions";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";

type Status = "pending" | "in_progress" | "done" | "blocked";

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-stone-100 text-stone-700",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

export const Route = createFileRoute("/_authenticated/dev/todos")({
  head: () => ({ meta: [{ title: "Dev Todo List — Deshi Cart" }] }),
  beforeLoad: async () => {
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/profile" });
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      throw redirect({ to: "/profile" });
    }
  },
  component: DevTodosPage,
});

function DevTodosPage() {
  const qc = useQueryClient();
  const list = useServerFn(listDevTodos);
  const create = useServerFn(createDevTodo);
  const update = useServerFn(updateDevTodo);
  const remove = useServerFn(deleteDevTodo);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["dev-todos"],
    queryFn: () => list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dev-todos"] });

  const createMut = useMutation({
    mutationFn: (data: { title: string; details?: string | null }) => create({ data }),
    onSuccess: () => {
      toast.success("Todo added");
      invalidate();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (data: { id: string; status?: Status; title?: string; details?: string | null }) =>
      update({ data }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      invalidate();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMut.mutate({ title: title.trim(), details: details.trim() || null });
    setTitle("");
    setDetails("");
  }

  const grouped: Record<Status, typeof todos> = {
    pending: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  todos.forEach((t) => grouped[t.status as Status].push(t));
  const order: Status[] = ["in_progress", "pending", "blocked", "done"];

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link
          to="/dev"
          className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Dev Todo List</h1>
          <p className="mt-1 text-sm text-stone-500">
            Admin-only. Add tasks here; say "continue with the work" and I'll start
            building from the open items.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mb-8 space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs building? (e.g. Add a taskbar)"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-mango"
            required
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details, acceptance criteria, links…"
            rows={2}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-mango"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMut.isPending ? "Adding…" : "Add todo"}
          </button>
        </form>

        {isLoading ? (
          <div className="py-12 text-center text-stone-400">Loading…</div>
        ) : todos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
            No todos yet. Add the first one above.
          </div>
        ) : (
          <div className="space-y-8">
            {order.map((status) => {
              const items = grouped[status];
              if (items.length === 0) return null;
              return (
                <section key={status}>
                  <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-stone-500">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLES[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="text-stone-400">({items.length})</span>
                  </h2>
                  <ul className="space-y-2">
                    {items.map((t) => {
                      const isDone = t.status === "done";
                      return (
                        <li
                          key={t.id}
                          className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateMut.mutate({
                                id: t.id,
                                status: isDone ? "pending" : "done",
                              })
                            }
                            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                              isDone
                                ? "border-green-600 bg-green-600 text-white"
                                : "border-stone-300 bg-white hover:border-brand-ink"
                            }`}
                            aria-label={isDone ? "Mark not done" : "Mark done"}
                          >
                            {isDone && (
                              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`text-sm font-medium ${
                                  isDone ? "text-stone-400 line-through" : "text-brand-ink"
                                }`}
                              >
                                {t.title}
                                {t.source === "auto" && (
                                  <span
                                    title="Added automatically from a stopped build"
                                    className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-violet-700"
                                  >
                                    <Sparkles className="size-2.5" /> auto
                                  </span>
                                )}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                <select
                                  value={t.status}
                                  onChange={(e) =>
                                    updateMut.mutate({
                                      id: t.id,
                                      status: e.target.value as Status,
                                    })
                                  }
                                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-mango"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In progress</option>
                                  <option value="blocked">Blocked</option>
                                  <option value="done">Done</option>
                                </select>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete "${t.title}"?`)) deleteMut.mutate(t.id);
                                  }}
                                  className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            {t.details && (
                              <p
                                className={`mt-1 whitespace-pre-wrap text-xs ${
                                  isDone ? "text-stone-400 line-through" : "text-stone-500"
                                }`}
                              >
                                {t.details}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}