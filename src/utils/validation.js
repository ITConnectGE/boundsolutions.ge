// Practical email format check: no spaces, one @, and a real domain with a dot
// and a TLD (gmail.com, yahoo.com, company.ge, …). Rejects "nata @gmail.com",
// "nata@gmail", "nata@.com", etc. Not a mailbox-existence check — just format.
export function isValidEmail(value) {
  const v = String(value || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}
