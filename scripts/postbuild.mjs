import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { services } from '../src/data/services.js'
import { posts } from '../src/data/blog.js'

const dist = resolve('dist')

// SPA fallback: GitHub Pages serves 404.html for any unmatched path. We reuse the
// built index.html so the client router can resolve deep links / show NotFound.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// Content-less SPA shell (same <head>/assets, empty #app) for client-only routes
// like the admin portal — so they don't flash the prerendered homepage before the
// router mounts. nginx serves this instead of index.html for portal.boundsolutions.ge.
const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')
const shell = indexHtml.replace(/<div id="app"[^>]*>[\s\S]*<\/div><\/body>/, '<div id="app"></div></body>')
writeFileSync(resolve(dist, 'app-shell.html'), shell)

const base = 'https://boundsolutions.ge'
const staticRoutes = [
  '/',
  '/about',
  '/services',
  '/blog',
  '/vacancies',
  '/for-companies',
  '/contact',
  '/privacy',
  '/terms',
]
const dynamic = [
  ...services.map((s) => `/services/${s.slug}`),
  ...posts.map((p) => `/blog/${p.slug}`),
]
const urls = [...staticRoutes, ...dynamic]

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n') +
  `\n</urlset>\n`
writeFileSync(resolve(dist, 'sitemap.xml'), sitemap)

writeFileSync(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`)

console.log('postbuild: wrote 404.html, app-shell.html, sitemap.xml, robots.txt')
