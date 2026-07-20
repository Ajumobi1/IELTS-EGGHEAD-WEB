import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { to: "/exam-library", label: "Exam Library" },
  { to: "/ielts-tips", label: "IELTS Tips" },
  { to: "/live-lessons", label: "Live Lessons" },
  { to: "/courses", label: "Courses" },
  { to: "/study-abroad", label: "Study Abroad" },
] as const;

export function SiteHeader({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const positioning = variant === "overlay" ? "absolute inset-x-0 top-0 z-30" : "sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur";
  const textColor = variant === "overlay" ? "text-cream/90" : "text-foreground/80";
  const hoverColor = variant === "overlay" ? "hover:text-gold-light" : "hover:text-primary";
  const brandTop = variant === "overlay" ? "text-cream" : "text-foreground";

  return (
    <header className={positioning}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" aria-label="Dr. Egghead's IELTS Clinic — Home" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient font-display text-xl font-black text-ink shadow-gold">D</div>
          <div className={`hidden sm:block ${brandTop}`}>
            <div className="font-display text-sm font-bold leading-tight tracking-wide">Dr. Egghead's</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">IELTS Clinic</div>
          </div>
        </Link>
        <nav className={`hidden gap-7 text-sm font-medium ${textColor} lg:flex`}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={hoverColor} activeProps={{ className: "text-gold-light" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild size="sm" variant="ghost" className={variant === "overlay" ? "text-cream hover:bg-cream/10 hover:text-cream" : ""}>
                <Link to="/profile">Profile</Link>
              </Button>
              <Button asChild size="sm" className="bg-gold-gradient text-ink hover:opacity-90">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className={variant === "overlay" ? "text-cream hover:bg-cream/10 hover:text-cream" : ""}>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gold-gradient text-ink hover:opacity-90">
                <Link to="/auth">Sign up</Link>
              </Button>
            </>
          )}
          <button onClick={() => setOpen((v) => !v)} className={`lg:hidden ${textColor}`} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-cream/10 bg-ink/95 px-6 py-4 backdrop-blur lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-cream/90">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-1 hover:text-gold-light">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream/80">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient font-display text-xl font-black text-ink">D</div>
              <div>
                <div className="font-display text-base font-bold text-cream">Dr. Egghead's IELTS Clinic</div>
                <div className="text-xs italic text-gold-light">Pass once, Pass well</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-cream/60">Premium IELTS preparation for students who want to pass on their first try.</p>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-gold-light">Explore</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.to}><Link to={n.to} className="hover:text-gold-light">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-gold-light">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="https://twitter.com/TobiJoshua2" target="_blank" rel="noreferrer" className="hover:text-gold-light">X · @TobiJoshua2</a></li>
              <li><a href="https://instagram.com/_eggheady_" target="_blank" rel="noreferrer" className="hover:text-gold-light">IG · @_eggheady_</a></li>
              <li><a href="https://wa.me/2348168053430" target="_blank" rel="noreferrer" className="hover:text-gold-light">WhatsApp · 08168053430</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-gold-light">Accredited By</h4>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-widest text-cream/60">
              <span>British Council</span>
              <span>IELTS</span>
              <span>IDP</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-cream/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Dr. Egghead's IELTS Clinic. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
