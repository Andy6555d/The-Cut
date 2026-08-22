"use client";

import { useState } from "react";
import { getAdaptivePracticeConfig, getPracticeLevel } from "@/lib/microgames/engine/adaptiveDifficulty";
import { PracticeIntro } from "@/lib/microgames/engine/PracticeIntro";
import { PracticeSummary } from "@/lib/microgames/engine/PracticeSummary";
import { ExactGame } from "@/lib/microgames/exact/client";
import { recordPracticeScore, getPracticeStats } from "@/lib/microgames/engine/personalBests";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { hapticNewBest } from "@/lib/microgames/engine/haptics";
import { getInstructionForConfig } from "@/lib/microgames/engine/gameInstructions";

const CONFIG: MicrogameConfig = {
  microgameId: "exact",
  version: 1,
  difficulty: { targetSeconds: 3.0, hideAfterMs: 800 },
  seed: 0,
};

type Phase = "intro" | "playing" | "summary";

export default function ExactGamePracticePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastResult, setLastResult] = useState<MicrogameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  function start() {
    setRunKey((k) => k + 1);
    setPhase("playing");
    track("practice_started", { microgameId: "exact" });
  }

  function handleFinish(result: MicrogameResult) {
    setLastResult(result);
    if (!result.failed) {
      const prevBest = getPracticeStats("exact", "lower_is_better").best;
      setPreviousBest(prevBest);
      const newBest = prevBest === null || result.rawScore < prevBest;
      setIsNewBest(newBest);
      if (newBest) hapticNewBest();
      recordPracticeScore("exact", result.rawScore);
    } else {
      setPreviousBest(null);
      setIsNewBest(false);
    }
    setPhase("summary");
    track("practice_completed", { microgameId: "exact", score: result.rawScore, failed: !!result.failed });
  }

  if (phase === "intro") {
    return (
      <PracticeIntro
        title="ZERO"
        instructions={getInstructionForConfig(getAdaptivePracticeConfig(CONFIG))}
        onStart={start}
        level={getPracticeLevel(CONFIG.microgameId)}
      />
    );
  }

  if (phase === "playing") {
    return <ExactGame key={runKey} config={getAdaptivePracticeConfig(CONFIG)} onFinish={handleFinish} />;
  }

  return (
    <PracticeSummary
      microgameId="exact"
      gameName="ZERO"
      metricDirection="lower_is_better"
      formatScore={(s) => `${s.toFixed(3)}s`}
      result={lastResult!}
      previousBest={previousBest}
      isNewBest={isNewBest}
      onPlayAgain={start}
    />
  );
}
