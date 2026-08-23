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

/**
 * A single very light pulse for one anticipation tick — call once per
 * tick alongside soundAnticipationTick so the build-up is felt as well as
 * heard. Deliberately much softer than hapticTap, which marks an actual
 * input, not a countdown beat.
 */
export function hapticAnticipationTick() {
  if (canVibrate()) navigator.vibrate(6);
}

/** The release pulse for the exact GO moment — sits between a tick and a
 *  full result pulse, since it's neither idle nor a scored outcome yet. */
export function hapticGo() {
  if (canVibrate()) navigator.vibrate(18);
}
