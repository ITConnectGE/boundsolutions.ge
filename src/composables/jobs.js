// Vacancies store — always talks to the Laravel API (data lives in the DB).
// The static seed is only used for the very first server-side render (SSR); the
// client refreshes from the API on mount.
import { api } from './api'
import { jobs as seedJobs } from '@/data/jobs.js'

export function getJobsSeed() {
  return seedJobs.map((j) => ({ ...j }))
}

// Public + admin both use the {ka,en} shape returned by the API.
export async function getJobs() {
  return api('/vacancies')
}

// job: { id?, category, title:{ka,en}, sector:{ka,en}, salary, image? }
// file: optional File for the vacancy image.
export async function saveJob(job, file) {
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

export async function deleteJob(id) {
  const numericId = String(id).replace(/^v/, '')
  return api(`/vacancies/${numericId}`, { method: 'DELETE', auth: true })
}
