import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/cart-store";
import { getPublicProduct } from "@/lib/products.functions";
import { CONTACT, whatsappLink } from "@/components/FloatingContact";
import type { Product } from "@/components/ProductCard";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const product = await getPublicProduct({ data: { id: params.id } });
    if (!product) throw notFound();
    return { product: product as Product };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    const url = `https://chat-and-sell-hub.lovable.app/product/${params.id}`;
    if (!p) {
      return {
        meta: [
          { title: "Product — Deshi Cart" },
          { name: "description", content: "Product details on Deshi Cart." },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${p.name} — ৳${p.price_bdt.toLocaleString()} | Deshi Cart`;
    const desc =
      (p.description?.slice(0, 155) ??
        `${p.name} — ${p.category}. ৳${p.price_bdt.toLocaleString()}. ${p.in_stock ? "In stock" : "Currently unavailable"}. Delivered across Bangladesh.`);
    const meta: any[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (p.image_url) {
      meta.push({ property: "og:image", content: p.image_url });
      meta.push({ name: "twitter:image", content: p.image_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description ?? undefined,
            image: p.image_url ?? undefined,
            category: p.category,
            offers: {
              "@type": "Offer",
              price: p.price_bdt,
              priceCurrency: "BDT",
              availability: p.in_stock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url,
            },
          }),
        },
      ],
    };
  },
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-stone-500">We couldn't load this product right now.</p>
          <button
            type="button"
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="mt-6 rounded-full bg-brand-ink px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </main>
        <Footer />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-mango">404</p>
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <p className="mt-2 text-stone-500">
          This product may have been removed or the link is incorrect.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 rounded-full bg-brand-ink px-5 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="size-3.5" /> Back to shop
        </Link>
      </main>
      <Footer />
    </div>
  ),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const msg = `Hi! I'm interested in "${product.name}" (৳${product.price_bdt.toLocaleString()}). Is it available?`;

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" /> Back to shop
        </Link>
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <div className="overflow-hidden rounded-3xl bg-white p-3 shadow-sm ring-1 ring-stone-200 md:p-4">
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-stone-50">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="eager"
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
              <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl md:text-4xl">
                {product.name}
              </h1>
              <p className="mt-3 text-2xl font-bold text-brand-mango md:text-3xl">
                ৳{product.price_bdt.toLocaleString()}
              </p>
              <div className="mt-4">
                {product.in_stock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="size-1.5 rounded-full bg-green-600" /> In stock — ready to ship
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Sold out — stay tuned for restock
                  </span>
                )}
              </div>
              {product.description && (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-stone-600 md:text-base">
                  {product.description}
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  className={`inline-flex flex-1 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    product.in_stock
                      ? "bg-brand-ink text-white hover:opacity-90"
                      : "cursor-not-allowed bg-stone-100 text-stone-400"
                  }`}
                >
                  {product.in_stock ? "Add to cart" : "Notify me"}
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Ask a question
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={whatsappLink(msg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href={CONTACT.messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0084FF] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <MessageCircle className="size-4" /> Messenger
                  </a>
                </div>
              </div>
            </div>
          </div>
      </main>
      <Footer />
    </div>
  );
}