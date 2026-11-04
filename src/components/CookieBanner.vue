<script setup>
// Shown until the visitor answers, and again whenever they reopen it from the
// footer. Both buttons carry the same weight: refusing must be as easy as
// agreeing, and the site works fully either way.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { bannerVisible, setConsent, consent } from '@/composables/consent.js'

const { t } = useI18n()

// The answer lives in the browser, which the prerender knows nothing about.
// Waiting for mount keeps the banner out of the static HTML, so a visitor who
// already answered never sees it flash.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const show = computed(() => mounted.value && bannerVisible.value)

// While the question is open the page behind is dimmed and frozen, so the
// visitor answers before reading on. <html> is locked as well as <body>:
// locking only <body> still lets mobile browsers scroll the page.
function lockScroll(open) {
  const { documentElement: html, body } = document
  html.style.overflow = open ? 'hidden' : ''
  body.style.overflow = open ? 'hidden' : ''
  body.style.touchAction = open ? 'none' : ''
}
watch(show, lockScroll)
onBeforeUnmount(() => lockScroll(false))
</script>

<template>
  <Transition name="page">
    <div
      v-if="show"
      class="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 backdrop-blur-[2px] p-4 sm:p-5 overscroll-contain"
      @touchmove.prevent
      @wheel.prevent
      role="dialog"
      aria-modal="true"
      :aria-label="t('cookies.bannerTitle')"
    >
      <div class="w-full max-w-5xl">
        <div
          class="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4"
        >
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 text-sm">{{ t('cookies.bannerTitle') }}</p>
            <p class="text-gray-500 text-sm mt-1 leading-relaxed">
              {{ t('cookies.bannerText') }}
              <RouterLink to="/cookies/" class="text-brand font-medium underline underline-offset-2">
                {{ t('cookies.readMore') }}
              </RouterLink>
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5 lg:flex-shrink-0">
            <button
              type="button"
              class="px-6 py-3 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
              @click="setConsent('denied')"
            >
              {{ t('cookies.decline') }}
            </button>
            <button
              type="button"
              class="px-6 py-3 rounded-xl text-sm font-semibold gradient-bg text-white hover:opacity-90 transition-opacity whitespace-nowrap"
              @click="setConsent('granted')"
            >
              {{ t('cookies.accept') }}
            </button>
          </div>
        </div>

        <p v-if="consent" class="text-center text-xs text-white/70 mt-2.5">
          {{ consent === 'granted' ? t('cookies.currentAccepted') : t('cookies.currentDeclined') }}
        </p>
      </div>
    </div>
  </Transition>
</template>
