export type ShareResultPayload = {
  mode: "practice" | "daily";
  game?: string;
  headline: string;
  score: string;
  detail?: string;
  rank?: string;
  cta?: string;
};

function clean(value: string | undefined, max = 120): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function buildShareResultUrl(origin: string, payload: ShareResultPayload): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("mode", payload.mode);
  if (payload.game) params.set("game", clean(payload.game, 32));
  params.set("headline", clean(payload.headline, 72));
  params.set("score", clean(payload.score, 72));
  if (payload.detail) params.set("detail", clean(payload.detail, 100));
  if (payload.rank) params.set("rank", clean(payload.rank, 72));
  if (payload.cta) params.set("cta", clean(payload.cta, 72));
  return `${base}/share/result?${params.toString()}`;
}

export function buildShareText(payload: ShareResultPayload): string {
  const pieces = [payload.headline];
  if (payload.game) pieces.push(payload.game);
  pieces.push(payload.score);
  if (payload.detail) pieces.push(payload.detail);
  if (payload.rank) pieces.push(payload.rank);
  pieces.push(payload.cta ?? "Think you can beat it?");
  return pieces.filter(Boolean).join(" · ");
}
