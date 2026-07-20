import { createFileRoute } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import { ComingSoonPage } from "@/lib/placeholder-page";

export const Route = createFileRoute("/study-abroad")({
  component: () => (
    <ComingSoonPage
      title="Study Abroad"
      kicker="Your Next Chapter"
      description="Country-by-country guides to using your IELTS band for admissions and visas — UK, Canada, Australia, USA, and more."
      icon={Globe}
    />
  ),
  head: () => ({
    meta: [
      { title: "Study Abroad — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Study abroad guides for IELTS candidates — UK, Canada, Australia, USA, and more." },
      { property: "og:title", content: "Study Abroad — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Country guides to using your IELTS band for admissions and visas." },
      { property: "og:url", content: "https://www.eggheadielts.com/study-abroad" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/study-abroad" }],
  }),
});
