"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface LeagueInfo {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

interface LeagueEntry {
  leagueRank: number;
  roundsSurvived: number;
  finalPercentile: number;
  handle: string;
}

export default function LeagueDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [entries, setEntries] = useState<LeagueEntry[]>([]);
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/leagues/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setLeague(data);
      });

    fetch(`/api/leagues/${id}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "ok") {
          setState("empty");
          return;
        }
        setEntries(data.entries ?? []);
        setDailyDate(data.dailyDate ?? null);
        setState((data.entries ?? []).length === 0 ? "empty" : "ready");
      })
      .catch(() => setState("error"));
  }, [id]);

  async function shareInvite() {
    if (!league) return;
    const text = `Join my league "${league.name}" on THE CUT — code: ${league.inviteCode}`;
    const url = typeof window !== "undefined" ? window.location.origin + "/leagues" : "";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} — ${url}`);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 1800);
      } catch {
        // non-fatal
      }
    }
  }

  return (
    <main className="ranked-shell">
      <div className="ranked-glow" />

      <div className="ranked-header">
        <Link href="/leagues" className="back-chip" aria-label="Back">
          ←
        </Link>
        <span>LEAGUE</span>
        <h1>{league ? league.name : "Loading…"}</h1>
      </div>

      {league && (
        <div className="ranked-subrow">
          <button onPointerDown={shareInvite} className="secondary-link" style={{ cursor: "pointer" }}>
            {shareState === "copied" ? "COPIED" : `INVITE · CODE ${league.inviteCode}`}
          </button>
          <span className="ranked-date">
            {league.memberCount} member{league.memberCount === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {dailyDate && <p className="ranked-date" style={{ margin: "0 0 0.75rem" }}>{dailyDate}</p>}

      {state === "loading" && (
        <div className="ranked-skeleton">
          <div className="ranked-skeleton-row" />
          <div className="ranked-skeleton-row" />
        </div>
      )}

      {state === "empty" && (
        <div className="ranked-empty">
          <p>No ranked results yet for this league — check back after a Daily closes and members have played.</p>
        </div>
      )}

      {state === "error" && (
        <div className="ranked-error">
          <p>Couldn't load this league.</p>
        </div>
      )}

      {state === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {entries.map((entry) => (
            <div key={entry.leagueRank + entry.handle} className={`ranked-row ${entry.leagueRank === 1 ? "ranked-row-first" : ""}`}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                <span className="ranked-rank">#{entry.leagueRank}</span>
                <span className="ranked-handle">{entry.handle}</span>
              </span>
              <span className="ranked-meta">{entry.roundsSurvived} rounds</span>
            </div>
          ))}
        </div>
      )}

      <div className="ranked-cta-row">
        <Link href="/leagues" className="secondary-link" style={{ textDecoration: "none" }}>
          ALL LEAGUES
        </Link>
      </div>
    </main>
  );
}
