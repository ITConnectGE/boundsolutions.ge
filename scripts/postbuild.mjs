import { copyFileSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join, relative, sep } from 'node:path'
import { SITE_URL, FILE_PATH, withSlash } from '../src/utils/url.js'

const dist = resolve('dist')

// SPA fallback: GitHub Pages serves 404.html for any unmatched path. We reuse the
// built index.html so the client router can resolve deep links / show NotFound.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// Content-less SPA shell (same <head>/assets, empty #app) for client-only routes
// like the admin portal and /vacancies/:id - so they don't flash the prerendered
// homepage before the router mounts. nginx serves this instead of index.html.
// The homepage's canonical + og:url are stripped: left in, every vacancy page
// would first declare the homepage as its canonical. The router sets the real one.
const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')
const shell = indexHtml
  .replace(/<div id="app"[^>]*>[\s\S]*<\/div><\/body>/, '<div id="app"></div></body>')
  .replace(/<link[^>]*rel="canonical"[^>]*>/g, '')
  .replace(/<meta[^>]*property="og:url"[^>]*>/g, '')
writeFileSync(resolve(dist, 'app-shell.html'), shell)

// ---- Sitemaps ----
// /sitemap.xml is an index of two sitemaps:
//   /sitemap-pages.xml      every prerendered page (written here)
//   /sitemap-vacancies.xml  every visible vacancy, generated live by Laravel
//                           (SitemapController) so it never goes stale
// Pages are taken from the files actually in dist, so a new page can't be
// forgotten, and every <loc> is the trailing-slash URL that answers 200.
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? htmlFiles(p) : name.endsWith('.html') ? [p] : []
  })
}
const NOT_PAGES = new Set(['404.html', 'app-shell.html'])
const pages = htmlFiles(dist)
  .filter((f) => f.endsWith(`${sep}index.html`) || relative(dist, f) === 'index.html')
  .filter((f) => !NOT_PAGES.has(relative(dist, f)))
  .map((f) => {
    const dir = relative(dist, f).replace(/index\.html$/, '').split(sep).join('/')
    return { file: f, path: withSlash('/' + dir) }
  })
  .sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)))

const pagesSitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((p) => `  <url><loc>${SITE_URL}${p.path}</loc></url>`).join('\n') +
  `\n</urlset>\n`
writeFileSync(resolve(dist, 'sitemap-pages.xml'), pagesSitemap)

const sitemapIndex =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <sitemap><loc>${SITE_URL}/sitemap-pages.xml</loc></sitemap>\n` +
  `  <sitemap><loc>${SITE_URL}/sitemap-vacancies.xml</loc></sitemap>\n` +
  `</sitemapindex>\n`
writeFileSync(resolve(dist, 'sitemap.xml'), sitemapIndex)

writeFileSync(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(
  `postbuild: wrote 404.html, app-shell.html, sitemap.xml (index), sitemap-pages.xml (${pages.length} URLs), robots.txt`,
)

// ---- Guard: fail the build if the URL standard is broken anywhere ----
// Sitemap URL == the page's canonical tag, and no internal page link lacks its
// trailing slash. Runs after every file is written, so dist is always complete.
const problems = []
const NON_PAGE_PREFIX = /^\/(api|admin|storage|laravel-mailbox|assets|images|video)(\/|$)/

for (const { file, path } of pages) {
  const html = readFileSync(file, 'utf8')
  const where = relative(dist, file)
  const canonicals = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g)].map((m) => m[1])
  const expected = SITE_URL + path
  if (canonicals.length !== 1 || canonicals[0] !== expected) {
    problems.push(`${where}: canonical ${JSON.stringify(canonicals)} should be exactly ["${expected}"]`)
  }
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/g)) {
    const hrefPath = href.split(/[?#]/)[0]
    if (href.startsWith('//') || FILE_PATH.test(hrefPath) || NON_PAGE_PREFIX.test(hrefPath)) continue
    if (!hrefPath.endsWith('/')) problems.push(`${where}: internal link href="${href}" has no trailing slash`)
  }
}
if (/rel="canonical"/.test(shell)) problems.push('app-shell.html: still carries a canonical tag')
if (!existsSync(resolve(dist, 'app-shell.html'))) problems.push('app-shell.html was not written')

if (problems.length) {
  console.error(`\npostbuild: URL standard violated (${problems.length}):\n  - ` + problems.join('\n  - '))
  console.error('Pages must link to and declare https://boundsolutions.ge/<path>/ - see src/utils/url.js\n')
  process.exit(1)
}
console.log('postbuild: URL check passed (canonicals match the sitemap, internal links end with /)')
