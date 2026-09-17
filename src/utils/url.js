// URL standard for the whole site: https, no www, and a trailing slash on every
// page path (https://boundsolutions.ge/services/). The sitemap, canonical tags,
// internal links and the nginx redirects all follow it, so a crawler never lands
// on a URL that 301s. scripts/postbuild.mjs fails the build if a page breaks it.

export const SITE_URL = 'https://boundsolutions.ge'

// A path that names a file (sitemap.xml, favicon.png, app.js), not a page.
export const FILE_PATH = /\.[A-Za-z0-9]{1,10}$/

// "/services" -> "/services/", "/blog/x?a=1#b" -> "/blog/x/?a=1#b".
// Files, external URLs, protocol-relative and non-path values pass through.
export function withSlash(to) {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to
  const [, path, rest] = to.match(/^([^?#]*)(.*)$/)
  if (path.endsWith('/') || FILE_PATH.test(path)) return to
  return `${path}/${rest}`
}

// Absolute canonical URL for a route path.
export function canonicalUrl(path) {
  return SITE_URL + withSlash(path || '/')
}
