// Admin accounts (the "Users" tab). Inviting an admin creates the account with a
// temporary password that the backend emails out; the invitee can't reach any
// admin endpoint until they replace it.
import { api } from './api'

function normalize(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    mustResetPassword: !!u.must_reset_password,
    invitedAt: u.invited_at || null,
    createdAt: u.created_at || null,
  }
}

export async function getAdminUsers() {
  const rows = await api('/admin/users', { auth: true })
  return rows.map(normalize)
}

// Returns { user, emailSent, tempPassword } - tempPassword is only filled in
// when the invite email could not be sent, so it can be handed over manually.
export async function inviteAdminUser(name, email) {
  const res = await api('/admin/users', {
    method: 'POST',
    auth: true,
    body: { name: (name || '').trim(), email: (email || '').trim() },
  })
  return { user: normalize(res.user), emailSent: !!res.email_sent, tempPassword: res.temp_password || '' }
}

export async function resendAdminInvite(id) {
  const res = await api(`/admin/users/${id}/resend`, { method: 'POST', auth: true })
  return { user: normalize(res.user), emailSent: !!res.email_sent, tempPassword: res.temp_password || '' }
}

export async function deleteAdminUser(id) {
  return api(`/admin/users/${id}`, { method: 'DELETE', auth: true })
}
