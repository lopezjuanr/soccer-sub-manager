/**
 * useWakeLock — keeps the screen awake while `active` is true.
 *
 * Uses the Screen Wake Lock API (supported in Chrome/Safari on mobile).
 * Automatically re-acquires the lock if the page becomes visible again
 * after being backgrounded (the OS releases wake locks on visibility change).
 */

import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      // Release the lock if it exists
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      return;
    }

    let cancelled = false;

    async function acquire() {
      if (cancelled) return;
      if (!("wakeLock" in navigator)) return; // API not supported
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Silently ignore — e.g. battery saver mode blocking the request
      }
    }

    acquire();

    // Re-acquire when the page becomes visible again (OS releases lock on hide)
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && active) {
        acquire();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
