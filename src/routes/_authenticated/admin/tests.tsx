import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tests")({ component: TestsRoute });

const iconFor = (t: string) => t === "listening" ? Headphones : t === "writing" ? PenLine : t === "speaking" ? Mic : BookOpen;

function TestsRoute() {
  const isListPage = useRouterState({ select: (state) => state.location.pathname === "/admin/tests" });
  return isListPage ? <TestsAdmin /> : <Outlet />;
}

function TestsAdmin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; type: "reading" | "listening" | "writing" | "speaking"; difficulty: "academic" | "general"; duration_minutes: number }>({ title: "", type: "reading", difficulty: "academic", duration_minutes: 60 });

  const { data: tests, isLoading } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: created, error } = await supabase.from("tests").insert({
      title: form.title,
      type: form.type,
      difficulty: form.difficulty,
      duration_minutes: Number(form.duration_minutes),
      created_by: u.user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Draft created — add sections & questions");
    setOpen(false);
    setForm({ title: "", type: "reading", difficulty: "academic", duration_minutes: 60 });
    qc.invalidateQueries({ queryKey: ["admin-tests"] });
    nav({ to: "/admin/tests/$testId", params: { testId: created.id } });
  };

  const togglePublish = async (id: string, cur: boolean) => {
    const { error } = await supabase.from("tests").update({ is_published: !cur }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-tests"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this test and everything inside?")) return;
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-tests"] });
  };

  const durations: Record<string, number> = { reading: 60, listening: 40, writing: 60, speaking: 15 };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Tests</h1>
          <p className="text-sm text-muted-foreground">Create Cambridge-style IELTS practice tests.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold-gradient text-ink"><Plus className="mr-1 h-4 w-4" />New Test</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a new test</DialogTitle>
              <DialogDescription>Start with the basics — you'll add sections, passages, and questions next.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 pt-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cambridge Book 18 · Test 1 · Reading" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Skill</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type, duration_minutes: durations[v] ?? 60 })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="listening">Listening</SelectItem>
                      <SelectItem value="writing">Writing</SelectItem>
                      <SelectItem value="speaking">Speaking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Module</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as typeof form.difficulty })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="general">General Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Duration (minutes)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
              <Button onClick={create} disabled={!form.title} className="bg-gold-gradient text-ink">Create & open editor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div> :
          !tests?.length ? <div className="p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-semibold">No tests yet</p>
            <p className="text-sm text-muted-foreground">Click "New Test" to add your first Cambridge-style test.</p>
          </div> :
          <div className="divide-y divide-border">
            {tests.map((t) => {
              const Icon = iconFor(t.type);
              return (
                <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-gradient text-ink"><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">{t.type}</span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{(t as any).difficulty ?? "academic"}</span>
                        <span className={`text-xs font-semibold ${t.is_published ? "text-green-600" : "text-muted-foreground"}`}>{t.is_published ? "● Published" : "○ Draft"}</span>
                      </div>
                      <div className="mt-1 truncate font-semibold">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.duration_minutes} min · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(t.id, t.is_published)} title={t.is_published ? "Unpublish" : "Publish"}>
                      {t.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button asChild variant="outline" size="sm"><Link to="/admin/tests/$testId" params={{ testId: t.id }}><Pencil className="mr-1 h-4 w-4" />Edit</Link></Button>
                    <Button variant="ghost" size="sm" onClick={() => del(t.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}
