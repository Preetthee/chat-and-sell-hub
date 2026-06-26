import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import mangoHero from "@/assets/mango-hero.jpg";

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(["featured", "price_asc", "price_desc"]), "featured").default("featured"),
  minPrice: fallback(z.number().int().nonnegative().optional(), undefined),
  maxPrice: fallback(z.number().int().nonnegative().optional(), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Deshi Cart — Seasonal Mangoes & Tech Essentials" },
      { name: "description", content: "Premium Rajshahi mangoes (sold out for the season) and a curated selection of electronics, delivered across Bangladesh." },
      { property: "og:title", content: "Deshi Cart — Seasonal Mangoes & Tech Essentials" },
      { property: "og:description", content: "Premium Rajshahi mangoes and curated electronics, delivered across Bangladesh." },
      { property: "og:url", content: "https://chat-and-sell-hub.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://chat-and-sell-hub.lovable.app/" },
      { rel: "preload", as: "image", href: mangoHero, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Deshi Cart",
          url: "https://chat-and-sell-hub.lovable.app/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Deshi Cart",
          url: "https://chat-and-sell-hub.lovable.app/",
          address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
        }),
      },
    ],
  }),
  component: Index,
});

function useProducts() {
  return useQuery({
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
  });
}

function Index() {
  const { data: products = [], isLoading } = useProducts();
  const { category, sort, minPrice, maxPrice } = Route.useSearch();
  const navigate = Route.useNavigate();

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const bounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((p) => p.price_bdt);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const lo = minPrice ?? bounds.min;
  const hi = maxPrice ?? bounds.max;
  const [range, setRange] = useState<[number, number]>([lo, hi]);
  useEffect(() => {
    setRange([minPrice ?? bounds.min, maxPrice ?? bounds.max]);
  }, [bounds.min, bounds.max, minPrice, maxPrice]);

  const visible = useMemo(() => {
    let list = category ? products.filter((p) => p.category === category) : products;
    list = list.filter((p) => p.price_bdt >= lo && p.price_bdt <= hi);
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price_bdt - b.price_bdt);
    else if (sort === "price_desc") list = [...list].sort((a, b) => b.price_bdt - a.price_bdt);
    return list;
  }, [products, category, sort, lo, hi]);

  const setCategory = (next: string) =>
    navigate({ search: (prev: any) => ({ ...prev, category: next }) });

  const setSort = (next: "featured" | "price_asc" | "price_desc") =>
    navigate({ search: (prev: any) => ({ ...prev, sort: next }) });

  const commitRange = (next: [number, number]) =>
    navigate({
      search: (prev: any) => ({
        ...prev,
        minPrice: next[0] === bounds.min ? undefined : next[0],
        maxPrice: next[1] === bounds.max ? undefined : next[1],
      }),
    });

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />

      {/* Hero: Mango sold out */}
      <section className="px-4 py-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-stone-900 text-white">
          <img
            src={mangoHero}
            alt="Ripe Rajshahi mangoes in a basket"
            width={1600}
            height={900}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
          <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20 text-center md:py-28">
            <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              Harvest Season Ended
            </span>
            <h1 className="mb-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Deshi Cart — Tech Essentials
              <br />
              and Premium Rajshahi Mangoes
            </h1>
            <p className="max-w-md text-stone-200">
              Our premium Rajshahi mangoes are sold out for this season. See you next May! Meanwhile, browse our tech essentials below.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold">Tech Essentials</h2>
            <p className="text-stone-500">Fast delivery across Bangladesh</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand-mango"
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </label>
        </div>

        {categories.length > 0 && (
          <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                !category
                  ? "border-brand-ink bg-brand-ink text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  category === c
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {bounds.max > bounds.min && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-700">Price range</span>
              <span className="tabular-nums text-stone-600">
                ৳{range[0].toLocaleString()} – ৳{range[1].toLocaleString()}
              </span>
            </div>
            <Slider
              min={bounds.min}
              max={bounds.max}
              step={Math.max(1, Math.round((bounds.max - bounds.min) / 100))}
              value={range}
              onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
              onValueCommit={(v) => commitRange([v[0], v[1]] as [number, number])}
              className="py-2"
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            No products match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
