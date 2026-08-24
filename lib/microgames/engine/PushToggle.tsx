"use client";

import { useEffect, useState } from "react";

type Status = "unsupported" | "checking" | "off" | "on" | "denied" | "busy";

function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        setStatus("off"); // push isn't configured server-side yet
        return;
      }
      const { publicKey } = await keyRes.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }

  if (status === "unsupported") return null; // notably absent on iOS Safari — not our limitation, Apple's

  if (status === "denied") {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.78rem", padding: "0.6rem 0" }}>
        Reminders are blocked in your browser settings — re-enable them there if you want them back.
      </p>
    );
  }

  return (
    <button
      onPointerDown={status === "on" ? disable : enable}
      disabled={status === "checking" || status === "busy"}
      className="hamburger-sound-toggle"
      style={{ marginTop: "0.5rem" }}
    >
      <span>{status === "on" ? "🔔" : "🔕"}</span>
      <span>
        {status === "checking" || status === "busy"
          ? "Reminders…"
          : status === "on"
          ? "Streak reminders on"
          : "Get streak reminders"}
      </span>
    </button>
  );
}
