import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import {
  createProduct,
  deleteProduct,
  toggleProductStock,
  checkIsAdmin,
  updateProduct,
  enhanceProduct,
} from "@/lib/products.functions";
import type { Product } from "@/components/ProductCard";
import { toast } from "sonner";
import { Trash2, ArrowLeft, Pencil, X, Wand2 } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";

type ProductForm = {
  name: string;
  description: string;
  price_bdt: string;
  image_url: string;
  category: string;
  in_stock: boolean;
};

type FieldErrors = Partial<Record<keyof ProductForm, string>>;

function validateProductForm(f: ProductForm): FieldErrors {
  const errs: FieldErrors = {};
  const name = f.name.trim();
  if (!name) errs.name = "Name is required.";
  else if (name.length < 2) errs.name = "Name must be at least 2 characters.";
  else if (name.length > 100) errs.name = "Name must be 100 characters or fewer.";

  if (f.description && f.description.length > 500)
    errs.description = "Description must be 500 characters or fewer.";

  const priceRaw = f.price_bdt.trim();
  if (!priceRaw) errs.price_bdt = "Price is required.";
  else if (!/^\d+$/.test(priceRaw)) errs.price_bdt = "Price must be a whole number in BDT.";
  else {
    const n = parseInt(priceRaw, 10);
    if (n < 0) errs.price_bdt = "Price cannot be negative.";
    else if (n > 10_000_000) errs.price_bdt = "Price seems too large (max ৳10,000,000).";
  }

  const cat = f.category.trim();
  if (!cat) errs.category = "Category is required.";
  else if (cat.length > 40) errs.category = "Category must be 40 characters or fewer.";

  const url = f.image_url.trim();
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:")
        errs.image_url = "Image URL must start with http:// or https://";
    } catch {
      errs.image_url = "Enter a valid URL (e.g. https://…).";
    }
  }

  return errs;
}

export const Route = createFileRoute("/_authenticated/dev/products")({
  head: () => ({ meta: [{ title: "Manage Products — Deshi Cart" }] }),
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
      <DevProductsPage />
    </AdminGate>
  ),
});

function DevProductsPage() {
  const { user } = useAuth();
  const { isAdmin, checked } = useIsAdmin(user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [editing, setEditing] = useState<Product | null>(null);

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(
    () => (categoryFilter === "All" ? products : products.filter((p) => p.category === categoryFilter)),
    [products, categoryFilter],
  );

  const create = useServerFn(createProduct);
  const remove = useServerFn(deleteProduct);
  const toggle = useServerFn(toggleProductStock);
  const update = useServerFn(updateProduct);

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

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; in_stock: boolean }) => toggle({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (vars: any) => update({ data: vars }),
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price_bdt: "",
    image_url: "",
    category: "Electronics",
    in_stock: true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function updateForm(patch: Partial<ProductForm>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      // clear errors on the fields being edited
      if (Object.keys(errors).length > 0) {
        setErrors((prevErrs) => {
          const nextErrs = { ...prevErrs };
          for (const k of Object.keys(patch)) delete nextErrs[k as keyof ProductForm];
          return nextErrs;
        });
      }
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateProductForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    const price = parseInt(form.price_bdt, 10);
    createMut.mutate({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_bdt: price,
      image_url: form.image_url.trim() || null,
      category: form.category.trim(),
      in_stock: form.in_stock,
    });
    setForm({ name: "", description: "", price_bdt: "", image_url: "", category: "Electronics", in_stock: true });
    setErrors({});
  }

  if (!checked) return <div className="p-10 text-center text-stone-400">Checking access…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <Link
          to="/dev"
          className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Products</h1>
            <p className="text-sm text-stone-500">{products.length} total · {filtered.length} shown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  categoryFilter === c
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm h-fit"
          >
            <h2 className="font-display text-lg font-semibold">Add product</h2>
            <Field label="Name" error={errors.name}>
              <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Mechanical Keyboard" className="input" aria-invalid={!!errors.name} maxLength={100} />
            </Field>
            <Field label="Description" error={errors.description}>
              <input type="text" value={form.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Short tagline" className="input" aria-invalid={!!errors.description} maxLength={500} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (৳)" error={errors.price_bdt}>
                <input type="number" min={0} value={form.price_bdt} onChange={(e) => updateForm({ price_bdt: e.target.value })} placeholder="3500" className="input" aria-invalid={!!errors.price_bdt} inputMode="numeric" />
              </Field>
              <Field label="Category" error={errors.category}>
                <input type="text" value={form.category} onChange={(e) => updateForm({ category: e.target.value })} className="input" aria-invalid={!!errors.category} maxLength={40} />
              </Field>
            </div>
            <Field label="Image URL (optional)" error={errors.image_url}>
              <input type="url" value={form.image_url} onChange={(e) => updateForm({ image_url: e.target.value })} placeholder="https://..." className="input" aria-invalid={!!errors.image_url} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} className="size-4 rounded accent-brand-mango" />
              In stock
            </label>
            <button type="submit" disabled={createMut.isPending} className="w-full rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {createMut.isPending ? "Adding…" : "Add product"}
            </button>
            <style>{`.input{width:100%;border:1px solid #e7e5e4;border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;background:#fff;outline:none}.input:focus{border-color:#f59e0b}.input[aria-invalid="true"]{border-color:#dc2626}.input[aria-invalid="true"]:focus{border-color:#dc2626}`}</style>
          </form>

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-stone-200 p-4">
              <h2 className="font-display text-lg font-semibold">Inventory ({filtered.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-stone-500">{p.category}</td>
                      <td className="px-4 py-3 font-mono">৳{p.price_bdt.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={p.in_stock}
                          disabled={toggleMut.isPending}
                          onClick={() => toggleMut.mutate({ id: p.id, in_stock: !p.in_stock })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                            p.in_stock ? "bg-green-500" : "bg-stone-300"
                          }`}
                          title={p.in_stock ? "In stock — click to mark out" : "Out — click to mark in stock"}
                        >
                          <span
                            className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                              p.in_stock ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditing(p)}
                          className="mr-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                        >
                          <Pencil className="size-3.5" /> Edit
                        </button>
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
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                        No products in this category.
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
      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => updateMut.mutate({ id: editing.id, ...patch })}
          saving={updateMut.isPending}
        />
      )}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EditProductModal({
  product,
  onClose,
  onSave,
  saving,
}: {
  product: Product;
  onClose: () => void;
  onSave: (patch: any) => void;
  saving: boolean;
}) {
  const [f, setF] = useState<ProductForm>({
    name: product.name,
    description: product.description ?? "",
    price_bdt: String(product.price_bdt),
    image_url: product.image_url ?? "",
    category: product.category,
    in_stock: product.in_stock,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  function updateF(patch: Partial<ProductForm>) {
    setF((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[k as keyof ProductForm];
      return next;
    });
  }
  const enhance = useServerFn(enhanceProduct);
  const [enhancing, setEnhancing] = useState(false);

  async function runEnhance() {
    if (!f.name) {
      toast.error("Add a name first");
      return;
    }
    setEnhancing(true);
    try {
      const price = parseInt(f.price_bdt, 10);
      const out = await enhance({
        data: {
          name: f.name,
          description: f.description || null,
          category: f.category || null,
          price_bdt: isNaN(price) ? null : price,
        },
      });
      setF((prev) => ({ ...prev, name: out.name, description: out.description }));
      toast.success("AI rewrote name & description");
    } catch (e: any) {
      toast.error("AI rewrite failed", { description: e.message });
    } finally {
      setEnhancing(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateProductForm(f);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    const price = parseInt(f.price_bdt, 10);
    onSave({
      name: f.name.trim(),
      description: f.description.trim() || null,
      price_bdt: price,
      image_url: f.image_url.trim() || null,
      category: f.category.trim(),
      in_stock: f.in_stock,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Edit product</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={runEnhance}
              disabled={enhancing || saving}
              title="Rewrite name & description with AI"
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <Wand2 className="size-3.5" />
              {enhancing ? "Rewriting…" : "AI rewrite"}
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-stone-100">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <Field label="Name" error={errors.name}>
          <input value={f.name} onChange={(e) => updateF({ name: e.target.value })} className="input" aria-invalid={!!errors.name} maxLength={100} />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea value={f.description} onChange={(e) => updateF({ description: e.target.value })} className="input min-h-[80px]" aria-invalid={!!errors.description} maxLength={500} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (৳)" error={errors.price_bdt}>
            <input type="number" min={0} value={f.price_bdt} onChange={(e) => updateF({ price_bdt: e.target.value })} className="input" aria-invalid={!!errors.price_bdt} inputMode="numeric" />
          </Field>
          <Field label="Category" error={errors.category}>
            <input value={f.category} onChange={(e) => updateF({ category: e.target.value })} className="input" aria-invalid={!!errors.category} maxLength={40} />
          </Field>
        </div>
        <Field label="Image URL" error={errors.image_url}>
          <input type="url" value={f.image_url} onChange={(e) => updateF({ image_url: e.target.value })} placeholder="https://..." className="input" aria-invalid={!!errors.image_url} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} className="size-4 rounded accent-brand-mango" />
          In stock
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold hover:bg-stone-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-ink py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid #e7e5e4;border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;background:#fff;outline:none}.input:focus{border-color:#f59e0b}.input[aria-invalid="true"]{border-color:#dc2626}.input[aria-invalid="true"]:focus{border-color:#dc2626}`}</style>
      </form>
    </div>
  );
}