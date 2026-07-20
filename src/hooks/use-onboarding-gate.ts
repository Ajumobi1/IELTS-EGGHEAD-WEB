import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Redirects signed-in students to /onboarding until profiles.onboarded = true.
 * Admins are exempt. Passes the current path as `returnTo` so the wizard can
 * send the user back to where they were after finishing.
 */
export function useOnboardingGate(userId: string) {
  const nav = useNavigate();
  const location = useLocation();
  const { data } = useQuery({
    queryKey: ["onboarding-gate", userId],
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      return { onboarded: !!profile?.onboarded, isAdmin };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    if (!data.isAdmin && !data.onboarded) {
      const returnTo = location.pathname + (location.searchStr ?? "");
      nav({ to: "/onboarding", search: { returnTo }, replace: true });
    }
  }, [data, nav, location.pathname, location.searchStr]);
}

