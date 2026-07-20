import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { Clock, Save, CheckCircle2, ChevronLeft, ChevronRight, Flag, Highlighter, Eraser, Mic, Square, Trash2, NotebookPen, BookOpen, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOnboardingGate } from "@/hooks/use-onboarding-gate";

export const Route = createFileRoute("/_authenticated/exam/$testId")({
  component: ExamRunner,
  head: ({ params }) => ({
    meta: [
      { title: `Exam ${params.testId.slice(0, 8)} — Dr. Egghead's IELTS Clinic` },
      { name: "description", content: "Sit a timed IELTS practice test with live band scoring, notepad, and section-by-section review." },
      { property: "og:title", content: "IELTS Practice Exam — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Timed IELTS practice with instant band scoring and detailed review." },
      { property: "og:url", content: `https://www.eggheadielts.com/exam/${params.testId}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

// Highlighter: wraps current text selection in a <mark> inside the given container.
function highlightSelection(container: HTMLElement | null) {
  if (!container) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return;
  try {
    const mark = document.createElement("mark");
    mark.className = "exam-hl";
    mark.style.backgroundColor = "hsl(48 96% 76% / 0.7)";
    mark.style.padding = "0 1px";
    mark.style.borderRadius = "2px";
    mark.style.cursor = "pointer";
    range.surroundContents(mark);
    sel.removeAllRanges();
  } catch {
    // Selection crosses element boundaries — fallback: extract & wrap
    const frag = range.extractContents();
    const mark = document.createElement("mark");
    mark.className = "exam-hl";
    mark.style.backgroundColor = "hsl(48 96% 76% / 0.7)";
    mark.appendChild(frag);
    range.insertNode(mark);
    sel.removeAllRanges();
  }
}

function clearHighlights(container: HTMLElement | null) {
  if (!container) return;
  container.querySelectorAll("mark.exam-hl").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parent.normalize();
  });
}

function ExamRunner() {
  const { testId } = Route.useParams();
  const { user } = Route.useRouteContext();
  useOnboardingGate(user.id);


  const { data, isLoading } = useQuery({
    queryKey: ["exam", testId],
    queryFn: async () => {
      const [{ data: test, error: e1 }, { data: sections, error: e2 }, { data: qs, error: e3 }] = await Promise.all([
        supabase.from("tests").select("*").eq("id", testId).single(),
        supabase.from("test_sections").select("*").eq("test_id", testId).order("position"),
        supabase.from("questions").select("id,test_id,group_id,number,position,prompt,options,points,question_type").eq("test_id", testId).order("number", { nullsFirst: false }),
      ]);
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
      const groupIds = Array.from(new Set((qs ?? []).map((q: any) => q.group_id).filter(Boolean)));
      let groups: any[] = [];
      if (groupIds.length) {
        const { data: gs } = await supabase.from("question_groups").select("*").in("id", groupIds).order("position");
        groups = gs ?? [];
      }
      return { test, sections: sections ?? [], groups, questions: qs ?? [] };
    },
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
  const [phase, setPhase] = useState<"reading" | "testing">("reading");
  const [notes, setNotes] = useState<string>("");
  const [notepadOpen, setNotepadOpen] = useState<boolean>(true);
  const [passageViewsUsed, setPassageViewsUsed] = useState<number>(0);
  const [showPassage, setShowPassage] = useState<boolean>(true);
  const MAX_PASSAGE_VIEWS = 2;
  const savedAt = useRef<number>(0);
  const passageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data?.test) return;
    (async () => {
      const { data: existing } = await supabase.from("test_attempts").select("*").eq("test_id", testId).eq("user_id", user.id).eq("submitted", false).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        setAttemptId(existing.id);
        const saved = (existing.answers as any) ?? {};
        setAnswers(saved.__answers ?? saved);
        setFlagged(saved.__flagged ?? {});
        if (typeof saved.__notes === "string") setNotes(saved.__notes);
        const startIso = saved.__testStartedAt ?? existing.started_at;
        testStartedAtRef.current = startIso;
        const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
        setRemaining(Math.max(0, data.test.duration_minutes * 60 - elapsed));
        if (saved.__phase === "testing") {
          setPhase("testing");
          setShowPassage(false);
          setPassageViewsUsed(saved.__passageViewsUsed ?? 0);
        }
      } else {
        const { data: created, error } = await supabase.from("test_attempts").insert({ test_id: testId, user_id: user.id, total: data.questions.length }).select().single();
        if (error) return toast.error(error.message);
        setAttemptId(created.id);
        testStartedAtRef.current = created.started_at ?? new Date().toISOString();
        setRemaining(data.test.duration_minutes * 60);
      }
    })();
  }, [data, testId, user.id]);

  useEffect(() => {
    if (!attemptId || submitted || submitting || !data?.test) return;
    const durationSec = data.test.duration_minutes * 60;
    const compute = () => {
      const startIso = testStartedAtRef.current;
      if (!startIso) return;
      const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
      setRemaining(Math.max(0, durationSec - elapsed));
    };
    compute();
    const t = setInterval(compute, 1000);
    const onVis = () => { if (!document.hidden) compute(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", compute);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", compute);
    };
  }, [attemptId, submitted, submitting, data]);


  const testStartedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!attemptId) return;
    const now = Date.now();
    if (now - savedAt.current < 3000) return;
    savedAt.current = now;
    const timer = setTimeout(async () => {
      await supabase.from("test_attempts").update({ answers: { __answers: answers, __flagged: flagged, __notes: notes, __phase: phase, __passageViewsUsed: passageViewsUsed, __testStartedAt: testStartedAtRef.current }, updated_at: new Date().toISOString() }).eq("id", attemptId);
    }, 800);
    return () => clearTimeout(timer);
  }, [answers, flagged, notes, phase, passageViewsUsed, attemptId]);

  const timeStr = useMemo(() => {
    const m = Math.floor(remaining / 60), s = remaining % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remaining]);

  const submitLockRef = useRef(false);
  const handleSubmit = useCallback(async () => {
    if (!attemptId || !data) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    const { data: result, error } = await supabase.rpc("submit_test_attempt", {
      _attempt_id: attemptId,
      _answers: answers as any,
      _flagged: flagged as any,
      _notes: notes,
    });
    setSubmitting(false);
    if (error) { submitLockRef.current = false; return toast.error(error.message); }
    const row = Array.isArray(result) ? result[0] : result;
    setSubmitted({ score: row?.score ?? 0, total: row?.total ?? 0 });
  }, [attemptId, data, answers, flagged, notes]);

  const startTest = useCallback(() => {
    testStartedAtRef.current = new Date().toISOString();
    setPhase("testing");
    setShowPassage(false);
  }, []);

  const togglePassage = useCallback(() => {
    if (phase !== "testing") { setShowPassage((v) => !v); return; }
    if (showPassage) { setShowPassage(false); return; }
    if (passageViewsUsed >= MAX_PASSAGE_VIEWS) { toast.error("You've used your 2 passage views."); return; }
    setPassageViewsUsed((n) => n + 1);
    setShowPassage(true);
  }, [phase, showPassage, passageViewsUsed]);


  const timeUp = remaining === 0 && !!attemptId;
  const notifiedTimeUp = useRef(false);
  useEffect(() => {
    if (timeUp && !submitted && !notifiedTimeUp.current) {
      notifiedTimeUp.current = true;
      toast.error("Time's up — submitting your exam.");
      handleSubmit();
    }
  }, [timeUp, submitted, handleSubmit]);

  const toggleFlag = (id: string) => setFlagged((f) => ({ ...f, [id]: !f[id] }));
  const jumpTo = (qId: string, targetSectionIdx?: number) => {
    if (typeof targetSectionIdx === "number" && targetSectionIdx !== sectionIdx) setSectionIdx(targetSectionIdx);
    setTimeout(() => {
      const el = document.getElementById(`q-${qId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  if (isLoading || !data?.test) return <div className="p-10 text-center">Loading exam...</div>;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gold-radial p-6 text-cream">
        <div className="max-w-lg rounded-3xl border border-gold/40 bg-cream/5 p-10 text-center backdrop-blur">
          <CheckCircle2 className="mx-auto h-16 w-16 text-gold-light" />
          <h1 className="mt-4 font-display text-3xl font-bold">Submitted</h1>
          <div className="mt-6 font-display text-6xl font-black text-gold-shine">{submitted.score}/{submitted.total}</div>
          <p className="mt-2 text-cream/70">{Math.round((submitted.score / Math.max(submitted.total, 1)) * 100)}% correct on objective questions</p>
          <p className="mt-4 text-sm text-cream/60">Essays and long-form answers are reviewed manually.</p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {attemptId && <Button asChild className="bg-gold-gradient text-ink"><Link to="/results/$attemptId" params={{ attemptId }}>Review answers</Link></Button>}
            <Button asChild variant="outline" className="border-gold/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"><Link to="/dashboard">Back to dashboard</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const { test, sections, groups, questions } = data;
  const useSections = sections.length > 0;
  const activeSection = useSections ? sections[Math.min(sectionIdx, sections.length - 1)] : null;
  const sectionQuestions = useSections
    ? (questions as any[]).filter((q) => (groups as any[]).some((g) => g.id === q.group_id && g.section_id === activeSection?.id))
    : (questions as any[]);
  const sectionGroups = useSections
    ? (groups as any[]).filter((g) => g.section_id === activeSection?.id).sort((a, b) => a.position - b.position)
    : [];

  // Palette: all questions across all sections with their section index
  const paletteItems = useSections
    ? (sections as any[]).flatMap((s, si) => {
        const sqs = (questions as any[])
          .filter((q) => (groups as any[]).some((g) => g.id === q.group_id && g.section_id === s.id))
          .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
        return sqs.map((q) => ({ q, sectionIdx: si }));
      })
    : (questions as any[]).map((q) => ({ q, sectionIdx: 0 }));

  const answeredCount = paletteItems.filter(({ q }) => (answers[q.id] ?? "").trim() !== "").length;

  const passageAvailable = useSections
    ? (activeSection?.passage || activeSection?.audio_url || activeSection?.image_url || activeSection?.writing_prompt || activeSection?.speaking_cue)
    : (test.passage || test.audio_url);

  const passagePanel = (
    <aside className={cn("border-border bg-card lg:overflow-y-auto", phase === "reading" ? "" : "border-r lg:h-[calc(100vh-73px)]")}>
      <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-border bg-card/95 px-6 py-2 backdrop-blur">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {useSections ? activeSection?.title || `Section ${sectionIdx + 1}` : test.type === "listening" ? "Listening" : "Reading"}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => highlightSelection(passageRef.current)} title="Highlight selected text">
            <Highlighter className="h-3.5 w-3.5" /> Highlight
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => clearHighlights(passageRef.current)} title="Clear all highlights">
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>
      <div
        ref={passageRef}
        className="p-6"
        onCopy={(e) => { e.preventDefault(); toast.error("Copying the passage is disabled."); }}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {useSections ? (
          <>
            <h2 className="font-display text-xl font-bold">{activeSection?.title || `Section ${sectionIdx + 1}`}</h2>
            {activeSection?.audio_url && <audio controls src={activeSection.audio_url} className="mt-4 w-full">Your browser does not support audio.</audio>}
            {activeSection?.image_url && <img src={activeSection.image_url} alt="" className="mt-4 w-full rounded-lg border border-border" draggable={false} />}
            {activeSection?.writing_prompt && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"><strong className="text-primary">Writing prompt</strong><p className="mt-2 whitespace-pre-wrap">{activeSection.writing_prompt}</p></div>
            )}
            {activeSection?.speaking_cue && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"><strong className="text-primary">Cue card</strong><p className="mt-2 whitespace-pre-wrap">{activeSection.speaking_cue}</p></div>
            )}
            {activeSection?.passage && (
              <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap leading-relaxed text-foreground select-text">{activeSection.passage}</div>
            )}
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold">{test.type === "listening" ? "Listening" : "Reading"} Material</h2>
            {test.audio_url && <audio controls src={test.audio_url} className="mt-4 w-full">Your browser does not support audio.</audio>}
            {test.passage && <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap leading-relaxed text-foreground select-text">{test.passage}</div>}
            {!test.passage && !test.audio_url && <p className="mt-4 text-sm text-muted-foreground">Read the questions carefully and answer on the right.</p>}
          </>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{test.type}</div>
            <h1 className="font-display text-lg font-bold">{test.title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {phase === "testing" && passageAvailable && (
              <Button type="button" variant="outline" size="sm" onClick={togglePassage} className="gap-1">
                {showPassage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPassage ? "Hide passage" : `View passage (${MAX_PASSAGE_VIEWS - passageViewsUsed} left)`}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setNotepadOpen((v) => !v)} className="gap-1">
              <NotebookPen className="h-4 w-4" /> Notepad
            </Button>
            {phase === "testing" && (
              <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Save className="h-3 w-3" /> {answeredCount}/{paletteItems.length}</div>
            )}
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-sm font-bold ${remaining < 300 ? "bg-destructive text-destructive-foreground" : "bg-gold-gradient text-ink"}`}>
              <Clock className="h-4 w-4" /> {timeStr}
            </div>
            {phase === "testing" && <Button onClick={handleSubmit} disabled={submitting} size="sm">Submit</Button>}

          </div>
        </div>
        {phase === "testing" && useSections && sections.length > 1 && (
          <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-6 pb-3">
            {(sections as any[]).map((s, i) => (
              <button key={s.id} onClick={() => setSectionIdx(i)} className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition ${i === sectionIdx ? "border-primary bg-gold-gradient text-ink" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                {s.title || `Section ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </header>

      {phase === "reading" ? (
        <div className="mx-auto w-full max-w-[1000px] flex-1 p-6">
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-foreground">Read the passage first.</p>
                <p className="mt-1 text-muted-foreground">Your timer is already running — read the passage (or listen to the audio) and take notes on the right. Click <strong>Take Test</strong> when you're ready to answer. During the test you can re-open the passage up to <strong>{MAX_PASSAGE_VIEWS} times</strong>, and your notes stay with you.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-card">
            {passagePanel}
          </div>
          <div className="sticky bottom-4 z-10 mt-6 flex justify-center">
            <Button size="lg" onClick={startTest} className="bg-gold-gradient text-ink shadow-gold">
              Take Test <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : showPassage ? (
        <div className="mx-auto w-full max-w-[1000px] flex-1 p-6">
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-foreground">Passage view</p>
            <p className="mt-1 text-muted-foreground">Questions are hidden while you re-read the passage. Click <strong>Continue test</strong> or <strong>Hide passage</strong> to return to your questions. Your timer is still running.</p>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-card">
            {passagePanel}
          </div>
          <div className="sticky bottom-4 z-10 mt-6 flex justify-center">
            <Button size="lg" onClick={() => setShowPassage(false)} className="bg-gold-gradient text-ink shadow-gold">
              Continue test <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-0">
          <section className="p-6 pb-32 lg:h-[calc(100vh-73px)] lg:overflow-y-auto">
            <div className="space-y-6">
              {useSections ? (
                sectionGroups.map((g) => {
                  const gQs = (sectionQuestions as any[]).filter((q) => q.group_id === g.id).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
                  return (
                    <div key={g.id} className="space-y-4">
                      {g.instructions && <div className="rounded-lg bg-secondary p-3 text-sm font-medium text-secondary-foreground">{g.instructions}</div>}
                      {gQs.map((q) => <QuestionCard key={q.id} q={q} answers={answers} setAnswers={setAnswers} flagged={!!flagged[q.id]} onToggleFlag={() => toggleFlag(q.id)} />)}
                    </div>
                  );
                })
              ) : (
                (questions as any[]).map((q, i) => <QuestionCard key={q.id} q={{ ...q, number: q.number ?? i + 1 }} answers={answers} setAnswers={setAnswers} flagged={!!flagged[q.id]} onToggleFlag={() => toggleFlag(q.id)} />)
              )}

              {useSections && sections.length > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" disabled={sectionIdx === 0} onClick={() => setSectionIdx((i) => i - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous section</Button>
                  {sectionIdx < sections.length - 1 ? (
                    <Button onClick={() => setSectionIdx((i) => i + 1)} className="bg-gold-gradient text-ink">Next section<ChevronRight className="ml-1 h-4 w-4" /></Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-gold-gradient text-ink">Submit exam</Button>
                  )}
                </div>
              )}
              {!useSections && (
                <div className="pb-8">
                  <Button size="lg" onClick={handleSubmit} disabled={submitting} className="w-full bg-gold-gradient text-ink shadow-gold">
                    {submitting ? "Submitting..." : "Submit exam"}
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Notepad — typing only, no paste/drop */}
      {notepadOpen && (
        <div className="fixed bottom-20 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-gold">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
              <NotebookPen className="h-3.5 w-3.5" /> Notepad
            </div>
            <button type="button" onClick={() => setNotepadOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={(e) => { e.preventDefault(); toast.error("Paste is disabled — type your notes."); }}
            onDrop={(e) => { e.preventDefault(); toast.error("Drag & drop is disabled."); }}
            onCut={(e) => { /* allow cutting own text */ }}
            placeholder="Type your notes here… (paste is disabled)"
            rows={10}
            className="min-h-[220px] resize-none border-0 rounded-none rounded-b-xl focus-visible:ring-0"
          />
        </div>
      )}




      {/* Question palette footer */}
      {phase === "testing" && (
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 overflow-x-auto">
          <div className="hidden shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:block">Questions</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {paletteItems.map(({ q, sectionIdx: si }, idx) => {
              const answered = (answers[q.id] ?? "").trim() !== "";
              const isFlagged = !!flagged[q.id];
              const num = q.number ?? idx + 1;
              return (
                <button
                  key={q.id}
                  onClick={() => jumpTo(q.id, si)}
                  title={`Question ${num}${isFlagged ? " (flagged)" : ""}`}
                  className={cn(
                    "relative h-8 w-8 shrink-0 rounded-md border text-xs font-bold transition",
                    answered ? "border-primary bg-gold-gradient text-ink" : "border-border bg-background text-foreground hover:bg-accent",
                    isFlagged && "ring-2 ring-destructive ring-offset-1 ring-offset-card",
                  )}
                >
                  {num}
                  {isFlagged && <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-destructive text-destructive" />}
                </button>
              );
            })}
          </div>
          <div className="ml-auto hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gold-gradient" /> answered</span>
            <span className="flex items-center gap-1"><Flag className="h-3 w-3 fill-destructive text-destructive" /> flagged</span>
          </div>
        </div>
      </footer>
      )}

      {timeUp && !submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-gold/40 bg-card p-8 text-center shadow-gold">
            <Clock className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 font-display text-2xl font-bold text-foreground">Time's up</h2>
            <p className="mt-2 text-sm text-muted-foreground">The timer has reached zero. Submitting your answers now…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, answers, setAnswers, flagged, onToggleFlag }: { q: any; answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void; flagged: boolean; onToggleFlag: () => void }) {
  return (
    <div id={`q-${q.id}`} className={cn("rounded-xl border bg-card p-5 shadow-card scroll-mt-24", flagged ? "border-destructive/50" : "border-border")}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-xs font-bold text-ink">{q.number}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium whitespace-pre-wrap">{q.prompt}</p>
            <button
              type="button"
              onClick={onToggleFlag}
              title={flagged ? "Unflag" : "Flag for review"}
              className={cn(
                "shrink-0 rounded-md border p-1.5 transition",
                flagged ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Flag className={cn("h-3.5 w-3.5", flagged && "fill-destructive")} />
            </button>
          </div>
          <div className="mt-4">
            {q.question_type === "speaking" ? (
              <SpeakingRecorder value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} questionId={q.id} />
            ) : q.question_type === "essay" ? (
              <Textarea rows={10} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Write your essay here..." />
            ) : q.question_type === "tf_ng" ? (
              <div className="flex flex-wrap gap-2">
                {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
                  <label key={opt} className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold uppercase transition ${answers[q.id] === opt ? "border-primary bg-gold-gradient text-ink" : "border-border bg-background hover:bg-accent"}`}>
                    <input type="radio" className="hidden" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : q.question_type === "yn_ng" ? (
              <div className="flex flex-wrap gap-2">
                {["YES", "NO", "NOT GIVEN"].map((opt) => (
                  <label key={opt} className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold uppercase transition ${answers[q.id] === opt ? "border-primary bg-gold-gradient text-ink" : "border-border bg-background hover:bg-accent"}`}>
                    <input type="radio" className="hidden" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : q.options && (q.options as string[]).length > 0 ? (
              <div className="space-y-2">
                {(q.options as string[]).map((opt) => (
                  <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${answers[q.id] === opt ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} className="h-4 w-4 accent-primary" />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Your answer" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakingRecorder({ value, onChange, questionId }: { value: string; onChange: (v: string) => void; questionId: string }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1024) { toast.error("Recording too short — please try again."); return; }
        setUploading(true);
        try {
          const { data: userData } = await supabase.auth.getUser();
          const uid = userData.user?.id;
          if (!uid) throw new Error("Not signed in");
          const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
          const path = `${uid}/${questionId}-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from("speaking-responses").upload(path, blob, { contentType: blob.type, upsert: true });
          if (error) throw error;
          onChange(path);
          toast.success("Answer recorded");
        } catch (err: any) {
          toast.error(err.message || "Upload failed");
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err: any) {
      toast.error(err?.name === "NotAllowedError" ? "Microphone permission denied." : "Could not start recording.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const clear = () => { onChange(""); };

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAudioUrl(null);
    if (value) {
      supabase.storage.from("speaking-responses").createSignedUrl(value, 3600).then(({ data }) => {
        if (!cancelled) setAudioUrl(data?.signedUrl ?? null);
      });
    }
    return () => { cancelled = true; };
  }, [value]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <Button type="button" onClick={start} disabled={uploading} className="bg-gold-gradient text-ink">
            <Mic className="mr-2 h-4 w-4" />{value ? "Re-record" : "Start recording"}
          </Button>
        ) : (
          <Button type="button" onClick={stop} variant="destructive">
            <Square className="mr-2 h-4 w-4" />Stop ({mm}:{ss})
          </Button>
        )}
        {recording && <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" /> Recording…</span>}
        {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
        {value && !recording && !uploading && (
          <Button type="button" onClick={clear} variant="ghost" size="sm" className="text-destructive"><Trash2 className="mr-1 h-4 w-4" />Clear</Button>
        )}
      </div>
      {value && audioUrl && !recording && (
        <audio controls src={audioUrl} className="mt-3 w-full" />
      )}
      {!value && !recording && (
        <p className="mt-2 text-xs text-muted-foreground">Click "Start recording" to answer with your voice. Your response will be graded manually by your instructor.</p>
      )}
    </div>
  );
}
