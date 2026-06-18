// DEMO auth — NOT secure, client-side only. There is no backend yet, so this just
// checks a hard-coded credential and keeps a flag in localStorage.
const KEY = 'bs-admin-auth'
const DEMO_EMAIL = 'nino.bartaia@gmail.com'
const DEMO_PASSWORD = '12345678'

export function useAdminAuth() {
  function login(email, password) {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, DEMO_EMAIL)
      return true
    }
    return false
  }
  function isAuthed() {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(KEY)
  }
  function currentUser() {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
  }
  function logout() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY)
  }
  return { login, isAuthed, currentUser, logout, DEMO_EMAIL, DEMO_PASSWORD }
}
