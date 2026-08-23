"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { getConfigForTier } from "@/lib/microgames/engine/adaptiveDifficulty";
import { hapticResult, hapticNewBest } from "@/lib/microgames/engine/haptics";
import { track } from "@/lib/analytics/track";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";

const GAME_SLUGS = ["react", "stop", "centre", "exact", "half", "bigger", "memory-grid", "count", "dont-tap", "trace"] as const;
type GameSlug = (typeof GAME_SLUGS)[number];

const GAME_COMPONENTS: Record<GameSlug, React.ComponentType<{ config: MicrogameConfig; onFinish: (r: MicrogameResult) => void }>> = {
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

const BEST_LEVEL_KEY = "the_cut_levels_best";
// How many levels it takes to go from the easiest tier to the hardest.
// Higher = more gradual. 72 levels across 9 tier-steps is roughly 8
// levels per tier — a genuinely slow ramp, not a handful of big jumps.
const LEVELS_PER_FULL_RAMP = 72;

function tierForLevel(level: number): number {
  return Math.min(10, 1 + ((level - 1) * 9) / (LEVELS_PER_FULL_RAMP - 1));
}

function getBestLevel(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(BEST_LEVEL_KEY);
  return raw ? Number(raw) || 0 : 0;
}

function saveBestLevel(level: number) {
  if (typeof window === "undefined") return;
  if (level > getBestLevel()) window.localStorage.setItem(BEST_LEVEL_KEY, String(level));
}

type Phase = "intro" | "pre-level" | "playing" | "failed";

export function LevelsRunner() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1);
  const [currentGame, setCurrentGame] = useState<GameSlug | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const bestBeforeRunRef = useRef(getBestLevel());

  const pickGame = useCallback((): GameSlug => {
    const idx = Math.floor(Math.random() * GAME_SLUGS.length);
    return GAME_SLUGS[idx] ?? "react";
  }, []);

  const startLevel = useCallback(
    (targetLevel: number) => {
      setLevel(targetLevel);
      setCurrentGame(pickGame());
      setPhase("pre-level");
    },
    [pickGame]
  );

  function beginRun() {
    bestBeforeRunRef.current = getBestLevel();
    startLevel(1);
    track("levels_run_started", {});
  }

  function handleFinish(result: MicrogameResult) {
    hapticResult(!result.failed);

    if (result.failed) {
      track("levels_level_failed", { level, microgameId: currentGame });
      setPhase("failed");
      return;
    }

    saveBestLevel(level);
    if (level > bestBeforeRunRef.current) {
      setIsNewBest(true);
      hapticNewBest();
    }
    track("levels_level_cleared", { level, microgameId: currentGame });
    startLevel(level + 1);
  }

  const config: MicrogameConfig | null = useMemo(() => {
    if (!currentGame) return null;
    return getConfigForTier({ microgameId: currentGame, version: 1, difficulty: {}, seed: 0 }, tierForLevel(level));
  }, [currentGame, level]);

  if (phase === "intro") {
    const best = getBestLevel();
    return (
      <Centered>
        <p className="game-instruction" style={{ color: "var(--muted)" }}>
          LEVELS
        </p>
        <h1 className="game-headline" style={{ fontSize: "2rem" }}>
          Climb as far as you can
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "22rem", margin: "0.75rem 0 0" }}>
          A random game each level, starting easy and getting harder very
          gradually. No streak, no ranking — just see how far you get. Miss a
          level and try it again, no penalty.
        </p>
        {best > 0 && (
          <p className="game-instruction" style={{ color: "var(--warn)", marginTop: "1rem" }}>
            BEST: LEVEL {best}
          </p>
        )}
        <button onPointerDown={beginRun} className="big-tap-button" style={{ marginTop: "1.5rem" }}>
          START
        </button>
        <Link href="/" className="secondary-link" style={{ marginTop: "1rem" }}>
          BACK HOME
        </Link>
      </Centered>
    );
  }

  if (phase === "pre-level" && currentGame) {
    return (
      <Centered>
        <p className="game-instruction" style={{ color: "var(--warn)" }}>
          LEVEL {level}
        </p>
        <p style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem" }}>
          {currentGame.replace("-", " ")}
        </p>
        <button onPointerDown={() => setPhase("playing")} className="big-tap-button" style={{ marginTop: "1.5rem" }}>
          GO
        </button>
      </Centered>
    );
  }

  if (phase === "playing" && currentGame && config) {
    const GameComponent = GAME_COMPONENTS[currentGame];
    if (!GameComponent) return <Centered>Something went wrong loading that game.</Centered>;
    return <GameComponent config={config} onFinish={handleFinish} />;
  }

  if (phase === "failed") {
    return (
      <Centered>
        <p className="game-headline" style={{ color: "var(--cut)" }}>
          LEVEL {level}
        </p>
        <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
          That one didn't land — you'd cleared {Math.max(0, level - 1)} level{level - 1 === 1 ? "" : "s"} so far.
        </p>
        {isNewBest && (
          <p className="game-instruction new-best-badge" style={{ color: "var(--warn)", marginTop: "0.75rem" }}>
            NEW BEST
          </p>
        )}
        <div style={{ display: "flex", gap: "1rem", marginTop: "1.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onPointerDown={() => startLevel(level)} className="big-tap-button">
            RETRY THIS LEVEL
          </button>
          <button onPointerDown={beginRun} className="secondary-link" style={{ cursor: "pointer" }}>
            START OVER
          </button>
        </div>
        <Link href="/" className="secondary-link" style={{ marginTop: "1rem" }}>
          BACK HOME
        </Link>
      </Centered>
    );
  }

  return <Centered>Loading…</Centered>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.35rem",
        background: "var(--bg)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
