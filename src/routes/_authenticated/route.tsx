import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logAuth } from "@/lib/auth-log";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        logAuth("guard:getUser:error", { message: error.message, path: location.pathname });
        throw redirect({ to: "/auth", search: { redirect: location.pathname } });
      }
      if (!data.user) {
        logAuth("guard:no-user", { path: location.pathname });
        throw redirect({ to: "/auth", search: { redirect: location.pathname } });
      }
      logAuth("guard:ok", { userId: data.user.id, path: location.pathname });
      return { user: data.user };
    } catch (err) {
      // Re-throw redirects untouched; only swallow real errors into a redirect.
      if (err && typeof err === "object" && "isRedirect" in err) throw err;
      logAuth("guard:exception", { message: err instanceof Error ? err.message : String(err) });
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
  },
  component: () => <Outlet />,
});