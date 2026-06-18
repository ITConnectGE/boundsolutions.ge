# Bound Solutions — website

HR consulting, recruitment & team-building site for [boundsolutions.ge](https://boundsolutions.ge).
Rebuilt as a **Vue 3 + Vite** app, restructured per the June 2026 website audit, and
**statically pre-rendered** (SSG) so every page ships as real HTML — great for SEO and
GitHub Pages, exactly like the old static site, but component-based and bilingual.

## Commands

```bash
npm install      # one-time
npm run dev      # local dev server (http://localhost:5173)
npm run build    # static build → ./dist  (+ 404.html, sitemap.xml, robots.txt)
npm run preview  # serve the built ./dist locally
```

## Tech

- **Vue 3** + **vue-router** + **vite-ssg** (static-site generation)
- **vue-i18n** — Georgian (default) + English, with a language toggle in the nav
- **Tailwind CSS v4** — brand tokens (`brand`, `cream`) defined in `src/style.css`
- Deploys automatically to GitHub Pages on push to `main` (`.github/workflows/pages.yml`)

## Structure

```
index.html              # app shell + base SEO/JSON-LD
src/
  main.js               # ViteSSG entry
  App.vue               # layout: Nav + <router-view> + Footer
  router/index.js       # routes (services/blog detail routes are pre-rendered)
  pages/                # one component per route
  components/           # Nav, Footer, ServiceCard, VideoEmbed, PageHero, ...
  i18n/{ka,en}.js       # UI strings + homepage narrative copy
  data/                 # content collections (bilingual { ka, en })
  composables/          # useLocale, usePageMeta
public/images, public/video, public/CNAME
_legacy/                # the previous static HTML site (reference only)
```

## Editing content

- **UI text / homepage copy** → `src/i18n/ka.js` and `src/i18n/en.js`
- **Services** → `src/data/services.js`   • **Blog posts** → `src/data/blog.js`
- **Vacancies** → `src/data/jobs.js`
- **About (founder, mission, vision, values, team)** → `src/data/about.js`
- **Testimonials & partners** → `src/data/social.js`
- **Privacy / Terms** → `src/data/legal.js`

## Admin area (demo — no backend yet)

A client-side demo admin dashboard for incoming job applications / messages.

- **URL:** `/admin/login` → `/admin`
- **Demo login:** `nino.bartaia@gmail.com` / `12345678` (hard-coded in `src/composables/useAdminAuth.js`)
- Applications are stored in **localStorage** (seeded from `src/data/applications.js`). The
  Vacancies CV form and Contact form append to it, so submissions show up in the dashboard.
- Not linked publicly, excluded from the sitemap, and `noindex`.
- ⚠️ This is a **demo only** — there is no real authentication or database. To make it real,
  swap `useAdminAuth` + `composables/applications.js` for actual API calls.

## ⚠️ TODO before launch (placeholders to replace)

1. **English copy** is a machine-drafted first pass — review/approve all `en` strings.
2. **Partner logos** (`data/social.js`) — add files under `public/images/partners/` and set `logo`.
3. A couple of service card images use Unsplash placeholders — swap for real photos.

_Done: real team + founder photos live in `public/images/team/` (`nina.jpg`, `katerina.jpg`,
`elene.jpg`, `nata.jpg`); real partner testimonials; company positioning updated._
