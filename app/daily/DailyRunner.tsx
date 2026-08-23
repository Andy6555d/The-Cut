"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReactGame } from "@/lib/microgames/react/client";
import { StopGame } from "@/lib/microgames/stop/client";
import { CentreGame } from "@/lib/microgames/centre/client";
import { ExactGame } from "@/lib/microgames/exact/client";
import { HalfGame } from "@/lib/microgames/half/client";
import { BiggerGame } from "@/lib/microgames/bigger/client";
import { MemoryGridGame } from "@/lib/microgames/memory-grid/client";
import { CountGame } from "@/lib/microgames/count/client";
import { DontTapGame } from "@/lib/microgames/dont-tap/client";
import { TraceGame } from "@/lib/microgames/trace/client";
import { hapticResult } from "@/lib/microgames/engine/haptics";
import { Celebration } from "@/lib/microgames/engine/Celebration";
import { soundCut, soundSurvived } from "@/lib/microgames/engine/sound";
import type { ResultFeedback } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { Countdown } from "@/lib/microgames/engine/Countdown";
import { withPlayerTimeZone } from "@/lib/domain/timezone/browserTimezone";
import { localWeeklyPressure } from "@/lib/domain/daily-generation/weeklyPressure";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { ShareSheet } from "@/lib/share/ShareSheet";
import { GAME_DISPLAY_NAMES, getGameInstruction } from "@/lib/microgames/engine/gameInstructions";

interface RoundInfo {
  roundNumber: number;
  microgameId: string;
  difficultyConfig: Record<string, number>;
  cutoffValue: number;
  targetSurvivalPct: number;
}

type Phase =
  | "starting"
  | "pre-round"
  | "playing"
  | "round-result"
  | "eliminated"
  | "success"
  | "already-played"
  | "error";

// Same components practice mode uses — the Daily engine doesn't care
// whether it's practice or official, only the score submission path
// differs.
const GAME_COMPONENTS: Record<
  string,
  React.ComponentType<{ config: MicrogameConfig; onFinish: (r: MicrogameResult) => void }>
> = {
  react: ReactGame,
  stop: StopGame,
  centre: CentreGame,
  exact: ExactGame,
  half: HalfGame,
  bigger: BiggerGame,
  "memory-grid": MemoryGridGame,
  count: CountGame,
  "dont-tap": DontTapGame,
  trace: TraceGame,
};


const ROUND_RESULT_HOLD_MS = 2400;

function targetLabel(pct: number): string {
  return `THE ${Math.round(pct * 100)}% CUT`;
}

export function DailyRunner() {
  const [phase, setPhase] = useState<Phase>("starting");
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [lastResult, setLastResult] = useState<{ survived: boolean; rawScore: number; cutoffValue: number; feedback?: ResultFeedback } | null>(null);
  const [roundsSurvived, setRoundsSurvived] = useState(0);
  const [estimatedPercentile, setEstimatedPercentile] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalPlayersToday, setTotalPlayersToday] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startAttempt();
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function captureFinalizeFields(data: Record<string, unknown>) {
    setRoundsSurvived(Number(data.roundsSurvived ?? 0));
    setEstimatedPercentile((data.estimatedPercentile as number | null | undefined) ?? null);
    setCurrentStreak(Number(data.currentStreak ?? 0));
    setTotalPlayersToday((data.totalPlayersToday as number | null | undefined) ?? null);
  }

  async function startAttempt() {
    try {
      const res = await fetch("/api/attempt/start", { method: "POST", headers: withPlayerTimeZone() });
      const data = await res.json();

      if (res.status === 409 && data?.error === "already_played") {
        setPhase("already-played");
        return;
      }
      if (!res.ok) {
        setErrorMessage(String(data?.error ?? "unknown_error"));
        setPhase("error");
        return;
      }

      if (data.status === "all_rounds_complete") {
        captureFinalizeFields(data);
        setTotalRounds(Number(data.totalRounds ?? 0));
        setPhase(data.eliminated ? "eliminated" : "success");
        return;
      }

      setAttemptToken(data.attemptToken);
      setTotalRounds(Number(data.totalRounds));
      setRound(data.round);
      track("daily_started", {});
      setPhase("pre-round");
    } catch {
      setErrorMessage("network_error");
      setPhase("error");
    }
  }

  async function handleGameFinish(result: MicrogameResult) {
    if (!round || !attemptToken) return;

    try {
      const res = await fetch("/api/attempt/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptToken,
          roundNumber: round.roundNumber,
          events: result.inputEvents,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(String(data?.error ?? "unknown_error"));
        setPhase("error");
        return;
      }

      const survived = !!data.survived;
      setLastResult({ survived, rawScore: Number(data.rawScore), cutoffValue: Number(data.cutoffValue), feedback: result.feedback });
      hapticResult(survived);
      if (survived) soundSurvived(); else soundCut();
      track("round_completed", { microgameId: round.microgameId, round: round.roundNumber, survived });
      setPhase("round-result");

      if (data.eliminated) {
        captureFinalizeFields(data);
        track("player_eliminated", { round: round.roundNumber });
        advanceTimerRef.current = setTimeout(() => setPhase("eliminated"), ROUND_RESULT_HOLD_MS);
        return;
      }

      if (data.completedAllRounds) {
        captureFinalizeFields(data);
        track("daily_completed", {});
        advanceTimerRef.current = setTimeout(() => setPhase("success"), ROUND_RESULT_HOLD_MS);
        return;
      }

      // Survived, more rounds remain.
      setRoundsSurvived((prev) => prev + 1);
      advanceTimerRef.current = setTimeout(() => {
        setAttemptToken(data.attemptToken);
        setRound(data.nextRound);
        setPhase("pre-round");
      }, ROUND_RESULT_HOLD_MS);
    } catch {
      setErrorMessage("network_error");
      setPhase("error");
    }
  }

  function handleShare() {
    setShareOpen(true);
  }

  if (phase === "starting") {
    return <CenteredMessage>Starting today's run…</CenteredMessage>;
  }

  if (phase === "error") {
    return (
      <CenteredMessage>
        Something went wrong{errorMessage ? ` (${errorMessage})` : ""}. Try reloading.
      </CenteredMessage>
    );
  }

  if (phase === "already-played") {
    return (
      <CenteredMessage>
        <p className="game-headline">ALREADY PLAYED</p>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
          You've used today's official attempt. Your next Cut unlocks at midnight in your local timezone.
        </p>
        <p className="game-instruction" style={{ color: "var(--warn)", marginTop: "1rem" }}>NEXT ATTEMPT</p>
        <Countdown />
      </CenteredMessage>
    );
  }

  if (phase === "pre-round" && round) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "var(--bg)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div className="weekly-pressure-banner"><strong>{localWeeklyPressure().day} · {localWeeklyPressure().tier}</strong><span>{localWeeklyPressure().note} Weekly pressure resets Sunday at your midnight.</span></div>
        <p className="game-instruction" style={{ color: "var(--warn)" }}>
          {targetLabel(round.targetSurvivalPct)}
        </p>
        <h1 className="game-headline" style={{margin:".1rem 0"}}>{GAME_DISPLAY_NAMES[round.microgameId] ?? round.microgameId}</h1>
        <p style={{ color: "var(--fg)", maxWidth: "32rem", lineHeight: 1.55, margin: ".25rem 0" }}>
          {getGameInstruction(round.microgameId, round.difficultyConfig)}
        </p>
        <p style={{ color: "var(--muted)" }}>
          Round {round.roundNumber} of {totalRounds}
        </p>
        <button onPointerDown={() => setPhase("playing")} className="big-tap-button" style={{ marginTop: "1rem" }}>
          START
        </button>
      </div>
    );
  }

  if (phase === "playing" && round) {
    const GameComponent = GAME_COMPONENTS[round.microgameId];
    if (!GameComponent) {
      return <CenteredMessage>Unknown game "{round.microgameId}" — this round can't be played yet.</CenteredMessage>;
    }
    const config: MicrogameConfig = {
      microgameId: round.microgameId,
      version: 1,
      difficulty: round.difficultyConfig,
      seed: 0,
    };
    return <GameComponent config={config} onFinish={handleGameFinish} />;
  }

  if (phase === "round-result" && lastResult) {
    const fb = lastResult.feedback;
    const margin = lastResult.cutoffValue - lastResult.rawScore;
    return (
      <div className={`daily-round-result ${lastResult.survived ? "daily-survived" : "daily-cut"}`}>
        {lastResult.survived && <Celebration />}
        <div className="daily-result-card result-reveal">
          <p className="result-kicker">{round ? `ROUND ${round.roundNumber} · ${targetLabel(round.targetSurvivalPct)}` : "DAILY"}</p>
          <h1 className={`daily-result-word ${lastResult.survived ? "survive-text" : "cut-text"}`}>
            {lastResult.survived ? "SURVIVED" : "CUT."}
          </h1>
          {fb?.targetValue && <div className="target-chip"><span>{fb.targetLabel ?? "TARGET"}</span><strong>{fb.targetValue}</strong></div>}
          <p className="result-primary-label">{fb?.primaryLabel ?? "YOUR SCORE"}</p>
          <p className="result-primary-value">{fb?.primaryValue ?? lastResult.rawScore.toFixed(3)}</p>
          {fb?.errorValue && <div className={`error-readout direction-${fb.direction ?? "none"}`}><span>{fb.errorLabel ?? "ERROR"}</span><strong>{fb.errorValue}</strong></div>}
          {fb?.secondaryStats && fb.secondaryStats.length > 0 && (
            <div className="secondary-stats-grid">
              {fb.secondaryStats.map((stat) => <div key={stat.label} className={`secondary-stat tone-${stat.tone ?? "neutral"}`}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}
            </div>
          )}
          {typeof fb?.performanceScore === "number" && <div className="performance-score-row"><span>PERFORMANCE</span><strong>{fb.performanceScore}<small>/1000</small></strong></div>}
          {typeof fb?.thresholdPct === "number" && <div className={`threshold-callout ${fb.thresholdPassed ? "threshold-pass" : "threshold-miss"}`}><span>{fb.thresholdPassed ? "✓ THRESHOLD CLEARED" : "ACCURACY THRESHOLD"}</span><strong>{fb.thresholdPct.toFixed(0)}%</strong><small>{fb.thresholdPassed ? "Speed bonus active" : "Accuracy first, then speed"}</small></div>}
          <div className="cutoff-box">
            <span>SURVIVAL LIMIT</span>
            <strong>≤ {lastResult.cutoffValue.toFixed(3)}</strong>
            <small>{lastResult.survived ? `${Math.max(0, margin).toFixed(3)} inside the cut` : `${Math.abs(margin).toFixed(3)} outside the cut`}</small>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "eliminated" || phase === "success") {
    const eliminated = phase === "eliminated";
    const beatenEstimate =
      totalPlayersToday !== null && estimatedPercentile !== null
        ? Math.max(0, Math.round(totalPlayersToday * (1 - estimatedPercentile)))
        : null;

    return (
      <CenteredMessage>
        <p className="game-headline" style={{ color: eliminated ? "var(--cut)" : "var(--survive)" }}>
          {eliminated ? "CUT." : "YOU SURVIVED."}
        </p>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
          {eliminated ? `You reached round ${roundsSurvived + 1} of ${totalRounds}.` : `All ${totalRounds} rounds.`}
        </p>

        {estimatedPercentile !== null && (
          <p className="game-instruction" style={{ color: "var(--warn)", marginTop: "0.75rem" }}>
            CURRENTLY ~TOP {Math.round(estimatedPercentile * 100)}%
          </p>
        )}

        {beatenEstimate !== null && totalPlayersToday !== null && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
            ~{beatenEstimate.toLocaleString()} of {totalPlayersToday.toLocaleString()} players today
          </p>
        )}

        {currentStreak > 0 && (
          <p style={{ color: "var(--fg)", marginTop: "1rem" }}>🔥 {currentStreak} day streak</p>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onPointerDown={handleShare} className="big-tap-button">
            SHARE
          </button>
          <Link href="/practice" className="secondary-link">
            PRACTICE
          </Link>
        </div>
        {eliminated && (
          <p style={{ marginTop: "1.25rem" }}>
            <Link href="/levels" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Want something more forgiving? Try Levels →
            </Link>
          </p>
        )}
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={{
            mode: "daily",
            headline: eliminated ? "I TOOK THE CUT" : "I SURVIVED THE CUT",
            score: eliminated ? `${roundsSurvived} ROUND${roundsSurvived === 1 ? "" : "S"} SURVIVED` : `ALL ${totalRounds} ROUNDS SURVIVED`,
            detail: estimatedPercentile !== null ? `Currently about top ${Math.round(estimatedPercentile * 100)}% today` : undefined,
            rank: currentStreak > 0 ? `${currentStreak} day streak` : undefined,
            cta: "You get one shot today. Beat me.",
          }}
        />
      </CenteredMessage>
    );
  }

  return <CenteredMessage>Loading…</CenteredMessage>;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        background: "var(--bg)",
        padding: "2rem",
        textAlign: "center",
        color: "var(--fg)",
      }}
    >
      {children}
    </div>
  );
}
