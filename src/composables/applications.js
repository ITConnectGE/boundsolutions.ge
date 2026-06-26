// Applications store. When VITE_API_BASE is set, this talks to the Laravel API
// (data lives in the DB). With no API it falls back to a localStorage demo so the
// site still works offline. All functions are async.
import { hasApi, api, storageUrl } from './api'
import { seedApplications } from '@/data/applications.js'

const KEY = 'bs-applications'

// ---- localStorage fallback ----
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

// Normalise a backend row to the shape the UI uses (camelCase + display fields).
function normalize(r) {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    contactName: r.contact_name ?? r.contactName ?? '',
    email: r.email,
    phone: r.phone,
    position: r.position,
    sector: r.sector,
    message: r.message,
    cvFile: r.cv_path ? r.cv_path.split('/').pop() : r.cvFile || '',
    cvUrl: r.cv_path ? storageUrl(r.cv_path) : '',
    consent: r.consent,
    status: r.status,
    date: r.created_at ?? r.date,
  }
}

export async function getApplications() {
  if (hasApi()) {
    const rows = await api('/applications', { auth: true })
    return rows.map(normalize)
  }
  return read()
}

// app: plain object using UI keys; file: optional File (CV upload).
export async function addApplication(app, file) {
  if (hasApi()) {
    const payload = { ...app }
    if ('contactName' in payload) {
      payload.contact_name = payload.contactName
      delete payload.contactName
    }
    delete payload.cvFile // filename string — the actual file goes as `cv`
    if (file) {
      const fd = new FormData()
      for (const [k, v] of Object.entries(payload)) {
        if (v == null) continue
        fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v)
      }
      fd.append('cv', file)
      return api('/applications', { method: 'POST', body: fd, form: true })
    }
    return api('/applications', { method: 'POST', body: payload })
  }
  // fallback
  const list = read()
  list.unshift({ id: 'a' + Date.now(), date: new Date().toISOString(), status: 'new', ...app })
  write(list)
}

export async function setApplicationStatus(id, status) {
  if (hasApi()) return api(`/applications/${id}/status`, { method: 'PATCH', body: { status }, auth: true })
  write(read().map((a) => (a.id === id ? { ...a, status } : a)))
}

export async function deleteApplication(id) {
  if (hasApi()) return api(`/applications/${id}`, { method: 'DELETE', auth: true })
  write(read().filter((a) => a.id !== id))
}
