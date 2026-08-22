"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DisplayNamePrompt } from "@/lib/microgames/engine/DisplayNamePrompt";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon } from "@/lib/microgames/engine/NavIcons";

interface LeagueSummary {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data) => setLeagues(data.leagues ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function createLeague() {
    const name = createName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError("Couldn't create that league — try a shorter name.");
        return;
      }
      setCreateName("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function joinLeague() {
    const code = joinCode.trim();
    if (!code || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!res.ok) {
        setError("Couldn't find a league with that code.");
        return;
      }
      setJoinCode("");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ranked-shell">
      <div className="ranked-glow" />

      <div className="ranked-header">
        <Link href="/" className="back-chip" aria-label="Back">
          ←
        </Link>
        <span>PRIVATE COMPETITION</span>
        <h1>Leagues</h1>
      </div>

      <div className="ranked-subrow">
        <DisplayNamePrompt />
      </div>

      <div className="league-panel">
        <p className="league-panel-label">Create a league</p>
        <div className="league-input-row">
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. Family Cut"
            maxLength={40}
            className="league-input"
          />
          <button onPointerDown={createLeague} className="secondary-link" style={{ cursor: "pointer", padding: "0.7rem 1.1rem", minHeight: "auto" }}>
            CREATE
          </button>
        </div>
      </div>

      <div className="league-panel">
        <p className="league-panel-label">Join with a code</p>
        <div className="league-input-row">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={12}
            className="league-input"
          />
          <button onPointerDown={joinLeague} className="secondary-link" style={{ cursor: "pointer", padding: "0.7rem 1.1rem", minHeight: "auto" }}>
            JOIN
          </button>
        </div>
      </div>

      {error && <p className="league-error">{error}</p>}

      <p className="league-panel-label" style={{ margin: "1.25rem 0 0.6rem" }}>
        Your leagues
      </p>

      {loading && (
        <div className="ranked-skeleton">
          <div className="ranked-skeleton-row" />
          <div className="ranked-skeleton-row" />
        </div>
      )}

      {!loading && leagues.length === 0 && (
        <div className="league-list-empty">No leagues yet — create one or join with a code above.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {leagues.map((l) => (
          <Link key={l.id} href={`/leagues/${l.id}`} className="league-card">
            <span>
              <strong>{l.name}</strong>
              <span>
                {l.memberCount} member{l.memberCount === 1 ? "" : "s"} · code {l.inviteCode}
              </span>
            </span>
            <span className="league-card-arrow">→</span>
          </Link>
        ))}
      </div>

      <div className="ranked-cta-row">
        <Link href="/daily" className="big-tap-button" style={{ textDecoration: "none" }}>
          PLAY TODAY'S CUT
        </Link>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <Link href="/"><HomeIcon/><span>HOME</span></Link>
        <Link href="/practice"><TargetIcon/><span>PRACTICE</span></Link>
        <Link href="/daily"><BoltIcon/><span>DAILY</span></Link>
        <Link href="/leaderboard"><RanksIcon/><span>RANKS</span></Link>
        <Link href="/leagues" className="active"><LeaguesIcon/><span>LEAGUES</span></Link>
      </nav>
    </main>
  );
}
