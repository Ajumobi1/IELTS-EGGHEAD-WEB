import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowUp, ArrowDown, ChevronsUpDown, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/students/")({ component: StudentsPage });

type SortKey = "name" | "joined" | "attempts" | "avg" | "target_band" | "country";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function StudentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const [{ data: profiles }, { data: attempts }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("test_attempts").select("user_id, score, total, submitted, reviewed"),
      ]);
      const stats = new Map<string, { attempts: number; submitted: number; avg: number; hasUnreviewed: boolean; hasReviewed: boolean }>();
      (attempts ?? []).forEach((a) => {
        const cur = stats.get(a.user_id) ?? { attempts: 0, submitted: 0, avg: 0, hasUnreviewed: false, hasReviewed: false };
        cur.attempts += 1;
        if (a.submitted) {
          cur.submitted += 1;
          const pct = a.total ? (a.score ?? 0) / a.total : 0;
          cur.avg = (cur.avg * (cur.submitted - 1) + pct) / cur.submitted;
          if (a.reviewed) cur.hasReviewed = true;
          else cur.hasUnreviewed = true;
        }
        stats.set(a.user_id, cur);
      });
      return (profiles ?? []).map((p) => ({ ...p, ...(stats.get(p.id) ?? { attempts: 0, submitted: 0, avg: 0, hasUnreviewed: false, hasReviewed: false }) }));
    },
  });

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [userType, setUserType] = useState<string>("all");
  const [onboardedFilter, setOnboardedFilter] = useState<"all" | "yes" | "no">("all");
  const [reviewedFilter, setReviewedFilter] = useState<"all" | "any_reviewed" | "any_unreviewed" | "no_attempts">("all");
  const [bandMin, setBandMin] = useState("");
  const [bandMax, setBandMax] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const countries = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((p: any) => { if (p.country) s.add(p.country); });
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const bMin = bandMin ? Number(bandMin) : null;
    const bMax = bandMax ? Number(bandMax) : null;
    const sMin = scoreMin ? Number(scoreMin) : null;
    const sMax = scoreMax ? Number(scoreMax) : null;
    return (data ?? []).filter((p: any) => {
      if (term) {
        const hay = `${p.full_name ?? ""} ${p.phone ?? ""} ${p.native_language ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (country !== "all" && p.country !== country) return false;
      if (userType !== "all" && (p.user_type ?? "") !== userType) return false;
      if (onboardedFilter === "yes" && !p.onboarded) return false;
      if (onboardedFilter === "no" && p.onboarded) return false;
      if (reviewedFilter === "any_reviewed" && !p.hasReviewed) return false;
      if (reviewedFilter === "any_unreviewed" && !p.hasUnreviewed) return false;
      if (reviewedFilter === "no_attempts" && p.attempts > 0) return false;
      if (bMin !== null && (p.target_band ?? -1) < bMin) return false;
      if (bMax !== null && (p.target_band ?? 99) > bMax) return false;
      const avgPct = p.submitted ? p.avg * 100 : null;
      if (sMin !== null && (avgPct === null || avgPct < sMin)) return false;
      if (sMax !== null && (avgPct === null || avgPct > sMax)) return false;
      return true;
    });
  }, [data, q, country, userType, onboardedFilter, reviewedFilter, bandMin, bandMax, scoreMin, scoreMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (p: any): string | number => {
      switch (sortKey) {
        case "name": return (p.full_name ?? "").toLowerCase();
        case "joined": return new Date(p.created_at).getTime();
        case "attempts": return p.attempts;
        case "avg": return p.submitted ? p.avg : -1;
        case "target_band": return p.target_band ?? -1;
        case "country": return (p.country ?? "").toLowerCase();
      }
    };
    arr.sort((a, b) => {
      const av = getVal(a); const bv = getVal(b);
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
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "joined" || key === "attempts" || key === "avg" ? "desc" : "asc"); }
    setPage(1);
  };

  const clearFilters = () => {
    setQ(""); setCountry("all"); setUserType("all"); setOnboardedFilter("all"); setReviewedFilter("all");
    setBandMin(""); setBandMax(""); setScoreMin(""); setScoreMax("");
    setPage(1);
  };

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">Registered candidates and their progress.</p>
        </div>
        <Button variant="outline" onClick={clearFilters} className="gap-2">
          <X className="h-4 w-4" /> Clear filters
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, phone, native language" className="pl-9" />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Country</span>
            <select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">User type</span>
            <select value={userType} onChange={(e) => { setUserType(e.target.value); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All types</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="professional">Professional</option>
              <option value="institution">Institution</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Onboarded</span>
            <select value={onboardedFilter} onChange={(e) => { setOnboardedFilter(e.target.value as any); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All</option>
              <option value="yes">Completed</option>
              <option value="no">Incomplete</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Review status</span>
            <select value={reviewedFilter} onChange={(e) => { setReviewedFilter(e.target.value as any); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All students</option>
              <option value="any_unreviewed">Has unreviewed attempts</option>
              <option value="any_reviewed">Has reviewed attempts</option>
              <option value="no_attempts">No attempts yet</option>
            </select>
          </label>
          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Target band</span>
            <div className="flex gap-2">
              <Input type="number" step="0.5" min="1" max="9" placeholder="Min" value={bandMin} onChange={(e) => { setBandMin(e.target.value); setPage(1); }} />
              <Input type="number" step="0.5" min="1" max="9" placeholder="Max" value={bandMax} onChange={(e) => { setBandMax(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Avg score %</span>
            <div className="flex gap-2">
              <Input type="number" min="0" max="100" placeholder="Min" value={scoreMin} onChange={(e) => { setScoreMin(e.target.value); setPage(1); }} />
              <Input type="number" min="0" max="100" placeholder="Max" value={scoreMax} onChange={(e) => { setScoreMax(e.target.value); setPage(1); }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading students…</div>
        ) : !sorted.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No students match these filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <SortHeader label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Country" col="country" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Target" col="target_band" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Joined" col="joined" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Attempts" col="attempts" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Avg score" col="avg" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="p-4 font-semibold">
                        <Link to="/admin/students/$userId" params={{ userId: s.id }} className="text-primary hover:underline">
                          {s.full_name || "Unnamed student"}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">{s.country || "—"}</td>
                      <td className="p-4">{s.target_band ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="p-4">{s.attempts}</td>
                      <td className="p-4">{s.submitted ? `${Math.round(s.avg * 100)}%` : "—"}</td>
                      <td className="p-4">
                        <Link to="/admin/students/$userId" params={{ userId: s.id }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                          Open <ExternalLink className="h-3 w-3" />
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
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                    {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>First</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                <span className="px-2 text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SortHeader({ label, col, sortKey, sortDir, onClick }: { label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void }) {
  const active = sortKey === col;
  return (
    <th className="p-4">
      <button type="button" onClick={() => onClick(col)} className={`inline-flex items-center gap-1 uppercase tracking-widest transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}>
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </th>
  );
}
