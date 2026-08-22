// No 0/O, 1/I/L — characters that are easy to misread when someone reads
// a code aloud or types it in from a screenshot.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? "A";
  }
  return code;
}
