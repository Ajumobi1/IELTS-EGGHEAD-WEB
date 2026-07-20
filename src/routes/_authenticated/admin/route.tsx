import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, BookOpen, CalendarCheck, Users, ClipboardList, LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-ink text-cream md:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-display text-lg font-black text-ink">D</div>
          <div>
            <div className="font-display text-sm font-bold">Admin Console</div>
            <div className="text-[10px] uppercase tracking-widest text-gold-light">Egghead's Clinic</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <NavItem to="/admin" icon={LayoutDashboard} label="Overview" />
          <NavItem to="/admin/tests" icon={BookOpen} label="Tests" />
          <NavItem to="/admin/attempts" icon={ClipboardList} label="Attempts" />
          <NavItem to="/admin/bookings" icon={CalendarCheck} label="Bookings" />
          <NavItem to="/admin/students" icon={Users} label="Students" />
          <NavItem to="/admin/security" icon={ShieldCheck} label="Security" />
        </nav>
        <div className="p-3">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/70 hover:bg-cream/5 hover:text-cream">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} activeOptions={{ exact: to === "/admin" }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/80 transition hover:bg-cream/5 hover:text-cream data-[status=active]:bg-gold-gradient data-[status=active]:text-ink">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
