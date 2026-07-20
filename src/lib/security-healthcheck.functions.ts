import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HealthcheckItem = {
  category: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

export const runSecurityHealthcheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await context.supabase.rpc("admin_security_healthcheck");
    if (error) throw error;
    return {
      generatedAt: new Date().toISOString(),
      items: (data ?? []) as HealthcheckItem[],
    };
  });
