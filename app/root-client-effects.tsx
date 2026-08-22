"use client";

import { useEffect } from "react";
import { initAnalytics, track } from "@/lib/analytics/track";
import { unlockAudio } from "@/lib/microgames/engine/sound";
import { hydratePracticeScores } from "@/lib/microgames/engine/personalBests";

export function RootClientEffects() {
  useEffect(() => {
    initAnalytics();
    track("session_started", {});
    fetch("/api/practice/stats").then((r) => r.json()).then((data) => {
      if (data?.scores) for (const [key, scores] of Object.entries(data.scores)) hydratePracticeScores(key, scores as number[]);
    }).catch(() => {});

    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the site works without the service worker,
        // it just loses offline-shell/install behaviour.
      });
    }

    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  return null;
}
