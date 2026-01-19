/**
 * Format wait time as a human-readable string
 */
export function formatWaitTime(availableSince: number | undefined): string {
  if (!availableSince) return '';

  const now = Date.now();
  const waitMs = now - availableSince;

  if (waitMs < 0) return '';

  const minutes = Math.floor(waitMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m waiting`
      : `${hours}h waiting`;
  }

  if (minutes > 0) {
    return `${minutes}m waiting`;
  }

  return 'Just ready';
}

/**
 * Get the wait time in minutes (for sorting priority indicators)
 */
export function getWaitMinutes(availableSince: number | undefined): number {
  if (!availableSince) return 0;
  return Math.floor((Date.now() - availableSince) / 60000);
}
