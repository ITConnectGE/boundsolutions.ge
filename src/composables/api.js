// Tiny fetch wrapper for the Laravel API. The base URL comes from VITE_API_BASE
// (see .env.example). When it's empty, hasApi() is false and the app falls back
// to the localStorage demo, so the site still works with no backend running.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const TOKEN_KEY = 'bs-admin-token'
const USER_KEY = 'bs-admin-user'

export function hasApi() {
  return !!BASE
}
export function apiBase() {
  return BASE
}
// Absolute URL for a stored file (e.g. cv_path "cv/x.pdf" -> origin/storage/cv/x.pdf)
export function storageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const origin = BASE.replace(/\/api$/, '')
  return `${origin}/storage/${String(path).replace(/^\/+/, '')}`
}

export function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || '' : ''
}
export function setToken(t) {
  if (typeof localStorage === 'undefined') return
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}
export function getStoredUser() {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}
export function setStoredUser(u) {
  if (typeof localStorage === 'undefined') return
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
  else localStorage.removeItem(USER_KEY)
}

export async function api(path, { method = 'GET', body, auth = false, form = false } = {}) {
  const headers = { Accept: 'application/json' }
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`

  let payload
  if (form) {
    payload = body // FormData — let the browser set the boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  if (!res.ok) {
    // A stale/expired token: clear it so the app falls back to the login screen.
    if (res.status === 401 && auth) {
      setToken('')
      setStoredUser(null)
    }
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || res.statusText), { status: res.status, data })
  }
  if (res.status === 204) return null
  return res.json()
}
