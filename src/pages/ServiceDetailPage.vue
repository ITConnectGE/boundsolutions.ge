<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { services, getService } from '@/data/services.js'
import ContactCta from '@/components/ContactCta.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const route = useRoute()
const { t } = useI18n()
const { loc } = useLoc()

const service = computed(() => getService(route.params.slug))
const others = computed(() =>
  services.filter((s) => s.slug !== route.params.slug).slice(0, 3),
)

usePageMeta({
  title: () => (service.value ? loc(service.value.title) : t('notFound.title')),
  description: () => (service.value ? loc(service.value.summary) : ''),
})
</script>

<template>
  <template v-if="service">
    <!-- HERO -->
    <section class="relative pt-28 pb-12 lg:pt-36 lg:pb-16 overflow-hidden bg-cream-light">
      <div class="absolute top-6 right-0 w-[420px] h-[420px] bg-brand/5 rounded-full blur-[120px]"></div>
      <div class="max-w-5xl mx-auto px-6 relative">
        <RouterLink
          to="/services"
          class="inline-flex items-center gap-1.5 text-gray-400 hover:text-brand text-sm mb-6 transition-colors"
        >
          <BaseIcon name="arrowRight" class="w-4 h-4 rotate-180" /> {{ t('common.backToServices') }}
        </RouterLink>
        <div class="flex items-center gap-3 mb-4">
          <span class="w-12 h-12 rounded-2xl gradient-bg text-white flex items-center justify-center">
            <BaseIcon :name="service.icon" class="w-6 h-6" />
          </span>
        </div>
        <h1 class="text-3xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          {{ loc(service.title) }}
        </h1>
        <p class="text-gray-500 text-lg max-w-2xl leading-relaxed">{{ loc(service.summary) }}</p>
      </div>
    </section>

    <!-- BANNER (thematic image per audit p.9) -->
    <section class="max-w-5xl mx-auto px-6 -mt-6 lg:-mt-8 relative z-10">
      <img
        :src="service.image"
        :alt="loc(service.title)"
        class="w-full aspect-[21/9] object-cover rounded-2xl shadow-xl"
      />
    </section>

    <!-- BODY -->
    <section class="py-16 lg:py-24">
      <div class="max-w-5xl mx-auto px-6 grid lg:grid-cols-3 gap-12">
        <div class="lg:col-span-2">
          <p class="text-gray-600 text-[17px] leading-relaxed">{{ loc(service.body) }}</p>
        </div>
        <aside>
          <div class="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h2 class="font-bold text-gray-800 mb-4">{{ t('common.whatsIncluded') }}</h2>
            <ul class="space-y-3">
              <li
                v-for="(b, i) in loc(service.bullets)"
                :key="i"
                class="flex items-start gap-3 text-[15px] text-gray-600"
              >
                <span class="w-5 h-5 rounded-md gradient-bg text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BaseIcon name="check" class="w-3 h-3" />
                </span>
                {{ b }}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>

    <!-- OTHER SERVICES -->
    <section class="pb-8">
      <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8">{{ t('services.title') }}</h2>
        <div class="grid md:grid-cols-3 gap-5">
          <ServiceCard v-for="s in others" :key="s.slug" :service="s" />
        </div>
      </div>
    </section>

    <ContactCta title-key="serviceDetail.ctaTitle" text-key="serviceDetail.ctaText" />
  </template>

  <!-- unknown slug -->
  <section v-else class="min-h-[60vh] flex items-center justify-center px-6 pt-28 pb-20 text-center">
    <div>
      <h1 class="text-2xl font-extrabold text-gray-900 mb-3">{{ t('notFound.title') }}</h1>
      <RouterLink to="/services" class="text-brand font-semibold">{{
        t('common.backToServices')
      }}</RouterLink>
    </div>
  </section>
</template>
