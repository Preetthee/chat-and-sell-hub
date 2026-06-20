import { Link } from "@tanstack/react-router";
import { useAuth, initials } from "@/hooks/use-auth";

export function UserAvatar() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="size-9 rounded-full bg-stone-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="rounded-full bg-brand-ink px-4 py-2 text-xs font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
      >
        Sign in
      </Link>
    );
  }

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null;
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "You";

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 rounded-full border border-stone-200 bg-white p-1 pr-3 shadow-sm transition-colors hover:bg-stone-50"
      aria-label="Open profile"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-7 rounded-full object-cover"
          width={28}
          height={28}
        />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-brand-leaf text-[11px] font-bold text-white">
          {initials(name)}
        </span>
      )}
      <span className="text-sm font-medium text-brand-ink max-w-[8rem] truncate">{name.split(" ")[0]}</span>
    </Link>
  );
}