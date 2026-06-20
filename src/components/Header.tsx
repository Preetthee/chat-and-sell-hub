import { Link } from "@tanstack/react-router";
import { UserAvatar } from "./UserAvatar";

export function Header() {
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
            Contact
          </Link>
          <UserAvatar />
        </div>
      </div>
    </nav>
  );
}