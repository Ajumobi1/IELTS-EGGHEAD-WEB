import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Trophy, Target, Flame, CheckCircle2, Save, Calendar, ShieldCheck, Crown, Users, BookOpen, ClipboardList, Sparkles, LayoutDashboard, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { toBand } from "@/components/ScoreBreakdown";
import { useAvatarSrc } from "@/hooks/use-avatar-src";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My Profile — Dr. Egghead's IELTS Clinic" }, { name: "robots", content: "noindex" }] }),
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const [{ data: profile }, { data: attempts }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("test_attempts").select("*, tests(title, type)").eq("user_id", user.id).order("started_at", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      return { profile, attempts: attempts ?? [], isAdmin };
    },
  });

  const onSaved = () => qc.invalidateQueries({ queryKey: ["my-profile"] });

  if (data?.isAdmin) {
    return <AdminOwnProfile profile={data.profile} email={user.email} onSaved={onSaved} />;
  }

  return (
    <ProfileView
      profile={data?.profile}
      attempts={data?.attempts ?? []}
      editable
      email={user.email}
      onSaved={onSaved}
    />
  );
}

function AdminOwnProfile({ profile, email, onSaved }: { profile: any; email?: string | null; onSaved: () => void }) {
  const { data: stats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [students, tests, attempts, unreviewed, bookings] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("test_attempts").select("id", { count: "exact", head: true }).eq("submitted", true),
        supabase.from("test_attempts").select("id", { count: "exact", head: true }).eq("submitted", true).eq("reviewed", false),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        tests: tests.count ?? 0,
        attempts: attempts.count ?? 0,
        unreviewed: unreviewed.count ?? 0,
        bookings: bookings.count ?? 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink via-ink to-bronze/30">
      <header className="border-b border-gold/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Button asChild variant="ghost" size="sm" className="text-cream hover:bg-cream/10 hover:text-cream">
            <Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" />Admin Console</Link>
          </Button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
            <Crown className="h-3.5 w-3.5" /> Administrator
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-ink p-8 shadow-gold">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-gradient opacity-20 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-bronze/40 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-gold-light bg-gold-gradient text-4xl font-black text-ink">
                <AvatarImg value={profile?.avatar_url} fallback={<Crown className="h-12 w-12" />} />
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-gold-gradient text-ink">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold-light">
                <Sparkles className="h-3 w-3" /> Clinic Director
              </div>
              <h1 className="mt-1 font-display text-4xl font-black text-cream md:text-5xl">
                {profile?.full_name || "Dr. Egghead"}
              </h1>
              {email && <p className="mt-1 text-sm text-cream/60">{email}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-semibold text-gold-light">Full platform access</span>
                <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-cream/80">Content author</span>
                <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-cream/80">Grader</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform stats */}
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <AdminStat icon={<Users className="h-4 w-4" />} label="Students" value={stats?.students ?? "—"} />
          <AdminStat icon={<BookOpen className="h-4 w-4" />} label="Tests" value={stats?.tests ?? "—"} />
          <AdminStat icon={<ClipboardList className="h-4 w-4" />} label="Submissions" value={stats?.attempts ?? "—"} />
          <AdminStat icon={<Flame className="h-4 w-4" />} label="To review" value={stats?.unreviewed ?? "—"} highlight />
          <AdminStat icon={<Calendar className="h-4 w-4" />} label="Bookings" value={stats?.bookings ?? "—"} />
        </div>

        {/* Quick actions */}
        <section className="mt-6 rounded-2xl border border-gold/20 bg-ink/60 p-6 backdrop-blur">
          <h2 className="font-display text-lg font-bold text-cream">Quick actions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <AdminAction to="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" />
            <AdminAction to="/admin/tests" icon={<BookOpen className="h-4 w-4" />} label="Manage tests" />
            <AdminAction to="/admin/attempts" icon={<ClipboardList className="h-4 w-4" />} label="Grade attempts" />
            <AdminAction to="/admin/students" icon={<Users className="h-4 w-4" />} label="Students" />
          </div>
        </section>

        {profile?.bio && (
          <div className="mt-6 rounded-2xl border border-gold/20 bg-ink/60 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold-light">
              <Sparkles className="h-3 w-3" /> About the director
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-cream/80">{profile.bio}</p>
          </div>
        )}

        {/* Editor in an admin-tinted card */}
        <div className="mt-6 rounded-2xl border border-gold/20 bg-cream/95 p-1">
          <div className="rounded-xl bg-background">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-bronze" />
                <span className="font-display text-sm font-bold">Director settings</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Private</span>
            </div>
            <div className="p-2">
              <ProfileEditor profile={profile} onSaved={onSaved} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminStat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 backdrop-blur ${highlight ? "border-gold/50 bg-gold/10" : "border-cream/10 bg-ink/60"}`}>
      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${highlight ? "text-gold-light" : "text-cream/60"}`}>{icon}{label}</div>
      <div className={`mt-1 font-display text-2xl font-black ${highlight ? "text-gold-light" : "text-cream"}`}>{value}</div>
    </div>
  );
}

function AdminAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-cream/10 bg-cream/5 px-4 py-3 text-sm font-semibold text-cream transition hover:border-gold/50 hover:bg-gold/10 hover:text-gold-light">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-gradient text-ink">{icon}</span>
      {label}
    </Link>
  );
}

export function ProfileView({
  profile,
  attempts,
  editable,
  email,
  onSaved,
  targetUserId,
  adminMode,
}: {
  profile: any;
  attempts: any[];
  editable: boolean;
  email?: string | null;
  onSaved?: () => void;
  targetUserId?: string;
  adminMode?: boolean;
}) {
  const submitted = attempts.filter((a) => a.submitted);
  const totalCorrect = submitted.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalPossible = submitted.reduce((sum, a) => sum + (a.total ?? 0), 0);
  const avgPct = totalPossible ? Math.round((totalCorrect / totalPossible) * 100) : 0;
  const bestPct = submitted.length
    ? Math.max(...submitted.map((a) => (a.total ? (a.score ?? 0) / a.total : 0))) * 100
    : 0;
  const bestBand = submitted
    .filter((a) => a.tests?.type === "reading" || a.tests?.type === "listening")
    .reduce((best: number | null, a) => {
      const b = toBand(a.score ?? 0, a.total ?? 0);
      return b !== null && (best === null || b > best) ? b : best;
    }, null);
  const streak = submitted.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to={adminMode ? "/admin/students" : "/dashboard"}>
              <ArrowLeft className="mr-1 h-4 w-4" />Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl bg-gold-radial p-8 text-cream shadow-gold">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-gold-light bg-ink text-4xl font-black text-gold-light">
              <AvatarImg value={profile?.avatar_url} fallback={<User className="h-10 w-10" />} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">Candidate profile</p>
              <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                {profile?.full_name || "Unnamed candidate"}
              </h1>
              {email && <p className="mt-1 text-sm text-cream/70">{email}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {profile?.user_type && <Chip>👤 {profile.user_type}{profile.student_level ? ` · ${String(profile.student_level).replace(/_/g," ")}` : ""}</Chip>}
                {profile?.country && <Chip>🌍 {profile.country}</Chip>}
                {profile?.native_language && <Chip>🗣 {profile.native_language}</Chip>}
                {profile?.target_band && <Chip><Target className="mr-1 inline h-3 w-3" />Target band {profile.target_band}</Chip>}
                {profile?.exam_date && <Chip><Calendar className="mr-1 inline h-3 w-3" />Exam {new Date(profile.exam_date).toLocaleDateString()}</Chip>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatCard icon={<Flame className="h-4 w-4" />} label="Tests taken" value={streak} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Avg accuracy" value={`${avgPct}%`} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Best score" value={`${Math.round(bestPct)}%`} />
          <StatCard icon={<Target className="h-4 w-4" />} label="Best band" value={bestBand !== null ? bestBand.toString() : "—"} />
        </div>

        {profile?.bio && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About</div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{profile.bio}</p>
          </div>
        )}

        {editable && <ProfileEditor profile={profile} onSaved={onSaved} targetUserId={targetUserId} />}
        {adminMode && targetUserId && <AdminStudentControls userId={targetUserId} onChanged={onSaved} />}

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Recent activity</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            {attempts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No test attempts yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-3">Test</th>
                    <th className="p-3">Skill</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Band</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attempts.map((a) => {
                    const band = (a.tests?.type === "reading" || a.tests?.type === "listening") && a.submitted
                      ? toBand(a.score ?? 0, a.total ?? 0) : null;
                    return (
                      <tr key={a.id}>
                        <td className="p-3 font-semibold">{a.tests?.title || "—"}</td>
                        <td className="p-3 text-muted-foreground capitalize">{a.tests?.type}</td>
                        <td className="p-3 font-mono">{a.submitted ? `${a.score ?? 0}/${a.total ?? 0}` : "—"}</td>
                        <td className="p-3">{band !== null ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold">{band}</span> : "—"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(a.started_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.submitted ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                            {a.submitted ? "Submitted" : "In progress"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-cream/10 px-3 py-1 text-cream">{children}</span>;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-black">{value}</div>
    </div>
  );
}

const USER_TYPE_LABELS: Record<string, string> = {
  student: "Current Student",
  parent: "Parent or Guardian",
  professional: "Working Professional",
  institution: "Institution Staff",
};
const LEVEL_LABELS: Record<string, string> = {
  junior_middle: "Junior/Middle high school",
  high_school: "High school student",
  college_university: "College/University student",
  graduate: "Graduate student",
  other: "Other",
};

function ProfileEditor({ profile, onSaved, targetUserId }: { profile: any; onSaved?: () => void; targetUserId?: string }) {
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    country: "",
    phone: "",
    native_language: "",
    target_band: "",
    exam_date: "",
    avatar_url: "",
    user_type: "",
    student_level: "",
    currency: "",
    timezone: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        bio: profile.bio ?? "",
        country: profile.country ?? "",
        phone: profile.phone ?? "",
        native_language: profile.native_language ?? "",
        target_band: profile.target_band?.toString() ?? "",
        exam_date: profile.exam_date ?? "",
        avatar_url: profile.avatar_url ?? "",
        user_type: profile.user_type ?? "",
        student_level: profile.student_level ?? "",
        currency: profile.currency ?? "",
        timezone: profile.timezone ?? "",
      });
    }
  }, [profile]);

  const needsLevel = form.user_type === "student" || form.user_type === "parent";

  const save = useMutation({
    mutationFn: async () => {
      let id = targetUserId;
      if (!id) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not signed in");
        id = userData.user.id;
      }
      const payload: any = {
        id,
        full_name: form.full_name || null,
        bio: form.bio || null,
        country: form.country || null,
        phone: form.phone || null,
        native_language: form.native_language || null,
        target_band: form.target_band ? Number(form.target_band) : null,
        exam_date: form.exam_date || null,
        avatar_url: form.avatar_url || null,
        user_type: form.user_type || null,
        student_level: needsLevel ? (form.student_level || null) : null,
        currency: form.currency || null,
        timezone: form.timezone || null,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); onSaved?.(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Edit profile</h2>
      <p className="text-xs text-muted-foreground">Keep your details up to date so we can personalise your coaching.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="User type">
          <select value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            {Object.entries(USER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        {needsLevel && (
          <Field label={form.user_type === "parent" ? "Child's level" : "Student level"}>
            <select value={form.student_level} onChange={(e) => setForm({ ...form, student_level: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        )}
        <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Nigeria" /></Field>
        <Field label="Native language"><Input value={form.native_language} onChange={(e) => setForm({ ...form, native_language: e.target.value })} placeholder="e.g. Yoruba" /></Field>
        <Field label="Phone / WhatsApp"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" /></Field>
        <Field label="Display currency"><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="NGN, USD, GBP…" /></Field>
        <Field label="Timezone"><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Africa/Lagos" /></Field>
        <Field label="Target band"><Input type="number" min="1" max="9" step="0.5" value={form.target_band} onChange={(e) => setForm({ ...form, target_band: e.target.value })} placeholder="7.5" /></Field>
        <Field label="Exam date"><Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></Field>
        <AvatarUploadField
          value={form.avatar_url}
          onChange={(v) => setForm({ ...form, avatar_url: v })}
          targetUserId={targetUserId}
        />
        <Field label="About you" className="md:col-span-2">
          <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Your goals, why you're taking IELTS, previous scores…" />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gold-gradient text-ink hover:opacity-90">
          <Save className="mr-1 h-4 w-4" />{save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function AvatarImg({ value, fallback }: { value?: string | null; fallback: React.ReactNode }) {
  const src = useAvatarSrc(value);
  if (src) return <img src={src} alt="" className="h-full w-full object-cover" />;
  return <>{fallback}</>;
}


function AvatarUploadField({
  value,
  onChange,
  targetUserId,
}: {
  value: string;
  onChange: (v: string) => void;
  targetUserId?: string;
}) {
  const src = useAvatarSrc(value);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      let uid = targetUserId;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id;
      }
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      onChange(path);
      toast.success("Avatar uploaded — click Save changes to keep it.");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label="Avatar" className="md:col-span-2">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-gold-gradient text-lg font-black text-ink">
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <User className="h-6 w-6" />}
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={uploading}
            className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:opacity-90"
          />
          {value ? (
            <button
              type="button"
              className="self-start text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => onChange("")}
            >
              Remove avatar
            </button>
          ) : null}
          {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
        </div>
      </div>
    </Field>
  );
}

function AdminStudentControls({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const qc = useQueryClient();
  const { data: roles } = useQuery({
    queryKey: ["admin-user-roles", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r: any) => r.role as string);
    },
  });

  const isAdmin = roles?.includes("admin");
  const isStudent = roles?.includes("student");

  const setRole = useMutation({
    mutationFn: async ({ role, enable }: { role: "admin" | "student"; enable: boolean }) => {
      if (enable) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries({ queryKey: ["admin-user-roles", userId] });
      onChanged?.();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update role"),
  });

  const deleteAttempts = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("test_attempts").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("All attempts deleted"); onChanged?.(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile deleted"); onChanged?.(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <section className="mt-6 rounded-2xl border border-destructive/30 bg-card p-6">
      <h2 className="font-display text-xl font-bold">Admin controls</h2>
      <p className="text-xs text-muted-foreground">Manage this student's roles and data.</p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">Roles:</span>
          <Button
            size="sm"
            variant={isStudent ? "default" : "outline"}
            onClick={() => setRole.mutate({ role: "student", enable: !isStudent })}
            disabled={setRole.isPending}
          >
            {isStudent ? "✓ Student" : "Make student"}
          </Button>
        </div>


        <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { if (confirm("Delete ALL test attempts for this user?")) deleteAttempts.mutate(); }}
            disabled={deleteAttempts.isPending}
          >
            Delete all attempts
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { if (confirm("Delete this profile row? (Auth user will remain.)")) deleteProfile.mutate(); }}
            disabled={deleteProfile.isPending}
          >
            Delete profile
          </Button>
        </div>
      </div>
    </section>
  );
}
