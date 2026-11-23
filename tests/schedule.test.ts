import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dateKey, formatRange, isoMonday, isoWeek, monday, parseDay, stockholmDay } from '../src/dates.ts'
import { createSchedule, personalWeeks, type ScheduleConfig } from '../src/schedule.ts'
import { scheduleConfig } from '../src/schedule.config.ts'

const participants = [
  'Svenne', 'Jonis', 'Matte', 'Daniel L', 'Johan',
  'Viktor', 'Oscar', 'Göran', 'Daniel S', 'Benke',
] as const
const fixture = {
  scheduleStart: '2025-12-22',
  startPerson: 'Svenne',
  participants,
  specialWeeks: [],
} satisfies ScheduleConfig
const create = (overrides: Partial<ScheduleConfig> = {}) => createSchedule({ ...fixture, ...overrides })
const historicalSpecials = [
  { year: 2026, week: 39, type: 'everyone', description: 'Jaktpremiär' },
  { date: '2026-09-28', type: 'none', description: 'Uppehåll' },
] satisfies ScheduleConfig['specialWeeks']

test('rotationen börjar på vald person och omfattar deltagarna i angiven ordning', () => {
  const schedule = create({ startPerson: 'Oscar' })
  const order = [...participants.slice(6), ...participants.slice(0, 6), 'Oscar']
  assert.deepEqual(order.map((_, offset) => schedule.weekAt(schedule.start + offset * 7)?.person), order)
  assert.equal(schedule.weekAt(schedule.start - 1), undefined)
})

test('årsskiftet efter ISO-vecka 52 fortsätter den ordinarie turordningen', () => {
  const schedule = create()
  assert.equal(schedule.weekAt(isoMonday(2025, 52))?.person, 'Svenne')
  assert.equal(schedule.weekAt(isoMonday(2026, 1))?.person, 'Jonis')
  assert.equal(schedule.weekAt(isoMonday(2026, 2))?.person, 'Matte')
})

test('årsskiftet efter ISO-vecka 53 fortsätter den ordinarie turordningen', () => {
  const schedule = create()
  assert.equal(schedule.weekAt(isoMonday(2026, 52))?.person, 'Matte')
  assert.equal(schedule.weekAt(isoMonday(2026, 53))?.person, 'Daniel L')
  assert.equal(schedule.weekAt(isoMonday(2027, 1))?.person, 'Johan')
})

test('premiärvecka tilldelas alla och bevarar beskrivningen', () => {
  const week = create({ specialWeeks: historicalSpecials }).weekAt(isoMonday(2026, 39))
  assert.equal(week?.type, 'everyone')
  assert.equal(week?.person, undefined)
  assert.equal(week?.description, 'Jaktpremiär')
})

test('uppehåll tilldelas ingen och kan identifieras med måndagens datum', () => {
  const week = create({ specialWeeks: historicalSpecials }).weekAt(isoMonday(2026, 40))
  assert.equal(week?.type, 'none')
  assert.equal(week?.person, undefined)
  assert.equal(week?.description, 'Uppehåll')
})

test('två specialveckor i rad förbrukar inga turer och hoppas över när grannar söks', () => {
  const schedule = create({ specialWeeks: historicalSpecials })
  const before = isoMonday(2026, 38)
  const after = isoMonday(2026, 41)
  assert.equal(schedule.weekAt(before)?.person, 'Daniel S')
  assert.equal(schedule.weekAt(after)?.person, 'Benke')
  assert.equal(schedule.weekAt(after + 7)?.person, 'Svenne')
  assert.equal(schedule.adjacentRegular(before, 1)?.start, after)
  assert.equal(schedule.adjacentRegular(after, -1)?.start, before)
  assert.equal(schedule.adjacentRegular(schedule.start, -1), undefined)
})

test('en ordinarie vecka kan ha en beskrivning och förbrukar sin ordinarie tur', () => {
  const schedule = create({ specialWeeks: [{ year: 2025, week: 52, type: 'regular', description: 'Ordinarie' }] })
  assert.equal(schedule.weekAt(schedule.start)?.description, 'Ordinarie')
  assert.equal(schedule.weekAt(schedule.start)?.person, 'Svenne')
  assert.equal(schedule.weekAt(schedule.start + 7)?.person, 'Jonis')
})

test('specialvecka på ankaret skjuter fram startpersonens första tur', () => {
  const schedule = create({ specialWeeks: [{ date: fixture.scheduleStart, type: 'none' }] })
  assert.equal(schedule.weekAt(schedule.start)?.type, 'none')
  assert.equal(schedule.weekAt(schedule.start + 7)?.person, 'Svenne')
  assert.equal(schedule.nextForPerson('Svenne', schedule.start)?.start, schedule.start + 7)
})

test('personvyn följer huvudschemat och visar alla-veckor separat', () => {
  const schedule = create({ specialWeeks: historicalSpecials })
  const weeks = schedule.weeksForYear(2026)
  const from = isoMonday(2026, 39)
  const own = personalWeeks(weeks, 'Benke', from)
  const assigned = weeks.filter((week) => week.person === 'Benke')
  assert.equal(own.count, assigned.length)
  assert.deepEqual(own.upcoming, assigned.filter((week) => week.end >= from))
  assert.deepEqual(own.everyone.map((week) => week.week), [39])
  assert.equal(schedule.nextForPerson('Benke', from)?.start, own.upcoming[0]?.start)
  assert.equal(schedule.nextForPerson('Benke', own.upcoming[0].end)?.start, own.upcoming[0].start)
})

test('ISO-veckoår, veckonummer och datumgränser stämmer runt årsskiften', () => {
  assert.deepEqual(isoWeek(parseDay('2021-01-01')), { year: 2020, week: 53 })
  assert.deepEqual(isoWeek(parseDay('2018-12-31')), { year: 2019, week: 1 })
  assert.equal(dateKey(isoMonday(2026, 1)), '2025-12-29')
  assert.equal(dateKey(isoMonday(2026, 53)), '2026-12-28')
  const week = create().weekAt(parseDay('2027-01-03'))!
  assert.equal(dateKey(week.end), '2027-01-03')
  assert.equal(formatRange(week.start, week.end), '28 december 2026 – 3 januari 2027')
})

test('kalenderårsvyn visar alla schemaveckor som överlappar året', () => {
  const schedule = create()
  const weeks = schedule.weeksForYear(2027)
  assert.equal(dateKey(weeks[0].start), '2026-12-28')
  assert.equal(weeks[0].year, 2026)
  assert.equal(dateKey(weeks.at(-1)!.end), '2028-01-02')
  assert.ok(weeks.every((week) => week.start === monday(week.start) && week.end === week.start + 6))
  assert.deepEqual(schedule.weeksForYear(2024), [])
})

test('Stockholms lokala midnatt avgör veckobyte oberoende av sommar- eller vintertid', () => {
  const isoAt = (instant: string) => isoWeek(stockholmDay(new Date(instant)))
  assert.deepEqual(isoAt('2026-11-22T22:59:59Z'), { year: 2026, week: 47 })
  assert.deepEqual(isoAt('2026-11-22T23:00:00Z'), { year: 2026, week: 48 })
  assert.deepEqual(isoAt('2026-03-29T21:59:59Z'), { year: 2026, week: 13 })
  assert.deepEqual(isoAt('2026-03-29T22:00:00Z'), { year: 2026, week: 14 })
})

test('beräkningen är deterministisk för senare år oavsett anropsordning', () => {
  const schedule = create({ specialWeeks: historicalSpecials })
  const future = schedule.weeksForYear(2051)
  schedule.weeksForYear(2026)
  assert.deepEqual(schedule.weeksForYear(2051), future)
  assert.deepEqual(create({ specialWeeks: [...historicalSpecials].reverse() }).weeksForYear(2051), future)
})

test('gamla specialveckor påverkar senare år och nytillkomna påverkar bara från sitt datum', () => {
  const historical = create({ specialWeeks: historicalSpecials })
  const extended = create({
    specialWeeks: [...historicalSpecials, { year: 2028, week: 30, type: 'everyone' }],
  })
  const later = isoMonday(2028, 31)
  assert.notEqual(historical.weekAt(later)?.person, create().weekAt(later)?.person)
  for (const year of [2025, 2026, 2027]) {
    assert.deepEqual(extended.weeksForYear(year), historical.weeksForYear(year))
  }
  assert.equal(extended.weekAt(later)?.person, historical.weekAt(later - 7)?.person)
})

test('regression över flera år med fast ankare och bevarade historiska specialveckor', () => {
  const approvedFixture = create({ specialWeeks: historicalSpecials })
  const checkpoints = [
    ['2025-12-22', 'Svenne'],
    ['2026-01-05', 'Matte'],
    ['2026-10-05', 'Benke'],
    ['2026-12-28', 'Jonis'],
    ['2027-01-04', 'Matte'],
    ['2028-01-03', 'Johan'],
    ['2029-01-01', 'Oscar'],
  ]
  for (const [date, person] of checkpoints) {
    assert.equal(approvedFixture.weekAt(parseDay(date))?.person, person, date)
  }
})

test('aktuella konfigurationen matchar Word-schemat för hela 2026', () => {
  const schedule = createSchedule(scheduleConfig)
  assert.equal(schedule.start, isoMonday(2026, 1))
  for (let week = 1; week <= 52; week++) {
    const expected = participants[(week - 1) % participants.length]
    assert.equal(schedule.weekAt(isoMonday(2026, week))?.person, expected, `2026-W${week}`)
  }
})

test('den fastställda ordningen inför årsskiftet och tilldelningen för vecka 53 bevaras', () => {
  const schedule = createSchedule(scheduleConfig)
  const checkpoints = [
    [48, 'Göran'],
    [49, 'Daniel S'],
    [50, 'Benke'],
    [51, 'Svenne'],
    [52, 'Jonis'],
    // Word-schemat slutar efter vecka 52. Vecka 53 följer ordinarie rotation.
    [53, 'Matte'],
  ] as const
  for (const [week, person] of checkpoints) {
    assert.equal(schedule.weekAt(isoMonday(2026, week))?.person, person, `2026-W${week}`)
  }
})

test('en daterad turordningsändring bevarar historiken, även med specialvecka vid bytet', () => {
  const change = {
    effectiveFrom: '2026-10-05',
    startPerson: 'Göran',
    participants: ['Göran', 'Nya deltagaren'],
  }
  const specialWeeks = [...historicalSpecials, { date: change.effectiveFrom, type: 'none' }] satisfies ScheduleConfig['specialWeeks']
  const before = create({ specialWeeks })
  const after = create({ specialWeeks, rotationChanges: [change] })
  const start = parseDay(change.effectiveFrom)
  const history = (schedule: ReturnType<typeof create>) => schedule.weeksForYear(2026).filter((week) => week.start < start)
  assert.deepEqual(history(before), history(after))
  assert.equal(after.weekAt(start)?.type, 'none')
  assert.equal(after.weekAt(start + 7)?.person, 'Göran')
  assert.equal(after.weekAt(start + 14)?.person, 'Nya deltagaren')
  assert.equal(after.nextForPerson('Nya deltagaren', after.start)?.start, start + 14)
  assert.equal(after.nextForPerson('Svenne', start - 14), undefined)
  assert.ok(after.participants.includes('Benke'))
})

test('ogiltiga datum, veckor, deltagare och dubbletter upptäcks', () => {
  assert.throws(() => create({ scheduleStart: '2026-02-30' }), /Ogiltigt datum/)
  assert.throws(() => create({ scheduleStart: '2025-12-23' }), /måndag/)
  assert.throws(() => create({ startPerson: 'Saknas' }), /saknas/)
  assert.throws(() => create({ participants: ['Svenne', 'Svenne'] }), /unika/)
  assert.throws(() => create({ specialWeeks: [{ year: 2025, week: 53, type: 'none' }] }), /Ogiltig ISO-vecka/)
  assert.throws(() => create({ specialWeeks: [{ year: 2026, week: 0, type: 'none' }] }), /Ogiltig ISO-vecka/)
  assert.throws(() => create({ specialWeeks: [{ date: '2025-12-15', type: 'none' }] }), /före rotationsankaret/)
  assert.throws(() => create({ specialWeeks: [{ date: '2026-09-22', type: 'none' }] }), /måndag/)
  assert.throws(() => create({ specialWeeks: [...historicalSpecials, { date: '2026-09-21', type: 'none' }] }), /flera gånger/)
  const late = { effectiveFrom: '2026-10-12', startPerson: 'Svenne', participants }
  const early = { ...late, effectiveFrom: '2026-10-05' }
  assert.throws(() => create({ rotationChanges: [late, early] }), /stigande datumordning/)
  assert.throws(() => create({ rotationChanges: [{ ...late, startPerson: 'Saknas' }] }), /saknas/)
})
