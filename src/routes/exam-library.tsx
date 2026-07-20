import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/lib/site-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenLine, Mic, Search, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/exam-library")({
  component: ExamLibrary,
  head: () => ({
    meta: [
      { title: "Exam Library — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Browse the full library of IELTS Reading, Listening, Writing, and Speaking practice tests. Academic and General Training." },
      { property: "og:title", content: "Exam Library — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Free IELTS practice tests: Reading, Listening, Writing, Speaking. Academic & General." },
      { property: "og:url", content: "https://www.eggheadielts.com/exam-library" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/exam-library" }],
  }),
});

const TYPES = [
  { id: "all", label: "All Skills", icon: BookOpen },
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "listening", label: "Listening", icon: Headphones },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "speaking", label: "Speaking", icon: Mic },
] as const;

const DIFFS = [
  { id: "all", label: "All Modules" },
  { id: "academic", label: "Academic" },
  { id: "general", label: "General Training" },
] as const;

const iconFor = (t: string) => t === "listening" ? Headphones : t === "writing" ? PenLine : t === "speaking" ? Mic : BookOpen;

function ExamLibrary() {
  const [type, setType] = useState<string>("all");
  const [diff, setDiff] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["library-tests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (diff !== "all" && (t as any).difficulty !== diff) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase()) && !(t.description ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, type, diff, q]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gold-radial pb-20 pt-4 text-cream">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light">Exam Library</p>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight md:text-6xl">
            <span className="text-gold-shine">IELTS</span> Practice Tests
          </h1>
          <p className="mt-4 max-w-2xl text-base text-cream/80 md:text-lg">
            Cambridge-style full-length tests. Free to attempt, instantly graded, band-scored. Pass once, pass well.
          </p>
          <label htmlFor="exam-library-search" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-gold/30 bg-cream/5 p-1.5 backdrop-blur">
            <span className="sr-only">Search tests</span>
            <Search aria-hidden="true" className="ml-3 h-4 w-4 text-cream/60" />
            <Input id="exam-library-search" type="search" aria-label="Search tests by title or topic" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests by title or topic..." className="border-0 bg-transparent text-cream placeholder:text-cream/50 focus-visible:ring-0" />
          </label>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setType(t.id)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${type === t.id ? "border-primary bg-gold-gradient text-ink shadow-gold" : "border-border bg-card text-foreground/70 hover:border-primary/50 hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
          <span className="mx-2 h-6 w-px bg-border" />
          {DIFFS.map((d) => (
            <button key={d.id} onClick={() => setDiff(d.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${diff === d.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-card" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-semibold">No tests match your filters.</p>
              <p className="text-sm text-muted-foreground">Try clearing filters or check back soon — new tests are added weekly.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => {
                const Icon = iconFor(t.type);
                return (
                  <Link key={t.id} to="/exam/$testId" params={{ testId: t.id }} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-gold">
                    {(t as any).cover_image_url && (
                      <div className="absolute inset-0 opacity-10 transition group-hover:opacity-20" style={{ backgroundImage: `url(${(t as any).cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    )}
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-gradient text-ink"><Icon className="h-5 w-5" /></div>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                          {(t as any).difficulty ?? "academic"}
                        </span>
                      </div>
                      <div className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">{t.type}</div>
                      <h3 className="mt-1 font-display text-lg font-bold leading-snug line-clamp-2">{t.title}</h3>
                      {t.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                      <div className="mt-5 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{t.duration_minutes} min</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary transition group-hover:translate-x-1">Start test <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
