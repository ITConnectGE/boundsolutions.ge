<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import SiteNav from '@/components/SiteNav.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import SocialRail from '@/components/SocialRail.vue'
import ToastHost from '@/components/ToastHost.vue'
import { editMode, canEdit, toggleEdit } from '@/composables/editMode'

const { locale } = useI18n()
const route = useRoute()

// Admin area uses its own chrome (no public nav/footer/social rail).
const isAdmin = computed(() => route.path.startsWith('/admin'))

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
    mo.observe(main, { childList: true })
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
  <SiteFooter v-if="!isAdmin" />

  <!-- Inline-edit toggle (admins only) -->
  <button
    v-if="canEdit && !isAdmin"
    class="fixed bottom-5 right-5 z-[100] inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg transition-colors"
    :class="editMode ? 'bg-brand text-white' : 'bg-navy text-white hover:bg-navy/90'"
    @click="toggleEdit"
  >
    <span class="w-2 h-2 rounded-full" :class="editMode ? 'bg-white' : 'bg-brand'"></span>
    {{ editMode ? 'რედაქტირება: ჩართული' : 'ტექსტის რედაქტირება' }}
  </button>

  <ToastHost />
</template>
