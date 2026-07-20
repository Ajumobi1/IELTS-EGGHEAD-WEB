import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GraduationCap, Users2, Briefcase, School, Check, ArrowRight, ArrowLeft,
  BookOpen, Globe2, Headphones, PenLine, Mic, BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingWizard,
  validateSearch: (s: Record<string, unknown>) => ({
    returnTo: typeof s.returnTo === "string" ? s.returnTo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Complete your profile — Dr. Egghead's IELTS Clinic" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});


type UserType = "student" | "parent" | "professional" | "institution";
type StudentLevel = "junior_middle" | "high_school" | "college_university" | "graduate" | "other";
type ExamType = "academic" | "general_training";
type Timeframe = "within_1_month" | "1_3_months" | "3_6_months" | "6_plus" | "not_sure";
type Purpose = "study_abroad" | "immigration" | "work" | "other";
type Skill = "listening" | "reading" | "writing" | "speaking";

const USER_TYPES: { value: UserType; label: string; icon: typeof GraduationCap }[] = [
  { value: "student", label: "Current Student", icon: GraduationCap },
  { value: "parent", label: "Parent or Guardian of current student", icon: Users2 },
  { value: "professional", label: "Working Professional", icon: Briefcase },
  { value: "institution", label: "Institution Staff", icon: School },
];

const LEVELS: { value: StudentLevel; label: string }[] = [
  { value: "junior_middle", label: "Junior/Middle high school" },
  { value: "high_school", label: "High school student" },
  { value: "college_university", label: "College/University student" },
  { value: "graduate", label: "Graduate student" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  "Nigeria","Ghana","Kenya","South Africa","Uganda","Tanzania","Rwanda","Ethiopia","Cameroon","Zimbabwe",
  "United Kingdom","United States","Canada","Australia","New Zealand","Ireland",
  "India","Pakistan","Bangladesh","Sri Lanka","Nepal","Philippines","Vietnam","Indonesia","Malaysia","Singapore",
  "United Arab Emirates","Saudi Arabia","Qatar","Egypt","Morocco","Turkey","Germany","France","Netherlands","Other",
];

const CURRENCIES = [
  { code: "NGN", label: "NGN ₦" },
  { code: "USD", label: "USD $" },
  { code: "GBP", label: "GBP £" },
  { code: "EUR", label: "EUR €" },
  { code: "CAD", label: "CAD $" },
  { code: "AUD", label: "AUD $" },
  { code: "GHS", label: "GHS ₵" },
  { code: "KES", label: "KES KSh" },
  { code: "ZAR", label: "ZAR R" },
  { code: "INR", label: "INR ₹" },
  { code: "AED", label: "AED د.إ" },
];

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "within_1_month", label: "Within 1 month" },
  { value: "1_3_months", label: "In 1–3 months" },
  { value: "3_6_months", label: "In 3–6 months" },
  { value: "6_plus", label: "More than 6 months from now" },
  { value: "not_sure", label: "I'm not sure yet" },
];

const PURPOSES: { value: Purpose; label: string; icon: typeof Globe2 }[] = [
  { value: "study_abroad", label: "Study abroad", icon: BookMarked },
  { value: "immigration", label: "Immigration / PR", icon: Globe2 },
  { value: "work", label: "Work / Professional licensing", icon: Briefcase },
  { value: "other", label: "Other / Personal goal", icon: BookOpen },
];

const SKILLS: { value: Skill; label: string; icon: typeof Headphones }[] = [
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "reading", label: "Reading", icon: BookOpen },
  { value: "writing", label: "Writing", icon: PenLine },
  { value: "speaking", label: "Speaking", icon: Mic },
];

const REFERRAL_SOURCES = [
  "Google Search","Instagram","X (Twitter)","TikTok","YouTube","Facebook","WhatsApp","Friend / Word of mouth","Teacher / School","Other",
];

const TOTAL_STEPS = 4;

function guessTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

/** Only allow same-origin absolute paths as return destinations. */
function safeReturn(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (!v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}


function OnboardingWizard() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const nav = useNavigate();

  const [step, setStep] = useState(1);

  const [userType, setUserType] = useState<UserType | null>(null);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [currency, setCurrency] = useState("NGN");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [terms, setTerms] = useState<"yes" | "no" | null>(null);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [referral, setReferral] = useState("");
  const [targetBand, setTargetBand] = useState("7");
  const [examDate, setExamDate] = useState("");
  const [focusSkills, setFocusSkills] = useState<Skill[]>([]);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (cancelled || !data) return;
      if (data.onboarded) {
        const dest = safeReturn(search.returnTo) ?? "/dashboard";
        nav({ to: dest, replace: true });
        return;
      }
      const parts = (data.full_name ?? "").split(" ");
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
      if (data.user_type) setUserType(data.user_type as UserType);
      if (data.student_level) setStudentLevel(data.student_level as StudentLevel);
      if (data.country) setCountry(data.country);
      if (data.currency) setCurrency(data.currency);
      if (data.timezone) setTimezone(data.timezone);
      if (data.target_band) setTargetBand(String(data.target_band));
      if (data.exam_date) setExamDate(String(data.exam_date));
      const anyData = data as Record<string, unknown>;
      if (typeof anyData.exam_type === "string") setExamType(anyData.exam_type as ExamType);
      if (typeof anyData.test_timeframe === "string") setTimeframe(anyData.test_timeframe as Timeframe);
      if (typeof anyData.prep_purpose === "string") setPurpose(anyData.prep_purpose as Purpose);
      if (typeof anyData.referral_source === "string") setReferral(anyData.referral_source as string);
      if (Array.isArray(anyData.focus_skills)) setFocusSkills(anyData.focus_skills as Skill[]);
      if (typeof anyData.marketing_opt_in === "boolean") setMarketingOptIn(anyData.marketing_opt_in);
      // Save-and-resume: jump to the last incomplete step
      const savedStep = Number(anyData.onboarding_step ?? 1);
      if (savedStep >= 1 && savedStep <= TOTAL_STEPS) setStep(savedStep);
    })();
    return () => { cancelled = true; };
  }, [user.id, nav, search.returnTo]);


  const needsLevel = userType === "student" || userType === "parent";
  const canAdvance1 = !!userType && (!needsLevel || !!studentLevel);
  const canAdvance2 = !!(firstName.trim() && lastName.trim() && country && currency && timezone && terms === "yes");
  const canAdvance3 = !!(examType && timeframe && purpose);
  const canFinish = canAdvance1 && canAdvance2 && canAdvance3;

  const email = user.email ?? "";

  const saveStep = async (patch: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const toggleSkill = (s: Skill) => {
    setFocusSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const next = async () => {
    if (step === 1) {
      if (!canAdvance1) return;
      const ok = await saveStep({
        user_type: userType,
        student_level: needsLevel ? studentLevel : null,
        onboarding_step: 2,
      });
      if (ok) setStep(2);
    } else if (step === 2) {
      if (!canAdvance2) return;
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const ok = await saveStep({
        full_name,
        country,
        currency,
        timezone,
        terms_accepted_at: new Date().toISOString(),
        onboarding_step: 3,
      });
      if (ok) setStep(3);
    } else if (step === 3) {
      if (!canAdvance3) return;
      const ok = await saveStep({
        exam_type: examType,
        test_timeframe: timeframe,
        prep_purpose: purpose,
        referral_source: referral || null,
        onboarding_step: 4,
      });
      if (ok) setStep(4);
    }
  };

  const submit = async () => {
    if (!canFinish) return;
    const ok = await saveStep({
      target_band: targetBand ? Number(targetBand) : null,
      exam_date: examDate || null,
      focus_skills: focusSkills,
      marketing_opt_in: marketingOptIn,
      onboarded: true,
      onboarding_step: TOTAL_STEPS,
    });
    if (!ok) return;
    toast.success("Welcome! Your profile is ready.");
    const requested = safeReturn(search.returnTo);
    // Default: institution staff → dashboard; everyone else → exam library
    const dest = requested ?? (userType === "institution" ? "/dashboard" : "/exam-library");
    nav({ to: dest, replace: true });
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Dr. Egghead's IELTS Clinic</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Create your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Stepper step={step} />

        {step === 1 && (
          <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <h2 className="text-center font-display text-xl font-bold">Which best describes you?</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {USER_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setUserType(value); if (!(value === "student" || value === "parent")) setStudentLevel(null); }}
                  className={cn(
                    "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition",
                    userType === value ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-background hover:border-primary/50",
                  )}
                >
                  {userType === value && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <Icon className={cn("h-10 w-10", userType === value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-semibold", userType === value && "text-primary")}>{label}</span>
                </button>
              ))}
            </div>

            {needsLevel && (
              <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
                <p className="mb-3 font-semibold">
                  {userType === "student" ? "What kind of student you are?" : "Tell us about your child"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LEVELS.map(({ value, label }) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-primary/50">
                      <input
                        type="radio"
                        name="level"
                        value={value}
                        checked={studentLevel === value}
                        onChange={() => setStudentLevel(value)}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <h2 className="font-display text-xl font-bold">Personal information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <Label>First Name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Please fill in your first name" maxLength={80} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Please fill in your last name" maxLength={80} />
              </div>
              <div>
                <Label>{userType === "parent" ? "Email / Parent Email" : "Email"} *</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Country/Region of Residence *</Label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Display Currency *</Label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Timezone *</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. Africa/Lagos" />
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p>
                I confirm that I accept the site's <a className="text-primary underline" href="/terms" target="_blank" rel="noreferrer">Terms</a>{" "}
                and <a className="text-primary underline" href="/privacy" target="_blank" rel="noreferrer">Privacy</a> agreements and allow my data to be held for as long as I am registered with this Website *
              </p>
              <div className="mt-3 flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 font-semibold">
                  <input type="radio" name="terms" checked={terms === "yes"} onChange={() => setTerms("yes")} className="accent-primary" />
                  Yes
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-semibold">
                  <input type="radio" name="terms" checked={terms === "no"} onChange={() => setTerms("no")} className="accent-primary" />
                  No
                </label>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <h2 className="font-display text-xl font-bold">About your IELTS journey</h2>

            <div>
              <p className="mb-3 font-semibold">Which IELTS module will you take? *</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["academic","general_training"] as ExamType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setExamType(v)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                      examType === v ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-background hover:border-primary/50",
                    )}
                  >
                    <BookMarked className={cn("h-6 w-6", examType === v ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-semibold">{v === "academic" ? "IELTS Academic" : "IELTS General Training"}</p>
                      <p className="text-xs text-muted-foreground">
                        {v === "academic" ? "University admissions & professional registration" : "Migration & work experience programmes"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 font-semibold">When do you plan to take the test? *</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TIMEFRAMES.map(({ value, label }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-primary/50">
                    <input type="radio" name="tf" checked={timeframe === value} onChange={() => setTimeframe(value)} className="accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 font-semibold">Why are you preparing for IELTS? *</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PURPOSES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPurpose(value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition",
                      purpose === value ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-background hover:border-primary/50",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", purpose === value ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>How did you hear about us?</Label>
              <select value={referral} onChange={(e) => setReferral(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select an option (optional)</option>
                {REFERRAL_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <div>
              <h2 className="font-display text-xl font-bold">Your goals & focus</h2>
              <p className="mt-1 text-sm text-muted-foreground">We'll personalise practice tests and lessons around this.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Target Band Score</Label>
                <select value={targetBand} onChange={(e) => setTargetBand(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {["9","8.5","8","7.5","7","6.5","6","5.5","5"].map((b) => <option key={b} value={b}>Band {b}</option>)}
                </select>
              </div>
              <div>
                <Label>Planned Exam Date</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
            </div>

            <div>
              <p className="mb-3 font-semibold">Which skills do you want to focus on?</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SKILLS.map(({ value, label, icon: Icon }) => {
                  const on = focusSkills.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSkill(value)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
                        on ? "border-primary bg-primary/5 shadow-gold" : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {on && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <Icon className={cn("h-7 w-7", on ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold", on && "text-primary")}>{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Pick as many as you like. You can change this later.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-1 accent-primary"
              />
              <span>
                Send me practice tips, study plans, and exclusive class invitations by email. You can unsubscribe anytime.
              </span>
            </label>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-semibold text-primary">Ready to finish?</p>
              <p className="mt-1 text-muted-foreground">
                {firstName} {lastName} · {country} · {examType === "academic" ? "IELTS Academic" : examType === "general_training" ? "IELTS General Training" : "—"}
                {" · "}Target Band {targetBand}
              </p>
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            We will personalise your feed and recommendations based on this info.
          </p>
          <div className="flex justify-end gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button
                onClick={next}
                disabled={
                  saving ||
                  (step === 1 && !canAdvance1) ||
                  (step === 2 && !canAdvance2) ||
                  (step === 3 && !canAdvance3)
                }
                className="gap-1"
              >
                {saving ? "Saving…" : "Next"} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || !canFinish} className="gap-1">
                {saving ? "Saving…" : "Finish"} <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = useMemo(() => Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1), []);
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-black",
            step === s ? "bg-primary text-primary-foreground shadow-gold" :
            step > s ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>
            {step > s ? <Check className="h-5 w-5" /> : s}
          </div>
          {i < steps.length - 1 && <span className="text-xs text-muted-foreground">•••</span>}
        </div>
      ))}
    </div>
  );
}
