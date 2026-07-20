import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendBookingWhatsApp } from "@/lib/whatsapp.functions";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bookings")({ component: BookingsPage });

function BookingsPage() {
  const qc = useQueryClient();
  const sendWa = useServerFn(sendBookingWhatsApp);

  const { data } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const notify = async (bookingId: string, kind: "confirmed" | "cancelled", force = false) => {
    try {
      const res = await sendWa({ data: { bookingId, kind, force } });
      if (res.sent) {
        toast.success(`WhatsApp ${kind} message sent.`);
      } else if (res.reason === "already_sent") {
        toast.message(`WhatsApp ${kind} message was already sent for this booking.`);
      } else if (res.reason === "disabled_by_pref") {
        toast.message(`WhatsApp ${kind} message skipped by this booking's notification preference.`);
      } else if (res.waLink) {
        toast.message("Opening WhatsApp fallback…", {
          description: res.reason === "twilio_not_configured" ? "Twilio not connected — send manually." : "Auto-send failed — send manually.",
        });
        window.open(res.waLink, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No phone number on this booking.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "WhatsApp send failed");
    }
  };

  const setPref = async (id: string, pref: string) => {
    const { error } = await supabase.from("bookings").update({ notify_pref: pref }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  };

  const setStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    await notify(id, status);
  };

  const resend = async (b: { id: string; status: string | null }) => {
    if (b.status !== "confirmed" && b.status !== "cancelled") return;
    await notify(b.id, b.status, true);
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold">Bookings</h1>
      <p className="text-sm text-muted-foreground">Personal Speaking Interaction requests.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {!data?.length ? <div className="p-8 text-center text-sm text-muted-foreground">No bookings yet.</div> :
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <tr><th className="p-4">Name</th><th className="p-4">Contact</th><th className="p-4">Date</th><th className="p-4">Status</th><th className="p-4">Notify</th><th className="p-4"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((b) => (
                <tr key={b.id}>
                  <td className="p-4 font-semibold">{b.full_name}<div className="text-xs text-muted-foreground font-normal">{new Date(b.created_at).toLocaleString()}</div></td>
                  <td className="p-4"><div>{b.email}</div><div className="text-xs text-muted-foreground">{b.phone}</div></td>
                  <td className="p-4">{b.preferred_date ?? "—"}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${b.status === "confirmed" ? "bg-green-100 text-green-700" : b.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{b.status}</span></td>
                  <td className="p-4">
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={(b as { notify_pref?: string }).notify_pref ?? "both"}
                      onChange={(e) => setPref(b.id, e.target.value)}
                      title="Which WhatsApp messages to auto-send"
                    >
                      <option value="both">Both</option>
                      <option value="confirm_only">Confirm only</option>
                      <option value="cancel_only">Cancel only</option>
                      <option value="none">None</option>
                    </select>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    {b.status !== "confirmed" && b.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "confirmed")}>Confirm</Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "cancelled")}>Cancel</Button>
                    )}
                    {(b.status === "confirmed" || b.status === "cancelled") && (
                      <Button size="sm" variant="secondary" onClick={() => resend(b)} title="Resend WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
