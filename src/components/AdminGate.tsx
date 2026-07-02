import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { checkIsAdmin } from "@/lib/products.functions";

/**
 * Server-verified admin gate. Renders children only after the server's
 * `checkIsAdmin` server function returns `isAdmin: true`. This runs alongside
 * the route's `beforeLoad` redirect, so patching the client-side redirect is
 * not enough to render the admin UI shell — the server has to say yes.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const check = useServerFn(checkIsAdmin);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => check(),
    staleTime: 60_000,
    retry: false,
  });

  const isAdmin = data?.isAdmin === true;
  const denied = !isLoading && !isAdmin;

  useEffect(() => {
    if (denied || isError) {
      navigate({ to: "/profile", replace: true });
    }
  }, [denied, isError, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-brand-surface text-sm text-stone-500">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-brand-mango" />
          Verifying admin access…
        </span>
      </div>
    );
  }

  if (!isAdmin) return null;
  return <>{children}</>;
}