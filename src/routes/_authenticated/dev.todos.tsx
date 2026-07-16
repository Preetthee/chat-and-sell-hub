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
  analyzeTodoPlan,
  mergeTodos,
  splitTodo,
  estimateEffort,
} from "@/lib/dev-todos.functions";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Sparkles, Copy, ArrowUp, ArrowDown, Wand2, Combine, Split, X, Play, Gauge } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";

type Status = "pending" | "in_progress" | "done" | "blocked";
type Priority = "p0" | "p1" | "p2" | "p3";
type Effort = "xs" | "s" | "m" | "l" | "xl";

const EFFORT_LABEL: Record<Effort, string> = {
  xs: "XS · <30m",
  s: "S · ~1h",
  m: "M · 2-4h",
  l: "L · ~1d",
  xl: "XL · >1d",
};

const EFFORT_STYLES: Record<Effort, string> = {
  xs: "bg-emerald-50 text-emerald-700 border-emerald-200",
  s: "bg-teal-50 text-teal-700 border-teal-200",
  m: "bg-sky-50 text-sky-700 border-sky-200",
  l: "bg-orange-50 text-orange-700 border-orange-200",
  xl: "bg-rose-50 text-rose-700 border-rose-200",
};

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
  component: () => (
    <AdminGate>
      <DevTodosPage />
    </AdminGate>
  ),
});

function DevTodosPage() {
  const qc = useQueryClient();
  const list = useServerFn(listDevTodos);
  const create = useServerFn(createDevTodo);
  const update = useServerFn(updateDevTodo);
  const remove = useServerFn(deleteDevTodo);
  const enhance = useServerFn(enhanceDevTodo);
  const analyze = useServerFn(analyzeTodoPlan);
  const mergeFn = useServerFn(mergeTodos);
  const splitFn = useServerFn(splitTodo);
  const estimateFn = useServerFn(estimateEffort);

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
  const [plan, setPlan] = useState<{
    merges: { ids: string[]; title: string; details: string; reason: string }[];
    splits: { id: string; parts: { title: string; details: string }[]; reason: string }[];
    perTodo: Record<string, { action: string; targetIds?: string[]; hint?: string }>;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [estimating, setEstimating] = useState(false);

  const runEstimate = async (onlyMissing: boolean) => {
    setEstimating(true);
    try {
      const out = await estimateFn({ data: { onlyMissing } });
      toast.success(`Estimated ${out.updated} task${out.updated === 1 ? "" : "s"}`);
      invalidate();
    } catch (e: any) {
      toast.error("Estimate failed", { description: e.message });
    } finally {
      setEstimating(false);
    }
  };

  const runAnalyze = async () => {
    setAnalyzing(true);
    try {
      const out = await analyze();
      setPlan(out as any);
      setShowPlan(true);
    } catch (e: any) {
      toast.error("Analyze failed", { description: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const mergeMut = useMutation({
    mutationFn: (data: { ids: string[]; title: string; details: string }) => mergeFn({ data }),
    onSuccess: () => {
      toast.success("Tasks merged");
      setPlan((p) => (p ? { ...p, merges: [] } : p));
      invalidate();
    },
    onError: (e: any) => toast.error("Merge failed", { description: e.message }),
  });

  const splitMut = useMutation({
    mutationFn: (data: { id: string; parts: { title: string; details: string }[] }) => splitFn({ data }),
    onSuccess: () => {
      toast.success("Task split into parts");
      invalidate();
    },
    onError: (e: any) => toast.error("Split failed", { description: e.message }),
  });

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runAnalyze}
              disabled={analyzing}
              title="Ask AI to group small tasks and split big ones"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
            >
              <Combine className="size-4" /> {analyzing ? "Analyzing…" : "Merge / split"}
            </button>
            <button
              type="button"
              onClick={() => runEstimate(true)}
              disabled={estimating}
              title="Ask AI to size any open todos missing an effort estimate"
              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            >
              <Gauge className="size-4" /> {estimating ? "Estimating…" : "Estimate effort"}
            </button>
            <button
              type="button"
              onClick={copyContinue}
              title={`Copies "${CONTINUE_PHRASE}" — paste it in chat and I'll pick up the next open todo.`}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <Copy className="size-4" /> Continue work
            </button>
          </div>
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
                                {t.effort && (
                                  <span
                                    className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${EFFORT_STYLES[t.effort as Effort]}`}
                                    title={`Estimated effort: ${EFFORT_LABEL[t.effort as Effort]}`}
                                  >
                                    {EFFORT_LABEL[t.effort as Effort]}
                                  </span>
                                )}
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
                                  value={(t.effort as Effort) ?? ""}
                                  onChange={(e) =>
                                    updateMut.mutate({
                                      id: t.id,
                                      effort: (e.target.value || null) as Effort | null,
                                    })
                                  }
                                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-mango"
                                  aria-label="Effort"
                                >
                                  <option value="">— size</option>
                                  <option value="xs">XS</option>
                                  <option value="s">S</option>
                                  <option value="m">M</option>
                                  <option value="l">L</option>
                                  <option value="xl">XL</option>
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
                            {!isDone && plan?.perTodo?.[t.id] && plan.perTodo[t.id].action !== "none" && (
                              <TodoSuggestion
                                todoId={t.id}
                                suggestion={plan.perTodo[t.id]}
                                plan={plan}
                                onMerge={(m) =>
                                  mergeMut.mutate({ ids: m.ids, title: m.title, details: m.details })
                                }
                                onSplit={(s) => splitMut.mutate({ id: s.id, parts: s.parts })}
                                onOpenPlan={() => setShowPlan(true)}
                                allTodos={todos}
                                merging={mergeMut.isPending}
                                splitting={splitMut.isPending}
                              />
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
      {showPlan && plan && (
        <PlanModal
          plan={plan}
          todos={todos}
          onClose={() => setShowPlan(false)}
          onMerge={(m) => mergeMut.mutate({ ids: m.ids, title: m.title, details: m.details })}
          onSplit={(s) => splitMut.mutate({ id: s.id, parts: s.parts })}
          merging={mergeMut.isPending}
          splitting={splitMut.isPending}
        />
      )}
      <Footer />
    </div>
  );
}

function TodoSuggestion({
  todoId,
  suggestion,
  plan,
  onMerge,
  onSplit,
  onOpenPlan,
  allTodos,
  merging,
  splitting,
}: {
  todoId: string;
  suggestion: { action: string; targetIds?: string[]; hint?: string };
  plan: {
    merges: { ids: string[]; title: string; details: string; reason: string }[];
    splits: { id: string; parts: { title: string; details: string }[]; reason: string }[];
  };
  onMerge: (m: { ids: string[]; title: string; details: string }) => void;
  onSplit: (s: { id: string; parts: { title: string; details: string }[] }) => void;
  onOpenPlan: () => void;
  allTodos: any[];
  merging: boolean;
  splitting: boolean;
}) {
  const { action, hint } = suggestion;
  const relatedMerge = plan.merges.find((m) => m.ids.includes(todoId));
  const relatedSplit = plan.splits.find((s) => s.id === todoId);
  const titleFor = (id: string) => allTodos.find((t) => t.id === id)?.title ?? id.slice(0, 6);

  if (action === "merge_with" && relatedMerge) {
    const others = relatedMerge.ids.filter((id) => id !== todoId).map(titleFor);
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-800">
        <Combine className="size-3" />
        <span>
          {hint || `Merge with ${others.slice(0, 2).join(", ")}${others.length > 2 ? "…" : ""}`}
        </span>
        <button
          type="button"
          onClick={() => onMerge(relatedMerge)}
          disabled={merging}
          className="ml-auto rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {merging ? "Merging…" : "Merge"}
        </button>
      </div>
    );
  }
  if (action === "split" && relatedSplit) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
        <Split className="size-3" />
        <span>{hint || `Split into ${relatedSplit.parts.length} parts`}</span>
        <button
          type="button"
          onClick={() => onSplit(relatedSplit)}
          disabled={splitting}
          className="ml-auto rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {splitting ? "Splitting…" : "Split"}
        </button>
      </div>
    );
  }
  if (action === "start") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
        <Play className="size-3" />
        <span>{hint || "Right-sized — start this next."}</span>
        <button
          type="button"
          onClick={onOpenPlan}
          className="ml-auto rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Plan
        </button>
      </div>
    );
  }
  return null;
}

function PlanModal({
  plan,
  todos,
  onClose,
  onMerge,
  onSplit,
  merging,
  splitting,
}: {
  plan: {
    merges: { ids: string[]; title: string; details: string; reason: string }[];
    splits: { id: string; parts: { title: string; details: string }[]; reason: string }[];
  };
  todos: any[];
  onClose: () => void;
  onMerge: (m: { ids: string[]; title: string; details: string }) => void;
  onSplit: (s: { id: string; parts: { title: string; details: string }[] }) => void;
  merging: boolean;
  splitting: boolean;
}) {
  const titleFor = (id: string) => todos.find((t) => t.id === id)?.title ?? id.slice(0, 6);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">AI merge & split plan</h3>
          <button onClick={onClose} className="rounded-md p-1 text-stone-500 hover:bg-stone-100">
            <X className="size-4" />
          </button>
        </div>

        <section className="mb-6">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
            <Combine className="size-3.5" /> Merges ({plan.merges.length})
          </h4>
          {plan.merges.length === 0 ? (
            <p className="text-xs text-stone-400">Nothing small enough to group right now.</p>
          ) : (
            <ul className="space-y-3">
              {plan.merges.map((m, i) => (
                <li key={i} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                  <p className="text-sm font-semibold text-brand-ink">{m.title}</p>
                  {m.reason && <p className="mt-0.5 text-xs italic text-violet-700">{m.reason}</p>}
                  <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
                    {m.ids.map((id) => (
                      <li key={id}>• {titleFor(id)}</li>
                    ))}
                  </ul>
                  {m.details && (
                    <pre className="mt-2 whitespace-pre-wrap text-[11px] text-stone-500">{m.details}</pre>
                  )}
                  <button
                    onClick={() => onMerge(m)}
                    disabled={merging}
                    className="mt-2 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    Apply merge
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
            <Split className="size-3.5" /> Splits ({plan.splits.length})
          </h4>
          {plan.splits.length === 0 ? (
            <p className="text-xs text-stone-400">No tasks look big enough to split.</p>
          ) : (
            <ul className="space-y-3">
              {plan.splits.map((s, i) => (
                <li key={i} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-sm font-semibold text-brand-ink">Split: {titleFor(s.id)}</p>
                  {s.reason && <p className="mt-0.5 text-xs italic text-amber-700">{s.reason}</p>}
                  <ol className="mt-2 space-y-1 text-xs text-stone-600">
                    {s.parts.map((p, j) => (
                      <li key={j}>
                        <span className="font-semibold text-brand-ink">{j + 1}. {p.title}</span>
                        {p.details && (
                          <pre className="whitespace-pre-wrap text-[11px] text-stone-500">{p.details}</pre>
                        )}
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => onSplit(s)}
                    disabled={splitting}
                    className="mt-2 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Apply split
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}