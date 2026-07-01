// Applications store — always talks to the Laravel API (data lives in the DB).
import { api, storageUrl } from './api'

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
  const rows = await api('/applications', { auth: true })
  return rows.map(normalize)
}

// app: plain object using UI keys; file: optional File (CV upload).
export async function addApplication(app, file) {
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

export async function setApplicationStatus(id, status) {
  return api(`/applications/${id}/status`, { method: 'PATCH', body: { status }, auth: true })
}

export async function deleteApplication(id) {
  return api(`/applications/${id}`, { method: 'DELETE', auth: true })
}
