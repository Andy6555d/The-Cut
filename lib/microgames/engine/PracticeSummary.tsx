"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPracticeStats } from "./personalBests";
import type { MetricDirection, MicrogameResult } from "./types";
import { Celebration } from "./Celebration";
import { defaultFeedback, ratingClass, ratingLabel } from "./feedback";
import { isSoundEnabled, setSoundEnabled, soundBad, soundGood, soundPersonalBest } from "./sound";
import { getPracticeLevel } from "./adaptiveDifficulty";
import { ShareSheet } from "@/lib/share/ShareSheet";

export function PracticeSummary({
  microgameId,
  gameName,
  metricDirection,
  formatScore,
  result,
  previousBest,
  isNewBest,
  onPlayAgain,
}: {
  microgameId: string;
  gameName: string;
  metricDirection: MetricDirection;
  formatScore: (score: number) => string;
  result: MicrogameResult;
  previousBest?: number | null;
  isNewBest?: boolean;
  onPlayAgain: () => void;
}) {
  const stats = getPracticeStats(microgameId, metricDirection);
  const [shareOpen, setShareOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const feedback = defaultFeedback(result, formatScore);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    if (result.failed) soundBad();
    else if (isNewBest) soundPersonalBest();
    else soundGood();
  }, [isNewBest, result.failed]);

  useEffect(() => {
    const actualId = microgameId.replace(/-performance$/, "");
    const rawScore = Number.isFinite(result.rawScore) ? result.rawScore : null;
    const displayedLevel = getPracticeLevel(actualId);
    const practiceLevel = stats.attemptCount > 0 && stats.attemptCount % 3 === 0 ? Math.max(1, displayedLevel - 1) : displayedLevel;
    fetch("/api/practice/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        microgameId: actualId, practiceLevel, rawScore,
        performanceScore: typeof result.feedback?.performanceScore === "number" ? result.feedback.performanceScore : null,
        failed: !!result.failed, durationMs: typeof result.feedback?.timeMs === "number" ? Math.round(result.feedback.timeMs) : null,
      }),
    }).catch(() => {});
  }, [microgameId, result, stats.attemptCount]);

  function handleShare() {
    setShareOpen(true);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) soundGood();
  }

  const trackedScore = typeof feedback.performanceScore === "number" && metricDirection === "higher_is_better"
    ? feedback.performanceScore
    : result.rawScore;

  const improvement =
    isNewBest && previousBest != null && Number.isFinite(previousBest)
      ? metricDirection === "lower_is_better"
        ? previousBest - trackedScore
        : trackedScore - previousBest
      : null;

  if (result.failed) {
    return (
      <div className="result-screen result-screen-cut">
        <button className="sound-toggle" onPointerDown={toggleSound} aria-label="Toggle sound">{soundOn ? "🔊" : "🔇"}</button>
        <div className="result-card result-card-cut compact-result-card">
          <p className="result-kicker">{gameName} · PRACTICE</p>
          <h1 className="result-emotion cut-text">{feedback.title ?? (result.failureReason === "false_start" ? "TOO SOON" : result.failureReason === "timeout" || result.failureReason === "timeout_or_trace_too_short" ? "TIME’S UP" : "TRY AGAIN")}</h1>
          {feedback.primaryValue && <div className="error-readout"><span>{feedback.primaryLabel ?? "RESULT"}</span><strong>{feedback.primaryValue}</strong></div>}
          {typeof feedback.thresholdPct === "number" && <div className={`threshold-callout ${feedback.thresholdPassed ? "threshold-pass" : "threshold-miss"}`}><span>{feedback.thresholdPassed ? "✓ ACCURACY THRESHOLD CLEARED" : "ACCURACY REQUIRED"}</span><strong>{feedback.thresholdPct.toFixed(0)}%</strong></div>}
          <p className="result-message">{feedback.message ?? "That one didn't count. Reset and go again."}</p>
        </div>
        <div className="result-actions sticky-result-actions">
          <button onPointerDown={onPlayAgain} className="big-tap-button glow-button">↻ PLAY AGAIN</button>
          <Link href="/practice" className="secondary-link">ALL GAMES</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`result-screen ${isNewBest ? "result-screen-pb" : ""}`}>
      {isNewBest && <Celebration intensity="big" />}
      <button className="sound-toggle" onPointerDown={toggleSound} aria-label="Toggle sound">{soundOn ? "🔊" : "🔇"}</button>

      <div className="result-card compact-result-card">
        <p className="result-kicker">{gameName} · PRACTICE</p>
        {isNewBest && <div className="pb-banner">🏆 NEW PERSONAL BEST!</div>}
        {!isNewBest && <div className={`rating-pill ${ratingClass(feedback.rating)}`}>{ratingLabel(feedback.rating)}</div>}

        {feedback.targetValue && (
          <div className="target-chip">
            <span>{feedback.targetLabel ?? "TARGET"}</span>
            <strong>{feedback.targetValue}</strong>
          </div>
        )}

        <p className="result-primary-label">{feedback.primaryLabel ?? "YOUR RESULT"}</p>
        <p className="result-primary-value">{feedback.primaryValue ?? formatScore(result.rawScore)}</p>

        {feedback.errorValue && (
          <div className={`error-readout direction-${feedback.direction ?? "none"}`}>
            <span>{feedback.errorLabel ?? "ERROR"}</span>
            <strong>{feedback.errorValue}</strong>
          </div>
        )}

        {typeof feedback.performanceScore === "number" && (
          <div className="performance-score-row">
            <span>PERFORMANCE</span>
            <strong>{feedback.performanceScore}<small>/1000</small></strong>
          </div>
        )}

        {feedback.secondaryStats && feedback.secondaryStats.length > 0 && (
          <div className="secondary-stats-grid">
            {feedback.secondaryStats.map((stat) => (
              <div key={stat.label} className={`secondary-stat tone-${stat.tone ?? "neutral"}`}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        )}

        {typeof feedback.accuracyPct === "number" && (
          <div className="accuracy-wrap">
            <div className="accuracy-row"><span>ACCURACY</span><strong>{Math.max(0, Math.min(100, feedback.accuracyPct)).toFixed(1)}%</strong></div>
            <div className="accuracy-track"><div className="accuracy-fill" style={{ width: `${Math.max(0, Math.min(100, feedback.accuracyPct))}%` }} /></div>
          </div>
        )}

        {typeof feedback.thresholdPct === "number" && (
          <div className={`threshold-callout ${feedback.thresholdPassed ? "threshold-pass" : "threshold-miss"}`}>
            <span>{feedback.thresholdPassed ? "✓ ACCURACY THRESHOLD CLEARED" : "ACCURACY THRESHOLD"}</span>
            <strong>{feedback.thresholdPct.toFixed(0)}%</strong>
            <small>{feedback.thresholdPassed ? "Speed bonus active" : "Hit this before speed can boost your score"}</small>
          </div>
        )}

        <p className="result-message">{feedback.message ?? "Nice. Go again and tighten it up."}</p>

        {isNewBest && improvement != null && improvement > 0 && (
          <div className="improvement-callout">
            <span>YOU IMPROVED BY</span>
            <strong>{formatScore(improvement)}</strong>
          </div>
        )}
      </div>

      <div className="stats-panel">
        <Stat label={statLabels(microgameId).best} value={stats.best === null ? "—" : formatScore(stats.best)} />
        <Stat label={statLabels(microgameId).average} value={stats.average === null ? "—" : formatScore(stats.average)} />
        <Stat label="PLAYS" value={String(stats.attemptCount)} />
      </div>

      <div className="result-actions sticky-result-actions">
        <button onPointerDown={onPlayAgain} className="big-tap-button glow-button">↻ PLAY AGAIN</button>
        <button onPointerDown={handleShare} className="secondary-link share-button">SHARE</button>
        <Link href="/practice" className="secondary-link">ALL GAMES</Link>
      </div>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={{
          mode: "practice",
          game: gameName,
          headline: isNewBest ? "NEW PERSONAL BEST" : `${ratingLabel(feedback.rating)} RESULT`,
          score: feedback.primaryValue ?? formatScore(result.rawScore),
          detail: feedback.errorValue ? `${feedback.errorLabel ?? "ERROR"}: ${feedback.errorValue}` : feedback.message,
          rank: typeof feedback.performanceScore === "number" ? `Performance ${feedback.performanceScore}/1000` : undefined,
          cta: "Think you can beat my score?",
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat-tile"><span>{label}</span><strong>{value}</strong></div>;
}

function statLabels(id: string): { best: string; average: string } {
  if (["react", "bigger"].includes(id)) return { best: "FASTEST", average: "AVG TIME" };
  if (id === "dont-tap-performance") return { best: "BEST CONTROL", average: "AVG CONTROL" };
  if (["stop", "exact", "centre", "half"].includes(id)) return { best: "BEST ERROR", average: "AVG ERROR" };
  if (["memory-grid-performance", "count-performance", "trace-performance"].includes(id)) return { best: "BEST SCORE", average: "AVG SCORE" };
  if (["memory-grid", "count"].includes(id)) return { best: "BEST ERROR", average: "AVG ERROR" };
  if (id === "trace") return { best: "BEST DEV.", average: "AVG DEV." };
  return { best: "PERSONAL BEST", average: "AVERAGE" };
}
