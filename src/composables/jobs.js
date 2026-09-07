// Vacancies store - always talks to the Laravel API (data lives in the DB).
// The static seed is only used for the very first server-side render (SSR); the
// client refreshes from the API on mount.
import { api } from './api'
import { jobs as seedJobs } from '@/data/jobs.js'

export function getJobsSeed() {
  return seedJobs.map((j) => ({ ...j }))
}

// Public list: active vacancies only (the API filters them).
export async function getJobs() {
  return api('/vacancies')
}

// Admin list: same shape, but hidden vacancies are included too (each row
// carries is_active) so the panel can switch them back on.
export async function getAdminJobs() {
  return api('/admin/vacancies', { auth: true })
}

// job: { id?, category, title:{ka,en}, sector:{ka,en}, salary, isActive, image? }
// file: optional File for the vacancy image.
export async function saveJob(job, file) {
  const fd = new FormData()
  fd.append('category', job.category || 'hr')
  fd.append('title_ka', job.title?.ka || '')
  fd.append('title_en', job.title?.en || '')
  fd.append('sector_ka', job.sector?.ka || '')
  fd.append('sector_en', job.sector?.en || '')
  fd.append('description_ka', job.description?.ka || '')
  fd.append('description_en', job.description?.en || '')
  fd.append('salary', job.salary || '')
  // Hidden vacancies stay in the database and in the panel, they just drop out
  // of the public list.
  fd.append('is_active', job.isActive === false ? '0' : '1')
  if (file) fd.append('image', file)
  const numericId = job.id ? String(job.id).replace(/^v/, '') : ''
  const path = numericId ? `/vacancies/${numericId}` : '/vacancies'
  return api(path, { method: 'POST', body: fd, form: true, auth: true })
}

export async function deleteJob(id) {
  const numericId = String(id).replace(/^v/, '')
  return api(`/vacancies/${numericId}`, { method: 'DELETE', auth: true })
}

// ---- Vacancy categories (managed filter set, stored in vacancy_categories) ----
export async function getVacancyCategories() {
  return api('/vacancy-categories')
}

// names: ordered array of category strings. Replaces the whole set.
export async function saveVacancyCategories(names) {
  return api('/vacancy-categories', { method: 'PUT', body: { names }, auth: true })
}
