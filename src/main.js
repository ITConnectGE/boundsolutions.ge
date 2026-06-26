import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import { createI18nInstance } from './i18n'
import { initContent } from './composables/content.js'
import './style.css'

// ViteSSG = the same app in dev (SPA) and at build time pre-renders every route
// to static HTML (good for SEO + GitHub Pages).
export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(to, from, saved) {
      if (saved) return saved
      if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }
      return { top: 0 }
    },
  },
  ({ app, isClient }) => {
    const i18n = createI18nInstance()
    app.use(i18n)
    // On the client, fetch admin-edited content and merge it over the defaults.
    if (isClient) initContent(i18n)
  },
)
