import crypto from "crypto";

// A deliberately simple signed token, not a full JWT library — we only need
// tamper-evidence and expiry on a handful of known fields, and pulling in a
// JWT dependency I can't verify installs cleanly (see PHASE_A/B notes on
// blocked npm access in my review sandbox) isn't worth it for this shape.
// Format: base64url(json payload) + "." + base64url(hmac-sha256 signature)

export interface AttemptTokenPayload {
  attemptId: string;
  playerId: string;
  dailyId: string;
  exp: number; // unix ms
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getSecret(): string {
  const secret = process.env.ATTEMPT_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "ATTEMPT_TOKEN_SECRET is not set. Add it in Vercel → Project → Settings → Environment Variables."
    );
  }
  return secret;
}

export function signAttemptToken(payload: AttemptTokenPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadPart = base64url(Buffer.from(payloadJson, "utf8"));
  const signature = crypto.createHmac("sha256", getSecret()).update(payloadPart).digest();
  const signaturePart = base64url(signature);
  return `${payloadPart}.${signaturePart}`;
}

export function verifyAttemptToken(token: string): AttemptTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = base64url(
    crypto.createHmac("sha256", getSecret()).update(payloadPart).digest()
  );

  // Constant-time comparison — a token verification path is exactly the
  // kind of place a naive === comparison creates a timing side-channel.
  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8")) as AttemptTokenPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
