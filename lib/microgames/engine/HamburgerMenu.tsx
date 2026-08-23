"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon, InfoIcon } from "./NavIcons";
import { isSoundEnabled, setSoundEnabled, soundTap } from "./sound";

const LINKS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/", label: "Home", icon: <HomeIcon size={20} /> },
  { href: "/daily", label: "Play Today's Cut", icon: <BoltIcon size={20} /> },
  { href: "/levels", label: "Levels", icon: <LevelsGlyph /> },
  { href: "/practice", label: "Practice", icon: <TargetIcon size={20} /> },
  { href: "/practice/quick", label: "Quick Play", icon: <QuickGlyph /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <RanksIcon size={20} /> },
  { href: "/leagues", label: "Leagues", icon: <LeaguesIcon size={20} /> },
  { href: "/how-to-play", label: "How to Play", icon: <InfoIcon size={20} /> },
];

function LevelsGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18 L10 10 L14 14 L20 5" />
      <path d="M14 5h6v6" />
    </svg>
  );
}

function QuickGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
    </svg>
  );
}

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Closing on every navigation keeps the panel from staying open across
  // a route change, which would otherwise sit on top of the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) soundTap();
  }

  return (
    <>
      <button
        onPointerDown={() => setOpen(true)}
        className="hamburger-trigger"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="hamburger-backdrop" onPointerDown={() => setOpen(false)}>
          <nav
            className="hamburger-panel"
            aria-label="All destinations"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="hamburger-panel-header">
              <span>THE CUT</span>
              <button onPointerDown={() => setOpen(false)} aria-label="Close menu" className="hamburger-close">
                ✕
              </button>
            </div>

            <div className="hamburger-links">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hamburger-link ${pathname === link.href ? "active" : ""}`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <button onPointerDown={toggleSound} className="hamburger-sound-toggle">
              <span>{soundOn ? "🔊" : "🔇"}</span>
              <span>Sound {soundOn ? "on" : "off"}</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
