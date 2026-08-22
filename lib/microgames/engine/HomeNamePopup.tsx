"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "the_cut_name_prompt_seen";

export function HomeNamePopup() {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only ever pop up once per browser. Whether they save a name or skip,
    // we don't ask again automatically — they can still set/change it any
    // time from the leaderboard or leagues page.
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY)) return;

    fetch("/api/player/display-name")
      .then((r) => r.json())
      .then((data) => {
        if (!data.displayName) setVisible(true);
      })
      .catch(() => {
        // If the check itself fails, don't block the home screen with a
        // popup we can't act on — just skip it silently this time.
      });
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") window.localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/player/display-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "invalid_display_name") {
          setError("Enter any name you like, up to 30 characters.");
        } else {
          setError(`Couldn't save: ${data?.detail ?? data?.error ?? "unknown error"}`);
        }
        return;
      }
      dismiss();
    } catch {
      setError("Couldn't save that — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5, 7, 11, 0.75)",
        backdropFilter: "blur(6px)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "22rem",
          background: "rgba(16, 21, 32, 0.98)",
          border: "1px solid rgba(160, 184, 220, 0.15)",
          borderRadius: "20px",
          padding: "1.75rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 30px 100px rgba(0,0,0,0.5)",
        }}
      >
        <p className="game-instruction" style={{ color: "var(--muted)" }}>
          WHAT SHOULD WE CALL YOU?
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.5rem 0 1.25rem" }}>
          Shows on leaderboards and leagues. Optional, and you can change it any time.
        </p>

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={30}
          placeholder="Your name"
          autoFocus
          style={{
            width: "100%",
            background: "rgba(245,245,247,0.06)",
            border: "1px solid rgba(245,245,247,0.2)",
            borderRadius: "10px",
            color: "var(--fg)",
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            textAlign: "center",
            marginBottom: "0.75rem",
          }}
        />

        {error && <p style={{ color: "var(--cut)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onPointerDown={save} className="big-tap-button" style={{ cursor: "pointer" }}>
            {busy ? "SAVING…" : "SAVE"}
          </button>
          <button
            onPointerDown={dismiss}
            className="secondary-link"
            style={{ cursor: "pointer", minHeight: "auto", padding: "0.9rem 1.25rem" }}
          >
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
}
