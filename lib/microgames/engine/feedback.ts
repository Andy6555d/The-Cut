import type { MicrogameResult, ResultFeedback } from "./types";

export function ratingFromAccuracy(accuracy: number): ResultFeedback["rating"] {
  if (accuracy >= 99.5) return "perfect";
  if (accuracy >= 95) return "excellent";
  if (accuracy >= 85) return "great";
  if (accuracy >= 70) return "good";
  if (accuracy >= 50) return "close";
  return "poor";
}

export function ratingLabel(rating?: ResultFeedback["rating"]): string {
  switch (rating) {
    case "perfect": return "PERFECT";
    case "excellent": return "EXCELLENT";
    case "great": return "GREAT";
    case "good": return "GOOD";
    case "close": return "CLOSE";
    case "poor": return "KEEP GOING";
    default: return "RESULT";
  }
}

export function ratingClass(rating?: ResultFeedback["rating"]): string {
  if (rating === "poor") return "rating-poor";
  if (rating === "close") return "rating-close";
  if (rating === "perfect") return "rating-perfect";
  return "rating-good";
}

export function defaultFeedback(result: MicrogameResult, formatScore: (score: number) => string): ResultFeedback {
  return result.feedback ?? {
    primaryLabel: "SCORE",
    primaryValue: formatScore(result.rawScore),
    errorLabel: "LOWER IS BETTER",
    errorValue: formatScore(result.rawScore),
    rating: "good",
    message: "Keep chasing a cleaner result.",
  };
}
