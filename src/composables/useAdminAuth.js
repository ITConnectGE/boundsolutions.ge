// Admin auth against the Laravel backend (Sanctum token). The token is the login
// session and is the only thing kept in localStorage (standard for token auth);
// all real data lives in the database.
//
// An admin invited from the panel signs in with a temporary password. That login
// returns a token limited to "password:set", so every admin endpoint stays closed
// until setPassword() swaps it for a full-access one.
import { api, getToken, setToken, getStoredUser, setStoredUser } from './api'

export function useAdminAuth() {
  async function login(email, password) {
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { email: (email || '').trim(), password },
      })
      setToken(res.token)
      setStoredUser(res.user)
      return { ok: true, mustReset: !!res.must_reset_password }
    } catch {
      return { ok: false, mustReset: false }
    }
  }

  // Choose a new password. Throws with the API message on a rejected password.
  async function setPassword(password, confirmation) {
    const res = await api('/auth/password', {
      method: 'POST',
      auth: true,
      body: { password, password_confirmation: confirmation },
    })
    setToken(res.token)
    setStoredUser(res.user)
    return res
  }

  function isAuthed() {
    return !!getToken()
  }

  // True while the signed-in admin is still on their temporary password.
  function needsPasswordReset() {
    return !!getStoredUser()?.must_reset_password
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

  return { login, setPassword, isAuthed, needsPasswordReset, currentUser, logout }
}
