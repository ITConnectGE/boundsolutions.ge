import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'

const SITE = 'Bound Solutions'
const BASE_URL = 'https://boundsolutions.ge'
const DEFAULT_DESC =
  'Bound Solutions — HR კონსალტინგი, რეკრუტინგი და გუნდური ივენთები თბილისში. 20+ წლის გამოცდილება.'

// One call per page → title (App adds the " — Bound Solutions" suffix), description,
// canonical, and OpenGraph/Twitter tags. Accepts strings or getter functions so it
// stays reactive when the locale toggles.
export function usePageMeta({ title, description } = {}) {
  const route = useRoute()
  const resolve = (v) => (typeof v === 'function' ? v() : v)

  const fullTitle = computed(() => {
    const tt = resolve(title)
    return tt ? `${tt} — ${SITE}` : `${SITE} — HR Consulting & Recruitment`
  })
  const desc = computed(() => resolve(description) || DEFAULT_DESC)
  const url = computed(() => BASE_URL + (route.path === '/' ? '/' : route.path))

  useHead({
    title: () => resolve(title) || '',
    link: [{ rel: 'canonical', href: url }],
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: desc },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: desc },
    ],
  })
}
