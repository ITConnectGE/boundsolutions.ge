<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from './BaseIcon.vue'

const { t } = useI18n()

// Full-bleed background slides (crossfade). Swap these for your best wide photos.
const slides = [
  '/images/3/boundsolutions 1.jpg',
  '/images/bound.jpg',
  '/images/3/team building.jpg',
  '/images/bound.jpg',
]

const current = ref(0)
let timer

function go(i) {
  current.value = i
}
onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % slides.length
  }, 5500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="relative h-[100svh] min-h-[600px] overflow-hidden">
    <!-- Slides -->
    <div
      v-for="(s, i) in slides"
      :key="i"
      class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
      :class="i === current ? 'opacity-100' : 'opacity-0'"
    >
      <img :src="s" alt="" class="w-full h-full object-cover" :fetchpriority="i === 0 ? 'high' : 'low'" />
    </div>

    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/55 to-brand-800/60"
    ></div>

    <!-- Content -->
    <div class="relative h-full flex items-center">
      <div class="max-w-6xl mx-auto px-6 w-full">
        <div class="max-w-3xl">
          <h1
            class="font-brand text-white text-4xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6 drop-shadow"
          >
            {{ t('hero.slogan1') }}<br /><span class="gradient-text">{{ t('hero.slogan2') }}</span>
          </h1>
          <p class="text-white/80 text-lg max-w-xl mb-9 leading-relaxed">{{ t('hero.subtitle') }}</p>
          <div class="flex flex-wrap gap-4">
            <RouterLink
              to="/contact"
              class="gradient-bg text-white px-8 py-3.5 rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-brand/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              {{ t('hero.ctaPrimary') }}
            </RouterLink>
            <RouterLink
              to="/services"
              class="bg-white/10 backdrop-blur border border-white/30 text-white px-8 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              {{ t('hero.ctaSecondary') }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Dots -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
      <button
        v-for="(s, i) in slides"
        :key="i"
        class="h-2 rounded-full transition-all duration-300"
        :class="i === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'"
        :aria-label="`Slide ${i + 1}`"
        @click="go(i)"
      ></button>
    </div>

    <!-- Scroll hint -->
    <div
      class="absolute bottom-7 right-8 hidden lg:flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest"
    >
      Scroll <BaseIcon name="arrowRight" class="w-4 h-4 rotate-90" />
    </div>
  </section>
</template>
