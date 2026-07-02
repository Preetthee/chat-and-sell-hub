import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { checkIsAdmin } from "@/lib/products.functions";
import {
  listAdmins,
  grantAdminByEmail,
  revokeAdmin,
  listAdminAuditLog,
} from "@/lib/admins.functions";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";

export const Route = createFileRoute("/_authenticated/dev/admins")({
  head: () => ({ meta: [{ title: "Admin access — Deshi Cart" }] }),
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
      <DevAdminsPage />
    </AdminGate>
  ),
});

function DevAdminsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdmins);
  const grant = useServerFn(grantAdminByEmail);
  const revoke = useServerFn(revokeAdmin);
  const log = useServerFn(listAdminAuditLog);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["dev-admins"],
    queryFn: () => list(),
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["dev-admin-audit"],
    queryFn: () => log(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dev-admins"] });
    qc.invalidateQueries({ queryKey: ["dev-admin-audit"] });
  };

  const grantMut = useMutation({
    mutationFn: (email: string) => grant({ data: { email } }),
    onSuccess: () => {
      toast.success("Admin granted");
      invalidate();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });
  const revokeMut = useMutation({
    mutationFn: (userId: string) => revoke({ data: { userId } }),
    onSuccess: () => {
      toast.success("Admin revoked");
      invalidate();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link to="/dev" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand-ink">
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="size-7 text-rose-600" />
          <h1 className="font-display text-3xl font-bold">Admin access</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = email.trim();
            if (!v) return;
            grantMut.mutate(v);
            setEmail("");
          }}
          className="mb-8 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-mango"
            required
          />
          <button
            type="submit"
            disabled={grantMut.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus className="size-4" />
            {grantMut.isPending ? "Granting…" : "Grant admin"}
          </button>
        </form>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-stone-500">
            Current admins ({admins.length})
          </h2>
          {isLoading ? (
            <div className="py-8 text-center text-stone-400">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {admins.map((a) => (
                <li
                  key={a.user_id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-9 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                      {(a.display_name ?? a.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {a.display_name ?? a.email ?? a.user_id}
                      {a.is_self && (
                        <span className="ml-2 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                          you
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {a.email ?? "—"} · granted {new Date(a.granted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    disabled={a.is_self || revokeMut.isPending}
                    onClick={() => {
                      if (confirm(`Revoke admin from ${a.email ?? a.user_id}?`))
                        revokeMut.mutate(a.user_id);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShieldOff className="size-3.5" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-stone-500">
            Recent activity
          </h2>
          {audit.length === 0 ? (
            <p className="text-sm text-stone-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {audit.map((row: any) => (
                <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    <span
                      className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.action === "grant_admin"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.action === "grant_admin" ? "GRANT" : "REVOKE"}
                    </span>
                    {row.target_email ?? row.target_user_id}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}