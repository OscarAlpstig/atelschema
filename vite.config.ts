import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pagesPath = process.env.PAGES_BASE_PATH?.replace(/^\/+|\/+$/g, '')
const base = pagesPath ? `/${pagesPath}/` : '/'

export default defineConfig({
  base,
  plugins: [VitePWA({
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
      globPatterns: ['**/*.{html,js,css,jpg}'],
    },
  })],
})
