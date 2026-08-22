// A small, purpose-built icon set for primary navigation. Unicode glyphs
// (⌂ ◎ ♛ ♜ ⚑) render differently across devices, fonts, and OSes — some
// platforms substitute colorful emoji versions that clash with the rest of
// the visual language. These are plain stroked SVG paths, so they look
// identical everywhere and match the app's own line-weight exactly.

type IconProps = { size?: number; strokeWidth?: number };

const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function HomeIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

export function TargetIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BoltIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13z" strokeLinejoin="round" />
    </svg>
  );
}

export function RanksIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <path d="M5 20V13" />
      <path d="M12 20V7" />
      <path d="M19 20V10" />
      <path d="M3.5 20h17" />
    </svg>
  );
}

export function LeaguesIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M14.7 14.2c2.2.3 3.8 1.9 3.8 4.3" />
    </svg>
  );
}

export function InfoIcon({ size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
