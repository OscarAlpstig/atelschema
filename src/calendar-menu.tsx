import { useState } from 'react'
import { calendarPersonKey, createCalendar } from './calendar.ts'
import type { ScheduleWeek } from './schedule.ts'

export function CalendarMenu({ person, year, weeks }: {
  person: string; year: number; weeks: readonly ScheduleWeek[]
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const key = calendarPersonKey(person)
  const feed = new URL(`${import.meta.env.BASE_URL}kalender/${key}.ics`, location.origin).href

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feed)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('manual')
    }
  }

  function downloadCalendar() {
    const file = new Blob([createCalendar(weeks, person, new Date())], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const download = document.createElement('a')
    download.href = url
    download.download = `atelschema-${key}-${year}.ics`
    download.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return <details className="surface calendar-menu">
    <summary>Lägg till i kalendern</summary>
    <div className="calendar-options">
      <section>
        <h3>iPhone · Apple Kalender</h3>
        <p>Prenumerera på dina egna och gemensamma veckor. Kalendern uppdateras när schemat ändras.</p>
        <a className="button" href={feed.replace(/^https?:/, 'webcal:')}>Öppna i Apple Kalender</a>
        <p>Du kan också kopiera länken och klistra in den under <strong>Lägg till prenumerationskalender</strong> i Apple Kalender.</p>
      </section>
      <section>
        <h3>Android · Google Kalender</h3>
        <p>Fäll ut en vecka nedan och välj <strong>Lägg till i Google Kalender</strong> för att spara den från telefonen.</p>
        <p>För alla veckor, lägg till kalenderlänken under <strong>Andra kalendrar</strong>, <strong>Från webbadress</strong> på datorn. Använd samma Google-konto på telefonen.</p>
      </section>
    </div>
    <div className="calendar-actions">
      <button className="button" onClick={() => void copyFeed()}>Kopiera kalenderlänk</button>
      <button className="button" onClick={downloadCalendar}>Ladda ner {year} (.ics)</button>
      <span role="status">{copyStatus === 'copied' && 'Kalenderlänken är kopierad.'}</span>
    </div>
    {copyStatus === 'manual' && <input aria-label="Kalenderlänk" className="calendar-link"
      value={feed} readOnly onFocus={(event) => event.currentTarget.select()} />}
  </details>
}
