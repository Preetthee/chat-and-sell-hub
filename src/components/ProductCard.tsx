import { useCart } from "@/lib/cart-store";
import { useState } from "react";

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
  const { add } = useCart();
  const isMango = product.category?.toLowerCase() === "mangoes";
  const [touchHover, setTouchHover] = useState(false);
  const hoverActive = isMango; // mango uses hover-overlay behavior

  return (
    <div
      className="group flex flex-col"
      onTouchStart={() => hoverActive && setTouchHover((v) => !v)}
    >
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition-shadow group-hover:shadow-md">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-stone-50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={`${product.name} from Deshi Cart`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-stone-300">
              <span className="font-display text-3xl">{product.name.charAt(0)}</span>
            </div>
          )}
        </div>
        {hoverActive && (
          <div
            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-stone-900/85 px-4 text-center text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 ${touchHover ? "opacity-100" : ""}`}
          >
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
              Season Ended
            </span>
            <p className="font-display text-lg font-bold leading-tight">
              All out.<br />Stay tuned next year.
            </p>
          </div>
        )}
      </div>
      <h3 className="font-medium text-brand-ink">{product.name}</h3>
      {product.description ? (
        <p className="text-sm text-stone-500">{product.description}</p>
      ) : null}
      <p className="mt-1 font-bold text-brand-mango">৳{product.price_bdt.toLocaleString()}</p>
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
        className={`mt-3 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
          product.in_stock
            ? "bg-brand-ink text-white hover:opacity-90"
            : "cursor-not-allowed bg-stone-100 text-stone-400"
        }`}
      >
        {product.in_stock ? "Add to cart" : "Out of stock"}
      </button>
    </div>
  );
}