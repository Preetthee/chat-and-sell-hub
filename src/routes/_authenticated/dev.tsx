import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { createProduct, deleteProduct, checkIsAdmin } from "@/lib/products.functions";
import type { Product } from "@/components/ProductCard";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dev")({
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
  component: DevPage,
});

function DevPage() {
  const { user } = useAuth();
  const { isAdmin, checked } = useIsAdmin(user);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (checked && !isAdmin) navigate({ to: "/profile" });
  }, [checked, isAdmin, navigate]);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price_bdt, image_url, category, in_stock")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    enabled: isAdmin,
  });

  const create = useServerFn(createProduct);
  const remove = useServerFn(deleteProduct);

  const createMut = useMutation({
    mutationFn: (data: any) => create({ data }),
    onSuccess: () => {
      toast.success("Product added");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    price_bdt: "",
    image_url: "",
    category: "Electronics",
    in_stock: true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(form.price_bdt, 10);
    if (!form.name || isNaN(price)) {
      toast.error("Name and price are required");
      return;
    }
    createMut.mutate({
      name: form.name,
      description: form.description || null,
      price_bdt: price,
      image_url: form.image_url || null,
      category: form.category,
      in_stock: form.in_stock,
    });
    setForm({ name: "", description: "", price_bdt: "", image_url: "", category: "Electronics", in_stock: true });
  }

  if (!checked) return <div className="p-10 text-center text-stone-400">Checking access…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="inline-block size-2 animate-pulse rounded-full bg-brand-leaf" />
          <h1 className="font-display text-3xl font-bold">Dev Dashboard</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm h-fit"
          >
            <h2 className="font-display text-lg font-semibold">Add product</h2>

            <Field label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mechanical Keyboard"
                className="input"
                required
              />
            </Field>
            <Field label="Description">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short tagline"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (৳)">
                <input
                  type="number"
                  min={0}
                  value={form.price_bdt}
                  onChange={(e) => setForm({ ...form, price_bdt: e.target.value })}
                  placeholder="3500"
                  className="input"
                  required
                />
              </Field>
              <Field label="Category">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Image URL (optional)">
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="input"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                className="size-4 rounded accent-brand-mango"
              />
              In stock
            </label>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {createMut.isPending ? "Adding…" : "Add product"}
            </button>

            <style>{`.input{width:100%;border:1px solid #e7e5e4;border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;background:#fff;outline:none}.input:focus{border-color:#f59e0b}`}</style>
          </form>

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-stone-200 p-4">
              <h2 className="font-display text-lg font-semibold">Inventory ({products.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-stone-500">{p.category}</td>
                      <td className="px-4 py-3 font-mono">৳{p.price_bdt.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.in_stock ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {p.in_stock ? "In stock" : "Out"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                        No products yet. Add one with the form.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      {children}
    </div>
  );
}