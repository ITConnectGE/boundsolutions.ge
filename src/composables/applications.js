// Applications store — always talks to the Laravel API (data lives in the DB).
import { api, storageUrl } from './api'
import { sendViaWeb3Forms } from './web3forms'

// Human-readable email built from a submission (contact / CV / employer form).
function emailSubject(app) {
  const kind = app.type === 'cv' ? 'CV' : app.type === 'company' ? 'Employer request' : 'Contact message'
  const who = app.name || app.contactName || app.email || ''
  return `New ${kind}${who ? ' — ' + who : ''}`
}
function emailFields(app) {
  const map = {
    Type: app.type,
    Name: app.name,
    'Contact person': app.contactName,
    Email: app.email,
    Phone: app.phone,
    Position: app.position,
    Sector: app.sector,
    Message: app.message,
  }
  const out = {}
  for (const [k, v] of Object.entries(map)) {
    if (v != null && String(v).trim() !== '') out[k] = v
  }
  return out
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

  let result
  if (file) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(payload)) {
      if (v == null) continue
      let val = v
      if (typeof v === 'boolean') val = v ? '1' : '0' // Laravel `boolean` rule wants 1/0
      else if (typeof v === 'object') val = JSON.stringify(v)
      fd.append(k, val)
    }
    fd.append('cv', file)
    result = await api('/applications', { method: 'POST', body: fd, form: true })
  } else {
    result = await api('/applications', { method: 'POST', body: payload })
  }

  // Best-effort email notification (CV attached when present). Never blocks the
  // submission — the record is already saved to the admin inbox above.
  try {
    await sendViaWeb3Forms({ subject: emailSubject(app), fields: emailFields(app), file: file || null })
  } catch {
    /* email is optional; ignore failures */
  }

  return result
}

export async function setApplicationStatus(id, status) {
  return api(`/applications/${id}/status`, { method: 'PATCH', body: { status }, auth: true })
}

export async function deleteApplication(id) {
  return api(`/applications/${id}`, { method: 'DELETE', auth: true })
}
