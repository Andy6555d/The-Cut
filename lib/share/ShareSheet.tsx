"use client";

import { useEffect, useState } from "react";
import type { ShareResultPayload } from "./shareResult";
import { buildShareResultUrl, buildShareText } from "./shareResult";

type Props = {
  open: boolean;
  onClose: () => void;
  payload: ShareResultPayload;
};

export function ShareSheet({ open, onClose, payload }: Props) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://the-cutday.vercel.app";
  const shareUrl = buildShareResultUrl(origin, payload);
  const text = buildShareText(payload);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  function linkedin() {
    const target = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function whatsapp() {
    const target = `https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  async function more() {
    if (navigator.share) {
      try {
        await navigator.share({ title: payload.headline, text, url: shareUrl });
      } catch {
        // User cancelled or share target unavailable.
      }
      return;
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked by browser permissions.
    }
  }

  return (
    <div className="share-sheet-backdrop" onPointerDown={onClose}>
      <section className="share-sheet" onPointerDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Share your result">
        <div className="share-sheet-handle" />
        <p className="share-sheet-kicker">SHARE YOUR RESULT</p>
        <h2>{payload.game ? `${payload.game} · ${payload.score}` : payload.score}</h2>
        {payload.detail && <p className="share-sheet-detail">{payload.detail}</p>}
        {payload.rank && <p className="share-sheet-rank">{payload.rank}</p>}

        <div className="share-sheet-grid">
          <button className="share-target linkedin-target" onPointerDown={linkedin}><span>in</span><strong>LinkedIn</strong></button>
          <button className="share-target whatsapp-target" onPointerDown={whatsapp}><span>◉</span><strong>WhatsApp</strong></button>
          <button className="share-target more-target" onPointerDown={more}><span>↗</span><strong>More</strong></button>
          <button className="share-target copy-target" onPointerDown={copy}><span>⧉</span><strong>{copied ? "Copied" : "Copy"}</strong></button>
        </div>

        <p className="share-sheet-note">LinkedIn receives a dedicated result link whose preview includes your game and score.</p>
        <button className="share-sheet-close" onPointerDown={onClose}>CLOSE</button>
      </section>
    </div>
  );
}
