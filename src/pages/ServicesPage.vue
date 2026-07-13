<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { services as defaultServices } from '@/data/services.js'
import { collection } from '@/composables/content.js'
import PageHero from '@/components/PageHero.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import ContactCta from '@/components/ContactCta.vue'

const { t, tm, rt } = useI18n()
// Editable from the admin CMS (falls back to the built-in catalogue).
const services = computed(() => collection('services', defaultServices))
usePageMeta({ title: () => t('services.title'), description: () => t('services.subtitle') })
</script>

<template>
  <PageHero
    eyebrow-key="services.eyebrow"
    title-key="services.title"
    subtitle-key="services.subtitle"
  />

  <section class="py-20 lg:py-28">
    <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      <ServiceCard v-for="s in services" :key="s.slug" :service="s" />
    </div>
  </section>

  <!-- PROCESS / how we work -->
  <section class="py-20 lg:py-28 bg-gray-50/80">
    <div class="max-w-6xl mx-auto px-6">
      <SectionHeading
        eyebrow-key="home.process.eyebrow"
        title-key="home.process.title"
        center
        class="mb-14"
      />
      <div class="grid md:grid-cols-4 gap-8">
        <div v-for="(step, i) in tm('home.process.steps')" :key="i" class="fade-in text-center group">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-bold group-hover:scale-110 transition-transform duration-300"
            :class="i % 2 === 0 ? 'gradient-bg text-white shadow-lg shadow-brand/20' : 'bg-accent text-navy'"
          >
            {{ i + 1 }}
          </div>
          <h3 class="font-bold text-gray-800 mb-2">{{ rt(step.title) }}</h3>
          <p class="text-sm text-gray-400 leading-relaxed">{{ rt(step.text) }}</p>
        </div>
      </div>
    </div>
  </section>

  <ContactCta title-key="services.ctaTitle" text-key="services.ctaText" />
</template>
