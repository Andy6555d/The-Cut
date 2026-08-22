"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nowMs, RESULT_REVEAL_MS } from "@/lib/microgames/engine/timing";
import { hapticResult } from "@/lib/microgames/engine/haptics";
import type { MicrogameConfig, MicrogameInputEvent, MicrogameResult } from "@/lib/microgames/engine/types";
import { computeStopScore, isStopResultPlausible } from "./scorer";

type Phase = "running" | "result";

export function StopGame({
  config,
  onFinish,
}: {
  config: MicrogameConfig;
  onFinish: (result: MicrogameResult) => void;
}) {
  const target = config.difficulty.target ?? 5.0;
  const speed = config.difficulty.speed ?? 1.0;
  // After this many seconds of elapsed counter value, hide the live readout
  // so the player is timing from feel, not reading the number off — this is
  // what makes STOP a precision-timing game rather than a reflex-tap game.
  const hideAfterSeconds = config.difficulty.hideAfterSeconds ?? target * 0.4;

  const [phase, setPhase] = useState<Phase>("running");
  const [displayValue, setDisplayValue] = useState(0);
  const [resultError, setResultError] = useState<number | null>(null);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  const roundStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(() => {
    const elapsedSeconds = (nowMs() - roundStartRef.current) / 1000;
    const value = elapsedSeconds * speed;
    setDisplayValue(value);
    setHidden(elapsedSeconds >= hideAfterSeconds);
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, hideAfterSeconds]);

  useEffect(() => {
    roundStartRef.current = nowMs();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap() {
    if (phase !== "running") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tapTimestamp = nowMs() - roundStartRef.current;
    const events: MicrogameInputEvent[] = [{ type: "tap", clientTimestamp: tapTimestamp }];
    const actual = (tapTimestamp / 1000) * speed;
    const signed = actual - target;
    const score = computeStopScore(config, events);
    const plausible = isStopResultPlausible(config, events);

    setStoppedAt(actual);
    setResultError(score);
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
          primaryLabel: "YOU STOPPED",
          primaryValue: `${actual.toFixed(3)}s`,
          targetLabel: "TARGET",
          targetValue: `${target.toFixed(3)}s`,
          errorLabel: "ERROR",
          errorValue: `${score.toFixed(3)}s ${signed < 0 ? "EARLY" : signed > 0 ? "LATE" : "EXACT"}`,
          direction: signed < 0 ? "early" : signed > 0 ? "late" : "exact",
          accuracyPct: Math.max(0, 100 * (1 - score / Math.max(target, 0.001))),
          rating: score <= 0.01 ? "perfect" : score <= 0.05 ? "excellent" : score <= 0.15 ? "great" : score <= 0.35 ? "good" : score <= 0.75 ? "close" : "poor",
          message: score <= 0.01 ? "Dead on target." : signed < 0 ? "Too early — wait a fraction longer." : "Too late — tap a fraction sooner.",
        },
      });
    }, RESULT_REVEAL_MS);
  }

  return (
    <div
      className="game-stage"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2.5rem",
      }}
    >
      <p className="game-instruction" style={{ color: "var(--muted)" }}>
        STOP THE TIMER AT
      </p>
      <p className="game-number" style={{ color: "var(--fg)" }}>
        {target.toFixed(3)}
      </p>

      <div style={{ height: "5.5rem", display: "flex", alignItems: "center" }}>
        {phase === "running" && (
          <p className="game-number" style={{ color: "var(--warn)", opacity: hidden ? 0 : 1 }}>
            {displayValue.toFixed(3)}
          </p>
        )}
        {phase === "result" && resultError !== null && (
          <div className="result-reveal" style={{ textAlign: "center" }}>
            <p className="game-instruction" style={{ color: "var(--muted)" }}>YOU STOPPED</p>
            <p className="game-number" style={{ color: resultError < 0.15 ? "var(--survive)" : "var(--warn)" }}>
              {stoppedAt?.toFixed(3)}s
            </p>
            <p className="game-instruction" style={{ color: stoppedAt !== null && stoppedAt < target ? "var(--warn)" : "var(--cut)" }}>
              {resultError.toFixed(3)}s {stoppedAt !== null && stoppedAt < target ? "EARLY" : stoppedAt !== null && stoppedAt > target ? "LATE" : "EXACT"}
            </p>
          </div>
        )}
      </div>

      {phase === "running" && (
        <button onPointerDown={handleTap} className="big-tap-button">
          STOP
        </button>
      )}
    </div>
  );
}
