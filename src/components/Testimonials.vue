<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { testimonials as defaultTestimonials } from '@/data/social.js'
import { collection } from '@/composables/content.js'

const { t } = useI18n()
const { loc } = useLoc()
// Editable from the admin CMS (falls back to the built-in list).
const testimonials = computed(() => collection('testimonials', defaultTestimonials))
</script>

<template>
  <section class="relative py-20 lg:py-28 overflow-hidden">
    <!-- background image + dark overlay (PPT style) -->
    <img
      src="/images/3/boundsolutions 2.jpg"
      alt=""
      class="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
    <div class="absolute inset-0 bg-navy/85"></div>

    <div class="relative max-w-6xl mx-auto px-6">
      <p class="text-accent font-semibold text-sm mb-3 tracking-wide text-center fade-in">
        {{ t('home.testimonials.eyebrow') }}
      </p>
      <h2 class="text-3xl lg:text-4xl font-extrabold text-white text-center mb-14 fade-in">
        {{ t('home.testimonials.title') }}
      </h2>

      <div class="grid md:grid-cols-2 gap-6">
        <figure
          v-for="(item, i) in testimonials"
          :key="i"
          class="fade-in bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8"
        >
          <div class="text-brand text-5xl leading-none mb-2 font-serif">&ldquo;</div>
          <blockquote class="text-white/85 leading-relaxed text-[15px] mb-6">
            {{ loc(item.quote) }}
          </blockquote>
          <figcaption class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full bg-accent text-navy flex items-center justify-center font-bold text-sm flex-shrink-0"
            >
              {{ loc(item.author).charAt(0) }}
            </div>
            <div>
              <p class="font-bold text-white text-sm">{{ loc(item.author) }}</p>
              <p class="text-white/50 text-xs mt-0.5">{{ loc(item.role) }}</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
