import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Flag, ArrowLeft, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { ScoreBreakdown, toBand as _toBand } from "@/components/ScoreBreakdown";

export const Route = createFileRoute("/_authenticated/results/$attemptId")({
  component: Results,
  head: () => ({ meta: [{ title: "Results — Dr. Egghead's IELTS Clinic" }] }),
});

const toBand = _toBand;

function Results() {
  const { attemptId } = Route.useParams();
  const { user } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["results", attemptId],
    queryFn: async () => {
      const { data: attempt, error } = await supabase.from("test_attempts").select("*, tests(*)").eq("id", attemptId).single();
      if (error) throw error;
      const testId = attempt.test_id;
      const [{ data: sections }, { data: qs }, { data: answers }] = await Promise.all([
        supabase.from("test_sections").select("*").eq("test_id", testId).order("position"),
        supabase.from("questions").select("id,test_id,group_id,number,position,prompt,options,points,question_type").eq("test_id", testId).order("number", { nullsFirst: false }),
        supabase.rpc("get_question_answers", { _test_id: testId }),
      ]);
      const answerMap = new Map<string, string>((answers ?? []).map((a: any) => [a.id, a.correct_answer ?? ""]));
      const merged = (qs ?? []).map((q: any) => ({ ...q, correct_answer: answerMap.get(q.id) ?? "" }));
      const groupIds = Array.from(new Set(merged.map((q: any) => q.group_id).filter(Boolean)));
      let groups: any[] = [];
      if (groupIds.length) {
        const { data: gs } = await supabase.from("question_groups").select("*").in("id", groupIds).order("position");
        groups = gs ?? [];
      }
      return { attempt, sections: sections ?? [], groups, questions: merged };

    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const raw = (data.attempt.answers as any) ?? {};
    const answers: Record<string, string> = raw.__answers ?? raw;
    const flagged: Record<string, boolean> = raw.__flagged ?? {};
    return (data.questions as any[]).map((q, i) => {
      const userAns = (answers[q.id] ?? "").trim();
      const correct = (q.correct_answer ?? "").trim();
      const isManual = q.question_type === "essay" || q.question_type === "speaking";
      const isCorrect = !isManual && userAns && userAns.toLowerCase() === correct.toLowerCase();
      return { q, num: q.number ?? i + 1, userAns, correct, isCorrect, flagged: !!flagged[q.id], isManual };
    });
  }, [data]);

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading results...</div>;

  const { attempt, sections, groups } = data;
  if (attempt.user_id !== user.id) {
    return <div className="p-10 text-center text-muted-foreground">You don't have access to this attempt.</div>;
  }

  const objectiveRows = rows.filter((r) => !r.isManual);
  const correctCount = objectiveRows.filter((r) => r.isCorrect).length;
  const total = objectiveRows.length;
  const band = attempt.tests?.type === "reading" || attempt.tests?.type === "listening" ? toBand(correctCount, total) : null;
  const durationSec = attempt.submitted_at ? Math.floor((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000) : 0;
  const mm = Math.floor(durationSec / 60);

  // Group rows by section
  const sectionsView = sections.length > 0
    ? (sections as any[]).map((s) => {
        const sGroups = (groups as any[]).filter((g) => g.section_id === s.id);
        const sRows = rows.filter((r) => sGroups.some((g) => g.id === r.q.group_id))
          .sort((a, b) => a.num - b.num);
        const sCorrect = sRows.filter((r) => r.isCorrect).length;
        const sTotal = sRows.filter((r) => !r.isManual).length;
        return { section: s, rows: sRows, correct: sCorrect, total: sTotal };
      })
    : [{ section: null as any, rows: rows.sort((a, b) => a.num - b.num), correct: correctCount, total }];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Back to dashboard</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/exam/$testId" params={{ testId: attempt.test_id }}>Retake</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl bg-gold-radial p-8 text-cream shadow-gold">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">{attempt.tests?.type} · Results</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{attempt.tests?.title}</h1>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Score</div>
              <div className="mt-1 font-display text-3xl font-black text-gold-shine">{correctCount}/{total}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Percent</div>
              <div className="mt-1 font-display text-3xl font-black">{total ? Math.round((correctCount / total) * 100) : 0}%</div>
            </div>
            {band !== null && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Est. Band</div>
                <div className="mt-1 flex items-center gap-2 font-display text-3xl font-black"><Trophy className="h-6 w-6 text-gold-light" />{band}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Time</div>
              <div className="mt-1 flex items-center gap-2 font-display text-3xl font-black"><Clock className="h-6 w-6" />{mm}m</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ScoreBreakdown
            score={correctCount}
            total={total}
            sectionsView={sectionsView as any}
            testType={attempt.tests?.type}
          />
        </div>

        <section className="mt-10 space-y-8">
          {sectionsView.map(({ section, rows }, idx) => (
            <div key={section?.id ?? idx}>
              {section && <h2 className="font-display text-xl font-bold">{section.title || `Section ${idx + 1}`}</h2>}
              <div className="mt-3 space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.q.id}
                    className={cn(
                      "rounded-xl border bg-card p-4",
                      r.isManual ? "border-border" : r.isCorrect ? "border-emerald-500/40" : r.userAns ? "border-destructive/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        r.isManual ? "bg-secondary text-secondary-foreground" : r.isCorrect ? "bg-emerald-500 text-white" : r.userAns ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        {r.isManual ? (r.q.question_type === "speaking" ? "🎙" : "✎") : r.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-muted-foreground">Q{r.num}</span>
                          {r.flagged && <Flag className="h-3 w-3 fill-destructive text-destructive" />}
                          <span className="text-muted-foreground">{r.q.points} pt</span>
                        </div>
                        <p className="mt-1 text-sm font-medium whitespace-pre-wrap">{r.q.prompt}</p>
                        {r.q.question_type === "speaking" ? (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your recording</div>
                            {r.userAns ? <SpeakingPlayback path={r.userAns} /> : <p className="mt-1 italic text-muted-foreground">No recording submitted</p>}
                            <p className="mt-2 text-xs italic text-muted-foreground">Speaking responses are reviewed manually — score not shown.</p>
                          </div>
                        ) : r.q.question_type === "essay" ? (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your response</div>
                            <p className="mt-1 whitespace-pre-wrap">{r.userAns || <span className="italic text-muted-foreground">No answer</span>}</p>
                            <p className="mt-2 text-xs italic text-muted-foreground">Essays are reviewed manually — score not shown.</p>
                          </div>
                        ) : (
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-background p-2">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your answer</div>
                              <div className={cn("mt-0.5 font-mono", !r.userAns && "italic text-muted-foreground")}>{r.userAns || "No answer"}</div>
                            </div>
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Correct</div>
                              <div className="mt-0.5 font-mono">{r.correct || "—"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function SpeakingPlayback({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.storage.from("speaking-responses").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <p className="mt-1 text-xs text-muted-foreground">Loading audio…</p>;
  return <audio controls src={url} className="mt-2 w-full" />;
}
