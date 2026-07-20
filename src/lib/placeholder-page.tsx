import { Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/lib/site-nav";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

export function ComingSoonPage({ title, kicker, description, icon: Icon }: {
  title: string;
  kicker: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gold-radial pb-24 pt-4 text-cream">
        <SiteHeader />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient text-ink shadow-gold">
            <Icon className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-gold-light">{kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight md:text-6xl">
            <span className="text-gold-shine">{title}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-cream/80 md:text-lg">{description}</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-cream/5 px-5 py-2 text-sm font-semibold text-gold-light backdrop-blur">
            <Sparkles className="h-4 w-4" /> Coming soon
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gold-gradient text-ink shadow-gold hover:opacity-95">
              <Link to="/exam-library">Browse Exam Library <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/50 bg-transparent text-cream hover:bg-cream/10 hover:text-cream">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
