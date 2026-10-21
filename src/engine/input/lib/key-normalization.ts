const russianLetters = "йцукенгшщзфывапролдячсмить";
const physicalLetters = "qwertyuiopasdfghjklzxcvbnm";

export function normalizeKey(key: string, code?: string): string {
  if (code && /^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (code === "Slash") return "/";
  const lower = key.toLowerCase();
  const russianIndex = russianLetters.indexOf(lower);
  return lower.length === 1 && russianIndex >= 0
    ? physicalLetters[russianIndex]!
    : lower;
}
