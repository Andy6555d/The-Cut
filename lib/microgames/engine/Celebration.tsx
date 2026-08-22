"use client";

import { useMemo } from "react";

export function Celebration({ intensity = "normal" }: { intensity?: "normal" | "big" }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: intensity === "big" ? 54 : 34 }, (_, i) => ({
        id: i,
        x: (i * 37 + 11) % 100,
        delay: ((i * 13) % 55) / 100,
        duration: 1.5 + ((i * 17) % 70) / 100,
        rotate: (i * 83) % 360,
        size: 5 + ((i * 7) % 7),
        hue: ["var(--survive)", "var(--warn)", "var(--elite)", "#ffffff"][i % 4],
      })),
    [intensity]
  );

  return (
    <div className="celebration" aria-hidden="true">
      <div className="celebration-burst" />
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.8,
            background: p.hue,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
