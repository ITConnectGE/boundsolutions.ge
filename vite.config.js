import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { services } from './src/data/services.js'
import { posts } from './src/data/blog.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Keep the original videos out of the JS bundle; they live in /public
    assetsInlineLimit: 0,
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    // Emit nested index.html files (blog/index.html, not blog.html) so routes with
    // child pages (/blog, /services) resolve as directories - a trailing-slash URL
    // like /blog/ no longer hits an index-less directory and 403s on nginx.
    dirStyle: 'nested',
    // Expand dynamic routes so every service + blog post is pre-rendered to static HTML
    includedRoutes(paths) {
      const dynamic = [
        ...services.map((s) => `/services/${s.slug}`),
        ...posts.map((p) => `/blog/${p.slug}`),
      ]
      // drop the :param placeholders and the client-only admin routes (prerendering
      // /admin creates a dist/admin/ dir that makes nginx 301->403; admin is SPA-only)
      const staticPaths = paths.filter((p) => !p.includes(':') && !p.startsWith('/admin'))
      return [...new Set([...staticPaths, ...dynamic])]
    },
  },
})
