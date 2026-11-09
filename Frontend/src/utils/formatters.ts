/**
 * @file formatters.ts
 * @description Pure utility functions for validating 17-digit Birth Certificate Numbers (BCN),
 * privacy-masking student IDs, converting ASCII digits to Bengali numerals, and calculating countdown timers.
 */

/**
 * Validates whether the provided string is a strict 17-digit numeric Birth Certificate Number (BCN).
 *
 * @param id - Raw student ID input string.
 * @returns `true` if `id` consists of exactly 17 ASCII digits after trimming; otherwise `false`.
 */
export function isValidStudentId(id: string): boolean {
  return /^\d{17}$/.test(id.trim());
}

/**
 * Masks the middle 9 digits of a 17-digit Student BCN for privacy (`2010*********0123`).
 *
 * @param id - The 17-digit Student BCN string.
 * @returns Masked string showing only the first 4 and last 4 digits, or the trimmed input if not 17 characters.
 */
export function maskStudentId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 17) {
    return `${trimmed.slice(0, 4)}*********${trimmed.slice(13)}`;
  }
  return trimmed;
}

/**
 * Converts Western ASCII digits (`0-9`) in a number or string into Bengali numerals (`০-৯`).
 *
 * @param val - Number or string containing ASCII digits.
 * @returns String with all digits replaced by their Bengali script equivalents.
 */
export function toBengaliNumerals(val: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bengaliDigits[Number(d)]);
}

/**
 * Computes the remaining time until a hold's `expiresAt` ISO-8601 UTC timestamp.
 *
 * @param expiresAtIso - ISO-8601 UTC expiration timestamp from the backend.
 * @returns Object containing `remainingSeconds`, `formatted` (`MM:SS`), and `isExpired` boolean flag.
 */
export function formatRemainingTime(expiresAtIso: string): {
  remainingSeconds: number;
  formatted: string;
  isExpired: boolean;
} {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return {
    remainingSeconds,
    formatted,
    isExpired: remainingSeconds <= 0,
  };
}
