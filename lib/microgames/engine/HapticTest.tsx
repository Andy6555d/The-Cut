"use client";

import { useState } from "react";

export function HapticTest() {
  const [result, setResult] = useState<string | null>(null);

  function runTest() {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      setResult("navigator.vibrate is not available in this browser at all.");
      return;
    }
    const ok = navigator.vibrate(200);
    setResult(
      ok
        ? "vibrate() was called and returned true — if you still felt nothing, it's your phone's vibration/silent setting, not the code."
        : "vibrate() returned false — the browser itself refused the call (often a silent/Do Not Disturb mode, or a permissions-policy restriction)."
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <button onPointerDown={runTest} className="secondary-link" style={{ cursor: "pointer" }}>
        TEST VIBRATION
      </button>
      {result && (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "20rem", textAlign: "center" }}>
          {result}
        </p>
      )}
    </div>
  );
}
