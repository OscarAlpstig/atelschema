import { calendarYearBounds, DAYS_PER_WEEK, isoMonday, isoWeek, monday, parseDay, type Day } from './dates.ts'

export type WeekType = 'regular' | 'everyone' | 'none'
type SpecialWeek = ({ date: string } | { year: number; week: number }) & {
  type: WeekType
  description?: string
}
type Rotation = {
  startPerson: string
  participants: readonly string[]
}

export type ScheduleConfig = Rotation & {
  scheduleStart: string
  specialWeeks: readonly SpecialWeek[]
  rotationChanges?: readonly (Rotation & { effectiveFrom: string })[]
  provisional?: boolean
}

export type ScheduleWeek = {
  start: Day
  end: Day
  year: number
  week: number
  description?: string
} & ({ type: 'regular'; person: string } | { type: 'everyone' | 'none'; person?: never })

function mondayFrom(key: string): Day {
  const day = parseDay(key)
  if (monday(day) !== day) throw new Error(`${key} måste vara en måndag.`)
  return day
}

function makeRotation(start: Day, { participants, startPerson }: Rotation) {
  if (new Set(participants).size !== participants.length ||
      participants.some((person) => !person.trim() || person.trim() !== person)) {
    throw new Error('Deltagarlistan måste innehålla unika, ifyllda namn utan omgivande blanksteg.')
  }
  const startIndex = participants.indexOf(startPerson)
  if (startIndex === -1) throw new Error(`Startpersonen ${startPerson} saknas i deltagarlistan.`)
  return { start, startIndex, participants: [...participants] }
}

export function createSchedule(config: ScheduleConfig) {
  const start = mondayFrom(config.scheduleStart)
  const changes = (config.rotationChanges ?? []).map((change) =>
    makeRotation(mondayFrom(change.effectiveFrom), change),
  )
  const rotations = [makeRotation(start, config), ...changes]
  if (changes.some((rotation, index) => rotation.start <= rotations[index].start)) {
    throw new Error('Nya turordningar måste börja efter ankaret och anges i stigande datumordning.')
  }

  const specials = new Map<Day, SpecialWeek>()
  for (const entry of config.specialWeeks) {
    const day = 'date' in entry ? mondayFrom(entry.date) : isoMonday(entry.year, entry.week)
    if (day < start) throw new Error('En specialvecka börjar före rotationsankaret.')
    if (specials.has(day)) throw new Error('Samma specialvecka har angetts flera gånger.')
    if (!['regular', 'everyone', 'none'].includes(entry.type)) {
      throw new Error(`Okänd veckotyp: ${entry.type}.`)
    }
    specials.set(day, { ...entry })
  }
  const pauses = [...specials].filter(([, week]) => week.type !== 'regular').map(([day]) => day)
  const participants = [...new Set(rotations.flatMap((rotation) => rotation.participants))]

  function weekAt(day: Day): ScheduleWeek | undefined {
    const weekStart = monday(day)
    if (weekStart < start) return undefined
    const special = specials.get(weekStart)
    const details = {
      start: weekStart,
      end: weekStart + DAYS_PER_WEEK - 1,
      ...isoWeek(weekStart),
      description: special?.description,
    }
    if (special && special.type !== 'regular') return { ...details, type: special.type }

    const rotation = rotations.findLast((period) => period.start <= weekStart)!
    const skipped = pauses.filter((pause) => pause >= rotation.start && pause < weekStart).length
    const turns = (weekStart - rotation.start) / DAYS_PER_WEEK - skipped
    const index = (rotation.startIndex + turns) % rotation.participants.length
    return { ...details, type: 'regular', person: rotation.participants[index] }
  }

  function weeksForYear(year: number): ScheduleWeek[] {
    const { first, last } = calendarYearBounds(year)
    const weeks: ScheduleWeek[] = []
    for (let day = Math.max(first, start); day <= last; day += DAYS_PER_WEEK) {
      weeks.push(weekAt(day)!)
    }
    return weeks
  }

  function adjacentRegular(day: Day, direction: -1 | 1) {
    let candidate = monday(day) + direction * DAYS_PER_WEEK
    while (candidate >= start || direction === 1) {
      const week = weekAt(candidate)
      if (week?.type === 'regular') return week
      candidate += direction * DAYS_PER_WEEK
    }
    return undefined
  }

  function nextForPerson(person: string, from: Day) {
    const first = Math.max(start, monday(from))
    for (const [index, rotation] of rotations.entries()) {
      if (!rotation.participants.includes(person)) continue
      const next = rotations[index + 1]?.start ?? Infinity
      let candidate = Math.max(first, rotation.start)
      const pausesInPeriod = pauses.filter((pause) => pause >= candidate && pause < next).length
      // Within one full rotation plus the pauses, every member gets a turn.
      const limit = Math.min(next, candidate + (rotation.participants.length + pausesInPeriod) * DAYS_PER_WEEK)
      for (; candidate < limit; candidate += DAYS_PER_WEEK) {
        const week = weekAt(candidate)
        if (week?.type === 'regular' && week.person === person) return week
      }
    }
    return undefined
  }

  return { start, participants, weekAt, weeksForYear, adjacentRegular, nextForPerson }
}

export function personalWeeks(weeks: readonly ScheduleWeek[], person: string, from: Day) {
  const regular = weeks.filter((week) => week.type === 'regular' && week.person === person)
  return {
    count: regular.length,
    regular,
    upcoming: regular.filter((week) => week.end >= from),
    everyone: weeks.filter((week) => week.type === 'everyone'),
  }
}
