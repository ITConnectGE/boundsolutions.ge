// Admin auth against the Laravel backend (Sanctum token). The token is the login
// session and is the only thing kept in localStorage (standard for token auth);
// all real data lives in the database.
import { api, getToken, setToken, getStoredUser, setStoredUser } from './api'

export function useAdminAuth() {
  async function login(email, password) {
    try {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: { email: (email || '').trim(), password },
      })
      setToken(token)
      setStoredUser(user)
      return true
    } catch {
      return false
    }
  }

  function isAuthed() {
    return !!getToken()
  }

  function currentUser() {
    return getStoredUser()?.email || ''
  }

  async function logout() {
    const revoke = api('/auth/logout', { method: 'POST', auth: true }).catch(() => {})
    setToken('')
    setStoredUser(null)
    await revoke
  }

  return { login, isAuthed, currentUser, logout }
}
