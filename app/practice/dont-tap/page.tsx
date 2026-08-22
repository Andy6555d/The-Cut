"use client";

import { useState } from "react";
import { getAdaptivePracticeConfig, getPracticeLevel } from "@/lib/microgames/engine/adaptiveDifficulty";
import { PracticeIntro } from "@/lib/microgames/engine/PracticeIntro";
import { PracticeSummary } from "@/lib/microgames/engine/PracticeSummary";
import { DontTapGame } from "@/lib/microgames/dont-tap/client";
import { recordPracticeScore, getPracticeStats } from "@/lib/microgames/engine/personalBests";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { hapticNewBest } from "@/lib/microgames/engine/haptics";

const CONFIG: MicrogameConfig = {
  microgameId: "dont-tap",
  version: 1,
  difficulty: { trialCount: 8, responseWindowMs: 500, minDelayMs: 200, maxDelayMs: 500 },
  seed: 0,
};

type Phase = "intro" | "playing" | "summary";

export default function DontTapGamePracticePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastResult, setLastResult] = useState<MicrogameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  function start() {
    setRunKey((k) => k + 1);
    setPhase("playing");
    track("practice_started", { microgameId: "dont-tap" });
  }

  function handleFinish(result: MicrogameResult) {
    setLastResult(result);
    if (!result.failed) {
      const prevBest = getPracticeStats("dont-tap-performance", "higher_is_better").best;
      setPreviousBest(prevBest);
      const practiceScore = result.feedback?.performanceScore ?? 0;
      const newBest = prevBest === null || practiceScore > prevBest;
      setIsNewBest(newBest);
      if (newBest) hapticNewBest();
      recordPracticeScore("dont-tap-performance", practiceScore);
    } else {
      setPreviousBest(null);
      setIsNewBest(false);
    }
    setPhase("summary");
    track("practice_completed", { microgameId: "dont-tap", score: result.rawScore, failed: !!result.failed });
  }

  if (phase === "intro") {
    return (
      <PracticeIntro
        title="NOPE"
        instructions="Tap the circle. Do not tap the triangle. React correctly before each trial moves on."
        onStart={start}
        level={getPracticeLevel(CONFIG.microgameId)}
      />
    );
  }

  if (phase === "playing") {
    return <DontTapGame key={runKey} config={getAdaptivePracticeConfig(CONFIG)} onFinish={handleFinish} />;
  }

  return (
    <PracticeSummary
      microgameId="dont-tap-performance"
      gameName="NOPE"
      metricDirection="higher_is_better"
      formatScore={(s) => `${Math.round(s)}/1000`}
      result={lastResult!}
      previousBest={previousBest}
      isNewBest={isNewBest}
      onPlayAgain={start}
    />
  );
}
