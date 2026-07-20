import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileView } from "@/routes/_authenticated/profile";

export const Route = createFileRoute("/_authenticated/admin/students/$userId")({
  component: AdminStudentDeep,
  head: () => ({ meta: [{ title: "Student profile — Admin" }, { name: "robots", content: "noindex" }] }),
});

function AdminStudentDeep() {
  const { userId } = Route.useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-student", userId],
    queryFn: async () => {
      const [{ data: profile }, { data: attempts }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("test_attempts").select("*, tests(title, type)").eq("user_id", userId).order("started_at", { ascending: false }),
      ]);
      return { profile, attempts: attempts ?? [] };
    },
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading student…</div>;
  return (
    <ProfileView
      profile={data?.profile}
      attempts={data?.attempts ?? []}
      editable
      adminMode
      targetUserId={userId}
      onSaved={() => refetch()}
    />
  );
}
