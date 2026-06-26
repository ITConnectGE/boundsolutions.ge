// Admin auth. When VITE_API_BASE is set, this authenticates against the Laravel
// backend (Sanctum token). With no API configured it falls back to a local demo
// check so the admin still opens with no backend running.
import { hasApi, api, getToken, setToken, getStoredUser, setStoredUser } from './api'

// Demo fallback credentials (used only when no API base is configured).
const DEMO_EMAIL = 'nino@gmail.com'
const DEMO_PASSWORD = 'Tbilisi1!'
const DEMO_KEY = 'bs-admin-auth'

export function useAdminAuth() {
  async function login(email, password) {
    const mail = (email || '').trim()
    if (hasApi()) {
      try {
        const { token, user } = await api('/auth/login', {
          method: 'POST',
          body: { email: mail, password },
        })
        setToken(token)
        setStoredUser(user)
        return true
      } catch {
        return false
      }
    }
    // Demo fallback
    if (mail.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DEMO_KEY, JSON.stringify({ name: 'Admin', email: DEMO_EMAIL }))
      }
      return true
    }
    return false
  }

  function isAuthed() {
    if (hasApi()) return !!getToken()
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(DEMO_KEY)
  }

  function currentUser() {
    if (hasApi()) return getStoredUser()?.email || ''
    if (typeof localStorage === 'undefined') return ''
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null')?.email || ''
    } catch {
      return ''
    }
  }

  async function logout() {
    if (hasApi()) {
      const revoke = api('/auth/logout', { method: 'POST', auth: true }).catch(() => {})
      // Clear locally immediately so guards see us as logged out right away.
      setToken('')
      setStoredUser(null)
      await revoke
      return
    }
    if (typeof localStorage !== 'undefined') localStorage.removeItem(DEMO_KEY)
  }

  return { login, isAuthed, currentUser, logout, DEMO_EMAIL, DEMO_PASSWORD }
}
