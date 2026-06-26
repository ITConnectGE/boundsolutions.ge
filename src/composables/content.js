// Site content overrides (CMS). On the client we fetch admin-edited content from
// the API and merge it OVER the built-in i18n defaults, so any text key can be
// overridden, and images are resolved through img(). With no API configured this
// is a no-op and the site shows its built-in defaults.
import { reactive } from 'vue'
import { hasApi, api } from './api'

// Reactive store of image overrides: key -> URL.
export const imageOverrides = reactive({})

let i18nRef = null

function setNested(obj, dottedKey, value) {
  const parts = dottedKey.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
}

export function getNested(obj, dottedKey) {
  return dottedKey.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

// Apply a flat { key: value } map: image keys (prefix "img.") go to imageOverrides,
// everything else is treated as a text override and merged into i18n.
function applyMap(locale, map) {
  const nested = {}
  let hasText = false
  for (const [k, v] of Object.entries(map || {})) {
    if (k.startsWith('img.')) {
      imageOverrides[k] = v
    } else {
      setNested(nested, k, v)
      hasText = true
    }
  }
  if (i18nRef && hasText) i18nRef.global.mergeLocaleMessage(locale, nested)
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
