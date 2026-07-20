import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, CalendarCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminOverview });

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tests, attempts, bookings, students] = await Promise.all([
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("test_attempts").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { tests: tests.count ?? 0, attempts: attempts.count ?? 0, bookings: bookings.count ?? 0, students: students.count ?? 0 };
    },
  });

  const cards = [
    { icon: BookOpen, label: "Tests", value: stats.data?.tests ?? "—" },
    { icon: TrendingUp, label: "Test Attempts", value: stats.data?.attempts ?? "—" },
    { icon: CalendarCheck, label: "Bookings", value: stats.data?.bookings ?? "—" },
    { icon: Users, label: "Students", value: stats.data?.students ?? "—" },
  ];

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your clinic at a glance.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{c.label}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient text-ink"><c.icon className="h-4 w-4" /></div>
            </div>
            <div className="mt-4 font-display text-3xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
