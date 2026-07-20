import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, Eye, ChevronRight, ListPlus, LayoutList, Upload, Sparkles, Mic, Square, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tests/$testId")({ component: EditTest });

const QUESTION_TYPES = [
  { id: "mcq", label: "Multiple Choice", options: true, answerHint: "The correct option (matches exactly)" },
  { id: "tf_ng", label: "True / False / Not Given", options: false, answerHint: "TRUE, FALSE, or NOT GIVEN" },
  { id: "yn_ng", label: "Yes / No / Not Given", options: false, answerHint: "YES, NO, or NOT GIVEN" },
  { id: "gap_fill", label: "Gap Fill / Sentence Completion", options: false, answerHint: "The word(s) that fill the gap" },
  { id: "short_answer", label: "Short Answer", options: false, answerHint: "The expected short answer" },
  { id: "matching_headings", label: "Matching Headings", options: true, answerHint: "The heading label (e.g. 'iii')" },
  { id: "matching_features", label: "Matching Features / People", options: true, answerHint: "The feature/person label" },
  { id: "summary_completion", label: "Summary Completion", options: false, answerHint: "The word(s) that complete the summary" },
  { id: "diagram_labelling", label: "Diagram / Map Labelling", options: false, answerHint: "The label word(s)" },
  { id: "essay", label: "Essay (Task 1 / Task 2)", options: false, answerHint: "Sample answer or empty (essays are manually graded)" },
  { id: "speaking", label: "Speaking (voice recording)", options: false, answerHint: "Model answer or empty (speaking is manually graded)" },
] as const;

type QType = typeof QUESTION_TYPES[number]["id"];

function EditTest() {
  const { testId } = Route.useParams();
  const qc = useQueryClient();

  const { data: test } = useQuery({
    queryKey: ["admin-test", testId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("*").eq("id", testId).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: sections } = useQuery({
    queryKey: ["admin-sections", testId],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_sections").select("*").eq("test_id", testId).order("position");
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (test) setForm(test); }, [test]);

  const saveTest = async () => {
    const { error } = await supabase.from("tests").update({
      title: form.title, description: form.description, difficulty: form.difficulty,
      cover_image_url: form.cover_image_url,
      duration_minutes: Number(form.duration_minutes), is_published: form.is_published,
      updated_at: new Date().toISOString(),
    }).eq("id", testId);
    if (error) return toast.error(error.message);
    toast.success("Test saved");
    qc.invalidateQueries({ queryKey: ["admin-test", testId] });
  };

  const addSection = async () => {
    const { error } = await supabase.from("test_sections").insert({
      test_id: testId,
      position: (sections?.length ?? 0),
      title: `Section ${(sections?.length ?? 0) + 1}`,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-sections", testId] });
  };

  if (!form) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <Link to="/admin/tests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All tests</Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/exam/$testId" params={{ testId }} target="_blank"><Eye className="mr-1 h-4 w-4" />Preview as student</Link></Button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-bold">Test details</h1>
        <div className="mt-4 grid gap-4">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div><Label>Skill</Label><Input value={form.type} readOnly className="bg-muted" /></div>
            <div>
              <Label>Module</Label>
              <Select value={form.difficulty ?? "academic"} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            <label className="flex cursor-pointer items-end gap-2 pb-2">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Published</span>
            </label>
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short summary shown on the library card" /></div>
          <div><Label>Cover image URL (optional)</Label><Input value={form.cover_image_url ?? ""} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." /></div>
          <Button onClick={saveTest} className="bg-gold-gradient text-ink w-fit"><Save className="mr-1 h-4 w-4" />Save changes</Button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Sections</h2>
          <p className="text-sm text-muted-foreground">Each section holds one passage (or audio / writing prompt) and its question groups.</p>
        </div>
        <Button onClick={addSection} variant="outline"><Plus className="mr-1 h-4 w-4" />Add section</Button>
      </div>

      <div className="mt-4 space-y-4">
        {sections?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <LayoutList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No sections yet</p>
            <p className="text-sm text-muted-foreground">Reading tests usually have 3 passages · Listening has 4 sections.</p>
            <Button onClick={addSection} className="mt-4 bg-gold-gradient text-ink"><Plus className="mr-1 h-4 w-4" />Add first section</Button>
          </div>
        )}
        {sections?.map((s) => <SectionEditor key={s.id} section={s} testType={test?.type ?? "reading"} />)}
      </div>
    </div>
  );
}

function SectionEditor({ section, testType }: { section: any; testType: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(section);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => setForm(section), [section]);

  const { data: groups } = useQuery({
    queryKey: ["admin-groups", section.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("question_groups").select("*").eq("section_id", section.id).order("position");
      if (error) throw error;
      return data;
    },
  });

  const save = async () => {
    const { error } = await supabase.from("test_sections").update({
      title: form.title, passage: form.passage, audio_url: form.audio_url,
      writing_prompt: form.writing_prompt, speaking_cue: form.speaking_cue,
      image_url: form.image_url,
    }).eq("id", section.id);
    if (error) return toast.error(error.message);
    toast.success("Section saved");
    qc.invalidateQueries({ queryKey: ["admin-sections", section.test_id] });
  };

  const del = async () => {
    if (!confirm("Delete this section and all its questions?")) return;
    const { error } = await supabase.from("test_sections").delete().eq("id", section.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-sections", section.test_id] });
  };

  const addGroup = async () => {
    const { error } = await supabase.from("question_groups").insert({
      section_id: section.id,
      position: (groups?.length ?? 0),
      question_type: testType === "speaking" ? "speaking" : testType === "writing" ? "essay" : "mcq",
      instructions: "",
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-groups", section.id] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <div className="flex items-center gap-3">
          <ChevronRight className={`h-5 w-5 shrink-0 transition ${expanded ? "rotate-90" : ""}`} />
          <div>
            <div className="font-display font-bold">{form.title || `Section ${section.position + 1}`}</div>
            <div className="text-xs text-muted-foreground">{groups?.length ?? 0} question group(s)</div>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}><span onClick={del} className="text-destructive"><Trash2 className="h-4 w-4" /></span></Button>
      </button>

      {expanded && (
        <div className="border-t border-border p-5">
          <div className="grid gap-4">
            <div><Label>Section title</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`e.g. Passage ${section.position + 1}: The History of Coffee`} /></div>
            {(testType === "reading") && (
              <div><Label>Reading passage</Label><Textarea rows={10} value={form.passage ?? ""} onChange={(e) => setForm({ ...form, passage: e.target.value })} placeholder="Paste the full passage here. Paragraph breaks are preserved." /></div>
            )}
            {(testType === "listening") && (
              <>
                <ListeningAudioInput value={form.audio_url ?? ""} onChange={(v) => setForm({ ...form, audio_url: v })} sectionId={section.id} />
                <div><Label>Transcript / Context (optional)</Label><Textarea rows={4} value={form.passage ?? ""} onChange={(e) => setForm({ ...form, passage: e.target.value })} placeholder="Any on-screen context: form template, map labels, etc." /></div>
              </>
            )}
            {(testType === "writing") && (
              <div><Label>Writing prompt</Label><Textarea rows={6} value={form.writing_prompt ?? ""} onChange={(e) => setForm({ ...form, writing_prompt: e.target.value })} placeholder="e.g. The chart below shows... Summarise the information..." /></div>
            )}
            {(testType === "speaking") && (
              <div><Label>Speaking cue card</Label><Textarea rows={6} value={form.speaking_cue ?? ""} onChange={(e) => setForm({ ...form, speaking_cue: e.target.value })} placeholder="Describe a time when...\n\nYou should say:\n- what happened\n- who was there\n- how you felt" /></div>
            )}
            <div><Label>Image URL (optional — for maps, diagrams, charts)</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            <Button onClick={save} className="w-fit bg-gold-gradient text-ink"><Save className="mr-1 h-4 w-4" />Save section</Button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="font-display font-bold">Question Groups</h3>
            <Button onClick={addGroup} variant="outline" size="sm"><ListPlus className="mr-1 h-4 w-4" />Add group</Button>
          </div>
          <div className="mt-3 space-y-3">
            {groups?.map((g) => <GroupEditor key={g.id} group={g} />)}
            {groups?.length === 0 && <p className="text-sm text-muted-foreground">No question groups yet. A group is a run of questions sharing instructions and a type (e.g. Questions 1–5: MCQ).</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupEditor({ group }: { group: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(group);
  useEffect(() => setForm(group), [group]);

  const { data: questions } = useQuery({
    queryKey: ["admin-qs", group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id,test_id,group_id,number,position,prompt,options,points,question_type")
        .eq("group_id", group.id)
        .order("number");
      if (error) throw error;
      const testId = (group as any).test_id;
      let answerMap = new Map<string, string>();
      if (testId) {
        const { data: answers } = await supabase.rpc("get_question_answers", { _test_id: testId });
        answerMap = new Map<string, string>((answers ?? []).map((a: any) => [a.id, a.correct_answer ?? ""]));
      }
      return (data ?? []).map((q: any) => ({ ...q, correct_answer: answerMap.get(q.id) ?? "" }));
    },
  });


  const save = async () => {
    const { error } = await supabase.from("question_groups").update({
      question_type: form.question_type, instructions: form.instructions,
    }).eq("id", group.id);
    if (error) return toast.error(error.message);
    toast.success("Group saved");
    qc.invalidateQueries({ queryKey: ["admin-groups", group.section_id] });
  };

  const del = async () => {
    if (!confirm("Delete this group and all its questions?")) return;
    await supabase.from("question_groups").delete().eq("id", group.id);
    qc.invalidateQueries({ queryKey: ["admin-groups", group.section_id] });
  };

  const meta = QUESTION_TYPES.find((t) => t.id === form.question_type) ?? QUESTION_TYPES[0];

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Question type</Label>
              <Select value={form.question_type} onValueChange={(v) => setForm({ ...form, question_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUESTION_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={save} variant="outline" size="sm"><Save className="mr-1 h-4 w-4" />Save group</Button>
              <Button onClick={del} variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div><Label>Instructions</Label><Textarea rows={2} value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="e.g. Questions 1–5. Choose TRUE, FALSE, or NOT GIVEN." /></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {questions?.map((q) => (
          <QuestionRow key={q.id} q={q} qType={form.question_type as QType} onChanged={() => qc.invalidateQueries({ queryKey: ["admin-qs", group.id] })} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AddQuestion groupId={group.id} testId={group.test_id} qType={form.question_type as QType} nextNumber={(questions?.[questions.length - 1]?.number ?? 0) + 1} answerHint={meta.answerHint} showOptions={meta.options} onAdded={() => qc.invalidateQueries({ queryKey: ["admin-qs", group.id] })} />
        <BulkImport groupId={group.id} qType={form.question_type as QType} nextNumber={(questions?.[questions.length - 1]?.number ?? 0) + 1} showOptions={meta.options} onAdded={() => qc.invalidateQueries({ queryKey: ["admin-qs", group.id] })} />
      </div>
    </div>
  );
}

function AddQuestion({ groupId, qType, nextNumber, answerHint, showOptions, onAdded }: {
  groupId: string; testId: string; qType: QType; nextNumber: number; answerHint: string; showOptions: boolean; onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ number: nextNumber, prompt: "", options: "", correct_answer: "", points: 1 });

  useEffect(() => { if (open) setForm((f) => ({ ...f, number: nextNumber })); }, [open, nextNumber]);

  const add = async () => {
    const { data: g } = await supabase.from("question_groups").select("section_id, test_sections(test_id)").eq("id", groupId).single();
    const testId = (g?.test_sections as any)?.test_id;
    const options = form.options.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("questions").insert({
      test_id: testId,
      group_id: groupId,
      number: Number(form.number),
      position: Number(form.number),
      prompt: form.prompt,
      question_type: qType,
      options: options.length ? options : null,
      correct_answer: form.correct_answer,
      points: Number(form.points) || 1,
    });
    if (error) return toast.error(error.message);
    toast.success(`Q${form.number} added`);
    setForm({ number: form.number + 1, prompt: "", options: "", correct_answer: "", points: 1 });
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-1 h-4 w-4" />Add question</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add question</DialogTitle>
          <DialogDescription>Type: <span className="font-semibold">{QUESTION_TYPES.find((t) => t.id === qType)?.label}</span></DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Question #</Label><Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Points</Label><Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Prompt / question text</Label><Textarea rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder={qType === "gap_fill" ? "e.g. The scientists discovered a new ______ in the desert." : "The prompt shown to the student"} /></div>
          {showOptions && (
            <div><Label>Options (one per line)</Label><Textarea rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="A. The rising cost of living\nB. Political instability\nC. Climate change\nD. Population growth" /></div>
          )}
          {qType !== "essay" && qType !== "speaking" && (
            <div><Label>Correct answer <span className="text-xs text-muted-foreground">— {answerHint}</span></Label><Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} /></div>
          )}
          {(qType === "essay" || qType === "speaking") && (
            <p className="text-xs text-muted-foreground">This question type is graded manually — no correct answer needed.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={add} disabled={!form.prompt || (qType !== "essay" && qType !== "speaking" && !form.correct_answer)} className="bg-gold-gradient text-ink">Add question</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionRow({ q, qType, onChanged }: { q: any; qType: QType; onChanged: () => void }) {
  const del = async () => {
    if (!confirm(`Delete Q${q.number}?`)) return;
    await supabase.from("questions").delete().eq("id", q.id);
    onChanged();
  };
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gold-gradient px-2 py-0.5 text-xs font-bold text-ink">Q{q.number}</span>
          <span className="text-xs text-muted-foreground">{q.points} pt</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap">{q.prompt}</p>
        {q.options && (q.options as string[]).length > 0 && (
          <ul className="mt-1 text-xs text-muted-foreground">{(q.options as string[]).map((o, i) => <li key={i}>• {o}</li>)}</ul>
        )}
        {qType !== "essay" && qType !== "speaking" && <div className="mt-1 text-xs text-green-600">✓ {q.correct_answer}</div>}
      </div>
      <Button variant="ghost" size="sm" onClick={del} className="shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function BulkImport({ groupId, qType, nextNumber, showOptions, onAdded }: {
  groupId: string; qType: QType; nextNumber: number; showOptions: boolean; onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const placeholder = showOptions
    ? `1. What is the main idea of the passage?\nA. Option one\nB. Option two\nC. Option three\nD. Option four\nAnswer: B\n\n2. Which factor is most important?\nA. Cost\nB. Time\nC. Quality\nAnswer: C`
    : qType === "essay"
    ? `1. Some people think that... Discuss both views and give your opinion.\n\n2. Task 1: The chart below shows...`
    : `1. The scientists discovered a new ______ in the desert.\nAnswer: species\n\n2. TRUE / FALSE / NOT GIVEN — Coffee originated in Ethiopia.\nAnswer: TRUE\n\n3. Complete the sentence: The main export is ______.\nAnswer: cocoa`;

  const parse = (raw: string) => {
    // Split into blocks separated by blank lines
    const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const out: Array<{ number: number; prompt: string; options: string[]; correct_answer: string }> = [];
    let auto = nextNumber;
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      // First line: "1. prompt" or "1) prompt" or just prompt
      const firstMatch = lines[0].match(/^(\d+)[\.\)\:]\s*(.*)$/);
      const number = firstMatch ? Number(firstMatch[1]) : auto;
      const promptFirst = firstMatch ? firstMatch[2] : lines[0];
      const options: string[] = [];
      let correct = "";
      const promptExtra: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const ln = lines[i];
        const ansMatch = ln.match(/^(?:answer|ans|correct)\s*[:\-]\s*(.+)$/i);
        if (ansMatch) { correct = ansMatch[1].trim(); continue; }
        if (/^[A-Ha-h][\.\)]\s+/.test(ln)) { options.push(ln); continue; }
        promptExtra.push(ln);
      }
      const prompt = [promptFirst, ...promptExtra].join("\n").trim();
      if (!prompt) continue;
      out.push({ number, prompt, options, correct_answer: correct });
      auto = number + 1;
    }
    return out;
  };

  const preview = text.trim() ? parse(text) : [];

  const runImport = async () => {
    const rows = parse(text);
    if (!rows.length) return toast.error("Nothing to import — check the format");
    setBusy(true);
    const { data: g } = await supabase.from("question_groups").select("test_sections(test_id)").eq("id", groupId).single();
    const testId = (g?.test_sections as any)?.test_id;
    const payload = rows.map((r) => ({
      test_id: testId,
      group_id: groupId,
      number: r.number,
      position: r.number,
      prompt: r.prompt,
      question_type: qType,
      options: r.options.length ? r.options : null,
      correct_answer: r.correct_answer,
      points: 1,
    }));
    const { error } = await supabase.from("questions").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} question(s)`);
    setText("");
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="mr-1 h-4 w-4" />Bulk import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Paste many questions at once</DialogTitle>
          <DialogDescription>
            Separate each question with a blank line. Number each question (e.g. <code>1.</code>).
            {showOptions && <> Options start with <code>A.</code> <code>B.</code> etc. </>}
            {qType !== "essay" && <>End each question with <code>Answer: ...</code></>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <Label>Paste block</Label>
            <Textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
          </div>
          <div>
            <Label>Preview ({preview.length} question{preview.length === 1 ? "" : "s"})</Label>
            <div className="mt-1 max-h-[400px] space-y-2 overflow-auto rounded-md border border-border bg-background/50 p-3 text-xs">
              {preview.length === 0 && <p className="text-muted-foreground">Paste on the left to preview parsed questions.</p>}
              {preview.map((q, i) => (
                <div key={i} className="rounded border border-border bg-card p-2">
                  <div className="flex items-center gap-2"><span className="rounded bg-gold-gradient px-1.5 py-0.5 text-[10px] font-bold text-ink">Q{q.number}</span></div>
                  <p className="mt-1 whitespace-pre-wrap">{q.prompt}</p>
                  {q.options.length > 0 && <ul className="mt-1 text-muted-foreground">{q.options.map((o, j) => <li key={j}>{o}</li>)}</ul>}
                  {qType !== "essay" && qType !== "speaking" && (
                    q.correct_answer
                      ? <div className="mt-1 text-green-600">✓ {q.correct_answer}</div>
                      : <div className="mt-1 text-destructive">⚠ Missing answer</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={runImport} disabled={busy || preview.length === 0} className="bg-gold-gradient text-ink">
            <Upload className="mr-1 h-4 w-4" />Import {preview.length} question{preview.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListeningAudioInput({ value, onChange, sectionId }: { value: string; onChange: (v: string) => void; sectionId: string }) {
  const [mode, setMode] = useState<"url" | "upload" | "record">(value ? "url" : "upload");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  const uploadBlob = async (blob: Blob, ext: string) => {
    setBusy(true);
    try {
      const path = `${sectionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("listening-audio").upload(path, blob, {
        contentType: blob.type || `audio/${ext}`,
        upsert: true,
      });
      if (error) throw error;
      // Long-lived signed URL (10 years) — bucket is private but audio is not sensitive
      const { data, error: sErr } = await supabase.storage.from("listening-audio").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      onChange(data.signedUrl);
      toast.success("Audio uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() || "mp3";
    await uploadBlob(file, ext);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const buf: Blob[] = [];
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) buf.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(buf, { type: "audio/webm" });
        await uploadBlob(blob, "webm");
      };
      setChunks(buf);
      setRecorder(mr);
      mr.start();
      setRecording(true);
    } catch (e: any) {
      toast.error(e.message ?? "Microphone unavailable");
    }
  };

  const stopRec = () => {
    recorder?.stop();
    setRecording(false);
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <Label>Section audio</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")}><LinkIcon className="mr-1 h-3 w-3" />Paste URL</Button>
        <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} onClick={() => setMode("upload")}><Upload className="mr-1 h-3 w-3" />Upload file</Button>
        <Button type="button" size="sm" variant={mode === "record" ? "default" : "outline"} onClick={() => setMode("record")}><Mic className="mr-1 h-3 w-3" />Record</Button>
      </div>
      <div className="mt-3">
        {mode === "url" && (
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... (hosted MP3)" />
        )}
        {mode === "upload" && (
          <div className="flex items-center gap-2">
            <Input type="file" accept="audio/*" onChange={handleFile} disabled={busy} />
            {busy && <span className="text-xs text-muted-foreground">Uploading…</span>}
          </div>
        )}
        {mode === "record" && (
          <div className="flex items-center gap-2">
            {!recording ? (
              <Button type="button" size="sm" onClick={startRec} disabled={busy} className="bg-gold-gradient text-ink"><Mic className="mr-1 h-4 w-4" />Start recording</Button>
            ) : (
              <Button type="button" size="sm" variant="destructive" onClick={stopRec}><Square className="mr-1 h-4 w-4" />Stop & save</Button>
            )}
            {busy && <span className="text-xs text-muted-foreground">Uploading…</span>}
          </div>
        )}
      </div>
      {value && (
        <div className="mt-3">
          <audio controls src={value} className="w-full" />
          <p className="mt-1 truncate text-[10px] text-muted-foreground">{value}</p>
        </div>
      )}
    </div>
  );
}
