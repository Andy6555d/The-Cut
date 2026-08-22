"use client";

import { useEffect, useState } from "react";

function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now);
  // setHours(24, 0, 0, 0) intentionally uses the browser's LOCAL timezone
  // and correctly follows local DST rules. This is the reset the player
  // actually experiences, not a UTC approximation.
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - now.getTime();
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(msUntilNextLocalMidnight());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="game-number" style={{ color: "var(--fg)" }}>
      {remaining === null ? "--:--:--" : formatDuration(remaining)}
    </p>
  );
}
