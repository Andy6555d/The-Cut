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

interface WeeklyEntry {
  playerId: string;
  handle: string;
  roundsSurvivedTotal: number;
  dailiesPlayed: number;
  rank: number;
}

interface HistoryWeek {
  weekStart: string;
  entries: WeeklyEntry[];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function LeagueDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [current, setCurrent] = useState<WeeklyEntry[]>([]);
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/leagues/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setLeague(data);
      });

    fetch(`/api/leagues/${id}/weekly`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "ok") {
          setState("empty");
          return;
        }
        setCurrent(data.current ?? []);
        setHistory(data.history ?? []);
        setWeekStart(data.weekStart ?? null);
        setState((data.current ?? []).length === 0 && (data.history ?? []).length === 0 ? "empty" : "ready");
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
        <>
          <p className="league-panel-label" style={{ marginTop: "0.5rem" }}>
            THIS WEEK{weekStart ? ` · ${formatWeekLabel(weekStart)}` : ""}
          </p>

          {current.length === 0 ? (
            <div className="ranked-empty" style={{ margin: "0.5rem 0 1.5rem" }}>
              <p>Nobody's played a Daily yet this week — standings reset every Monday.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {current.map((entry) => (
                <div key={entry.playerId} className={`ranked-row ${entry.rank === 1 ? "ranked-row-first" : ""}`}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                    <span className="ranked-rank">#{entry.rank}</span>
                    <span className="ranked-handle">{entry.handle}</span>
                  </span>
                  <span className="ranked-meta">
                    {entry.roundsSurvivedTotal} rounds · {entry.dailiesPlayed} Daily{entry.dailiesPlayed === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <p className="league-panel-label">RECENT WEEKS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {history.map((week) => {
                  const winner = week.entries[0];
                  return (
                    <div key={week.weekStart} className="league-panel" style={{ marginBottom: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{formatWeekLabel(week.weekStart)}</span>
                        {winner && (
                          <span style={{ color: "var(--warn)", fontSize: "0.85rem" }}>
                            🏆 {winner.handle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <div className="ranked-cta-row">
        <Link href="/leagues" className="secondary-link" style={{ textDecoration: "none" }}>
          ALL LEAGUES
        </Link>
      </div>
    </main>
  );
}
