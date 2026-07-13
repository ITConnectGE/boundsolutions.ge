// Site content overrides (CMS). On the client we fetch admin-edited content from
// the API and merge it OVER the built-in i18n defaults, so any text key can be
// overridden, and images are resolved through img(). With no API configured this
// is a no-op and the site shows its built-in defaults.
import { reactive } from 'vue'
import { hasApi, api } from './api'
import ka from '@/i18n/ka.js'
import en from '@/i18n/en.js'

// Reactive store of image overrides: key -> URL.
export const imageOverrides = reactive({})
// Reactive store of structured collections (testimonials, team, partners, ...):
// name -> array/object. Stored in the DB under "col.<name>" as JSON.
export const collectionOverrides = reactive({})

let i18nRef = null
const DEFAULTS = { ka, en }

// Set a value at a dot-path, creating arrays for numeric segments so nested
// arrays (e.g. process.steps.0.title) keep their array shape.
function setNested(root, dottedKey, value) {
  const parts = dottedKey.split('.')
  let cur = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (cur[key] == null || typeof cur[key] !== 'object') {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {}
    }
    cur = cur[key]
  }
  cur[parts[parts.length - 1]] = value
}

export function getNested(obj, dottedKey) {
  return dottedKey.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

// Apply a flat { key: value } map for one locale. Image keys ("img.*") go to
// imageOverrides. Text overrides are set onto a deep clone of the DEFAULT messages
// at their exact paths, then the whole locale is replaced — so overridden leaves
// win while everything else keeps its default (arrays stay arrays).
function applyMap(locale, map) {
  if (!i18nRef) return
  const base = JSON.parse(JSON.stringify(DEFAULTS[locale] || {}))
  let hasText = false
  for (const [k, v] of Object.entries(map || {})) {
    if (k.startsWith('img.')) {
      imageOverrides[k] = v
      continue
    }
    if (k.startsWith('col.')) {
      try {
        collectionOverrides[k.slice(4)] = JSON.parse(v)
      } catch {
        /* ignore malformed json */
      }
      continue
    }
    setNested(base, k, v)
    hasText = true
  }
  if (hasText) i18nRef.global.setLocaleMessage(locale, base)
}

// Called once on the client at startup (from main.js).
export async function initContent(i18n) {
  i18nRef = i18n
  if (!hasApi() || typeof window === 'undefined') return
  try {
    const [ka, en] = await Promise.all([api('/content?locale=ka'), api('/content?locale=en')])
    applyMap('ka', ka)
    applyMap('en', en)
  } catch {
    // backend unreachable — keep built-in defaults
  }
}

// A structured collection: DB override (parsed) or the built-in default array.
export function collection(name, defaults) {
  return collectionOverrides[name] ?? defaults
}

// Save a whole collection (array/object) as JSON under "col.<name>".
export async function saveCollection(name, data) {
  await saveTexts([
    { key: `col.${name}`, locale: null, type: 'json', value: JSON.stringify(data), group: 'collections' },
  ])
  collectionOverrides[name] = data
}

// Live-apply a single override (used by inline editing after a save).
export function applyOne(locale, key, value) {
  if (key.startsWith('img.')) {
    imageOverrides[key] = value
    return
  }
  if (key.startsWith('col.')) {
    try {
      collectionOverrides[key.slice(4)] = JSON.parse(value)
    } catch {
      /* ignore */
    }
    return
  }
  if (!i18nRef) return
  const base = JSON.parse(JSON.stringify(i18nRef.global.getLocaleMessage(locale)))
  setNested(base, key, value)
  i18nRef.global.setLocaleMessage(locale, base)
}

// Resolve an image: admin override if present, otherwise the built-in default.
export function img(key, fallback) {
  return imageOverrides[key] || fallback
}

// ---- Admin (authenticated) ----
export async function loadAllContent() {
  return api('/admin/content', { auth: true })
}
export async function saveTexts(items) {
  return api('/content', { method: 'PUT', body: { items }, auth: true })
}
export async function uploadContentImage(key, file, group = 'general') {
  const fd = new FormData()
  fd.append('key', key)
  fd.append('group', group)
  fd.append('image', file)
  return api('/content/image', { method: 'POST', body: fd, form: true, auth: true })
}
