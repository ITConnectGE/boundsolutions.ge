// Received-email inbox (laravel-mailbox). Admin-only; all calls need the token.
import { api, apiBase, getToken } from './api'

export async function getInbox({ q = '', page = 1 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', page)
  const qs = params.toString()
  return api(`/inbox${qs ? `?${qs}` : ''}`, { auth: true })
}

export async function getEmail(id) {
  return api(`/inbox/${id}`, { auth: true })
}

export async function replyEmail(id, body) {
  return api(`/inbox/${id}/reply`, { method: 'POST', body: { body }, auth: true })
}

export async function deleteEmail(id) {
  return api(`/inbox/${id}`, { method: 'DELETE', auth: true })
}

// Attachments live inside the stored MIME, so they need an authenticated fetch
// (a plain <a href> can't send the bearer token). Stream to a blob and save.
export async function downloadAttachment(id, index, filename) {
  const res = await fetch(`${apiBase()}/inbox/${id}/attachments/${index}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'attachment'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
