import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { bookingId: string; kind: "confirmed" | "cancelled"; force?: boolean };

function buildMessage(kind: "confirmed" | "cancelled", name: string, date: string | null) {
  const when = date ? ` for ${date}` : "";
  if (kind === "confirmed") {
    return `Hi ${name}, this is Dr. Egghead's IELTS Clinic. Your Personal Speaking Interaction booking${when} is CONFIRMED ✅. We'll share joining details shortly. Reply here if you need to reschedule.`;
  }
  return `Hi ${name}, this is Dr. Egghead's IELTS Clinic. Unfortunately your Personal Speaking Interaction booking${when} has been CANCELLED. Please reply to rebook at a time that works for you.`;
}

function toE164Digits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  return digits.length >= 8 ? digits : null;
}

export const sendBookingWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin-only
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, full_name, phone, preferred_date, notify_pref")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!booking) throw new Error("Booking not found");

    // Per-booking notification preference. Manual resend (force) bypasses this.
    if (!data.force) {
      const pref = (booking as { notify_pref?: string }).notify_pref ?? "both";
      const allowed =
        pref === "both" ||
        (pref === "confirm_only" && data.kind === "confirmed") ||
        (pref === "cancel_only" && data.kind === "cancelled");
      if (!allowed) {
        return { sent: false, waLink: null, message: "", reason: "disabled_by_pref" as const };
      }
    }

    // Idempotency: if we already have a 'sent' record for this booking+kind, don't resend
    // unless the caller explicitly forces it (manual "resend").
    if (!data.force) {
      const { data: existing } = await supabase
        .from("booking_notifications")
        .select("id, status, sent_at")
        .eq("booking_id", data.bookingId)
        .eq("kind", data.kind)
        .eq("channel", "whatsapp")
        .eq("status", "sent")
        .maybeSingle();
      if (existing) {
        return {
          sent: false,
          waLink: null,
          message: "",
          reason: "already_sent" as const,
          sentAt: existing.sent_at,
        };
      }
    }

    const phone = toE164Digits(booking.phone);
    const message = buildMessage(data.kind, booking.full_name ?? "there", booking.preferred_date ?? null);
    const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;

    const twilioKey = process.env.TWILIO_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!phone) {
      return { sent: false, waLink: null, message, reason: "no_phone" as const };
    }

    // Reserve the slot BEFORE the network call so parallel clicks collide on the
    // unique (booking_id, kind, channel) constraint instead of double-sending.
    // We upsert 'pending' first; on success we flip to 'sent', on failure we clear.
    const reserveKind = data.force ? `${data.kind}_${Date.now()}` : data.kind;
    if (!data.force) {
      const { error: reserveErr } = await supabase
        .from("booking_notifications")
        .insert({
          booking_id: data.bookingId,
          kind: data.kind,
          channel: "whatsapp",
          status: "pending",
          sent_by: userId,
        });
      if (reserveErr) {
        // Unique-violation → another request is already sending / has sent.
        if ((reserveErr as { code?: string }).code === "23505") {
          return {
            sent: false,
            waLink: null,
            message: "",
            reason: "already_sent" as const,
          };
        }
        throw reserveErr;
      }
    }

    const finalize = async (status: "sent" | "failed", providerId: string | null) => {
      if (data.force && status === "sent") {
        // For forced resends, log a separate row (kind suffix keeps unique index happy)
        await supabase.from("booking_notifications").insert({
          booking_id: data.bookingId,
          kind: reserveKind,
          channel: "whatsapp",
          status: "sent",
          provider_message_id: providerId,
          sent_by: userId,
        });
        return;
      }
      if (status === "sent") {
        await supabase
          .from("booking_notifications")
          .update({ status: "sent", provider_message_id: providerId, sent_at: new Date().toISOString() })
          .eq("booking_id", data.bookingId)
          .eq("kind", data.kind)
          .eq("channel", "whatsapp");
      } else {
        // Clear the reservation so a later retry can go through.
        await supabase
          .from("booking_notifications")
          .delete()
          .eq("booking_id", data.bookingId)
          .eq("kind", data.kind)
          .eq("channel", "whatsapp")
          .eq("status", "pending");
      }
    };

    if (!twilioKey || !lovableKey || !from) {
      // Don't hold a reservation when we can't actually send.
      await finalize("failed", null);
      return { sent: false, waLink, message, reason: "twilio_not_configured" as const };
    }

    try {
      const body = new URLSearchParams({
        To: `whatsapp:+${phone}`,
        From: from,
        Body: message,
      });
      const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Twilio WhatsApp send failed [${res.status}]: ${errText}`);
        await finalize("failed", null);
        return { sent: false, waLink, message, reason: "twilio_error" as const, error: errText };
      }
      const payload = (await res.json().catch(() => null)) as { sid?: string } | null;
      await finalize("sent", payload?.sid ?? null);
      return { sent: true, waLink, message, reason: "ok" as const };
    } catch (e) {
      console.error("Twilio send exception", e);
      await finalize("failed", null);
      return { sent: false, waLink, message, reason: "twilio_error" as const, error: String(e) };
    }
  });
