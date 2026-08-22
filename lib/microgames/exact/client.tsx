"use client";

import { useEffect, useRef, useState } from "react";
import { nowMs, RESULT_REVEAL_MS } from "@/lib/microgames/engine/timing";
import { hapticResult } from "@/lib/microgames/engine/haptics";
import type { MicrogameConfig, MicrogameInputEvent, MicrogameResult } from "@/lib/microgames/engine/types";
import { computeExactScore, isExactResultPlausible } from "./scorer";

type Phase = "waiting_press" | "holding" | "result";

export function ExactGame({
  config,
  onFinish,
}: {
  config: MicrogameConfig;
  onFinish: (result: MicrogameResult) => void;
}) {
  const target = config.difficulty.targetSeconds ?? 3.0;
  const hideAfterMs = config.difficulty.hideAfterMs ?? 800;

  const [phase, setPhase] = useState<Phase>("waiting_press");
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [errorSeconds, setErrorSeconds] = useState<number | null>(null);
  const [actualSeconds, setActualSeconds] = useState<number | null>(null);

  const holdStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  function tick() {
    const elapsedMs = nowMs() - holdStartRef.current;
    setDisplaySeconds(elapsedMs / 1000);
    setHidden(elapsedMs >= hideAfterMs);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePressStart() {
    if (phase !== "waiting_press") return;
    holdStartRef.current = nowMs();
    setPhase("holding");
    setHidden(false);
    setDisplaySeconds(0);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePressEnd() {
    if (phase !== "holding") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const holdEndTimestamp = nowMs() - holdStartRef.current;
    const events: MicrogameInputEvent[] = [
      { type: "hold_start", clientTimestamp: 0 },
      { type: "hold_end", clientTimestamp: holdEndTimestamp },
    ];

    const actual = holdEndTimestamp / 1000;
    const signed = actual - target;
    const score = computeExactScore(config, events);
    const plausible = isExactResultPlausible(config, events);

    setActualSeconds(actual);
    setErrorSeconds(score);
    setPhase("result");
    hapticResult(plausible && score < 0.15);

    resultTimerRef.current = setTimeout(() => {
      onFinish({
        rawScore: score,
        metricDirection: "lower_is_better",
        inputEvents: events,
        clientComputedScore: score,
        failed: !plausible,
        failureReason: plausible ? undefined : "implausible_timing",
        feedback: {
          primaryLabel: "YOU HELD",
          primaryValue: `${actual.toFixed(3)}s`,
          targetLabel: "TARGET",
          targetValue: `${target.toFixed(3)}s`,
          errorLabel: "ERROR",
          errorValue: `${score.toFixed(3)}s ${signed < 0 ? "EARLY" : signed > 0 ? "LATE" : "EXACT"}`,
          direction: signed < 0 ? "early" : signed > 0 ? "late" : "exact",
          accuracyPct: Math.max(0, 100 * (1 - score / Math.max(target, 0.001))),
          rating: score <= 0.01 ? "perfect" : score <= 0.05 ? "excellent" : score <= 0.15 ? "great" : score <= 0.35 ? "good" : score <= 0.75 ? "close" : "poor",
          message: score <= 0.01 ? "Flawless timing." : signed < 0 ? "You released early — hold a little longer." : "You released late — let go a little sooner.",
        },
      });
    }, RESULT_REVEAL_MS);
  }

  return (
    <div
      className="game-stage"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={phase === "holding" ? handlePressEnd : undefined}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <p className="game-instruction" style={{ color: "var(--muted)" }}>
        HOLD, THEN RELEASE AT
      </p>
      <p className="game-number" style={{ color: "var(--fg)" }}>
        {target.toFixed(3)}s
      </p>

      <div style={{ height: "5.5rem", display: "flex", alignItems: "center" }}>
        {phase === "waiting_press" && (
          <p className="game-instruction" style={{ color: "var(--warn)" }}>
            PRESS AND HOLD · RELEASE AT TARGET
          </p>
        )}
        {phase === "holding" && (
          <p className="game-number" style={{ color: "var(--warn)", opacity: hidden ? 0 : 1 }}>
            {displaySeconds.toFixed(3)}
          </p>
        )}
        {phase === "result" && errorSeconds !== null && (
          <div className="result-reveal" style={{ textAlign: "center" }}>
            <p className="game-instruction" style={{ color: "var(--muted)" }}>YOU HELD</p>
            <p className="game-number" style={{ color: errorSeconds < 0.15 ? "var(--survive)" : "var(--warn)" }}>
              {actualSeconds?.toFixed(3)}s
            </p>
            <p className="game-instruction" style={{ color: actualSeconds !== null && actualSeconds < target ? "var(--warn)" : "var(--cut)" }}>
              {errorSeconds.toFixed(3)}s {actualSeconds !== null && actualSeconds < target ? "EARLY" : actualSeconds !== null && actualSeconds > target ? "LATE" : "EXACT"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
