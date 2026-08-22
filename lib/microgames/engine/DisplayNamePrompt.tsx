"use client";

import { useEffect, useState } from "react";

export function DisplayNamePrompt() {
  const [name, setName] = useState<string | null | undefined>(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/player/display-name")
      .then((r) => r.json())
      .then((data) => setName(data.displayName ?? null))
      .catch(() => setName(null));
  }, []);

  async function save() {
    setError(null);
    const trimmed = draft.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/player/display-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show what actually went wrong, not a guess. A validation failure
        // (bad characters/length) gets the specific message; anything else
        // (e.g. a database error) shows the real detail instead of
        // incorrectly blaming the input.
        if (data?.error === "invalid_display_name") {
          setError("Enter any name you like, up to 30 characters.");
        } else {
          setError(`Couldn't save: ${data?.detail ?? data?.error ?? "unknown error"}`);
        }
        return;
      }
      setName(data.displayName);
      setEditing(false);
    } catch {
      setError("Couldn't save that — check your connection and try again.");
    }
  }

  if (name === undefined) return null; // avoid a flash of the prompt while loading

  if (!editing && name) {
    return (
      <button
        onPointerDown={() => {
          setDraft(name);
          setEditing(true);
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          fontSize: "0.85rem",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Playing as <span style={{ color: "var(--fg)" }}>{name}</span> · edit
      </button>
    );
  }

  if (!editing && !name) {
    return (
      <button
        onPointerDown={() => setEditing(true)}
        className="secondary-link"
        style={{ cursor: "pointer", fontSize: "0.85rem", padding: "0.5rem 1rem", minHeight: "auto" }}
      >
        CHOOSE A NAME
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={30}
          placeholder="Your name"
          style={{
            background: "rgba(245,245,247,0.06)",
            border: "1px solid rgba(245,245,247,0.2)",
            borderRadius: "8px",
            color: "var(--fg)",
            padding: "0.5rem 0.75rem",
            fontSize: "0.9rem",
            width: "10rem",
          }}
        />
        <button onPointerDown={save} className="secondary-link" style={{ cursor: "pointer", padding: "0.5rem 1rem", minHeight: "auto" }}>
          SAVE
        </button>
      </div>
      {error && <p style={{ color: "var(--cut)", fontSize: "0.75rem" }}>{error}</p>}
    </div>
  );
}
