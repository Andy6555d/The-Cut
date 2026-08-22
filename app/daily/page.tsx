"use client";

import { useEffect, useState } from "react";
import { Countdown } from "@/lib/microgames/engine/Countdown";
import { DailyRunner } from "./DailyRunner";
import { withPlayerTimeZone } from "@/lib/domain/timezone/browserTimezone";

type Status = "checking" | "no_daily" | "ready" | "running";

export default function DailyPage() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/api/daily", { headers: withPlayerTimeZone() })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data?.status === "live" ? "ready" : "no_daily");
      })
      .catch(() => setStatus("no_daily"));
  }, []);

  if (status === "running") {
    return <DailyRunner />;
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 className="game-headline">THE CUT</h1>

      {status === "checking" && <p style={{ color: "var(--muted)" }}>Checking today's run…</p>}

      {status === "no_daily" && (
        <>
          <p className="game-instruction" style={{ color: "var(--muted)" }}>
            NEXT LOCAL ATTEMPT
          </p>
          <Countdown />
        </>
      )}

      {status === "ready" && (
        <>
          <p style={{ color: "var(--muted)", maxWidth: "22rem" }}>
            One official attempt today. Survive as many rounds as you can. Resets at your local midnight.
          </p>
          <button onPointerDown={() => setStatus("running")} className="big-tap-button">
            PLAY
          </button>
        </>
      )}
    </main>
  );
}
