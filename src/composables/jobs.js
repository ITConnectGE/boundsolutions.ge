// DEMO vacancies store, backed by localStorage. Seeded from data/jobs.js on first
// use. The admin dashboard manages these (add / edit / delete, optional image),
// and the public Vacancies page reads from here. Replace with a real API/backend
// when one exists. Images are stored inline as data URLs (demo only).
import { jobs as seedJobs } from '@/data/jobs.js'

const KEY = 'bs-jobs'

export function getJobsSeed() {
  return seedJobs.map((j) => ({ ...j }))
}

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

export function getJobs() {
  return read()
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

// Add (no id) or update (existing id) a vacancy. Returns the saved job.
export function saveJob(job) {
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

export function deleteJob(id) {
  write(read().filter((j) => j.id !== id))
}

export function resetJobs() {
  write(getJobsSeed())
}
