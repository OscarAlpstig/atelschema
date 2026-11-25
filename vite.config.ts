import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { calendarPersonKey, createCalendar } from './src/calendar.ts'
import { dateKey, stockholmDay } from './src/dates.ts'
import { createSchedule } from './src/schedule.ts'
import { scheduleConfig } from './src/schedule.config.ts'

const pagesPath = process.env.PAGES_BASE_PATH?.replace(/^\/+|\/+$/g, '')
const base = pagesPath ? `/${pagesPath}/` : '/'

function calendarFeeds(): Plugin {
  let feeds: Map<string, string> | undefined

  function getFeeds() {
    if (feeds) return feeds
    const schedule = createSchedule(scheduleConfig)
    const generatedAt = new Date()
    const firstYear = Number(dateKey(schedule.start).slice(0, 4))
    const lastYear = Number(dateKey(stockholmDay(generatedAt)).slice(0, 4)) + 5
    const weeks = Array.from({ length: lastYear - firstYear + 1 }, (_, offset) =>
      schedule.weeksForYear(firstYear + offset)).flat()
    feeds = new Map(schedule.participants.map((person) => [
      `kalender/${calendarPersonKey(person)}.ics`, createCalendar(weeks, person, generatedAt),
    ]))
    return feeds
  }

  return {
    name: 'atelschema-calendar-feeds',
    generateBundle() {
      for (const [fileName, source] of getFeeds()) this.emitFile({ type: 'asset', fileName, source })
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0]
        if (!pathname?.startsWith(`${base}kalender/`) || !pathname.endsWith('.ics')) return next()
        const feed = getFeeds().get(pathname.slice(base.length))
        if (feed === undefined) return next()
        response.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        response.end(feed)
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [calendarFeeds(), VitePWA({
    registerType: 'prompt',
    scope: base,
    includeAssets: ['icons/apple-touch.png'],
    manifest: {
      id: base,
      name: 'Åtelschema',
      short_name: 'Åtelschema',
      description: 'Jaktlagets rullande åtelschema och kommande ansvarsveckor.',
      lang: 'sv',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#f6f7f2',
      theme_color: '#f6f7f2',
      icons: [
        { src: 'icons/app-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/app-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/app-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      cacheId: 'atelschema',
      clientsClaim: true,
      navigateFallback: `${base}index.html`,
      navigateFallbackDenylist: [/\.ics(?:\?|$)/],
      globPatterns: ['**/*.{html,js,css,jpg}'],
    },
  })],
})
