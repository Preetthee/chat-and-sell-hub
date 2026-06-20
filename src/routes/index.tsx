import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import mangoHero from "@/assets/mango-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deshi Cart — Seasonal mangoes & everyday tech" },
      { name: "description", content: "Premium Rajshahi mangoes (sold out for the season) and a curated selection of electronics, delivered across Bangladesh." },
      { property: "og:title", content: "Deshi Cart" },
      { property: "og:description", content: "Premium Rajshahi mangoes and curated electronics, delivered across Bangladesh." },
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
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
          <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20 text-center md:py-28">
            <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              Harvest Season Ended
            </span>
            <h1 className="mb-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              All out.
              <br />
              Stay tuned next year.
            </h1>
            <p className="max-w-md text-stone-200">
              Our premium Rajshahi mangoes are sold out for this season. See you next May! Meanwhile, browse our tech essentials below.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Tech Essentials</h2>
            <p className="text-stone-500">Fast delivery across Bangladesh</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            No products listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
