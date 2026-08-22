"use client";

export function JeopardyTimer({ remainingMs, totalMs, label = "TIME" }: { remainingMs: number; totalMs: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (remainingMs / Math.max(1, totalMs)) * 100));
  const danger = pct <= 25;
  return (
    <div className={`jeopardy-timer ${danger ? "danger" : ""}`} aria-label={`${label} ${(remainingMs / 1000).toFixed(1)} seconds`}>
      <div className="jeopardy-timer-row"><span>{label}</span><strong>{(Math.max(0, remainingMs) / 1000).toFixed(1)}s</strong></div>
      <div className="jeopardy-track"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
