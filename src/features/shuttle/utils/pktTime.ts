/** Pakistan Standard Time — UTC+5 year-round (no DST). */
export const PKT_TIMEZONE = 'Asia/Karachi';

/**
 * Current clock time in PKT as minutes since midnight.
 */
export function getPktMinutesSinceMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PKT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

/**
 * Parse a route-stop ETA / lock time (HH:MM, HH:MM:SS, or ISO) to minutes since midnight.
 */
export function parseEtaToMinutes(eta: string | null | undefined): number | null {
  if (eta == null) return null;
  const raw = String(eta).trim();
  if (!raw) return null;

  if (raw.includes('T')) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  const [hStr, mStr = '00'] = raw.split(':');
  const hours = Number.parseInt(hStr, 10);
  const minutes = Number.parseInt(mStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/** Format minutes since midnight as e.g. "5:00 PM". */
export function formatMinutesAs12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export type EveningStartLock = {
  locked: boolean;
  unlockAtLabel: string | null;
};

/**
 * Whether the evening return trip is still locked until evening_lock_time (PKT).
 * No lock when evening_lock_time is missing.
 */
export function getEveningStartLock(
  eveningLockTime: string | null | undefined,
  now: Date = new Date(),
): EveningStartLock {
  const etaMinutes = parseEtaToMinutes(eveningLockTime);
  if (etaMinutes == null) {
    return { locked: false, unlockAtLabel: null };
  }
  const locked = getPktMinutesSinceMidnight(now) < etaMinutes;
  return {
    locked,
    unlockAtLabel: formatMinutesAs12h(etaMinutes),
  };
}
