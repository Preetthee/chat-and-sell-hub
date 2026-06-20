import { whatsappLink } from "./FloatingContact";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  image_url: string | null;
  category: string;
  in_stock: boolean;
};

export function ProductCard({ product }: { product: Product }) {
  const msg = `Hello! I'm interested in: ${product.name} (৳${product.price_bdt.toLocaleString()}). Is it available?`;
  return (
    <div className="group flex flex-col">
      <div className="mb-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition-shadow group-hover:shadow-md">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-stone-50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-stone-300">
              <span className="font-display text-3xl">{product.name.charAt(0)}</span>
            </div>
          )}
        </div>
      </div>
      <h3 className="font-medium text-brand-ink">{product.name}</h3>
      {product.description ? (
        <p className="text-sm text-stone-500">{product.description}</p>
      ) : null}
      <p className="mt-1 font-bold text-brand-mango">৳{product.price_bdt.toLocaleString()}</p>
      <a
        href={whatsappLink(msg)}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-3 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
          product.in_stock
            ? "bg-brand-ink text-white hover:opacity-90"
            : "cursor-not-allowed bg-stone-100 text-stone-400"
        }`}
        onClick={(e) => {
          if (!product.in_stock) e.preventDefault();
        }}
      >
        {product.in_stock ? "Inquire on WhatsApp" : "Out of stock"}
      </a>
    </div>
  );
}