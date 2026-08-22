import type { MicrogameConfig } from "./types";

export const GAME_DISPLAY_NAMES: Record<string, string> = {
  react: "SNAP",
  stop: "STOP",
  exact: "ZERO",
  centre: "CORE",
  half: "HALF",
  bigger: "MORE",
  "memory-grid": "FLASH",
  count: "COUNT",
  "dont-tap": "NOPE",
  trace: "TRACE",
};

function seconds(value: unknown, fallback: number): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return `${n.toFixed(3)}s`;
}

/** Clear, literal player instructions. Keep these aligned with the actual mechanics. */
export function getGameInstruction(microgameId: string, difficulty: Record<string, number> = {}): string {
  switch (microgameId) {
    case "react":
      return "Wait for GO. Tap the instant it appears. Do not tap early.";
    case "stop":
      return `Stop the timer at ${seconds(difficulty.target, 5)}. The timer disappears, so judge the remaining time and tap STOP.`;
    case "exact":
      return `Press and hold. Release when you think ${seconds(difficulty.targetSeconds, 3)} has passed. The timer disappears while you hold.`;
    case "centre":
      return "Find the true centre of the shape. Tap it before time runs out.";
    case "half":
      return "Split the line exactly in half. Tap the midpoint before time runs out.";
    case "bigger":
      return "Two shapes appear. Tap the bigger shape before time runs out.";
    case "memory-grid":
      return "Memorise the lit cells. When they disappear, tap the same cells from memory.";
    case "count":
      return "Count the dots while they are visible, then choose how many you saw.";
    case "dont-tap":
      return "Tap the circle. Do not tap the triangle. React correctly before each trial moves on.";
    case "trace":
      return "Trace the dotted circle as accurately as you can before time runs out.";
    default:
      return "Complete the challenge before time runs out.";
  }
}

export function getInstructionForConfig(config: MicrogameConfig): string {
  return getGameInstruction(config.microgameId, config.difficulty);
}
