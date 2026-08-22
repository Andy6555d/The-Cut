"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SEEN_KEY = "the_cut_howto_seen";

export function HowToPlayPopup({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY)) {
      onDismiss();
      return;
    }
    setVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") window.localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
    onDismiss();
  }

  if (!visible) return null;

  return (
    <div className="howto-popup-backdrop">
      <div className="howto-popup-card">
        <p className="game-instruction" style={{ color: "var(--muted)" }}>
          WELCOME TO THE CUT
        </p>
        <p style={{ color: "var(--fg)", fontSize: "0.95rem", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
          One shared daily skill test. Everyone plays the same rounds — survive as many as you can.
        </p>

        <div className="howto-popup-mini-steps">
          <div className="howto-popup-mini-step">
            <b>1</b> One official attempt a day — no do-overs.
          </div>
          <div className="howto-popup-mini-step">
            <b>2</b> Each round shows its cutoff before you play it.
          </div>
          <div className="howto-popup-mini-step">
            <b>3</b> Practice anytime, no pressure, unlimited tries.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <Link href="/how-to-play" className="big-tap-button" style={{ textDecoration: "none" }} onClick={dismiss}>
            SEE THE FULL RULES
          </Link>
          <button onPointerDown={dismiss} className="secondary-link" style={{ cursor: "pointer" }}>
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
