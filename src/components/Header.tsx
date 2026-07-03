import { Link } from "@tanstack/react-router";
import { UserAvatar } from "./UserAvatar";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { LanguageToggle, useT } from "@/lib/i18n";

export function Header() {
  const { count, setOpen } = useCart();
  const { t } = useT();
  return (
    <nav className="sticky top-0 z-40 border-b border-stone-200 bg-brand-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-brand-mango" aria-hidden />
          <span className="font-display text-xl font-bold tracking-tight text-brand-ink">
            DESHI CART
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="hidden sm:inline text-sm font-medium text-stone-600 hover:text-brand-ink"
          >
            {t("nav.contact")}
          </Link>
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("nav.openCart")}
            className="relative grid size-9 place-items-center rounded-full text-stone-700 hover:bg-stone-100"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand-mango px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
          <UserAvatar />
        </div>
      </div>
    </nav>
  );
}