export function formatDate(iso, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric',
      month: 'long',
    }).format(new Date(iso))
  } catch {
    return iso ? iso.slice(0, 4) : ''
  }
}
