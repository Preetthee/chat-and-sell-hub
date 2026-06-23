import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { checkIsAdmin } from "@/lib/products.functions";
import { Package, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dev/")({
  head: () => ({ meta: [{ title: "Dev Dashboard — Deshi Cart" }] }),
  beforeLoad: async () => {
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/profile" });
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      throw redirect({ to: "/profile" });
    }
  },
  component: DevHome,
});

function DevHome() {
  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="inline-block size-2 animate-pulse rounded-full bg-brand-leaf" />
          <h1 className="font-display text-3xl font-bold">Dev Dashboard</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/dev/products"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-mango/10 text-brand-mango">
              <Package className="size-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Manage products</h2>
            <p className="mt-1 text-sm text-stone-500">
              Add new products, toggle availability, and remove items from the catalog.
            </p>
          </Link>
          <Link
            to="/profile"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-leaf/10 text-brand-leaf">
              <User className="size-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Your profile</h2>
            <p className="mt-1 text-sm text-stone-500">
              Update your display name, avatar, and contact details.
            </p>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}