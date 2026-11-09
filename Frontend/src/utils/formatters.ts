export function isValidStudentId(id: string): boolean {
  return /^\d{17}$/.test(id.trim());
}

export function maskStudentId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 17) {
    return `${trimmed.slice(0, 4)}*********${trimmed.slice(13)}`;
  }
  return trimmed;
}

export function toBengaliNumerals(val: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bengaliDigits[Number(d)]);
}

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
