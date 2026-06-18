<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import BaseIcon from './BaseIcon.vue'
import SocialLinks from './SocialLinks.vue'

const { t } = useI18n()
const { toggle } = useLocale()
const route = useRoute()

const links = [
  { to: '/', key: 'home' },
  { to: '/about', key: 'about' },
  { to: '/services', key: 'services' },
  { to: '/team', key: 'team' },
  { to: '/blog', key: 'blog' },
  { to: '/vacancies', key: 'vacancies', badge: 6 },
]

const open = ref(false)
const scrolled = ref(false)

function isActive(to) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
function onScroll() {
  scrolled.value = window.scrollY > 10
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl transition-all duration-300"
    :class="scrolled ? 'border-b border-gray-100' : 'border-b border-transparent'"
  >
    <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-[68px]">
      <RouterLink to="/" class="flex items-center gap-2.5 group" aria-label="Bound Solutions">
        <img
          src="/images/BoundSolutions - Nav.png"
          alt="Bound Solutions"
          class="h-9 transition-transform duration-300 group-hover:scale-105"
        />
      </RouterLink>

      <!-- Desktop -->
      <div class="hidden lg:flex items-center gap-6 text-[13px] font-medium">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="transition-colors duration-200 flex items-center gap-1.5"
          :class="isActive(l.to) ? 'text-brand' : 'text-gray-500 hover:text-gray-900'"
        >
          {{ t(`nav.${l.key}`) }}
          <span
            v-if="l.badge"
            class="bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            >{{ l.badge }}</span
          >
        </RouterLink>

        <button
          class="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors"
          @click="toggle"
          aria-label="Switch language"
        >
          <BaseIcon name="globe" class="w-4 h-4" />
          <span class="font-semibold">{{ t('langName') }}</span>
        </button>

        <RouterLink
          to="/contact"
          class="gradient-bg text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all duration-300 hover:-translate-y-0.5"
        >
          {{ t('nav.contact') }}
        </RouterLink>
      </div>

      <!-- Mobile trigger -->
      <button
        class="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Menu"
        @click="open = !open"
      >
        <BaseIcon :name="open ? 'close' : 'menu'" class="w-6 h-6" />
      </button>
    </div>

    <!-- Mobile menu -->
    <div
      v-show="open"
      class="lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 pb-6 pt-2"
    >
      <RouterLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="flex items-center justify-between py-3.5 border-b border-gray-50 text-sm font-medium"
        :class="isActive(l.to) ? 'text-brand' : 'text-gray-600'"
      >
        {{ t(`nav.${l.key}`) }}
        <span
          v-if="l.badge"
          class="bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
          >{{ l.badge }}</span
        >
      </RouterLink>
      <RouterLink to="/contact" class="block py-3.5 text-brand font-semibold text-sm">{{
        t('nav.contact')
      }}</RouterLink>

      <div class="flex items-center justify-between pt-4 mt-2">
        <SocialLinks />
        <button
          class="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors text-sm font-semibold"
          @click="toggle"
        >
          <BaseIcon name="globe" class="w-4 h-4" />
          {{ t('langName') }}
        </button>
      </div>
    </div>
  </nav>
</template>
