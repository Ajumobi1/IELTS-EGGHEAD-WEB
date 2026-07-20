import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { ComingSoonPage } from "@/lib/placeholder-page";

export const Route = createFileRoute("/ielts-tips")({
  component: () => (
    <ComingSoonPage
      title="IELTS Tips & Strategy"
      kicker="Expert Guidance"
      description="High-band strategies for each IELTS section, weekly essays, and mistakes to avoid — all curated by Dr. Egghead."
      icon={Lightbulb}
    />
  ),
  head: () => ({
    meta: [
      { title: "IELTS Tips — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Expert IELTS tips, strategies, and study guides for Reading, Listening, Writing, and Speaking." },
      { property: "og:title", content: "IELTS Tips — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Expert IELTS tips and strategies for a band 8+ score." },
      { property: "og:url", content: "https://www.eggheadielts.com/ielts-tips" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/ielts-tips" }],
  }),
});
