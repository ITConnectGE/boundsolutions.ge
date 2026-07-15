<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { collection } from '@/composables/content.js'
import { defaultNav } from '@/data/nav.js'
import { services as defaultServices } from '@/data/services.js'
import BaseIcon from './BaseIcon.vue'
import SocialLinks from './SocialLinks.vue'
import LangSwitcher from './LangSwitcher.vue'

const { t } = useI18n()
const { loc } = useLoc()
const route = useRoute()

// Editable from the admin CMS (add / remove / re-title pages).
const links = computed(() => collection('nav', defaultNav))
// Services list for the "Services" nav dropdown.
const services = computed(() => collection('services', defaultServices))

const open = ref(false)
const svcOpen = ref(false) // mobile: services sub-list expanded
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
watch(() => route.fullPath, () => {
  open.value = false
  svcOpen.value = false
})
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
      <div class="hidden lg:flex items-center gap-6 text-sm font-medium">
        <template v-for="l in links" :key="l.to">
          <!-- Services: hover dropdown of the service list -->
          <div v-if="l.to === '/services' && services.length" class="relative group/svc">
            <RouterLink
              :to="l.to"
              class="transition-colors duration-200 flex items-center gap-1"
              :class="isActive(l.to) ? 'text-brand' : 'text-gray-500 hover:text-gray-900'"
            >
              {{ loc(l.label) }}
              <BaseIcon
                name="chevronDown"
                class="w-3.5 h-3.5 transition-transform duration-200 group-hover/svc:rotate-180"
              />
            </RouterLink>
            <!-- pt-3 bridges the gap so the panel doesn't close on the way down -->
            <div
              class="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 opacity-0 invisible translate-y-1 transition-all duration-200 group-hover/svc:opacity-100 group-hover/svc:visible group-hover/svc:translate-y-0"
            >
              <div
                class="w-64 bg-white rounded-xl border border-gray-100 border-t-2 border-t-brand shadow-xl shadow-navy/5 max-h-80 overflow-y-auto py-1"
              >
                <RouterLink
                  v-for="s in services"
                  :key="s.slug"
                  :to="`/services/${s.slug}`"
                  class="block px-4 py-3 text-[13px] text-gray-700 hover:text-brand hover:bg-brand/5 border-b border-gray-50 last:border-b-0 transition-colors"
                >
                  {{ loc(s.title) }}
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Regular nav link -->
          <RouterLink
            v-else
            :to="l.to"
            class="transition-colors duration-200 flex items-center gap-1.5"
            :class="isActive(l.to) ? 'text-brand' : 'text-gray-500 hover:text-gray-900'"
          >
            {{ loc(l.label) }}
            <span
              v-if="l.badge"
              class="bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
              >{{ l.badge }}</span
            >
          </RouterLink>
        </template>

        <LangSwitcher />

        <RouterLink
          to="/contact"
          class="gradient-bg text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-brand/25 transition-all duration-300 hover:-translate-y-0.5"
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
      <template v-for="l in links" :key="l.to">
        <!-- Services: tap to expand the service list -->
        <div v-if="l.to === '/services' && services.length" class="border-b border-gray-50">
          <button
            type="button"
            class="w-full flex items-center justify-between py-3.5 text-sm font-medium"
            :class="isActive(l.to) ? 'text-brand' : 'text-gray-600'"
            @click="svcOpen = !svcOpen"
          >
            {{ loc(l.label) }}
            <BaseIcon
              name="chevronDown"
              class="w-4 h-4 text-gray-400 transition-transform"
              :class="{ 'rotate-180': svcOpen }"
            />
          </button>
          <div v-show="svcOpen" class="pb-2">
            <RouterLink
              v-for="s in services"
              :key="s.slug"
              :to="`/services/${s.slug}`"
              class="block py-2.5 pl-4 text-[13px] text-gray-500 hover:text-brand"
            >
              {{ loc(s.title) }}
            </RouterLink>
          </div>
        </div>

        <!-- Regular nav link -->
        <RouterLink
          v-else
          :to="l.to"
          class="flex items-center justify-between py-3.5 border-b border-gray-50 text-sm font-medium"
          :class="isActive(l.to) ? 'text-brand' : 'text-gray-600'"
        >
          {{ loc(l.label) }}
          <span
            v-if="l.badge"
            class="bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            >{{ l.badge }}</span
          >
        </RouterLink>
      </template>
      <RouterLink to="/contact" class="block py-3.5 text-brand font-semibold text-sm">{{
        t('nav.contact')
      }}</RouterLink>

      <div class="flex items-center justify-between pt-4 mt-2">
        <SocialLinks />
        <LangSwitcher />
      </div>
    </div>
  </nav>
</template>
