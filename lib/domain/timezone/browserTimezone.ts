"use client";

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function withPlayerTimeZone(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set("x-player-timezone", getBrowserTimeZone());
  return headers;
}
