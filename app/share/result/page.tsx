import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined, fallback = ""): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? fallback).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

function data(searchParams: Params) {
  const mode = one(searchParams.mode, "practice") === "daily" ? "daily" : "practice";
  const game = one(searchParams.game, mode === "daily" ? "THE CUT" : "PRACTICE");
  const headline = one(searchParams.headline, "THE CUT RESULT");
  const score = one(searchParams.score, "RESULT");
  const detail = one(searchParams.detail);
  const rank = one(searchParams.rank);
  const cta = one(searchParams.cta, "Think you can beat it?");
  return { mode, game, headline, score, detail, rank, cta };
}

export function generateMetadata({ searchParams }: { searchParams: Params }): Metadata {
  const result = data(searchParams);
  const title = `${result.game}: ${result.score} | THE CUT`;
  const description = [result.headline, result.detail, result.rank, result.cta].filter(Boolean).join(" · ").slice(0, 220);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "THE CUT",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: false, follow: true },
  };
}

export default function SharedResultPage({ searchParams }: { searchParams: Params }) {
  const result = data(searchParams);
  return (
    <main className="shared-result-shell">
      <div className="shared-result-orb shared-result-orb-a" />
      <div className="shared-result-orb shared-result-orb-b" />
      <section className="shared-result-card">
        <div className="shared-brand"><span>THE</span><strong>CUT</strong></div>
        <p className="shared-result-kicker">{result.mode === "daily" ? "WORLD DAILY" : `${result.game} · PRACTICE`}</p>
        <h1>{result.headline}</h1>
        <div className="shared-result-score">{result.score}</div>
        {result.detail && <p className="shared-result-detail">{result.detail}</p>}
        {result.rank && <div className="shared-result-rank">{result.rank}</div>}
        <p className="shared-result-cta-copy">{result.cta}</p>
        <Link href={result.mode === "daily" ? "/daily" : "/practice"} className="hero-cta shared-play-cta">
          {result.mode === "daily" ? "PLAY TODAY'S CUT" : "TRY THE GAMES"} <span>→</span>
        </Link>
        <Link href="/" className="shared-home-link">THE-CUTDAY.VERCEL.APP</Link>
      </section>
    </main>
  );
}
