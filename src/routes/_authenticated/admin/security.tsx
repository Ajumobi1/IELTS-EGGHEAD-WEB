import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { runSecurityHealthcheck, type HealthcheckItem } from "@/lib/security-healthcheck.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: SecurityPage,
  head: () => ({ meta: [{ title: "Security health-check — Admin" }] }),
});

function SecurityPage() {
  const run = useServerFn(runSecurityHealthcheck);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-security-healthcheck"],
    queryFn: () => run(),
  });

  const items: HealthcheckItem[] = data?.items ?? [];
  const pass = items.filter((i: HealthcheckItem) => i.status === "pass").length;
  const fail = items.filter((i: HealthcheckItem) => i.status === "fail").length;
  const warn = items.filter((i: HealthcheckItem) => i.status === "warn").length;
  const grouped = items.reduce<Record<string, HealthcheckItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Security health-check</h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {isFetching ? "Running…" : "Re-run"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-3xl bg-gold-radial p-8 text-cream shadow-gold">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">RLS · Grants · Answer secrecy · Score integrity · RPC · Storage</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Backend protections summary</h2>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Tile label="Passing" value={pass} tone="pass" />
            <Tile label="Warnings" value={warn} tone="warn" />
            <Tile label="Failing" value={fail} tone="fail" />
          </div>
          {data && (
            <p className="mt-4 text-xs text-cream/60">Last run {new Date(data.generatedAt).toLocaleString()}</p>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message ?? "Failed to run health-check."}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {(Object.entries(grouped) as [string, HealthcheckItem[]][]).map(([category, rows]) => (
            <section key={category}>
              <h3 className="font-display text-lg font-bold">{category}</h3>
              <div className="mt-3 space-y-2">
                {rows.map((r: HealthcheckItem, i: number) => (
                  <div
                    key={category + i}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border bg-card p-4",
                      r.status === "pass" && "border-emerald-500/40",
                      r.status === "warn" && "border-amber-500/40",
                      r.status === "fail" && "border-destructive/40",
                    )}
                  >
                    <StatusIcon status={r.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{r.name}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!items.length && !isFetching && !error && (
            <p className="text-center text-sm text-muted-foreground">No checks reported.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "pass" | "warn" | "fail" }) {
  const classes = {
    pass: "text-emerald-300",
    warn: "text-amber-300",
    fail: "text-red-300",
  }[tone];
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-cream/60">{label}</div>
      <div className={cn("mt-1 font-display text-4xl font-black", classes)}>{value}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: HealthcheckItem["status"] }) {
  if (status === "pass") return <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />;
  return <XCircle className="mt-0.5 h-5 w-5 text-destructive" />;
}

function StatusBadge({ status }: { status: HealthcheckItem["status"] }) {
  const map = {
    pass: { label: "Pass", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    warn: { label: "Warn", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    fail: { label: "Fail", cls: "bg-destructive/10 text-destructive" },
  }[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", map.cls)}>{map.label}</span>;
}
