import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves an avatar field to a displayable URL.
 * - If value looks like an absolute URL, return as-is.
 * - Otherwise treat as a storage path in the private `avatars` bucket and
 *   fetch a signed URL.
 */
export function useAvatarSrc(value?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc(null);
      return;
    }
    if (/^https?:\/\//i.test(value)) {
      setSrc(value);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(value, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setSrc(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return src;
}
