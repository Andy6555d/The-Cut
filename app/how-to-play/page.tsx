"use client";

import Link from "next/link";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon } from "@/lib/microgames/engine/NavIcons";

const STEPS = [
  {
    icon: <BoltIcon size={26} />,
    tone: "#ff2f6f",
    title: "THE DAILY",
    body: "One official attempt, once a day. Every round shows its target and cutoff before you play it — beat it and you move on, miss it and you're cut. No second tries once you've started.",
  },
  {
    icon: <TargetIcon size={26} />,
    tone: "#00e5a0",
    title: "PRACTICE",
    body: "All 10 games, unlimited attempts, no pressure. Build a personal best on each one — practice never counts toward your official Daily result.",
  },
  {
    icon: <HomeIcon size={26} />,
    tone: "#ffc327",
    title: "STREAKS",
    body: "Play the Daily and it counts toward your streak. Miss a day and it resets. Nothing can be bought to protect it — a streak only ever reflects real days played.",
  },
  {
    icon: <LeaguesIcon size={26} />,
    tone: "#b467ff",
    title: "LEAGUES",
    body: "Create a league and share the code with friends or family to compete privately. Or check the worldwide leaderboard to see how you stack up against everyone.",
  },
  {
    icon: <RanksIcon size={26} />,
    tone: "#1ea7ff",
    title: "YOUR RESULT",
    body: "However far you get, you'll see roughly how many players you beat today. Survive every round and you'll see your full world rank once the Daily closes.",
  },
];

export default function HowToPlayPage() {
  return (
    <main className="howto-shell">
      <div className="howto-glow" />
      <div className="howto-header">
        <Link href="/" className="back-chip" aria-label="Back">
          ←
        </Link>
        <span>THE CUT</span>
        <h1>How to play</h1>
      </div>

      <div className="howto-steps">
        {STEPS.map((step, i) => {
          const stepStyle: React.CSSProperties = {};
          (stepStyle as Record<string, string>)["--step-tone"] = step.tone;
          return (
            <div key={step.title} className="howto-step" style={stepStyle}>
              <div className="howto-step-num">{i + 1}</div>
              <div className="howto-step-icon">{step.icon}</div>
              <div className="howto-step-copy">
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="howto-actions">
        <Link href="/daily" className="big-tap-button" style={{ textDecoration: "none" }}>
          PLAY TODAY'S CUT
        </Link>
        <Link href="/practice" className="secondary-link" style={{ textDecoration: "none" }}>
          PRACTICE FIRST
        </Link>
      </div>
    </main>
  );
}
