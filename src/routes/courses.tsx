import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ComingSoonPage } from "@/lib/placeholder-page";

export const Route = createFileRoute("/courses")({
  component: () => (
    <ComingSoonPage
      title="IELTS Courses"
      kicker="Specialised Programmes"
      description="Structured masterclasses that break your target score into weekly milestones — from foundation to band 8+."
      icon={GraduationCap}
    />
  ),
  head: () => ({
    meta: [
      { title: "IELTS Courses — Dr. Egghead's IELTS Clinic" },
      { name: "description", content: "Structured IELTS masterclass courses to breakthrough your band score." },
      { property: "og:title", content: "IELTS Courses — Dr. Egghead's IELTS Clinic" },
      { property: "og:description", content: "Structured IELTS masterclasses from foundation to band 8+." },
      { property: "og:url", content: "https://www.eggheadielts.com/courses" },
    ],
    links: [{ rel: "canonical", href: "https://www.eggheadielts.com/courses" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: [
            {
              "@type": "Course",
              name: "IELTS Foundation Masterclass",
              description: "Weekly-milestone foundation course covering all four IELTS skills for candidates targeting band 6.5+.",
              provider: { "@type": "Organization", name: "Dr. Egghead's IELTS Clinic", url: "https://www.eggheadielts.com/" },
              offers: { "@type": "Offer", category: "IELTS Preparation", availability: "https://schema.org/PreOrder" },
            },
            {
              "@type": "Course",
              name: "IELTS Band 8+ Intensive",
              description: "In-depth Task 1 & Task 2 writing frameworks and speaking coaching for advanced IELTS candidates.",
              provider: { "@type": "Organization", name: "Dr. Egghead's IELTS Clinic", url: "https://www.eggheadielts.com/" },
              offers: { "@type": "Offer", category: "IELTS Preparation", availability: "https://schema.org/PreOrder" },
            },
          ],
        }),
      },
    ],
  }),
});
