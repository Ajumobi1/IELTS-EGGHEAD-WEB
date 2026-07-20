import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, ExternalLink, X, ArrowUp, ArrowDown, ChevronsUpDown, CheckCheck, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/attempts/")({
  component: AttemptsPage,
});

type Status = "all" | "submitted" | "in_progress";
type ReviewFilter = "all" | "reviewed" | "unreviewed";
type SortKey = "student" | "test" | "started_at" | "submitted_at" | "score" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function AttemptsPage() {
  const qc = useQueryClient();
  const [studentQuery, setStudentQuery] = useState("");
  const [testId, setTestId] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [scoreMin, setScoreMin] = useState<string>("");
  const [scoreMax, setScoreMax] = useState<string>("");
  const [country, setCountry] = useState<string>("all");
  const [bandMin, setBandMin] = useState<string>("");
  const [bandMax, setBandMax] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("started_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: tests } = useQuery({
    queryKey: ["admin-tests-list"],
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-attempts"],
    queryFn: async () => {
      const [{ data: attempts, error: attemptsError }, { data: profiles, error: profilesError }, { data: allTests, error: testsError }] = await Promise.all([
        supabase.from("test_attempts").select("*").order("started_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id, full_name, country, target_band"),
        supabase.from("tests").select("id, title, type"),
      ]);
      const readError = attemptsError ?? profilesError ?? testsError;
      if (readError) throw readError;
      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const tMap = new Map((allTests ?? []).map((t) => [t.id, t]));
      return (attempts ?? []).map((a) => ({
        ...a,
        student: pMap.get(a.user_id),
        test: tMap.get(a.test_id),
      }));
    },
  });

  const countries = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((a: any) => { if (a.student?.country) s.add(a.student.country); });
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 : null;
    const sMin = scoreMin ? Number(scoreMin) : null;
    const sMax = scoreMax ? Number(scoreMax) : null;
    const bMin = bandMin ? Number(bandMin) : null;
    const bMax = bandMax ? Number(bandMax) : null;
    return (data ?? []).filter((a: any) => {
      if (testId !== "all" && a.test_id !== testId) return false;
      if (status === "submitted" && !a.submitted) return false;
      if (status === "in_progress" && a.submitted) return false;
      if (reviewFilter === "reviewed" && !a.reviewed) return false;
      if (reviewFilter === "unreviewed" && a.reviewed) return false;
      if (q) {
        const name = (a.student?.full_name ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      const started = new Date(a.started_at).getTime();
      if (fromTs !== null && started < fromTs) return false;
      if (toTs !== null && started >= toTs) return false;
      if (country !== "all" && a.student?.country !== country) return false;
      const tb = a.student?.target_band;
      if (bMin !== null && (tb ?? -1) < bMin) return false;
      if (bMax !== null && (tb ?? 99) > bMax) return false;
      if (sMin !== null || sMax !== null) {
        if (!a.submitted || !a.total) return false;
        const pct = ((a.score ?? 0) / a.total) * 100;
        if (sMin !== null && pct < sMin) return false;
        if (sMax !== null && pct > sMax) return false;
      }
      return true;
    });
  }, [data, studentQuery, testId, status, reviewFilter, from, to, scoreMin, scoreMax, country, bandMin, bandMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (a: any): string | number => {
      switch (sortKey) {
        case "student":
          return (a.student?.full_name ?? "").toLowerCase();
        case "test":
          return (a.test?.title ?? "").toLowerCase();
        case "started_at":
          return new Date(a.started_at).getTime();
        case "submitted_at":
          return a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        case "score":
          return a.submitted && a.total ? (a.score ?? 0) / a.total : -1;
        case "status":
          return a.submitted ? 1 : 0;
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = sorted.slice(pageStart, pageStart + pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "started_at" || key === "submitted_at" || key === "score" ? "desc" : "asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setStudentQuery("");
    setTestId("all");
    setStatus("all");
    setReviewFilter("all");
    setFrom("");
    setTo("");
    setScoreMin("");
    setScoreMax("");
    setCountry("all");
    setBandMin("");
    setBandMax("");
    setPage(1);
  };


  const stats = useMemo(() => {
    const submitted = filtered.filter((a: any) => a.submitted);
    const avg = submitted.length
      ? submitted.reduce((s: number, a: any) => s + (a.total ? (a.score ?? 0) / a.total : 0), 0) / submitted.length
      : 0;
    const reviewedCount = filtered.filter((a: any) => a.reviewed).length;
    return { total: filtered.length, submitted: submitted.length, avg, reviewed: reviewedCount };
  }, [filtered]);

  const bulkReview = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("test_attempts")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData.user?.id ?? null,
        })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`Marked ${n} attempt${n === 1 ? "" : "s"} as reviewed`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-attempts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Bulk update failed"),
  });

  const nextUnreviewed = useMemo(
    () => (data ?? []).find((a: any) => a.submitted && !a.reviewed) ?? null,
    [data],
  );

  function exportCsv(rows: any[]) {
    if (!rows.length) return;
    const headers = [
      "Student", "Country", "Target band", "Test", "Test type",
      "Started", "Submitted at", "Status", "Reviewed",
      "Score", "Total", "Score %", "Admin notes",
    ];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    rows.forEach((a: any) => {
      const pct = a.submitted && a.total ? Math.round(((a.score ?? 0) / a.total) * 100) : "";
      lines.push([
        a.student?.full_name ?? "",
        a.student?.country ?? "",
        a.student?.target_band ?? "",
        a.test?.title ?? "",
        a.test?.type ?? "",
        a.started_at ?? "",
        a.submitted_at ?? "",
        a.submitted ? "submitted" : "in_progress",
        a.reviewed ? "yes" : "no",
        a.score ?? "",
        a.total ?? "",
        pct === "" ? "" : `${pct}%`,
        a.admin_notes ?? "",
      ].map(esc).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} attempts`);
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Exam attempts</h1>
          <p className="text-sm text-muted-foreground">Review every student attempt across all tests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={!nextUnreviewed}
            asChild={!!nextUnreviewed}
            className="gap-2"
          >
            {nextUnreviewed ? (
              <Link to="/admin/attempts/$attemptId" params={{ attemptId: nextUnreviewed.id }}>
                Next unreviewed <ArrowDown className="h-4 w-4 rotate-[-90deg]" />
              </Link>
            ) : (
              <span>All caught up</span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportCsv(sorted)}
            disabled={!sorted.length}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" /> Clear filters
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <StatCard label="Total attempts" value={stats.total.toString()} />
        <StatCard label="Submitted" value={stats.submitted.toString()} />
        <StatCard label="Reviewed" value={`${stats.reviewed} / ${stats.submitted}`} />
        <StatCard label="Avg score" value={stats.submitted ? `${Math.round(stats.avg * 100)}%` : "—"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Student</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentQuery}
                onChange={(e) => { setStudentQuery(e.target.value); setPage(1); }}
                placeholder="Search by name"
                className="pl-9"
              />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Test</span>
            <select
              value={testId}
              onChange={(e) => { setTestId(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All tests</option>
              {(tests ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</span>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as Status); setPage(1); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In progress</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Review</span>
            <select
              value={reviewFilter}
              onChange={(e) => { setReviewFilter(e.target.value as ReviewFilter); setPage(1); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Country</span>
            <select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 md:col-span-6">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">From</span>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">To</span>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </label>
          </div>
          <div className="md:col-span-6 grid gap-3 md:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Score % range</span>
              <div className="flex gap-2">
                <Input type="number" min="0" max="100" placeholder="Min" value={scoreMin} onChange={(e) => { setScoreMin(e.target.value); setPage(1); }} />
                <Input type="number" min="0" max="100" placeholder="Max" value={scoreMax} onChange={(e) => { setScoreMax(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Target band</span>
              <div className="flex gap-2">
                <Input type="number" step="0.5" min="1" max="9" placeholder="Min" value={bandMin} onChange={(e) => { setBandMin(e.target.value); setPage(1); }} />
                <Input type="number" step="0.5" min="1" max="9" placeholder="Max" value={bandMax} onChange={(e) => { setBandMax(e.target.value); setPage(1); }} />
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading attempts…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            Could not load attempts: {(error as any).message ?? "Database read failed"}
          </div>
        ) : !sorted.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No attempts match these filters.</div>
        ) : (
          <>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gold-gradient/10 px-4 py-3 text-sm">
                <span className="font-semibold">
                  {selected.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkReview.isPending}
                    onClick={() => bulkReview.mutate(Array.from(selected))}
                    className="gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {bulkReview.isPending ? "Marking…" : "Mark as reviewed"}
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="w-10 p-4">
                      <Checkbox
                        checked={paged.length > 0 && paged.every((a: any) => selected.has(a.id))}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) paged.forEach((a: any) => next.add(a.id));
                          else paged.forEach((a: any) => next.delete(a.id));
                          setSelected(next);
                        }}
                        aria-label="Select all on page"
                      />
                    </th>
                    <SortHeader label="Student" col="student" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Test" col="test" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Started" col="started_at" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Submitted" col="submitted_at" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Score" col="score" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <th className="p-4">Review</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((a: any) => (
                    <tr key={a.id} className={selected.has(a.id) ? "bg-muted/40" : ""}>
                      <td className="p-4">
                        <Checkbox
                          checked={selected.has(a.id)}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(a.id); else next.delete(a.id);
                            setSelected(next);
                          }}
                          aria-label={`Select attempt by ${a.student?.full_name ?? "student"}`}
                        />
                      </td>
                      <td className="p-4 font-semibold">{a.student?.full_name || "Unnamed student"}</td>
                      <td className="p-4">
                        <div>{a.test?.title ?? "—"}</div>
                        {a.test?.type && (
                          <div className="text-xs uppercase tracking-widest text-muted-foreground">{a.test.type}</div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(a.started_at).toLocaleString()}</td>
                      <td className="p-4 text-muted-foreground">
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-4">
                        {a.submitted && a.total
                          ? `${a.score ?? 0} / ${a.total} (${Math.round(((a.score ?? 0) / a.total) * 100)}%)`
                          : "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            a.submitted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {a.submitted ? "Submitted" : "In progress"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            a.reviewed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.reviewed ? "Reviewed" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link
                          to="/admin/attempts/$attemptId"
                          params={{ attemptId: a.id }}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          Review <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  Showing <span className="font-semibold text-foreground">{pageStart + 1}</span>–
                  <span className="font-semibold text-foreground">{Math.min(pageStart + pageSize, sorted.length)}</span> of{" "}
                  <span className="font-semibold text-foreground">{sorted.length}</span>
                </span>
                <span className="mx-2">·</span>
                <label className="flex items-center gap-2">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  First
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Prev
                </Button>
                <span className="px-2 text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="p-4">
      <button
        type="button"
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-widest transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </th>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
