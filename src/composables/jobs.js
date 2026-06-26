// Vacancies store. With VITE_API_BASE set, reads/writes the Laravel API (DB).
// Without it, falls back to a localStorage demo seeded from data/jobs.js.
import { hasApi, api } from './api'
import { jobs as seedJobs } from '@/data/jobs.js'

const KEY = 'bs-jobs'

export function getJobsSeed() {
  return seedJobs.map((j) => ({ ...j }))
}

// ---- localStorage fallback ----
function read() {
  if (typeof localStorage === 'undefined') return getJobsSeed()
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seedJobs))
    return getJobsSeed()
  }
  try {
    return JSON.parse(raw)
  } catch {
    return getJobsSeed()
  }
}
function write(list) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(list))
}
function slugId(job) {
  const base =
    (job.title?.en || job.title?.ka || job.category || 'job')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'job'
  return `${base}-${Date.now().toString(36)}`
}

// Public + admin both use the {ka,en} shape returned here.
export async function getJobs() {
  if (hasApi()) return api('/vacancies')
  return read()
}

// job: { id?, category, title:{ka,en}, sector:{ka,en}, salary, image? }
// file: optional File for the vacancy image.
export async function saveJob(job, file) {
  if (hasApi()) {
    const fd = new FormData()
    fd.append('category', job.category || 'hr')
    fd.append('title_ka', job.title?.ka || '')
    fd.append('title_en', job.title?.en || '')
    fd.append('sector_ka', job.sector?.ka || '')
    fd.append('sector_en', job.sector?.en || '')
    fd.append('salary', job.salary || '')
    fd.append('is_active', '1')
    if (file) fd.append('image', file)
    const numericId = job.id ? String(job.id).replace(/^v/, '') : ''
    const path = numericId ? `/vacancies/${numericId}` : '/vacancies'
    return api(path, { method: 'POST', body: fd, form: true, auth: true })
  }
  // fallback
  const list = read()
  if (job.id) {
    const i = list.findIndex((j) => j.id === job.id)
    if (i !== -1) list[i] = { ...list[i], ...job }
    else list.unshift(job)
  } else {
    job = { ...job, id: slugId(job) }
    list.unshift(job)
  }
  write(list)
  return job
}

export async function deleteJob(id) {
  if (hasApi()) {
    const numericId = String(id).replace(/^v/, '')
    return api(`/vacancies/${numericId}`, { method: 'DELETE', auth: true })
  }
  write(read().filter((j) => j.id !== id))
}
