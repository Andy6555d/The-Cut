"use client";

import { useState } from "react";
import { getAdaptivePracticeConfig, getPracticeLevel } from "@/lib/microgames/engine/adaptiveDifficulty";
import { PracticeIntro } from "@/lib/microgames/engine/PracticeIntro";
import { PracticeSummary } from "@/lib/microgames/engine/PracticeSummary";
import { CountGame } from "@/lib/microgames/count/client";
import { recordPracticeScore, getPracticeStats } from "@/lib/microgames/engine/personalBests";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { hapticNewBest } from "@/lib/microgames/engine/haptics";

const CONFIG: MicrogameConfig = {
  microgameId: "count",
  version: 1,
  difficulty: { showMs: 900, minCount: 5, maxCount: 12, answerDeadlineMs: 5000 },
  seed: 0,
};

type Phase = "intro" | "playing" | "summary";

export default function CountGamePracticePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastResult, setLastResult] = useState<MicrogameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  function start() {
    setRunKey((k) => k + 1);
    setPhase("playing");
    track("practice_started", { microgameId: "count" });
  }

  function handleFinish(result: MicrogameResult) {
    setLastResult(result);
    if (!result.failed) {
      const prevBest = getPracticeStats("count-performance", "higher_is_better").best;
      setPreviousBest(prevBest);
      const practiceScore = result.feedback?.performanceScore ?? 0;
      const newBest = prevBest === null || practiceScore > prevBest;
      setIsNewBest(newBest);
      if (newBest) hapticNewBest();
      recordPracticeScore("count-performance", practiceScore);
    } else {
      setPreviousBest(null);
      setIsNewBest(false);
    }
    setPhase("summary");
    track("practice_completed", { microgameId: "count", score: result.rawScore, failed: !!result.failed });
  }

  if (phase === "intro") {
    return (
      <PracticeIntro
        title="COUNT"
        instructions="Count the dots while they are visible, then choose how many you saw."
        onStart={start}
        level={getPracticeLevel(CONFIG.microgameId)}
      />
    );
  }

  if (phase === "playing") {
    return <CountGame key={runKey} config={getAdaptivePracticeConfig(CONFIG)} onFinish={handleFinish} />;
  }

  return (
    <PracticeSummary
      microgameId="count-performance"
      gameName="COUNT"
      metricDirection="higher_is_better"
      formatScore={(s) => `${Math.round(s)}/1000`}
      result={lastResult!}
      previousBest={previousBest}
      isNewBest={isNewBest}
      onPlayAgain={start}
    />
  );
}
