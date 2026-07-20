import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { ComingSoonPage } from "@/lib/placeholder-page";

export const Route = createFileRoute("/live-lessons")({
  component: () => (
    <ComingSoonPage
      title="Live Lessons"
      kicker="One-on-One with Dr. Egghead"
      description="Book live speaking sessions, writing reviews, and full-band coaching with our expert instructor."
      icon={Video}
    />
  ),
  head: () => ({
    meta: [
      { title: "Live Lessons — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Live one-on-one IELTS lessons with expert instructors. Speaking practice, writing reviews, and personalized coaching." },
      { property: "og:title", content: "Live Lessons — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Live 1:1 IELTS coaching with expert instructors." },
      { property: "og:url", content: "https://www.eggheadielts.com/live-lessons" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/live-lessons" }],
  }),
});
