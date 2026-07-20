import { ShieldCheck, CheckCircle2, XCircle, CircleDashed, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreakdownRow = {
  q: { id: string; question_type: string; group_id?: string | null; points?: number | null };
  num: number;
  userAns: string;
  correct: string;
  isCorrect: boolean;
  isManual: boolean;
};

export type SectionView = {
  section: { id: string; title?: string | null } | null;
  rows: BreakdownRow[];
  correct: number;
  total: number;
};

// IELTS Reading/Listening band conversion (approximation)
export function toBand(score: number, total: number): number | null {
  if (!total) return null;
  const pct = (score / total) * 40;
  const bands: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
    [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3],
  ];
  for (const [min, band] of bands) if (pct >= min) return band;
  return 2.5;
}

export function ScoreBreakdown({
  score,
  total,
  sectionsView,
  testType,
  className,
}: {
  score: number;
  total: number;
  sectionsView: SectionView[];
  testType?: string | null;
  className?: string;
}) {
  const allRows = sectionsView.flatMap((s) => s.rows);
  const objective = allRows.filter((r) => !r.isManual);
  const correct = objective.filter((r) => r.isCorrect).length;
  const incorrect = objective.filter((r) => !r.isCorrect && r.userAns).length;
  const unanswered = objective.filter((r) => !r.userAns).length;
  const manual = allRows.filter((r) => r.isManual).length;

  // Per question type
  const byType = new Map<string, { correct: number; total: number; manual: boolean }>();
  allRows.forEach((r) => {
    const key = r.q.question_type || "unknown";
    const cur = byType.get(key) ?? { correct: 0, total: 0, manual: r.isManual };
    cur.total += 1;
    if (!r.isManual && r.isCorrect) cur.correct += 1;
    byType.set(key, cur);
  });

  const bandCapable = testType === "reading" || testType === "listening";

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Score breakdown</h2>
          <p className="text-xs text-muted-foreground">Auto-scored on the server. Essays & speaking are graded manually.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-3 w-3" /> Server-validated
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Correct" value={correct} tone="emerald" />
        <StatTile icon={<XCircle className="h-4 w-4" />} label="Incorrect" value={incorrect} tone="destructive" />
        <StatTile icon={<CircleDashed className="h-4 w-4" />} label="Unanswered" value={unanswered} tone="muted" />
        <StatTile icon={<Pencil className="h-4 w-4" />} label="Manual review" value={manual} tone="amber" />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Objective total</span>
          <span className="font-display text-2xl font-black">
            {score}<span className="text-muted-foreground">/{total}</span>
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {total ? Math.round((score / total) * 100) : 0}%
            </span>
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${total ? (score / total) * 100 : 0}%` }} />
        </div>
      </div>

      {sectionsView.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Per section</div>
          <div className="mt-2 space-y-2">
            {sectionsView.map(({ section, correct: c, total: st }, idx) => {
              const pct = st ? Math.round((c / st) * 100) : 0;
              const sBand = bandCapable ? toBand(c, st) : null;
              return (
                <div key={section?.id ?? idx} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{section?.title || `Section ${idx + 1}`}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">{c}/{st}</span>
                      <span>{pct}%</span>
                      {sBand !== null && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-bold text-foreground">Band {sBand}</span>}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {byType.size > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Per question type</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {Array.from(byType.entries()).map(([type, s]) => (
              <div key={type} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <span className="font-medium capitalize">{type.replace(/_/g, " ")}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {s.manual ? `${s.total} manual` : `${s.correct}/${s.total}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "destructive" | "muted" | "amber" }) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-border bg-muted/40 text-muted-foreground",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  };
  return (
    <div className={cn("rounded-xl border p-3", tones[tone])}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-black text-foreground">{value}</div>
    </div>
  );
}
