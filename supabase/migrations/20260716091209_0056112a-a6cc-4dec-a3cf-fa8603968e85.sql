
CREATE TABLE public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('confirmed','cancelled')),
  channel text NOT NULL DEFAULT 'whatsapp',
  provider_message_id text,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_notifications TO authenticated;
GRANT ALL ON public.booking_notifications TO service_role;

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking_notifications"
  ON public.booking_notifications
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
