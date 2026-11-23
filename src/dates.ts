// A Day is a civil date represented by its integer distance from 1970-01-01.
// Read the clock in Stockholm, then use UTC solely for civil date arithmetic.
export type Day = number
export const DAYS_PER_WEEK = 7
const DAY_MS = 86_400_000
const stockholm = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
})
const monthDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'UTC', month: 'short', day: 'numeric',
})
const fullDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
})

function asDate(day: Day): Date {
  return new Date(day * DAY_MS)
}

export function dateKey(day: Day): string {
  return asDate(day).toISOString().slice(0, 10)
}

export function parseDay(key: string): Day {
  const time = /^\d{4}-\d{2}-\d{2}$/.test(key) ? Date.parse(key) : NaN
  if (!Number.isFinite(time) || dateKey(time / DAY_MS) !== key) {
    throw new Error(`Ogiltigt datum: ${key}. Använd ÅÅÅÅ-MM-DD.`)
  }
  return time / DAY_MS
}

export function stockholmDay(now: Date): Day {
  const parts = stockholm.formatToParts(now)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  return parseDay(`${part('year')}-${part('month')}-${part('day')}`)
}

export function monday(day: Day): Day {
  return day - (asDate(day).getUTCDay() + 6) % DAYS_PER_WEEK
}

function ordinalDate(year: number, monthDay: string): Day {
  return parseDay(`${String(year).padStart(4, '0')}-${monthDay}`)
}

function firstIsoMonday(year: number): Day {
  return monday(ordinalDate(year, '01-04'))
}

export function isoWeek(day: Day) {
  const start = monday(day)
  const year = asDate(start + 3).getUTCFullYear()
  return { year, week: (start - firstIsoMonday(year)) / DAYS_PER_WEEK + 1 }
}

export function isoMonday(year: number, week: number): Day {
  if (!Number.isInteger(year) || year < 1 || year > 9998 ||
      !Number.isInteger(week) || week < 1 || week > 53) {
    throw new Error(`Ogiltig ISO-vecka: ${year}-W${week}.`)
  }
  const start = firstIsoMonday(year) + (week - 1) * DAYS_PER_WEEK
  if (start >= firstIsoMonday(year + 1)) {
    throw new Error(`Ogiltig ISO-vecka: ${year}-W${week}.`)
  }
  return start
}

export function calendarYearBounds(year: number) {
  return {
    first: monday(ordinalDate(year, '01-01')),
    last: monday(ordinalDate(year, '12-31')),
  }
}

export function formatDate(day: Day): string {
  return fullDate.format(asDate(day))
}

export function formatRange(start: Day, end: Day): string {
  const from = asDate(start)
  const to = asDate(end)
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${formatDate(start)} – ${formatDate(end)}`
  }
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()}–${monthDay.format(to)}`
  }
  return `${monthDay.format(from)} – ${monthDay.format(to)}`
}
