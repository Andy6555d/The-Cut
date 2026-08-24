"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nowMs, RESULT_REVEAL_MS } from "@/lib/microgames/engine/timing";
import { hapticResult, hapticAnticipationTick } from "@/lib/microgames/engine/haptics";
import { soundGood, soundBad, soundTap } from "@/lib/microgames/engine/sound";
import { ReadyCountdown } from "@/lib/microgames/engine/ReadyCountdown";
import type { MicrogameConfig, MicrogameInputEvent, MicrogameResult } from "@/lib/microgames/engine/types";
import { computeMemoryGridErrors, computeMemoryGridScore, isMemoryGridResultPlausible } from "./scorer";

type Phase = "countdown" | "showing" | "input" | "result";

function generatePattern(cellCount: number, patternLength: number): number[] {
  const indices = Array.from({ length: cellCount }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = indices[i], b = indices[j];
    if (a === undefined || b === undefined) continue;
    indices[i] = b;
    indices[j] = a;
  }
  return indices.slice(0, patternLength);
}

export function MemoryGridGame({ config, onFinish }: { config: MicrogameConfig; onFinish: (result: MicrogameResult) => void }) {
  const gridSize = config.difficulty.gridSize ?? 3;
  const patternLength = config.difficulty.patternLength ?? 4;
  const showMs = config.difficulty.showMs ?? 1200;
  // Countdown pressure on the RECALL step itself, not just the reveal —
  // defaults to 5 seconds. Running out submits whatever's selected so far.
  const answerDeadlineMs = config.difficulty.answerDeadlineMs ?? 5000;
  const cellCount = gridSize * gridSize;

  const [phase, setPhase] = useState<Phase>("countdown");
  const [selected, setSelected] = useState<number[]>([]);
  const [errors, setErrors] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(answerDeadlineMs);

  const inputStartRef = useRef<number | null>(null);
  const selectedRef = useRef<number[]>([]);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  const pattern = useMemo(() => { const configured=Array.from({length:patternLength},(_,i)=>config.difficulty[`pattern${i}`]).filter((v): v is number => typeof v === "number"); return configured.length===patternLength?configured:generatePattern(cellCount, patternLength); }, [cellCount, patternLength, config.difficulty]);
  const patternSet = useMemo(() => new Set(pattern), [pattern]);

  const submit = useCallback(
    (finalSelection: number[]) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);

      const effectiveConfig: MicrogameConfig = {
        ...config,
        difficulty: {
          ...config.difficulty,
          gridSize,
          patternLength,
          ...Object.fromEntries(pattern.map((idx, i) => [`pattern${i}`, idx])),
        },
      };
      const responseTimeMs = inputStartRef.current == null ? 0 : nowMs() - inputStartRef.current;
      const events: MicrogameInputEvent[] = finalSelection.map((idx, i) => ({
        type: "tap",
        clientTimestamp: responseTimeMs + i,
        data: { cellIndex: idx },
      }));

      const err = computeMemoryGridErrors(effectiveConfig, events);
      const score = computeMemoryGridScore(effectiveConfig, events);
      const plausible = isMemoryGridResultPlausible(effectiveConfig, events);
      const accuracy = Math.max(0, (100 * (patternLength - err)) / Math.max(patternLength, 1));
      const performanceScore = Math.max(0, Math.round(accuracy * 8 + Math.max(0, 200 - responseTimeMs / 15)));

      setErrors(err);
      setPhase("result");
      hapticResult(plausible && err === 0); if (plausible && err === 0) soundGood(); else soundBad();

      resultTimerRef.current = setTimeout(
        () =>
          onFinish({
            rawScore: score,
            metricDirection: "lower_is_better",
            inputEvents: events,
            clientComputedScore: score,
            failed: !plausible,
            failureReason: plausible ? undefined : "invalid_selection",
            feedback: {
              primaryLabel: "MATCHED",
              primaryValue: `${Math.max(0, patternLength - err)}/${patternLength}`,
              targetLabel: "PATTERN",
              targetValue: `${patternLength} CELLS`,
              errorLabel: "ERRORS",
              errorValue: err === 0 ? "NONE" : String(err),
              direction: err === 0 ? "exact" : "none",
              accuracyPct: accuracy,
              rating: err === 0 ? "perfect" : err === 1 ? "great" : err === 2 ? "good" : "poor",
              performanceScore,
              timeMs: responseTimeMs,
              secondaryStats: [
                { label: "TIME", value: `${(responseTimeMs / 1000).toFixed(2)}s`, tone: responseTimeMs < 1800 ? "good" : responseTimeMs < 3000 ? "warn" : "neutral" },
                { label: "MATCH", value: `${Math.max(0, patternLength - err)}/${patternLength}`, tone: err === 0 ? "good" : "neutral" },
              ],
              message: err === 0 ? "Perfect recall — now chase a faster answer." : `${err} cell${err === 1 ? "" : "s"} missed. Accuracy first; then speed.`,
            },
          }),
        RESULT_REVEAL_MS
      );
    },
    [config, gridSize, patternLength, pattern, onFinish]
  );

  const begin = useCallback(() => {
    setPhase("showing");
    showTimerRef.current = setTimeout(() => {
      inputStartRef.current = nowMs();
      selectedRef.current = [];
      submittedRef.current = false;
      setSelected([]);
      setRemainingMs(answerDeadlineMs);
      setPhase("input");

      const deadlineAt = nowMs() + answerDeadlineMs;
      tickRef.current = setInterval(() => {
        const left = Math.max(0, deadlineAt - nowMs());
        setRemainingMs(left);
      }, 100);

      deadlineTimerRef.current = setTimeout(() => {
        submit(selectedRef.current);
      }, answerDeadlineMs);
    }, showMs);
  }, [showMs, answerDeadlineMs, submit]);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    },
    []
  );

  function handleCellTap(cellIndex: number) {
    if (phase !== "input" || selectedRef.current.includes(cellIndex)) return;
    // A tiny per-tap cue reinforcing the instant correct/wrong reveal above
    // — deliberately lighter than the round-level result sound/haptic.
    if (patternSet.has(cellIndex)) soundTap(); else hapticAnticipationTick();
    const next = [...selectedRef.current, cellIndex];
    selectedRef.current = next;
    setSelected(next);
    if (next.length >= patternLength) submit(next);
  }

  if (phase === "countdown") return <ReadyCountdown accent="#1ea7ff" label="FLASH · READY" onComplete={begin} />;

  const remainingSeconds = (remainingMs / 1000).toFixed(1);
  const urgent = remainingMs < 1500;

  return (
    <div className="game-stage" style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", padding: "2rem" }}>
      <p className="game-instruction" style={{ color: "var(--muted)" }}>
        {phase === "showing" ? "LOCK IT IN" : phase === "input" ? "REBUILD THE FLASH" : "RESULT"}
      </p>

      {phase === "input" && (
        <p className="game-number" style={{ fontSize: "1.6rem", color: urgent ? "var(--cut)" : "var(--warn)" }}>
          {remainingSeconds}s
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize},1fr)`, gap: ".6rem", width: "min(70vw,320px)" }}>
        {Array.from({ length: cellCount }, (_, i) => i).map((cellIndex) => {
          const isLit = phase === "showing" && patternSet.has(cellIndex);
          const isSelected = phase !== "showing" && selected.includes(cellIndex);
          // Correct/wrong now reveals the INSTANT you tap, not just at the
          // end of the round — the same "green tile" micro-reward that
          // makes each individual guess feel like a small win, not just
          // the final outcome.
          const correct = isSelected && patternSet.has(cellIndex);
          const wrong = isSelected && !patternSet.has(cellIndex);
          return (
            <button
              key={cellIndex}
              onPointerDown={() => handleCellTap(cellIndex)}
              disabled={phase !== "input"}
              style={{
                aspectRatio: "1",
                borderRadius: "10px",
                border: "1px solid rgba(245,245,247,.15)",
                boxShadow: isLit ? "0 0 24px rgba(30,167,255,.45)" : correct ? "0 0 18px rgba(0,229,160,.4)" : "none",
                background: correct ? "var(--survive)" : wrong ? "var(--cut)" : isLit ? "#1ea7ff" : "rgba(245,245,247,.05)",
                transition: "all .16s ease",
              }}
            />
          );
        })}
      </div>

      {phase === "result" && errors !== null && (
        <p className="game-number" style={{ color: errors === 0 ? "var(--survive)" : "var(--cut)" }}>
          {errors === 0 ? "PERFECT" : `${errors} MISS`}
        </p>
      )}
    </div>
  );
}
