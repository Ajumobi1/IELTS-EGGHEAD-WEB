import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, ShieldCheck, ArrowRight, Headphones, PenLine, Mic, LayoutDashboard, UserCircle } from "lucide-react";
import { useOnboardingGate } from "@/hooks/use-onboarding-gate";
import { useAvatarSrc } from "@/hooks/use-avatar-src";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Your Dashboard — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Your personal IELTS study hub: continue practice tests, track band scores, and jump into upcoming live coaching sessions." },
      { property: "og:title", content: "Your IELTS Study Dashboard" },
      { property: "og:description", content: "Track band scores, resume practice tests, and manage your coaching plan." },
      { property: "og:url", content: "https://www.eggheadielts.com/dashboard" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/dashboard" }],
  }),
});

const iconFor = (t: string) => t === "listening" ? Headphones : t === "writing" ? PenLine : t === "speaking" ? Mic : BookOpen;

function Dashboard() {
  const { user } = Route.useRouteContext();
  const nav = useNavigate();
  useOnboardingGate(user.id);


  const tests = useQuery({
    queryKey: ["tests-published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const roles = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return data?.map((r) => r.role) ?? [];
    },
  });

  const attempts = useQuery({
    queryKey: ["my-attempts", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("test_attempts").select("*, tests(title, type)").order("updated_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const isAdmin = roles.data?.includes("admin");

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-display text-lg font-black text-ink">D</div>
            <div>
              <div className="font-display font-bold text-sm">Dr. Egghead's</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">IELTS Clinic</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="bg-gold/10 text-gold-light hover:bg-gold/20">
              <Link to="/dashboard"><LayoutDashboard className="mr-1 h-4 w-4" />Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile" className="flex items-center gap-2">
                <ProfileAvatar userId={user.id} />
                <span>Profile</span>
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline" size="sm"><Link to="/admin"><ShieldCheck className="mr-1 h-4 w-4" />Admin</Link></Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl bg-gold-radial p-8 text-cream shadow-gold">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">Welcome back</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{user.user_metadata?.full_name || user.email?.split("@")[0]}</h1>
          <p className="mt-2 text-sm text-cream/80">Pick up where you left off. Pass once, pass well.</p>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Available Tests</h2>
          {tests.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          ) : !tests.data?.length ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No published tests yet. Check back soon.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.data.map((t) => {
                const Icon = iconFor(t.type);
                return (
                  <Link key={t.id} to="/exam/$testId" params={{ testId: t.id }} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-gold">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-gradient text-ink"><Icon className="h-5 w-5" /></div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">{t.type}</span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold">{t.title}</h3>
                    {t.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.duration_minutes} min</span>
                      <span className="font-semibold text-primary group-hover:translate-x-1 transition inline-flex items-center gap-1">Start <ArrowRight className="h-3 w-3" /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {attempts.data && attempts.data.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Recent attempts</h2>
            <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
              {attempts.data.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold">{a.tests?.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleString()} · {a.submitted ? "Submitted" : "In progress"}</div>
                  </div>
                  {a.submitted ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-display text-xl font-bold text-primary">{a.score}/{a.total}</div>
                      </div>
                      <Button asChild size="sm" variant="outline"><Link to="/results/$attemptId" params={{ attemptId: a.id }}>Review</Link></Button>
                    </div>
                  ) : (
                    <Button asChild size="sm" variant="outline"><Link to="/exam/$testId" params={{ testId: a.test_id }}>Continue</Link></Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ProfileAvatar({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["profile-avatar", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const src = useAvatarSrc(data?.avatar_url);
  const initial = (data?.full_name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border bg-gold-gradient text-[10px] font-black text-ink">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial || <UserCircle className="h-4 w-4" />}
    </span>
  );
}
