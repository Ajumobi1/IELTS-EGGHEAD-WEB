
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notify_pref text NOT NULL DEFAULT 'both'
  CHECK (notify_pref IN ('both','confirm_only','cancel_only','none'));
