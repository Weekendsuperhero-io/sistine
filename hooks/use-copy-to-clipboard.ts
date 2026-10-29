"use client";

import * as React from "react";
import { toast } from "sonner";

/** Shows success only after the clipboard accepts the text, with one reset timer per copy control. */
export function useCopyToClipboard() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const copy = React.useCallback(async (text: string, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (mounted.current) {
        clearTimeout(timer.current);
        setCopied(key);
        timer.current = setTimeout(() => setCopied(null), 2000);
      }
      return true;
    } catch {
      if (mounted.current) {
        clearTimeout(timer.current);
        setCopied(null);
        toast.error("Could not copy. Select the code and copy it manually.");
      }
      return false;
    }
  }, []);

  return { copied, copy };
}
