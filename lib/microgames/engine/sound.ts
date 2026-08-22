"use client";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("the_cut_sound") !== "off";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("the_cut_sound", enabled ? "on" : "off");
}

export function isSoundEnabled(): boolean {
  return soundEnabled();
}

export function unlockAudio() {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    unlocked = true;
  } catch {
    // Audio is enhancement only.
  }
}

function tone(freq: number, durationMs: number, delayMs = 0, type: OscillatorType = "sine", gain = 0.05) {
  if (!soundEnabled()) return;
  try {
    audioCtx ??= new AudioContext();
    if (!unlocked && audioCtx.state === "suspended") void audioCtx.resume();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const start = ctx.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  } catch {
    // Non-fatal.
  }
}

export function soundTap() {
  tone(240, 45, 0, "sine", 0.025);
}

export function soundGood() {
  tone(520, 90, 0, "sine", 0.04);
  tone(720, 130, 70, "sine", 0.04);
}

export function soundBad() {
  tone(180, 140, 0, "sawtooth", 0.025);
  tone(115, 180, 90, "sine", 0.035);
}

export function soundPersonalBest() {
  tone(523, 90, 0, "sine", 0.045);
  tone(659, 100, 75, "sine", 0.045);
  tone(784, 130, 150, "sine", 0.05);
  tone(1047, 220, 240, "sine", 0.045);
}

export function soundSurvived() {
  tone(392, 90, 0, "triangle", 0.045);
  tone(587, 110, 80, "triangle", 0.045);
  tone(784, 170, 165, "triangle", 0.05);
}

export function soundCut() {
  tone(220, 120, 0, "sawtooth", 0.035);
  tone(150, 180, 70, "sawtooth", 0.03);
  tone(90, 250, 150, "sine", 0.045);
}
