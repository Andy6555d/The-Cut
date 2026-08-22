"use client";

// navigator.vibrate is Android/Chrome-class support only — iOS Safari never
// implements it, by Apple's own choice, not a bug on our end. Every call
// here is a no-op where it's missing, per spec §30 ("haptics where
// supported"). Never assume it worked; never block anything on it.

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** A light tick — used on the moment-of-input tap itself. */
export function hapticTap() {
  if (canVibrate()) navigator.vibrate(10);
}

/** A short pulse pattern reflecting whether the result was good or not. */
export function hapticResult(good: boolean) {
  if (!canVibrate()) return;
  navigator.vibrate(good ? [15, 40, 15] : 60);
}

/** A distinct, more celebratory pattern reserved for a new personal best. */
export function hapticNewBest() {
  if (canVibrate()) navigator.vibrate([20, 30, 20, 30, 40]);
}
