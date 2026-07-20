import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Mic, Headphones, PenLine, Check, MessageCircle, ArrowRight } from "lucide-react";
import heroStudent from "@/assets/hero-student.png";
import { SiteHeader, SiteFooter } from "@/lib/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { property: "og:url", content: "https://www.eggheadielts.com/" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Dr. Egghead's IELTS Clinic",
          url: "https://www.eggheadielts.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.eggheadielts.com/exam-library?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "IELTS Preparation Coaching",
          provider: { "@type": "Organization", name: "Dr. Egghead's IELTS Clinic", url: "https://www.eggheadielts.com/" },
          areaServed: "Worldwide",
          description: "Personal speaking interaction, reading & listening aids, and in-depth Task 1 & Task 2 teaching for IELTS candidates targeting band 8+.",
        }),
      },
    ],
  }),
});

const services = [
  { icon: Mic, title: "Personal Speaking Interaction", desc: "One-on-one speaking practice with real-time feedback on pronunciation, fluency, and coherence." },
  { icon: Headphones, title: "Reading & Listening Aids", desc: "Curated audio tracks and passages engineered to sharpen your test-day comprehension." },
  { icon: PenLine, title: "In-Depth Task 1 & Task 2 Teaching", desc: "Break down every essay type — from graphs to opinion pieces — with proven high-band frameworks." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Accreditation />
      <Services />
      <Why />
      <Booking />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gold-radial pt-24 pb-16 text-cream md:pt-28 md:pb-24">
      <SiteHeader />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 25% 30%, oklch(0.9 0.15 90 / 0.4) 0, transparent 40%)" }} />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pt-16 md:grid-cols-2 md:gap-12 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-cream/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-light" /> Dr. Egghead's
          </div>
          <h1 className="mt-6 font-display text-6xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            <span className="text-gold-shine">IELTS</span>
            <br />
            <span className="text-cream">Clinic</span>
          </h1>
          <p className="mt-4 font-display text-xl italic text-gold-light md:text-2xl">Pass once, Pass well.</p>
          <p className="mt-6 max-w-lg text-base text-cream/80 md:text-lg">
            A premium preparation clinic for serious IELTS candidates. Personal coaching, elite materials, and proven frameworks — engineered for a first-attempt band 8+.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gold-gradient text-ink shadow-gold hover:opacity-95">
              <a href="#book">Enroll Now <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold/50 bg-transparent text-cream hover:bg-cream/10 hover:text-cream">
              <a href="https://wa.me/2348168053430" target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gold-gradient opacity-20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-b from-cream/10 to-transparent p-2 backdrop-blur">
            <img src={heroStudent} alt="IELTS student holding preparation book" width={1024} height={1280} className="w-full max-w-md mx-auto" />
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              {["Personal Speaking Interaction", "Reading & Listening Aids", "In-Depth Task 1 & Task 2"].map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-full bg-cream/95 px-4 py-2 text-sm font-semibold text-ink shadow-card">
                  <Check className="h-4 w-4 text-primary" /> {t}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Accreditation() {
  return (
    <div className="border-y border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-6 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
        <span>Aligned with</span>
        <span className="text-foreground">British Council</span>
        <span className="text-foreground">IELTS</span>
        <span className="text-foreground">IDP</span>
      </div>
    </div>
  );
}

function Services() {
  return (
    <section id="services" className="mx-auto max-w-7xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">What we teach</p>
        <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Three focused disciplines. One high band score.</h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-card transition hover:shadow-gold"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-gradient opacity-10 blur-2xl transition group-hover:opacity-30" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient text-ink shadow-gold">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Why() {
  const stats = [
    { k: "8+", v: "Average band achieved" },
    { k: "100%", v: "Personal attention" },
    { k: "1st", v: "Attempt success" },
  ];
  return (
    <section id="about" className="bg-ink py-24 text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light">The Egghead Method</p>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Not another <span className="text-gold-shine">tutoring service.</span></h2>
          <p className="mt-6 text-cream/70">
            IELTS is a test of precision. We drill you on the specific frameworks examiners reward — from cohesion devices in Writing Task 2 to signposting language in Speaking Part 3 — until they become instinct.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg" className="bg-gold-gradient text-ink hover:opacity-90">
              <Link to="/auth">Start practicing</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.v} className="rounded-2xl border border-gold/20 bg-cream/5 p-6 text-center">
              <div className="font-display text-4xl font-black text-gold-shine md:text-5xl">{s.k}</div>
              <div className="mt-2 text-xs uppercase tracking-widest text-cream/60">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Booking() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", preferred_date: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("bookings").insert({ ...form, preferred_date: form.preferred_date || null });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Booking received! We'll reach you on WhatsApp shortly.");
    setForm({ full_name: "", email: "", phone: "", preferred_date: "", message: "" });
  };

  return (
    <section id="book" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Book a Session</p>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Personal Speaking Interaction.</h2>
          <p className="mt-4 text-muted-foreground">Reserve a one-on-one slot with Dr. Egghead. We'll confirm on WhatsApp within 24 hours.</p>
          <div className="mt-8 space-y-3 text-sm">
            <a href="https://wa.me/2348168053430" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition hover:shadow-gold">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">Prefer WhatsApp?</div>
                <div className="text-muted-foreground">Message 08168053430 directly</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4" />
            </a>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone / WhatsApp</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="preferred_date">Preferred date</Label>
              <Input id="preferred_date" type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Any specific areas you'd like to focus on?" />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="bg-gold-gradient text-ink shadow-gold hover:opacity-95">
              {loading ? "Sending..." : "Request Booking"} <BookOpen className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
