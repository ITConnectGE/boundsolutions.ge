// Editable content for the admin "Content" tab. The text list is auto-generated
// by flattening the whole Georgian i18n tree, so EVERY string on the site is
// editable (grouped by page/section). Images are listed explicitly. Overrides are
// saved to the DB and merged over the built-in defaults on the public site.
import ka from '@/i18n/ka.js'

// Top-level i18n sections NOT exposed for editing (the admin panel's own chrome).
const SKIP = new Set(['admin', 'langName'])

const SECTION_LABELS = {
  nav: 'ნავიგაცია / Nav',
  common: 'ღილაკები / Buttons',
  hero: 'ჰირო / Hero',
  home: 'მთავარი გვერდი / Home',
  about: 'ჩვენ შესახებ / About',
  team: 'გუნდი / Team',
  services: 'სერვისები / Services',
  serviceDetail: 'სერვისის დეტალი / Service detail',
  blog: 'ბლოგი / Blog',
  vacancies: 'ვაკანსიები / Vacancies',
  companyForm: 'დამსაქმებლის ფორმა / Employer form',
  contact: 'კონტაქტი / Contact',
  footer: 'ფუტერი / Footer',
  legal: 'იურიდიული / Legal',
  notFound: '404',
}

// Flatten an object/array subtree to dot-path keys pointing at strings.
function flattenKeys(node, prefix) {
  const out = []
  for (const [k, v] of Object.entries(node)) {
    const key = `${prefix}.${k}`
    if (typeof v === 'string') out.push(key)
    else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') out.push(`${key}.${i}`)
        else if (item && typeof item === 'object') out.push(...flattenKeys(item, `${key}.${i}`))
      })
    } else if (v && typeof v === 'object') {
      out.push(...flattenKeys(v, key))
    }
  }
  return out
}

const IMAGES = {
  group: 'images',
  label: 'სურათები / Images',
  items: [
    { key: 'img.hero.slide1', type: 'image', label: 'ჰირო სლაიდი 1', default: '/images/3/boundsolutions 1.jpg' },
    { key: 'img.hero.slide2', type: 'image', label: 'ჰირო სლაიდი 2', default: '/images/bound.jpg' },
    { key: 'img.hero.slide3', type: 'image', label: 'ჰირო სლაიდი 3', default: '/images/3/team building.jpg' },
    { key: 'img.hero.slide4', type: 'image', label: 'ჰირო სლაიდი 4', default: '/images/bound.jpg' },
    { key: 'img.about.founder', type: 'image', label: 'დამფუძნებლის ფოტო', default: '/images/team/nina.jpg' },
  ],
}

// One group per top-level i18n section, with every string exposed as a text field.
export const editableContent = (() => {
  const groups = []
  for (const [section, val] of Object.entries(ka)) {
    if (SKIP.has(section) || !val || typeof val !== 'object') continue
    const keys = flattenKeys(val, section)
    if (!keys.length) continue
    groups.push({
      group: section,
      label: SECTION_LABELS[section] || section,
      items: keys.map((k) => ({ key: k, type: 'text', label: k })),
    })
  }
  groups.push(IMAGES)
  return groups
})()
