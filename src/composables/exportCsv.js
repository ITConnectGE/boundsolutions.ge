// Client-side CSV export for the admin inbox. Produces a UTF-8 file with a BOM
// so Georgian text opens correctly in Excel. No backend required.

function cell(v) {
  const s = v == null ? '' : String(v)
  // Escape quotes; wrap in quotes so commas/newlines are safe.
  return `"${s.replace(/"/g, '""')}"`
}

const COLUMNS = [
  ['date', (a) => a.date],
  ['type', (a) => a.type],
  ['status', (a) => a.status],
  ['name', (a) => a.name],
  ['contactName', (a) => a.contactName],
  ['email', (a) => a.email],
  ['phone', (a) => a.phone],
  ['position', (a) => a.position],
  ['sector', (a) => a.sector],
  ['message', (a) => a.message],
  ['cvFile', (a) => a.cvFile],
]

export function applicationsToCsv(apps) {
  const header = COLUMNS.map(([k]) => cell(k)).join(',')
  const rows = apps.map((a) => COLUMNS.map(([, get]) => cell(get(a))).join(','))
  return '﻿' + [header, ...rows].join('\r\n')
}

export function downloadApplicationsCsv(apps, filename = 'bound-applications.csv') {
  if (typeof document === 'undefined') return
  const blob = new Blob([applicationsToCsv(apps)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
