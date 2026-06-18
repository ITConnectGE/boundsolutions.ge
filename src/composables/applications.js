// DEMO applications store, backed by localStorage. Seeded from data/applications.js
// on first use; the Vacancies CV form and Contact form append to it, and the admin
// dashboard reads from it. Replace with a real API when a backend exists.
import { seedApplications } from '@/data/applications.js'

const KEY = 'bs-applications'

function read() {
  if (typeof localStorage === 'undefined') return [...seedApplications]
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seedApplications))
    return [...seedApplications]
  }
  try {
    return JSON.parse(raw)
  } catch {
    return [...seedApplications]
  }
}

function write(list) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(list))
}

export function getApplications() {
  return read()
}

export function addApplication(app) {
  const list = read()
  list.unshift({
    id: 'a' + Date.now(),
    date: new Date().toISOString(),
    status: 'new',
    ...app,
  })
  write(list)
}

export function setApplicationStatus(id, status) {
  write(read().map((a) => (a.id === id ? { ...a, status } : a)))
}

export function deleteApplication(id) {
  write(read().filter((a) => a.id !== id))
}
