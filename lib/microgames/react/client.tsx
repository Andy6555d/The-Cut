"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nowMs, randomBetween, RESULT_REVEAL_MS } from "@/lib/microgames/engine/timing";
import { hapticResult } from "@/lib/microgames/engine/haptics";
import { soundAnticipationBuildup, soundGo, soundGood, soundBad } from "@/lib/microgames/engine/sound";
import type { MicrogameConfig, MicrogameInputEvent, MicrogameResult } from "@/lib/microgames/engine/types";
import { computeReactScore, isReactResultPlausible } from "./scorer";

type Phase = "idle" | "waiting" | "live" | "result" | "false_start";

export function ReactGame({
  config,
  onFinish,
}: {
  config: MicrogameConfig;
  onFinish: (result: MicrogameResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionMs, setReactionMs] = useState<number | null>(null);

  const roundStartRef = useRef(0);
  const stimulusDelayRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minDelay = config.difficulty.minDelayMs ?? 1200;
  const maxDelay = config.difficulty.maxDelayMs ?? 3600;

  const begin = useCallback(() => {
    roundStartRef.current = nowMs();
    stimulusDelayRef.current = config.difficulty.stimulusDelayMs ?? randomBetween(minDelay, maxDelay);
    setPhase("waiting");
    setReactionMs(null);
    soundAnticipationBuildup(stimulusDelayRef.current);

    timerRef.current = setTimeout(() => {
      setPhase("live");
      soundGo();
    }, stimulusDelayRef.current);
  }, [config.difficulty.stimulusDelayMs, minDelay, maxDelay]);

  useEffect(() => {
    begin();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap() {
    if (phase === "waiting") {
      // False start — tapped before the stimulus appeared.
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("false_start");
      hapticResult(false);
      soundBad();
      const result: MicrogameResult = {
        rawScore: Number.POSITIVE_INFINITY,
        metricDirection: "lower_is_better",
        inputEvents: [{ type: "false_start", clientTimestamp: nowMs() - roundStartRef.current }],
        clientComputedScore: Number.POSITIVE_INFINITY,
        failed: true,
        failureReason: "false_start",
      };
      resultTimerRef.current = setTimeout(() => onFinish(result), RESULT_REVEAL_MS);
      return;
    }

    if (phase === "live") {
      const tapTimestamp = nowMs() - roundStartRef.current;
      const events: MicrogameInputEvent[] = [{ type: "tap", clientTimestamp: tapTimestamp }];
      const effectiveConfig: MicrogameConfig = {
        ...config,
        difficulty: { ...config.difficulty, stimulusDelayMs: stimulusDelayRef.current },
      };
      const score = computeReactScore(effectiveConfig, events);
      const plausible = isReactResultPlausible(effectiveConfig, events);

      setReactionMs(score);
      setPhase("result");
      hapticResult(plausible && score < 300);
      if (plausible && score < 300) soundGood(); else soundBad();

      // Hold on the result screen for a beat so the player actually sees
      // their number before the practice summary takes over.
      resultTimerRef.current = setTimeout(() => {
        onFinish({
          rawScore: score,
          metricDirection: "lower_is_better",
          inputEvents: events,
          clientComputedScore: score,
          failed: !plausible,
          failureReason: plausible ? undefined : "implausible_timing",
          feedback: {
            primaryLabel: "REACTION TIME",
            primaryValue: `${Math.round(score)}ms`,
            errorLabel: "SPEED",
            errorValue: score < 180 ? "ELITE" : score < 230 ? "FAST" : score < 300 ? "GOOD" : score < 400 ? "OKAY" : "SLOW",
            direction: score < 230 ? "fast" : "slow",
            accuracyPct: Math.max(0, Math.min(100, 120 - score / 3)),
            rating: score < 180 ? "perfect" : score < 220 ? "excellent" : score < 280 ? "great" : score < 350 ? "good" : score < 450 ? "close" : "poor",
            message: score < 220 ? "Lightning quick." : score < 320 ? "Sharp reaction — keep pushing." : "You can shave time off that. Reset and go again.",
          },
        });
      }, RESULT_REVEAL_MS);
    }
  }

  const bg =
    phase === "live"
      ? "var(--survive)"
      : phase === "false_start"
      ? "var(--cut)"
      : "var(--bg)";

  return (
    <div
      onPointerDown={handleTap}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        transition: "background-color 60ms linear",
        cursor: "pointer",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {phase === "waiting" && (
        <p className="game-instruction" style={{ color: "var(--fg)" }}>
          WAIT FOR IT
        </p>
      )}
      {phase === "live" && (
        <p className="game-headline" style={{ color: "var(--bg)" }}>
          NOW!
        </p>
      )}
      {phase === "false_start" && (
        <>
          <p className="game-headline" style={{ color: "var(--fg)" }}>
            TOO SOON
          </p>
          <p className="game-instruction" style={{ color: "var(--fg)" }}>
            wait for NOW before you tap
          </p>
        </>
      )}
      {phase === "result" && reactionMs !== null && (
        <div className="result-reveal">
          <p className="game-number" style={{ color: "var(--survive)" }}>
            {Math.round(reactionMs)}
          </p>
          <p className="game-instruction" style={{ color: "var(--muted)" }}>
            milliseconds
          </p>
        </div>
      )}
    </div>
  );
}
