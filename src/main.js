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
  ({ app, isClient, router }) => {
    const i18n = createI18nInstance()
    app.use(i18n)
    if (isClient) {
      // Drop legacy localStorage demo stores — all data now lives in the DB.
      ;['bs-applications', 'bs-jobs', 'bs-admin-auth'].forEach((k) => localStorage.removeItem(k))
      // Fetch admin-edited content and merge it over the defaults.
      initContent(i18n)
      // Meta Pixel: the inline snippet fires the first PageView; report subsequent
      // client-side route changes too. (GA4 enhanced measurement tracks these itself.)
      let first = true
      router.afterEach(() => {
        if (first) {
          first = false
          return
        }
        if (window.fbq) window.fbq('track', 'PageView')
      })
    }
  },
)
