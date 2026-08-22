"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nowMs, randomBetween, RESULT_REVEAL_MS } from "@/lib/microgames/engine/timing";
import { hapticResult } from "@/lib/microgames/engine/haptics";
import type { MicrogameConfig, MicrogameInputEvent, MicrogameResult } from "@/lib/microgames/engine/types";
import { computeDontTapErrors, computeDontTapScore, isDontTapResultPlausible } from "./scorer";

type Phase = "waiting" | "live" | "result";

// A short, roughly-balanced sequence — never more than 2 of the same kind
// in a row, so the pattern can't be guessed from a streak, but not a
// strict 50/50 alternation either (that would be just as guessable).
function generateTrialSequence(count: number): number[] {
  const sequence: number[] = [];
  let sameStreak = 0;
  let last: number | null = null;

  for (let i = 0; i < count; i++) {
    let next = Math.random() < 0.5 ? 1 : 0;
    if (last !== null && next === last && sameStreak >= 1) {
      next = last === 1 ? 0 : 1; // force a break after 2 in a row
    }
    sequence.push(next);
    sameStreak = next === last ? sameStreak + 1 : 0;
    last = next;
  }

  return sequence;
}

export function DontTapGame({
  config,
  onFinish,
}: {
  config: MicrogameConfig;
  onFinish: (result: MicrogameResult) => void;
}) {
  const trialCount = config.difficulty.trialCount ?? 8;
  const responseWindowMs = config.difficulty.responseWindowMs ?? 500;
  const minGapMs = config.difficulty.minDelayMs ?? 200;
  const maxGapMs = config.difficulty.maxDelayMs ?? 500;

  const trialSequence = useMemo(() => { const configured=Array.from({length:trialCount},(_,i)=>config.difficulty[`trial${i}IsGo`]); return configured.every(v=>v===0||v===1)?configured.map(Number):generateTrialSequence(trialCount); }, [trialCount, config.difficulty]);

  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [errors, setErrors] = useState<number | null>(null);
  const [scoreValue, setScoreValue] = useState<number | null>(null);

  const trialOnsetRef = useRef(0);
  const respondedRef = useRef(false);
  const eventsRef = useRef<MicrogameInputEvent[]>([]);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTrial(index: number) {
    respondedRef.current = false;
    setPhase("waiting");
    const gap = randomBetween(minGapMs, maxGapMs);

    gapTimerRef.current = setTimeout(() => {
      trialOnsetRef.current = nowMs();
      setPhase("live");
      windowTimerRef.current = setTimeout(() => {
        if (respondedRef.current) return;
        respondedRef.current = true;
        recordTrial(index, "timeout");
      }, responseWindowMs);
    }, gap);
  }

  function recordTrial(index: number, kind: "tap" | "timeout") {
    if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    eventsRef.current.push({
      type: kind,
      clientTimestamp: nowMs() - trialOnsetRef.current,
      data: { trial: index },
    });

    const nextIndex = index + 1;
    if (nextIndex < trialCount) {
      setTrialIndex(nextIndex);
      startTrial(nextIndex);
      return;
    }
    finish();
  }

  function finish() {
    const effectiveConfig: MicrogameConfig = {
      ...config,
      difficulty: {
        ...config.difficulty,
        trialCount,
        responseWindowMs,
        ...Object.fromEntries(trialSequence.map((isGo, i) => [`trial${i}IsGo`, isGo])),
      },
    };
    const events = eventsRef.current;

    const errorCount = computeDontTapErrors(effectiveConfig, events);
    const score = computeDontTapScore(effectiveConfig, events);
    const plausible = isDontTapResultPlausible(effectiveConfig, events);

    setErrors(errorCount);
    setScoreValue(score);
    setPhase("result");
    hapticResult(plausible && errorCount === 0);

    const performanceScore = Math.max(0, Math.round(1000 - errorCount * 150));

    resultTimerRef.current = setTimeout(() => {
      onFinish({
        rawScore: score,
        metricDirection: "lower_is_better",
        inputEvents: events,
        clientComputedScore: score,
        failed: !plausible,
        failureReason: plausible ? undefined : "invalid_sequence",
        feedback: {
          primaryLabel: "CONTROL",
          primaryValue: `${trialCount - errorCount}/${trialCount}`,
          targetLabel: "TRIALS",
          targetValue: `${trialCount} · ${responseWindowMs}ms EACH`,
          errorLabel: "ERRORS",
          errorValue: errorCount === 0 ? "NONE" : String(errorCount),
          direction: errorCount === 0 ? "exact" : "none",
          accuracyPct: (100 * (trialCount - errorCount)) / trialCount,
          rating: errorCount === 0 ? "perfect" : errorCount <= 1 ? "great" : errorCount <= 2 ? "good" : "poor",
          performanceScore,
          secondaryStats: [
            { label: "CORRECT", value: `${trialCount - errorCount}/${trialCount}`, tone: errorCount === 0 ? "good" : "neutral" },
          ],
          message:
            errorCount === 0
              ? "Perfect control across every trial."
              : `${errorCount} trial${errorCount === 1 ? "" : "s"} missed or mistapped.`,
        },
      });
    }, RESULT_REVEAL_MS);
  }

  useEffect(() => {
    startTrial(0);
    return () => {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTap() {
    if (phase !== "live" || respondedRef.current) return;
    respondedRef.current = true;
    recordTrial(trialIndex, "tap");
  }

  const currentIsGo = trialSequence[trialIndex] ?? 1;

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
        gap: "1.5rem",
        background: "var(--bg)",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {phase !== "result" && (
        <p className="game-instruction" style={{ color: "var(--muted)" }}>
          TRIAL {trialIndex + 1} / {trialCount}
        </p>
      )}

      {phase === "waiting" && <div style={{ width: "9rem", height: "9rem" }} />}

      {phase === "live" && (
        <>
          {currentIsGo === 1 ? (
            <div
              style={{
                width: "9rem",
                height: "9rem",
                borderRadius: "50%",
                background: "var(--survive)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "var(--bg)", fontWeight: 700, fontSize: "1.1rem" }}>TAP</span>
            </div>
          ) : (
            <div
              style={{
                width: "9rem",
                height: "9rem",
                background: "var(--cut)",
                clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: "1.2rem",
              }}
            >
              <span style={{ color: "var(--bg)", fontWeight: 700, fontSize: "1rem" }}>DON'T</span>
            </div>
          )}
        </>
      )}

      {phase === "result" && errors !== null && scoreValue !== null && (
        <div className="result-reveal" style={{ textAlign: "center" }}>
          <p className="game-headline" style={{ color: errors === 0 ? "var(--survive)" : "var(--cut)" }}>
            {trialCount - errors}/{trialCount}
          </p>
          <p className="game-instruction" style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
            {errors === 0 ? "PERFECT CONTROL" : `${errors} MISSED`}
          </p>
        </div>
      )}
    </div>
  );
}
