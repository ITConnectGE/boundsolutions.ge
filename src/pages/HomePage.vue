<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { services as defaultServices } from '@/data/services.js'
import { collection } from '@/composables/content.js'
import { aboutDefault } from '@/data/about.js'
import { defaultStats } from '@/data/lists.js'
import { partners as defaultPartners } from '@/data/social.js'
import HeroSlider from '@/components/HeroSlider.vue'
import PartnerMarquee from '@/components/PartnerMarquee.vue'
import NewsletterSection from '@/components/NewsletterSection.vue'
import CountUp from '@/components/CountUp.vue'
import EditableText from '@/components/EditableText.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import Testimonials from '@/components/Testimonials.vue'
import ContactCta from '@/components/ContactCta.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t, tm, rt } = useI18n()
const { loc } = useLoc()
const founderImgFailed = ref(false)
// Editable from the admin CMS (falls back to the built-in catalogue).
const services = computed(() => collection('services', defaultServices))
const founder = computed(() => collection('about', aboutDefault).founder)
const stats = computed(() => collection('stats', defaultStats))
const partners = computed(() => collection('partners', defaultPartners))

// no title => site default; description from i18n keeps it bilingual
usePageMeta({ description: () => t('hero.subtitle') })
</script>

<template>
  <!-- HERO SLIDER (full page, slogan) -->
  <HeroSlider />

  <!-- STATS STRIP -->
  <section class="bg-white border-b border-gray-100">
    <div class="max-w-5xl mx-auto px-6 py-10 grid grid-cols-3 gap-4 sm:gap-8 text-center">
      <div v-for="(s, i) in stats" :key="i" class="fade-in">
        <div class="text-3xl lg:text-4xl font-extrabold gradient-text">
          <CountUp :value="loc(s.v)" />
        </div>
        <p class="text-gray-400 text-xs sm:text-sm mt-1">{{ loc(s.l) }}</p>
      </div>
    </div>
  </section>

  <!-- CLIENT LOGOS (partner trust strip) -->
  <section class="py-12 lg:py-16 bg-white border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-6">
      <p class="text-center text-gray-400 text-xs uppercase tracking-widest mb-7">
        {{ t('home.partners.title') }}
      </p>
      <PartnerMarquee :partners="partners" />
    </div>
  </section>

  <!-- NEWSLETTER (right after the partner logos) -->
  <NewsletterSection />

  <!-- SERVICES -->
  <section id="services" class="py-20 lg:py-28 bg-gray-50/80">
    <div class="max-w-6xl mx-auto px-6">
      <SectionHeading
        eyebrow-key="home.services.eyebrow"
        title-key="home.services.title"
        subtitle-key="home.services.subtitle"
        class="mb-14"
      />
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ServiceCard v-for="s in services" :key="s.slug" :service="s" />
      </div>
      <div class="mt-10">
        <RouterLink
          to="/services"
          class="inline-flex items-center gap-2 text-brand font-semibold text-sm hover:gap-3 transition-all"
        >
          {{ t('common.viewAll') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- ABOUT teaser (Nino) — after services -->
  <section class="py-20 lg:py-28">
    <div class="max-w-5xl mx-auto px-6">
      <div class="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center fade-in">
        <div class="lg:col-span-2 order-1">
          <img
            v-if="!founderImgFailed"
            :src="founder.photo"
            :alt="loc(founder.name)"
            class="w-full aspect-[4/5] object-cover object-top rounded-2xl bg-gray-100"
            loading="lazy"
            @error="founderImgFailed = true"
          />
          <div
            v-else
            class="w-full aspect-[4/5] rounded-2xl bg-cream flex items-center justify-center"
          >
            <img src="/images/BoundSolutions - Nav.png" alt="" class="h-10 opacity-40" />
          </div>
        </div>
        <div class="lg:col-span-3 order-2">
          <p class="text-brand font-semibold text-sm mb-3 tracking-wide">
            <EditableText tkey="home.aboutTeaser.eyebrow" />
          </p>
          <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            <EditableText tkey="home.aboutTeaser.title" />
          </h2>
          <p class="text-gray-500 text-[15px] leading-relaxed mb-8">
            <EditableText tkey="home.aboutTeaser.text" />
          </p>
          <RouterLink
            to="/about"
            class="inline-flex items-center gap-2 bg-navy text-white px-7 py-3 rounded-2xl font-semibold text-sm hover:bg-navy/90 transition-all"
          >
            {{ t('home.aboutTeaser.cta') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS / partner reviews (PPT-style) -->
  <Testimonials />

  <!-- CONTACT CTA -->
  <ContactCta />
</template>
