"use client";

import { useState } from "react";
import { getAdaptivePracticeConfig, getPracticeLevel } from "@/lib/microgames/engine/adaptiveDifficulty";
import { PracticeIntro } from "@/lib/microgames/engine/PracticeIntro";
import { PracticeSummary } from "@/lib/microgames/engine/PracticeSummary";
import { ReactGame } from "@/lib/microgames/react/client";
import { recordPracticeScore, getPracticeStats } from "@/lib/microgames/engine/personalBests";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { hapticNewBest } from "@/lib/microgames/engine/haptics";

const CONFIG: MicrogameConfig = {
  microgameId: "react",
  version: 1,
  difficulty: { minDelayMs: 1200, maxDelayMs: 3600 },
  seed: 0,
};

type Phase = "intro" | "playing" | "summary";

export default function ReactPracticePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastResult, setLastResult] = useState<MicrogameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  function start() {
    setRunKey((k) => k + 1);
    setPhase("playing");
    track("practice_started", { microgameId: "react" });
  }

  function handleFinish(result: MicrogameResult) {
    setLastResult(result);
    if (!result.failed) {
      const prevBest = getPracticeStats("react", "lower_is_better").best;
      setPreviousBest(prevBest);
      const newBest = prevBest === null || result.rawScore < prevBest;
      setIsNewBest(newBest);
      if (newBest) hapticNewBest();
      recordPracticeScore("react", result.rawScore);
    } else {
      setPreviousBest(null);
      setIsNewBest(false);
    }
    setPhase("summary");
    track("practice_completed", { microgameId: "react", score: result.rawScore, failed: !!result.failed });
  }

  if (phase === "intro") {
    return (
      <PracticeIntro
        title="SNAP"
        instructions="Wait for GO. Tap the instant it appears. Do not tap early."
        onStart={start}
        level={getPracticeLevel(CONFIG.microgameId)}
      />
    );
  }

  if (phase === "playing") {
    return <ReactGame key={runKey} config={getAdaptivePracticeConfig(CONFIG)} onFinish={handleFinish} />;
  }

  return (
    <PracticeSummary
      microgameId="react"
      gameName="SNAP"
      metricDirection="lower_is_better"
      formatScore={(s) => `${Math.round(s)}ms`}
      result={lastResult!}
      previousBest={previousBest}
      isNewBest={isNewBest}
      onPlayAgain={start}
    />
  );
}
