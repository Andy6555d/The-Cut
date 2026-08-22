"use client";

import { useState } from "react";
import { getAdaptivePracticeConfig, getPracticeLevel } from "@/lib/microgames/engine/adaptiveDifficulty";
import { PracticeIntro } from "@/lib/microgames/engine/PracticeIntro";
import { PracticeSummary } from "@/lib/microgames/engine/PracticeSummary";
import { TraceGame } from "@/lib/microgames/trace/client";
import { recordPracticeScore, getPracticeStats } from "@/lib/microgames/engine/personalBests";
import type { MicrogameConfig, MicrogameResult } from "@/lib/microgames/engine/types";
import { track } from "@/lib/analytics/track";
import { hapticNewBest } from "@/lib/microgames/engine/haptics";

const CONFIG: MicrogameConfig = {
  microgameId: "trace",
  version: 1,
  difficulty: { targetRadius: 0.3, accuracyThresholdPct: 90, timeLimitMs: 10000 },
  seed: 0,
};

type Phase = "intro" | "playing" | "summary";

export default function TraceGamePracticePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastResult, setLastResult] = useState<MicrogameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  function start() {
    setRunKey((k) => k + 1);
    setPhase("playing");
    track("practice_started", { microgameId: "trace" });
  }

  function handleFinish(result: MicrogameResult) {
    setLastResult(result);
    if (!result.failed) {
      const prevBest = getPracticeStats("trace-performance", "higher_is_better").best;
      setPreviousBest(prevBest);
      const practiceScore = result.feedback?.performanceScore ?? 0;
      const newBest = prevBest === null || practiceScore > prevBest;
      setIsNewBest(newBest);
      if (newBest) hapticNewBest();
      recordPracticeScore("trace-performance", practiceScore);
    } else {
      setPreviousBest(null);
      setIsNewBest(false);
    }
    setPhase("summary");
    track("practice_completed", { microgameId: "trace", score: result.rawScore, failed: !!result.failed });
  }

  if (phase === "intro") {
    return (
      <PracticeIntro
        title="TRACE"
        instructions="Trace the dotted circle as accurately as you can before time runs out."
        onStart={start}
        level={getPracticeLevel(CONFIG.microgameId)}
      />
    );
  }

  if (phase === "playing") {
    return <TraceGame key={runKey} config={getAdaptivePracticeConfig(CONFIG)} onFinish={handleFinish} />;
  }

  return (
    <PracticeSummary
      microgameId="trace-performance"
      gameName="TRACE"
      metricDirection="higher_is_better"
      formatScore={(s) => `${Math.round(s)}/1000`}
      result={lastResult!}
      previousBest={previousBest}
      isNewBest={isNewBest}
      onPlayAgain={start}
    />
  );
}
