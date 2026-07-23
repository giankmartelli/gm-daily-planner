export type Interval = { start: number; end: number }
export const MINUTES_PER_DAY = 1440
export function toMinutes(time: string) { const match = /^(\d{2}):(\d{2})$/.exec(time); if (!match) return Number.NaN; const value = Number(match[1]) * 60 + Number(match[2]); return Number(match[1]) < 24 && Number(match[2]) < 60 ? value : Number.NaN }
export function toTime(minutes: number) { const safe = Math.max(0, Math.min(MINUTES_PER_DAY, minutes)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}` }
export function duration(interval: Interval) { return Math.max(0, interval.end - interval.start) }
export function overlaps(left: Interval, right: Interval) { return left.start < right.end && right.start < left.end }
export function subtractIntervals(base: Interval, occupied: Interval[]) { const sorted = occupied.filter((item) => overlaps(base, item)).map((item) => ({ start: Math.max(base.start, item.start), end: Math.min(base.end, item.end) })).sort((a, b) => a.start - b.start); const gaps: Interval[] = []; let cursor = base.start; for (const item of sorted) { if (item.start > cursor) gaps.push({ start: cursor, end: item.start }); cursor = Math.max(cursor, item.end) } if (cursor < base.end) gaps.push({ start: cursor, end: base.end }); return gaps }
