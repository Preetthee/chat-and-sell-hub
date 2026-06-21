import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin, initials } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Deshi Cart" },
      { name: "description", content: "Manage your Deshi Cart profile, view your account details, and access your developer dashboard if available." },
      { property: "og:title", content: "Profile — Deshi Cart" },
      { property: "og:description", content: "Manage your Deshi Cart profile and account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(user);
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/auth" });
  }, [user, navigate]);

  if (!user) return null;

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null;
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "You";

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-20 rounded-full object-cover ring-2 ring-brand-mango/30"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-full bg-brand-leaf text-2xl font-bold text-white ring-2 ring-brand-leaf/30">
                {initials(name)}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">{name}</h1>
              <p className="text-sm text-stone-500">{user.email}</p>
              {isAdmin && (
                <span className="mt-2 inline-block rounded-full bg-brand-mango/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-mango">
                  Developer
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {isAdmin && (
              <Link
                to="/dev"
                className="rounded-xl bg-brand-mango px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
              >
                Open Dev Dashboard
              </Link>
            )}
            <button
              onClick={signOut}
              disabled={signingOut}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-brand-ink hover:bg-stone-50 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}