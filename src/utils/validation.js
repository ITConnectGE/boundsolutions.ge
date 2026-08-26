// Shared form validation. The same rules are mirrored in the Laravel API
// (ApplicationController) so a hand-crafted POST can't bypass the frontend.

// Practical email format check: no spaces, one @, and a real domain with a dot
// and a TLD (gmail.com, yahoo.com, company.ge, …). Rejects "nata @gmail.com",
// "nata@gmail", "nata@.com", "nata@gmail..com", etc. Not a mailbox-existence
// check - just format.
export function isValidEmail(value) {
  const v = String(value || '').trim()
  if (!v || v.length > 254 || v.includes('..')) return false
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v)
}

// Phone format check. Written without a country code it must be a full Georgian
// number: 9 digits, mobile starting with 5 or landline with 3 (555 12 34 56 /
// 32 2 12 34 56). Foreign numbers are accepted when written with + or 00 in
// E.164 shape (8-15 digits), so international clients aren't blocked.
export function isValidPhone(value) {
  const raw = String(value || '').trim()
  if (!raw || !/^\+?[\d\s()./-]+$/.test(raw)) return false
  const intl = raw.startsWith('+') || raw.startsWith('00')
  const digits = raw.replace(/\D/g, '').replace(/^00/, '')
  if (digits.startsWith('995')) return digits.length === 12 && /^995[35]/.test(digits)
  if (!intl) return digits.length === 9 && /^[35]/.test(digits)
  return digits.length >= 8 && digits.length <= 15
}

// Store phones in one shape so the admin inbox and CSV export stay searchable.
export function normalizePhone(value) {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '').replace(/^00/, '')
  if (digits.startsWith('995') && digits.length === 12) return '+' + digits
  if (digits.length === 9 && /^[35]/.test(digits)) return '+995' + digits
  return raw.startsWith('+') || raw.startsWith('00') ? '+' + digits : raw
}

// Validate one field and return the i18n key of the message to show, or ''
// when it's fine. Kinds: 'email' | 'phone' | 'text'.
export function fieldError(kind, value, required = true) {
  const v = String(value ?? '').trim()
  if (!v) return required ? 'common.required' : ''
  if (kind === 'email' && !isValidEmail(v)) return 'common.invalidEmail'
  if (kind === 'phone' && !isValidPhone(v)) return 'common.invalidPhone'
  return ''
}

// Admin password policy, mirrored from the API
// (Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()).
export function isValidPassword(value) {
  const v = String(value || '')
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)
}

// Validate a new-password pair and return the i18n key of the message, or ''.
export function passwordError(password, confirmation) {
  if (!String(password || '')) return 'common.required'
  if (!isValidPassword(password)) return 'admin.password.weak'
  if (password !== confirmation) return 'admin.password.mismatch'
  return ''
}
