import type { ScheduleConfig } from './schedule.ts'

export const scheduleConfig: ScheduleConfig = {
  scheduleStart: '2025-12-29',
  startPerson: 'Svenne',
  participants: [
    'Svenne', 'Jonis', 'Matte', 'Daniel L', 'Johan',
    'Viktor', 'Oscar', 'Göran', 'Daniel S', 'Benke',
  ],
  specialWeeks: [],
  yearlySpecialWeeks: [
    {
      monthDay: '08-16', fromYear: 2027, type: 'everyone',
      description: 'Bockpremiär och kronviltspremiär för hind och årskalv · 16 augusti',
    },
    {
      monthDay: '10-08', fromYear: 2027, type: 'everyone',
      description: 'Kronhjortspremiär för handjur · 8 oktober',
    },
  ],
  rotationChanges: [],
}
