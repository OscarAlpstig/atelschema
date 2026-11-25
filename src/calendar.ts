import { dateKey, formatDate } from './dates.ts'
import type { ScheduleWeek } from './schedule.ts'

const utf8 = new TextEncoder()

export function calendarPersonKey(person: string): string {
  return person.replace(/[^a-zA-Z0-9]/gu, (char) => `_${char.codePointAt(0)!.toString(16)}_`)
}

function calendarWeeks(weeks: readonly ScheduleWeek[], person: string): ScheduleWeek[] {
  const selected = weeks.filter((week) => week.type === 'everyone' || week.person === person)
  return [...new Map(selected.map((week) => [week.start, week])).values()]
    .sort((first, second) => first.start - second.start)
}

function eventDetails(week: ScheduleWeek) {
  const responsibility = week.type === 'everyone' ? 'Alla åtlar' : week.person
  return {
    title: `Åtling vecka ${week.week} – ${responsibility}`,
    description: [`${formatDate(week.start)} – ${formatDate(week.end)}`, week.description]
      .filter(Boolean).join('\n'),
    start: dateKey(week.start).replaceAll('-', ''),
    end: dateKey(week.end + 1).replaceAll('-', ''),
  }
}

export function googleCalendarUrl(week: ScheduleWeek): string {
  const event = eventDetails(week)
  const url = new URL('https://calendar.google.com/calendar/r/eventedit')
  url.search = new URLSearchParams({
    action: 'TEMPLATE', text: event.title, dates: `${event.start}/${event.end}`, details: event.description,
  }).toString()
  return url.href
}

function escapeCalendarText(value: string): string {
  return value.replaceAll('\\', '\\\\').replace(/[;,]/g, '\\$&').replace(/\r\n|\r|\n/g, '\\n')
}

function foldCalendarLine(line: string): string {
  let result = ''
  let bytes = 0
  for (const character of line) {
    const size = utf8.encode(character).length
    if (bytes + size > 75) {
      result += '\r\n '
      bytes = 1
    }
    result += character
    bytes += size
  }
  return result
}

export function createCalendar(weeks: readonly ScheduleWeek[], person: string, generatedAt: Date): string {
  const timestamp = generatedAt.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const personKey = calendarPersonKey(person)
  const events = calendarWeeks(weeks, person).flatMap((week) => {
    const event = eventDetails(week)
    return [
      'BEGIN:VEVENT',
      `UID:atelschema-${event.start}-${personKey}@oscaralpstig.github.io`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${event.start}`,
      `DTEND;VALUE=DATE:${event.end}`,
      `SUMMARY:${escapeCalendarText(event.title)}`,
      `DESCRIPTION:${escapeCalendarText(event.description)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]
  })
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelschema//Atelschema//SV',
    `X-WR-CALNAME:${escapeCalendarText(`Åtelschema – ${person}`)}`,
    ...events, 'END:VCALENDAR', '',
  ].map(foldCalendarLine).join('\r\n')
}
