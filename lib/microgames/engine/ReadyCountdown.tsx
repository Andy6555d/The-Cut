"use client";

import { useEffect, useState } from "react";
import { hapticAnticipationTick, hapticGo } from "@/lib/microgames/engine/haptics";
import { soundAnticipationTick, soundGo } from "@/lib/microgames/engine/sound";

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
    hapticAnticipationTick();
    soundAnticipationTick(0);
    let step = 0;
    const interval = setInterval(() => {
      setCount((current) => {
        if (current <= 1) {
          clearInterval(interval);
          hapticGo();
          soundGo();
          window.setTimeout(onComplete, 160);
          return 0;
        }
        step += 1;
        hapticAnticipationTick();
        soundAnticipationTick(step);
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
