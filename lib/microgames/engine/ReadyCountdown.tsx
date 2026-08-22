"use client";

import { useEffect, useState } from "react";
import { hapticTap } from "@/lib/microgames/engine/haptics";

export function ReadyCountdown({
  seconds = 3,
  label = "GET READY",
  accent = "var(--warn)",
  onComplete,
}: {
  seconds?: number;
  label?: string;
  accent?: string;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    hapticTap();
    const interval = setInterval(() => {
      setCount((current) => {
        if (current <= 1) {
          clearInterval(interval);
          window.setTimeout(onComplete, 160);
          return 0;
        }
        hapticTap();
        return current - 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="round-countdown" role="status" aria-live="polite">
      <div className="round-countdown-glow" style={{ background: accent }} />
      <span>{count > 0 ? label : "GO"}</span>
      <strong style={{ color: accent }}>{count > 0 ? count : "GO"}</strong>
      <small>FOCUS. ONE MOVE.</small>
    </div>
  );
}
