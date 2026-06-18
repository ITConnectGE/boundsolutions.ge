import { createI18n } from 'vue-i18n'
import ka from './ka.js'
import en from './en.js'

export const SUPPORTED = ['ka', 'en']
export const DEFAULT_LOCALE = 'ka'

export function createI18nInstance() {
  let locale = DEFAULT_LOCALE
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('locale')
    if (saved && SUPPORTED.includes(saved)) locale = saved
  }
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { ka, en },
  })
}
