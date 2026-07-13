// Email delivery for form submissions via Web3Forms (https://web3forms.com).
// Set your access key in VITE_WEB3FORMS_KEY (.env locally, .env.production for
// the build). Without a key this is a no-op, so the site still works.
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || ''
const ENDPOINT = 'https://api.web3forms.com/submit'

export function web3formsEnabled() {
  return !!ACCESS_KEY
}

// Send a submission to email. fields: flat object of readable label -> value.
// file: optional File to attach (e.g. a CV). Best-effort — resolves with the
// Web3Forms response, or { skipped: true } when no key is configured.
export async function sendViaWeb3Forms({ subject, fields = {}, file = null }) {
  if (!ACCESS_KEY || typeof fetch === 'undefined') return { skipped: true }

  const fd = new FormData()
  fd.append('access_key', ACCESS_KEY)
  fd.append('from_name', 'Bound Solutions Website')
  if (subject) fd.append('subject', subject)

  for (const [k, v] of Object.entries(fields)) {
    if (v == null || String(v).trim() === '') continue
    fd.append(k, String(v))
  }
  if (file) fd.append('attachment', file)

  const res = await fetch(ENDPOINT, { method: 'POST', body: fd })
  return res.json()
}
