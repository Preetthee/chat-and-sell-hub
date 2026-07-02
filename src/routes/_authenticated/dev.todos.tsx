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
  enhanceDevTodo,
} from "@/lib/dev-todos.functions";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Sparkles, Copy, ArrowUp, ArrowDown, Wand2 } from "lucide-react";

type Status = "pending" | "in_progress" | "done" | "blocked";
type Priority = "p0" | "p1" | "p2" | "p3";

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

const PRIORITY_LABEL: Record<Priority, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  p0: "bg-red-100 text-red-800 border-red-200",
  p1: "bg-orange-100 text-orange-800 border-orange-200",
  p2: "bg-blue-100 text-blue-800 border-blue-200",
  p3: "bg-stone-100 text-stone-600 border-stone-200",
};

const CONTINUE_PHRASE = "Continue with the work.";

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
  const enhance = useServerFn(enhanceDevTodo);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["dev-todos"],
    queryFn: () => list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dev-todos"] });

  const createMut = useMutation({
    mutationFn: (data: { title: string; details?: string | null; priority?: Priority }) =>
      create({ data }),
    onSuccess: () => {
      toast.success("Todo added");
      invalidate();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (data: {
      id: string;
      status?: Status;
      title?: string;
      details?: string | null;
      priority?: Priority;
      sort_order?: number;
    }) => update({ data }),
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
  const [priority, setPriority] = useState<Priority>("p2");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [enhancing, setEnhancing] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(true);

  async function runEnhance(): Promise<{ title: string; details: string } | null> {
    if (!title.trim()) return null;
    setEnhancing(true);
    try {
      const out = await enhance({
        data: { title: title.trim(), details: details.trim() || null },
      });
      setTitle(out.title);
      setDetails(out.details);
      return out;
    } catch (e: any) {
      toast.error("AI enhance failed", { description: e.message });
      return null;
    } finally {
      setEnhancing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    let finalTitle = title.trim();
    let finalDetails = details.trim() || null;
    if (autoEnhance) {
      const out = await runEnhance();
      if (out) {
        finalTitle = out.title;
        finalDetails = out.details || null;
      }
    }
    createMut.mutate(
      { title: finalTitle, details: finalDetails, priority },
      {
        onSuccess: () => {
          setTitle("");
          setDetails("");
          setPriority("p2");
        },
      },
    );
  }

  async function copyContinue() {
    try {
      await navigator.clipboard.writeText(CONTINUE_PHRASE);
      toast.success("Copied!", { description: "Paste it in chat to start building." });
    } catch {
      toast.error("Copy failed");
    }
  }

  const filteredTodos = filter === "all" ? todos : todos.filter((t: any) => t.status === filter);
  const grouped: Record<Status, typeof todos> = {
    pending: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  filteredTodos.forEach((t: any) => grouped[t.status as Status].push(t));
  const order: Status[] = ["in_progress", "pending", "blocked", "done"];
  const FILTERS: { value: typeof filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In progress" },
    { value: "blocked", label: "Blocked" },
    { value: "done", label: "Done" },
  ];

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
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Dev Todo List</h1>
            <p className="mt-1 text-sm text-stone-500">
              Admin-only. Add tasks here; click "Continue work" to copy the magic phrase.
            </p>
          </div>
          <button
            type="button"
            onClick={copyContinue}
            title={`Copies "${CONTINUE_PHRASE}" — paste it in chat and I'll pick up the next open todo.`}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Copy className="size-4" /> Continue work
          </button>
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-mango"
              >
                <option value="p0">P0 — critical</option>
                <option value="p1">P1 — high</option>
                <option value="p2">P2 — normal</option>
                <option value="p3">P3 — low</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                className="size-3.5 rounded border-stone-300"
              />
              Auto-enhance with AI
            </label>
            <button
              type="button"
              onClick={runEnhance}
              disabled={enhancing || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
              title="Ask AI to sharpen the title and draft a plan"
            >
              <Wand2 className="size-3.5" /> {enhancing ? "Thinking…" : "Enhance"}
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || enhancing}
              className="ml-auto rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {enhancing ? "Enhancing…" : createMut.isPending ? "Adding…" : "Add todo"}
            </button>
          </div>
        </form>

        <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.value
                  ? "border-brand-ink bg-brand-ink text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-stone-400">Loading…</div>
        ) : filteredTodos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
            No todos to show.
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
                    {items.map((t: any, idx: number) => {
                      const isDone = t.status === "done";
                      const p = (t.priority ?? "p2") as Priority;
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[p]}`}
                                  title={`Priority ${PRIORITY_LABEL[p]}`}
                                >
                                  {PRIORITY_LABEL[p]}
                                </span>
                                <p
                                  className={`text-sm font-medium ${
                                    isDone ? "text-stone-400 line-through" : "text-brand-ink"
                                  }`}
                                >
                                  {t.title}
                                </p>
                                {t.source === "auto" && (
                                  <span
                                    title="Added automatically from a stopped build"
                                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                                  >
                                    <Sparkles className="size-2.5" /> auto
                                  </span>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      updateMut.mutate({
                                        id: t.id,
                                        sort_order: (t.sort_order ?? 0) - 1,
                                      })
                                    }
                                    className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-brand-ink disabled:opacity-30"
                                    aria-label="Move up"
                                  >
                                    <ArrowUp className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === items.length - 1}
                                    onClick={() =>
                                      updateMut.mutate({
                                        id: t.id,
                                        sort_order: (t.sort_order ?? 0) + 1,
                                      })
                                    }
                                    className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-brand-ink disabled:opacity-30"
                                    aria-label="Move down"
                                  >
                                    <ArrowDown className="size-3" />
                                  </button>
                                </div>
                                <select
                                  value={p}
                                  onChange={(e) =>
                                    updateMut.mutate({
                                      id: t.id,
                                      priority: e.target.value as Priority,
                                    })
                                  }
                                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-mango"
                                  aria-label="Priority"
                                >
                                  <option value="p0">P0</option>
                                  <option value="p1">P1</option>
                                  <option value="p2">P2</option>
                                  <option value="p3">P3</option>
                                </select>
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