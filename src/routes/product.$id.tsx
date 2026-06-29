import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-store";
import type { Product } from "@/components/ProductCard";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Product — Deshi Cart` },
      { name: "description", content: `Product details on Deshi Cart.` },
      { property: "og:title", content: `Product — Deshi Cart` },
    ],
    links: [
      { rel: "canonical", href: `https://chat-and-sell-hub.lovable.app/product/${params.id}` },
    ],
  }),
  errorComponent: () => (
    <div className="p-10 text-center text-stone-500">Couldn't load this product.</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-stone-500">Product not found.</div>
  ),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const { add } = useCart();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price_bdt, image_url, category, in_stock")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Product;
    },
  });

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" /> Back to shop
        </Link>
        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-stone-100" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-stone-100" />
              <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
        ) : error || !product ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            Product not found.
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-stone-50">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center font-display text-6xl text-stone-300">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {product.category}
              </span>
              <h1 className="mt-1 font-display text-3xl font-extrabold md:text-4xl">
                {product.name}
              </h1>
              <p className="mt-3 text-2xl font-bold text-brand-mango">
                ৳{product.price_bdt.toLocaleString()}
              </p>
              {product.description && (
                <p className="mt-4 whitespace-pre-wrap text-stone-600">{product.description}</p>
              )}
              <div className="mt-6">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    product.in_stock
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {product.in_stock ? "In stock" : "Out of stock"}
                </span>
              </div>
              <button
                type="button"
                disabled={!product.in_stock}
                onClick={() =>
                  add({
                    id: product.id,
                    name: product.name,
                    price_bdt: product.price_bdt,
                    image_url: product.image_url,
                  })
                }
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors md:w-auto ${
                  product.in_stock
                    ? "bg-brand-ink text-white hover:opacity-90"
                    : "cursor-not-allowed bg-stone-100 text-stone-400"
                }`}
              >
                {product.in_stock ? "Add to cart" : "Out of stock"}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}