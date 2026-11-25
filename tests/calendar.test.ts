import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarPersonKey, createCalendar, googleCalendarUrl } from '../src/calendar.ts'
import { isoMonday } from '../src/dates.ts'
import { createSchedule, type ScheduleWeek } from '../src/schedule.ts'
import { scheduleConfig } from '../src/schedule.config.ts'

const now = new Date('2026-11-25T12:00:00Z')
const schedule = createSchedule(scheduleConfig)

test('kalenderfilen innehåller egna och gemensamma veckor och hoppar över uppehåll', () => {
  const withPause = createSchedule({
    ...scheduleConfig,
    specialWeeks: [{ year: 2027, week: 1, type: 'none' }],
  })
  const year = withPause.weeksForYear(2027)
  const file = createCalendar(year, 'Oscar', now)
  const events = file.replaceAll('\r\n ', '').split('BEGIN:VEVENT\r\n').slice(1)
  assert.equal(events.length, year.filter((week) => week.person === 'Oscar' || week.type === 'everyone').length)
  assert.match(file, /SUMMARY:Åtling vecka 33 – Alla åtlar/)
  assert.match(file, /SUMMARY:Åtling vecka 40 – Alla åtlar/)
  assert.doesNotMatch(file, /SUMMARY:Åtling vecka 1 –/)
  assert.ok(events.every((event) => /SUMMARY:.* – (?:Oscar|Alla åtlar)\r\n/.test(event)))
})

test('veckan över nyår exporteras en gång som heldagar med måndag som exklusivt slut', () => {
  const week = schedule.weekAt(isoMonday(2026, 53))!
  const file = createCalendar([week, week], 'Matte', now)
  assert.equal(file.match(/BEGIN:VEVENT/g)?.length, 1)
  assert.match(file, /DTSTART;VALUE=DATE:20261228\r\nDTEND;VALUE=DATE:20270104\r\n/)
  assert.match(file, /DTSTAMP:20261125T120000Z/)
  assert.match(file, /TRANSP:TRANSPARENT/)
  const laterFile = createCalendar([week], 'Matte', new Date('2026-11-26T12:00:00Z'))
  assert.equal(file.match(/UID:.*/)?.[0], laterFile.match(/UID:.*/)?.[0])
  assert.ok(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(file.endsWith('END:VCALENDAR\r\n'))
})

test('kalendertext hanterar radbrytningar, tecken och långa UTF-8-rader', () => {
  const first = schedule.weekAt(isoMonday(2027, 33))!
  const week: ScheduleWeek = {
    ...first, description: 'Å'.repeat(80) + ', punkt; rad\r\nslash\\',
  }
  const file = createCalendar([week], 'Daniel L', now)
  assert.ok(file.split('\r\n').every((line) => Buffer.byteLength(line) <= 75))
  const unfolded = file.replaceAll('\r\n ', '')
  assert.ok(unfolded.includes('Å'.repeat(80) + '\\, punkt\\; rad\\nslash\\\\'))
  assert.match(calendarPersonKey('Daniel L'), /^[a-zA-Z0-9_]+$/)
  assert.notEqual(calendarPersonKey('Daniel L'), calendarPersonKey('Daniel_20_L'))
})

test('Google Kalender-länken förifyller en heldagsvecka', () => {
  const week = schedule.weekAt(isoMonday(2027, 33))!
  const url = new URL(googleCalendarUrl(week))
  assert.equal(url.origin, 'https://calendar.google.com')
  assert.equal(url.searchParams.get('action'), 'TEMPLATE')
  assert.equal(url.searchParams.get('dates'), '20270816/20270823')
  assert.equal(url.searchParams.get('text'), 'Åtling vecka 33 – Alla åtlar')
  assert.match(url.searchParams.get('details') ?? '', /Bockpremiär/)
})
