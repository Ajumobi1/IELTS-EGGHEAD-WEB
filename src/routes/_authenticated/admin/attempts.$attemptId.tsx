import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Flag, ArrowLeft, ArrowRight, Clock, Trophy, User, ShieldCheck, Save, CalendarClock, AlertTriangle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";

export const Route = createFileRoute("/_authenticated/admin/attempts/$attemptId")({
  component: AdminAttemptReview,
  head: () => ({ meta: [{ title: "Attempt review — Admin" }] }),
});

function toBand(score: number, total: number): number | null {
  if (!total) return null;
  const pct = (score / total) * 40;
  const bands: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
    [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3],
  ];
  for (const [min, band] of bands) if (pct >= min) return band;
  return 2.5;
}

function AdminAttemptReview() {
  const { attemptId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-attempt", attemptId],
    queryFn: async () => {
      const { data: attempt, error } = await supabase
        .from("test_attempts")
        .select("*, tests(*)")
        .eq("id", attemptId)
        .single();
      if (error) throw error;
      const testId = attempt.test_id;
      const [{ data: profile, error: profileError }, { data: sections, error: sectionsError }, { data: qs, error: questionsError }, { data: answers, error: answersError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", attempt.user_id).maybeSingle(),
        supabase.from("test_sections").select("*").eq("test_id", testId).order("position"),
        supabase.from("questions").select("id,test_id,group_id,number,position,prompt,options,points,question_type").eq("test_id", testId).order("number", { nullsFirst: false }),
        supabase.rpc("get_question_answers", { _test_id: testId }),
      ]);
      const readError = profileError ?? sectionsError ?? questionsError ?? answersError;
      if (readError) throw readError;
      const answerMap = new Map<string, string>((answers ?? []).map((a: any) => [a.id, a.correct_answer ?? ""]));
      const merged = (qs ?? []).map((q: any) => ({ ...q, correct_answer: answerMap.get(q.id) ?? "" }));
      const groupIds = Array.from(new Set(merged.map((q: any) => q.group_id).filter(Boolean)));
      let groups: any[] = [];
      if (groupIds.length) {
        const { data: gs, error: groupsError } = await supabase.from("question_groups").select("*").in("id", groupIds).order("position");
        if (groupsError) throw groupsError;
        groups = gs ?? [];
      }
      return { attempt, profile, sections: sections ?? [], groups, questions: merged };

    },
  });

  const { data: nextUnreviewed } = useQuery({
    queryKey: ["admin-next-unreviewed", attemptId],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_attempts")
        .select("id")
        .eq("submitted", true)
        .eq("reviewed", false)
        .neq("id", attemptId)
        .order("submitted_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
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
      const isBlank = !userAns;
      const validation: "correct" | "incorrect" | "unanswered" | "manual" = isManual ? "manual" : isBlank ? "unanswered" : isCorrect ? "correct" : "incorrect";
      return { q, num: q.number ?? i + 1, userAns, correct, isCorrect, flagged: !!flagged[q.id], isManual, validation };
    });
  }, [data]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading attempt…</div>;
  if (error || !data) return <div className="p-10 text-center text-muted-foreground">Attempt not found.</div>;

  const { attempt, profile, sections, groups } = data;
  const raw = (attempt.answers as any) ?? {};
  const notes: string = raw.__notes ?? "";

  const objectiveRows = rows.filter((r) => !r.isManual);
  const manualRows = rows.filter((r) => r.isManual);
  const correctRows = objectiveRows.filter((r) => r.isCorrect);
  const incorrectRows = objectiveRows.filter((r) => !r.isCorrect && r.userAns);
  const unansweredRows = objectiveRows.filter((r) => !r.userAns);
  const flaggedRows = rows.filter((r) => r.flagged);
  const total = attempt.total ?? objectiveRows.length;
  const score = attempt.score ?? objectiveRows.filter((r) => r.isCorrect).length;
  const band = attempt.tests?.type === "reading" || attempt.tests?.type === "listening" ? toBand(score, total) : null;
  const durationSec = attempt.submitted_at
    ? Math.floor((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
    : 0;
  const mm = Math.floor(durationSec / 60);

  const sectionsView = sections.length > 0
    ? (sections as any[]).map((s) => {
        const sGroups = (groups as any[]).filter((g) => g.section_id === s.id);
        const sRows = rows.filter((r) => sGroups.some((g) => g.id === r.q.group_id)).sort((a, b) => a.num - b.num);
        const sCorrect = sRows.filter((r) => r.isCorrect).length;
        const sTotal = sRows.filter((r) => !r.isManual).length;
        return { section: s, rows: sRows, correct: sCorrect, total: sTotal };
      })
    : [{ section: null as any, rows: rows.sort((a, b) => a.num - b.num), correct: score, total }];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/attempts"><ArrowLeft className="mr-1 h-4 w-4" />Back to attempts</Link>
          </Button>
          <div className="flex items-center gap-2">
            {nextUnreviewed ? (
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link to="/admin/attempts/$attemptId" params={{ attemptId: nextUnreviewed.id }}>
                  Next unreviewed <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No pending reviews</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Server-validated score
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl bg-gold-radial p-8 text-cream shadow-gold">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">{attempt.tests?.type} · Attempt review</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{attempt.tests?.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-gold-light" />{profile?.full_name || "Unnamed student"}</span>
            <span className="text-cream/60">Started {new Date(attempt.started_at).toLocaleString()}</span>
            {attempt.submitted_at && <span className="text-cream/60">Submitted {new Date(attempt.submitted_at).toLocaleString()}</span>}
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              attempt.submitted ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100",
            )}>{attempt.submitted ? "Submitted" : "In progress"}</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Score</div>
              <div className="mt-1 font-display text-3xl font-black text-gold-shine">{score}/{total}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Percent</div>
              <div className="mt-1 font-display text-3xl font-black">{total ? Math.round((score / total) * 100) : 0}%</div>
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
            score={score}
            total={total}
            sectionsView={sectionsView as any}
            testType={attempt.tests?.type}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TimestampPanel attempt={attempt} durationSec={durationSec} />
          <ValidationPanel
            correct={correctRows.length}
            incorrect={incorrectRows.length}
            unanswered={unansweredRows.length}
            manual={manualRows.length}
            flagged={flaggedRows.length}
            submitted={!!attempt.submitted}
          />
        </div>

        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/students/$userId" params={{ userId: attempt.user_id }}>
              <User className="mr-1 h-4 w-4" />View student profile
            </Link>
          </Button>
        </div>

        {manualRows.length > 0 ? (
          <>
            <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
              <strong>{manualRows.length}</strong> response{manualRows.length === 1 ? "" : "s"} require manual review (essay / speaking) and are not included in the auto-score.
            </div>

            <AdminReviewPanel
              attemptId={attempt.id}
              initialNotes={attempt.admin_notes ?? ""}
              initialReviewed={!!attempt.reviewed}
              reviewedAt={attempt.reviewed_at}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["admin-attempt", attemptId] });
                qc.invalidateQueries({ queryKey: ["admin-next-unreviewed"] });
                qc.invalidateQueries({ queryKey: ["admin-attempts"] });
              }}
            />
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            <strong>Auto-marked.</strong> All questions in this attempt are objective and were validated by the server — no manual review needed.
          </div>
        )}

        {notes && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student notes</div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{notes}</p>
          </div>
        )}

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
                    r.isManual ? "border-amber-500/30" : r.isCorrect ? "border-emerald-500/40" : r.userAns ? "border-destructive/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        r.isManual ? "bg-amber-500 text-white" : r.isCorrect ? "bg-emerald-500 text-white" : r.userAns ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        {r.isManual ? (r.q.question_type === "speaking" ? "🎙" : "✎") : r.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-muted-foreground">Q{r.num}</span>
                          <span className="text-muted-foreground uppercase tracking-widest">{r.q.question_type}</span>
                          {r.flagged && <span className="inline-flex items-center gap-1 text-destructive"><Flag className="h-3 w-3 fill-current" /> Flagged</span>}
                          <span className="text-muted-foreground">{r.q.points} pt</span>
                          <ValidationBadge status={r.validation} />
                        </div>
                        <p className="mt-1 text-sm font-medium whitespace-pre-wrap">{r.q.prompt}</p>
                        {r.q.question_type === "speaking" ? (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student recording</div>
                            {r.userAns ? <SpeakingPlayback path={r.userAns} /> : <p className="mt-1 italic text-muted-foreground">No recording submitted</p>}
                            <p className="mt-2 text-xs italic text-muted-foreground">Grade manually.</p>
                          </div>
                        ) : r.q.question_type === "essay" ? (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student response ({(r.userAns.match(/\S+/g)?.length ?? 0)} words)</div>
                            <p className="mt-1 whitespace-pre-wrap">{r.userAns || <span className="italic text-muted-foreground">No answer</span>}</p>
                            <p className="mt-2 text-xs italic text-muted-foreground">Grade manually.</p>
                          </div>
                        ) : (
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-background p-2">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student answer</div>
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

function TimestampPanel({ attempt, durationSec }: { attempt: any; durationSec: number }) {
  const duration = durationSec > 0
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : "Still in progress";
  const items = [
    { label: "Started", value: attempt.started_at ? new Date(attempt.started_at).toLocaleString() : "—" },
    { label: "Submitted", value: attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "Not submitted" },
    { label: "Last saved", value: attempt.updated_at ? new Date(attempt.updated_at).toLocaleString() : "—" },
    { label: "Duration", value: duration },
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Attempt timestamps</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-background p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValidationPanel({ correct, incorrect, unanswered, manual, flagged, submitted }: { correct: number; incorrect: number; unanswered: number; manual: number; flagged: number; submitted: boolean }) {
  const checks = [
    { label: "Correct", value: correct, icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" },
    { label: "Incorrect", value: incorrect, icon: XCircle, className: "border-destructive/30 bg-destructive/5 text-destructive" },
    { label: "Unanswered", value: unanswered, icon: CircleDashed, className: "border-border bg-muted/40 text-muted-foreground" },
    { label: "Manual review", value: manual, icon: AlertTriangle, className: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400" },
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Validation results</h2>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", submitted ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
          {submitted ? "Submitted" : "In progress"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {checks.map(({ label, value, icon: Icon, className }) => (
          <div key={label} className={cn("rounded-xl border p-3", className)}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"><Icon className="h-4 w-4" />{label}</div>
            <div className="mt-1 font-display text-2xl font-black text-foreground">{value}</div>
          </div>
        ))}
      </div>
      {flagged > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
          {flagged} flagged question{flagged === 1 ? "" : "s"} marked by the student.
        </div>
      )}
    </section>
  );
}

function ValidationBadge({ status }: { status: "correct" | "incorrect" | "unanswered" | "manual" }) {
  const labels = {
    correct: "Validated correct",
    incorrect: "Validated incorrect",
    unanswered: "Unanswered",
    manual: "Manual review",
  };
  const classes = {
    correct: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    incorrect: "bg-destructive/10 text-destructive",
    unanswered: "bg-muted text-muted-foreground",
    manual: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", classes[status])}>{labels[status]}</span>;
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

function AdminReviewPanel({
  attemptId,
  initialNotes,
  initialReviewed,
  reviewedAt,
  onSaved,
}: {
  attemptId: string;
  initialNotes: string;
  initialReviewed: boolean;
  reviewedAt: string | null;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [reviewed, setReviewed] = useState(initialReviewed);

  useEffect(() => { setNotes(initialNotes); }, [initialNotes]);
  useEffect(() => { setReviewed(initialReviewed); }, [initialReviewed]);

  const dirty = notes !== initialNotes || reviewed !== initialReviewed;

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("test_attempts")
        .update({
          admin_notes: notes,
          reviewed,
          reviewed_at: reviewed ? new Date().toISOString() : null,
          reviewed_by: reviewed ? userData.user?.id ?? null : null,
        })
        .eq("id", attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review saved");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save review"),
  });

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin review</div>
          {initialReviewed && reviewedAt && (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Marked reviewed {new Date(reviewedAt).toLocaleString()}
            </p>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(!!v)} />
          Mark as reviewed
        </label>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Manual grading notes, feedback for the student, or internal comments…"
        rows={5}
        className="mt-3"
      />
      <div className="mt-3 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save review"}
        </Button>
      </div>
    </div>
  );
}
