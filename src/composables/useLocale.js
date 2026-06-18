import { useI18n } from 'vue-i18n'

// Switch + persist the active locale, and keep <html lang> in sync.
export function useLocale() {
  const { locale } = useI18n()
  function setLocale(l) {
    locale.value = l
    if (typeof localStorage !== 'undefined') localStorage.setItem('locale', l)
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }
  function toggle() {
    setLocale(locale.value === 'ka' ? 'en' : 'ka')
  }
  return { locale, setLocale, toggle }
}

// Pick the right side of a bilingual { ka, en } field coming from /data files.
export function useLoc() {
  const { locale } = useI18n()
  const loc = (field) =>
    field && typeof field === 'object' && ('ka' in field || 'en' in field)
      ? field[locale.value] ?? field.ka
      : field
  return { loc, locale }
}
