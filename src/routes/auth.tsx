import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Sign in or create your Dr. Egghead's IELTS Clinic account to access practice tests, live lessons, and personal speaking coaching." },
      { property: "og:title", content: "Sign in to Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Access IELTS practice tests, band scoring, and personal coaching. Sign in or create your account." },
      { property: "og:url", content: "https://www.eggheadielts.com/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/auth" }],
  }),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/dashboard" }); });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created. You're signed in!");
      nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      nav({ to: "/dashboard" });
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    else if (!r.redirected) nav({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gold-radial px-6 py-12 text-cream">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient font-display text-2xl font-black text-ink">D</div>
          <div className="text-center">
            <div className="font-display font-bold">Dr. Egghead's</div>
            <div className="text-xs uppercase tracking-widest text-gold-light">IELTS Clinic</div>
          </div>
        </Link>
        <div className="rounded-2xl border border-gold/30 bg-cream/5 p-8 backdrop-blur">
          <h1 className="font-display text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-cream/70">{mode === "signin" ? "Sign in to continue your prep." : "Start your journey to Band 8+."}</p>

          <Button onClick={google} variant="outline" className="mt-6 w-full border-cream/20 bg-cream text-ink hover:bg-cream/90">
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-cream/50">
            <div className="h-px flex-1 bg-cream/20" /> OR <div className="h-px flex-1 bg-cream/20" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName" className="text-cream/80">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-cream/10 border-cream/20 text-cream placeholder:text-cream/40" />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-cream/80">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-cream/10 border-cream/20 text-cream" />
            </div>
            <div>
              <Label htmlFor="password" className="text-cream/80">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-cream/10 border-cream/20 text-cream" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gold-gradient text-ink hover:opacity-95">
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-cream/70 hover:text-gold-light">
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
        <div className="mt-6 text-center text-xs text-cream/60">
          <Link to="/" className="hover:text-gold-light">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
