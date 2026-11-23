import { StrictMode, useEffect, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { DAYS_PER_WEEK, dateKey, formatDate, formatRange, isoWeek, monday, stockholmDay, type Day } from './dates.ts'
import { createSchedule, personalWeeks, type ScheduleWeek } from './schedule.ts'
import { scheduleConfig } from './schedule.config.ts'
import './styles.css'

const views = [
  { id: 'den-har-veckan', label: 'Den här veckan', icon: 'calendar' },
  { id: 'mina-veckor', label: 'Mina veckor', icon: 'person' },
  { id: 'hela-schemat', label: 'Hela schemat', icon: 'list' },
] as const

const icons = {
  tree: 'M12 3 7 9h3l-6 7h6v4h4v-4h6l-6-7h3l-5-6Z',
  calendar: 'M7 3v4m10-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  person: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  down: 'm6 9 6 6 6-6',
  info: 'M12 11v5m0-8h.01m9 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
} as const

function Icon({ name }: { name: keyof typeof icons }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>
}

const schedule = createSchedule(scheduleConfig)
const storageKey = 'atelschema-person'

function resolvePerson(name: string | null) {
  if (!name) return ''
  if (schedule.participants.includes(name)) return name
  // Keep existing bookmarks and saved selections working after the spelling correction.
  return name === 'Oskar' && schedule.participants.includes('Oscar') ? 'Oscar' : ''
}

function linkedPerson() {
  return resolvePerson(new URLSearchParams(location.search).get('person'))
}

function savedPerson() {
  try {
    return resolvePerson(localStorage.getItem(storageKey))
  } catch {
    return ''
  }
}

function activeView() {
  return views.find(({ id }) => location.hash === '#' + id) ??
    (linkedPerson() ? views[1] : views[0])
}

function responsible(week: ScheduleWeek | undefined) {
  if (!week) return 'Inför schemastart'
  if (week.type === 'regular') return week.person
  return week.type === 'everyone' ? 'Alla åtlar' : 'Ingen åtlar'
}

function weekLabel({ week, year }: { week: number; year: number }) {
  return `Vecka ${week}, ${year}`
}

function range(week: ScheduleWeek) {
  return formatRange(week.start, week.end)
}

function WeekView({ current }: { current: Day }) {
  const [selected, setSelected] = useState<Day | null>(null)
  const day = selected ?? current
  const week = schedule.weekAt(day)
  const previous = schedule.adjacentRegular(day, -1)
  const next = schedule.adjacentRegular(day, 1)
  const canGoBack = day > Math.min(current, schedule.start)

  return <>
    <header className="page-heading">
      <h1>Den här veckan</h1>
      <p>Se vem som ansvarar för åtlingen, vecka för vecka.</p>
    </header>
    <section className="week-hero" aria-label="Visad vecka">
      <div className="hero-content" aria-live="polite">
        <div className="week-marker">{day === current && <span className="current-dot" />}{weekLabel(isoWeek(day))}</div>
        <p className="hero-label">{week?.type === 'regular' ? 'Ansvarig för åtlingen' : week ? 'Specialvecka' : 'Åtelschemat'}</p>
        <h2>{responsible(week)}</h2>
        <p className="hero-date"><Icon name="calendar" />{formatRange(day, day + 6)}</p>
        {week?.description && <p className="hero-note">{week.description}</p>}
        {!week && <p className="hero-note">Rotationen börjar {formatDate(schedule.start)}.</p>}
      </div>
    </section>
    <div className="week-controls">
      <button className="button" disabled={!canGoBack} onClick={() => setSelected(day - DAYS_PER_WEEK)}>
        <Icon name="left" /> Föregående vecka
      </button>
      <button className="text-button current-link" disabled={day === current} onClick={() => setSelected(null)}>
        Till aktuell vecka
      </button>
      <button className="button" onClick={() => setSelected(day + DAYS_PER_WEEK)}>
        Nästa vecka <Icon name="right" />
      </button>
    </div>
    <section className="rotation" aria-labelledby="rotation-title">
      <h2 id="rotation-title">I turordningen</h2>
      <div className="rotation-grid">
        <Neighbor label="Föregående ordinarie" week={previous} icon="left" />
        <Neighbor label="Nästa ordinarie" week={next} icon="right" />
      </div>
    </section>
  </>
}

function Neighbor({ label, week, icon }: { label: string; week?: ScheduleWeek; icon: 'left' | 'right' }) {
  return <article className="neighbor surface">
    <span className="tile-icon"><Icon name={icon} /></span>
    <div>
      <p className="muted neighbor-label">{label}</p>
      <h3>{week ? responsible(week) : 'Ingen tidigare tilldelning'}</h3>
      {week && <p className="muted">Vecka {week.week} · {range(week)}</p>}
    </div>
  </article>
}

function YearControl({ year, onChange, min }: { year: number; onChange: (year: number) => void; min: number }) {
  return <fieldset className="year-filter">
    <legend>Kalenderår</legend>
    <div className="year-control">
      <button className="icon-button" type="button" aria-label="Föregående år"
        disabled={year <= min} onClick={() => onChange(year - 1)}><Icon name="left" /></button>
      <span aria-live="polite">{year}</span>
      <button className="icon-button" type="button" aria-label="Nästa år"
        disabled={year >= 9998} onClick={() => onChange(year + 1)}><Icon name="right" /></button>
    </div>
  </fieldset>
}

function PersonSelect({ label, value, empty, onChange }: {
  label: string; value: string; empty: string; onChange: (person: string) => void
}) {
  return <label className="person-filter">
    {label}
    <span className="select-wrap">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{empty}</option>
        {schedule.participants.map((name) => <option key={name}>{name}</option>)}
      </select>
      <Icon name="down" />
    </span>
  </label>
}

function WeekList({ weeks, current, empty }: {
  weeks: readonly ScheduleWeek[]; current: Day; empty: ReactNode
}) {
  if (weeks.length === 0) return <p className="empty surface">{empty}</p>

  return <ul className="week-list surface">
    {weeks.map((week) => <li key={week.start} className={
      week.start === current ? 'is-current' : week.start < current ? 'is-past' : undefined
    }>
      <details>
        <summary aria-current={week.start === current ? 'date' : undefined}>
          <span className="week-number"><span>VECKA</span><strong>{String(week.week).padStart(2, '0')}</strong></span>
          <span className="row-info">
            <strong>{responsible(week)}</strong>
            <span className="muted">{range(week)}</span>
          </span>
          <span className="row-tags">
            {week.type !== 'regular' && <span className="tag special-tag">Specialvecka</span>}
            {week.start === current && <span className="tag today-tag">Aktuell vecka</span>}
          </span>
          <Icon name="down" />
        </summary>
        <div className="week-details">
          <strong>{weekLabel(week)}</strong>
          <p>Måndag {formatDate(week.start)} – söndag {formatDate(week.end)}</p>
          {week.description && <p>{week.description}</p>}
          {week.type !== 'regular' && <p>Veckan pausar turordningen.</p>}
        </div>
      </details>
    </li>)}
  </ul>
}

function PersonalView({ person, onPerson, today, current, calendarYear, minYear }: {
  person: string; onPerson: (name: string) => void; today: Day; current: Day;
  calendarYear: number; minYear: number
}) {
  const [year, setYear] = useState(calendarYear)
  const weeks = personalWeeks(schedule.weeksForYear(year), person, today)
  const next = person ? schedule.nextForPerson(person, today) : undefined

  return <>
    <header className="page-heading">
      <h1>Mina veckor</h1>
      <p>Se när det är din tur och vilka veckor alla hjälps åt.</p>
    </header>
    <div className="filters surface">
      <PersonSelect label="Ditt namn" empty="Välj ditt namn" value={person} onChange={onPerson} />
      <YearControl year={year} onChange={setYear} min={minYear} />
    </div>
    {person ? <>
      <div className="personal-grid">
        <article className="neighbor surface">
          <span className="tile-icon"><Icon name="calendar" /></span>
          <div>
            <p className="muted neighbor-label">Nästa ordinarie åtelvecka</p>
            <h2>{next ? weekLabel(next) : 'Ingen tilldelad vecka'}</h2>
            {next && <p className="muted">{range(next)}</p>}
          </div>
        </article>
        <article className="neighbor surface">
          <span className="tile-icon"><Icon name="list" /></span>
          <div>
            <p className="muted neighbor-label">Ordinarie veckor under {year}</p>
            <h2>{weeks.count}</h2>
          </div>
        </article>
      </div>
      <section className="list-section" aria-labelledby="personal-upcoming">
        <h2 id="personal-upcoming">Kommande ordinarie veckor</h2>
        <WeekList weeks={weeks.upcoming} current={current} empty={`Du har inga kommande ordinarie veckor under ${year}.`} />
      </section>
      <section className="list-section" aria-labelledby="personal-everyone">
        <h2 id="personal-everyone">Specialveckor då alla åtlar</h2>
        <WeekList weeks={weeks.everyone} current={current} empty={`Inga gemensamma specialveckor under ${year}.`} />
      </section>
    </> : <p className="empty surface">Välj ditt namn för att visa dina åtelveckor.</p>}
  </>
}

function ScheduleView({ current, calendarYear, minYear }: { current: Day; calendarYear: number; minYear: number }) {
  const [year, setYear] = useState(calendarYear)
  const [filter, setFilter] = useState('')
  const [showPast, setShowPast] = useState(false)
  const yearWeeks = schedule.weeksForYear(year)
  const canToggleHistory = year === calendarYear && yearWeeks.some((week) => week.start < current)
  const weeks = yearWeeks.filter((week) =>
    (!canToggleHistory || showPast || week.start >= current) &&
    (!filter || week.person === filter || week.type === 'everyone'),
  )
  return <>
    <header className="page-heading">
      <h1>Hela schemat</h1>
      <p>Se ordinarie tilldelningar och specialveckor under året.</p>
    </header>
    <div className="filters surface">
      <YearControl year={year} onChange={setYear} min={minYear} />
      <PersonSelect label="Filtrera på person" empty="Alla deltagare" value={filter} onChange={setFilter} />
      {canToggleHistory && <label className="history-filter">
        <input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} />
        Visa tidigare veckor
      </label>}
    </div>
    <section className="list-section" aria-labelledby="year-heading">
      <h2 id="year-heading">Veckor under {year}</h2>
      <WeekList weeks={weeks} current={current} empty="Inga veckor att visa för det här urvalet." />
    </section>
  </>
}

function App() {
  const [view, setView] = useState(activeView)
  const [person, setPerson] = useState(() => linkedPerson() || savedPerson())
  const [today, setToday] = useState(() => stockholmDay(new Date()))
  const current = monday(today)
  const calendarYear = Number(dateKey(today).slice(0, 4))
  const minYear = Math.min(calendarYear, Number(dateKey(schedule.start).slice(0, 4)))

  useEffect(() => {
    function readLocation() {
      setView(activeView())
      setPerson(linkedPerson() || savedPerson())
    }
    const updateToday = () => setToday(stockholmDay(new Date()))
    const timer = window.setInterval(updateToday, 30_000)
    window.addEventListener('hashchange', readLocation)
    window.addEventListener('popstate', readLocation)
    document.addEventListener('visibilitychange', updateToday)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('hashchange', readLocation)
      window.removeEventListener('popstate', readLocation)
      document.removeEventListener('visibilitychange', updateToday)
    }
  }, [])

  useEffect(() => {
    try {
      if (person) localStorage.setItem(storageKey, person)
      else localStorage.removeItem(storageKey)
    } catch {
      // The URL still works when storage is unavailable.
    }
  }, [person])

  function selectPerson(name: string) {
    setPerson(name)
    const url = new URL(location.href)
    url.hash = views[1].id
    if (name) url.searchParams.set('person', name)
    else url.searchParams.delete('person')
    history.replaceState(history.state, '', url)
  }

  return <>
    <header className="masthead">
      <div className="shell masthead-inner">
        <a className="brand" href="#den-har-veckan">
          <span className="brand-mark"><Icon name="tree" /></span>
          <span>Åtelschema<small>Jaktlagets veckoplanering</small></span>
        </a>
        <nav aria-label="Huvudmeny">
          {views.map(({ id, label, icon }) =>
            <a key={id} href={'#' + id} aria-current={view.id === id ? 'page' : undefined}><Icon name={icon} />{label}</a>,
          )}
        </nav>
      </div>
    </header>
    <main className="shell main">
      {scheduleConfig.provisional && <p className="notice"><Icon name="info" /><span><strong>Provrotation.</strong> Startveckan ska bekräftas av jaktlaget.</span></p>}
      {view.id === 'den-har-veckan' && <WeekView current={current} />}
      {view.id === 'mina-veckor' && <PersonalView person={person} onPerson={selectPerson}
        today={today} current={current} calendarYear={calendarYear} minYear={minYear} />}
      {view.id === 'hela-schemat' && <ScheduleView current={current} calendarYear={calendarYear} minYear={minYear} />}
    </main>
    <footer className="shell footer"><span>Åtelschema</span><span><Icon name="clock" /> Svensk tid · Veckor börjar på måndag</span></footer>
  </>
}

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><App /></StrictMode>)
