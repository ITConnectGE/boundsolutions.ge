<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import SiteNav from '@/components/SiteNav.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import NewsletterSection from '@/components/NewsletterSection.vue'
import SocialRail from '@/components/SocialRail.vue'
import ToastHost from '@/components/ToastHost.vue'
import { editMode, canEdit, toggleEdit } from '@/composables/editMode'

const { locale } = useI18n()
const route = useRoute()

// Admin area uses its own chrome (no public nav/footer/social rail).
const isAdmin = computed(() => route.path.startsWith('/admin'))

// The newsletter band sits above the footer on the homepage only.
const showNewsletter = computed(() => route.name === 'home')

useHead({
  htmlAttrs: { lang: computed(() => locale.value) },
  titleTemplate: (title) =>
    title ? `${title} — Bound Solutions` : 'Bound Solutions — HR Consulting & Recruitment',
})

// Scroll-reveal. `reveal()` observes any not-yet-revealed .fade-in elements.
// A MutationObserver on <main> re-runs it whenever the routed page swaps, so newly
// mounted pages are always revealed (no blank content after in-app navigation).
let io
let mo
function reveal() {
  if (!io) {
    document.querySelectorAll('.fade-in').forEach((el) => el.classList.add('visible'))
    return
  }
  document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => io.observe(el))
}
onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 },
    )
  }
  reveal()

  const main = document.querySelector('main')
  if (main && typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(() => reveal())
    // subtree so async-loaded content (e.g. vacancies fetched after mount) is revealed too
    mo.observe(main, { childList: true, subtree: true })
  }
})
onBeforeUnmount(() => {
  if (io) io.disconnect()
  if (mo) mo.disconnect()
})
</script>

<template>
  <SiteNav v-if="!isAdmin" />
  <SocialRail v-if="!isAdmin" />
  <main :class="{ 'min-h-screen': !isAdmin }">
    <router-view />
  </main>
  <NewsletterSection v-if="showNewsletter" />
  <SiteFooter v-if="!isAdmin" />

  <!-- WhatsApp (public pages) -->
  <a
    v-if="!isAdmin"
    href="https://wa.me/995577323223"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="WhatsApp"
    class="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-black/20 hover:scale-105 transition-transform"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.947c0 2.096.546 4.142 1.588 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.945a11.9 11.9 0 00-3.48-8.418z" />
    </svg>
  </a>

  <!-- Inline-edit toggle (admins only) — sits above the WhatsApp button -->
  <button
    v-if="canEdit && !isAdmin"
    class="fixed bottom-24 right-5 z-[100] inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg transition-colors"
    :class="editMode ? 'bg-brand text-white' : 'bg-navy text-white hover:bg-navy/90'"
    @click="toggleEdit"
  >
    <span class="w-2 h-2 rounded-full" :class="editMode ? 'bg-white' : 'bg-brand'"></span>
    {{ editMode ? 'რედაქტირება: ჩართული' : 'ტექსტის რედაქტირება' }}
  </button>

  <ToastHost />
</template>
