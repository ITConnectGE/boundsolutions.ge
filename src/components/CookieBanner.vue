<script setup>
// Shown until the visitor answers, and again whenever they reopen it from the
// footer. Both buttons carry the same weight: refusing must be as easy as
// agreeing.
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { bannerVisible, setConsent, consent } from '@/composables/consent.js'

const { t } = useI18n()

// The answer lives in the browser, which the prerender knows nothing about.
// Waiting for mount keeps the banner out of the static HTML, so a visitor who
// already answered never sees it flash.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const show = computed(() => mounted.value && bannerVisible.value)
</script>

<template>
  <Transition name="page">
    <div
      v-if="show"
      class="fixed inset-x-0 bottom-0 z-[95] p-4 sm:p-5"
      role="dialog"
      aria-live="polite"
      :aria-label="t('cookies.bannerTitle')"
    >
      <div
        class="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl shadow-black/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4"
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

      <p v-if="consent" class="max-w-5xl mx-auto text-center text-xs text-gray-400 mt-2">
        {{ consent === 'granted' ? t('cookies.currentAccepted') : t('cookies.currentDeclined') }}
      </p>
    </div>
  </Transition>
</template>
