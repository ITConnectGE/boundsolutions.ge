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
    // Expand dynamic routes so every service + blog post is pre-rendered to static HTML
    includedRoutes(paths) {
      const dynamic = [
        ...services.map((s) => `/services/${s.slug}`),
        ...posts.map((p) => `/blog/${p.slug}`),
      ]
      // drop the un-rendered :param placeholder routes, add the real ones
      const staticPaths = paths.filter((p) => !p.includes(':'))
      return [...new Set([...staticPaths, ...dynamic])]
    },
  },
})
