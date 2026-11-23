import { defineConfig } from 'vite'

const pagesPath = process.env.PAGES_BASE_PATH?.replace(/^\/+|\/+$/g, '')

export default defineConfig({
  base: pagesPath ? `/${pagesPath}/` : '/',
})
