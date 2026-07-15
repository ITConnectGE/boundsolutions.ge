<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { getJobs } from '@/composables/jobs.js'
import BaseIcon from '@/components/BaseIcon.vue'
import CvModal from '@/components/CvModal.vue'

const route = useRoute()
const { t } = useI18n()
const { loc } = useLoc()

const jobs = ref([])
const loaded = ref(false)
onMounted(async () => {
  try {
    jobs.value = await getJobs()
  } catch {
    /* API unreachable */
  }
  loaded.value = true
})

const idParam = computed(() => String(route.params.id))
const job = computed(() =>
  jobs.value.find((j) => String(j.id).replace(/^v/, '') === idParam.value),
)
const vacancyId = computed(() => (job.value ? String(job.value.id).replace(/^v/, '') : null))

usePageMeta({
  title: () => (job.value ? loc(job.value.title) : t('vacancies.notFound')),
  description: () => (job.value ? loc(job.value.sector) : ''),
})

// Per-vacancy JobPosting structured data (Google job results).
const schema = computed(() => {
  const j = job.value
  if (!j) return ''
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: loc(j.title),
    description: loc(j.description) || loc(j.sector) || loc(j.title),
    datePosted: new Date().toISOString().slice(0, 10),
    employmentType: 'FULL_TIME',
    industry: j.category || undefined,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Bound Solutions',
      sameAs: 'https://boundsolutions.ge',
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Tbilisi', addressCountry: 'GE' },
    },
    ...(j.salary
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'GEL',
            value: { '@type': 'QuantitativeValue', value: j.salary, unitText: 'MONTH' },
          },
        }
      : {}),
  })
})
useHead({ script: [{ type: 'application/ld+json', innerHTML: schema }] })

const modalOpen = ref(false)
</script>

<template>
  <section class="pt-28 pb-8 lg:pt-32 bg-cream-light">
    <div class="max-w-4xl mx-auto px-6">
      <RouterLink
        to="/vacancies"
        class="inline-flex items-center gap-1.5 text-gray-400 hover:text-brand text-sm mb-6 transition-colors"
      >
        <BaseIcon name="arrowRight" class="w-4 h-4 rotate-180" /> {{ t('vacancies.backToList') }}
      </RouterLink>

      <template v-if="job">
        <div class="flex flex-col lg:flex-row lg:items-center gap-6">
          <img
            v-if="job.image"
            :src="job.image"
            :alt="loc(job.title)"
            class="w-full lg:w-40 h-40 lg:h-28 object-cover rounded-2xl flex-shrink-0"
          />
          <div class="flex-1">
            <div v-if="job.category" class="mb-2">
              <span class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{ job.category }}</span>
            </div>
            <h1 class="text-2xl lg:text-4xl font-extrabold text-gray-900 leading-tight">{{ loc(job.title) }}</h1>
            <p class="text-gray-500 mt-1">{{ loc(job.sector) }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 mt-6">
          <span class="px-3 py-1.5 bg-white border border-gray-100 text-gray-500 text-xs rounded-lg inline-flex items-center gap-1.5">
            <BaseIcon name="pin" class="w-3.5 h-3.5" /> {{ t('vacancies.location') }}
          </span>
          <span class="px-3 py-1.5 bg-white border border-gray-100 text-gray-500 text-xs rounded-lg">{{ t('vacancies.fullTime') }}</span>
          <span v-if="job.salary" class="px-3 py-1.5 bg-white border border-gray-100 text-gray-700 text-xs font-semibold rounded-lg">{{ job.salary }}</span>
        </div>
      </template>
    </div>
  </section>

  <template v-if="job">
    <!-- Description + apply -->
    <section class="py-12 lg:py-16">
      <div class="max-w-4xl mx-auto px-6 grid lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2">
          <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('vacancies.descriptionHeading') }}</h2>
          <p
            v-if="loc(job.description)"
            class="text-gray-600 text-[15px] leading-relaxed whitespace-pre-line"
          >
            {{ loc(job.description) }}
          </p>
          <p v-else class="text-gray-400 text-sm">{{ loc(job.sector) }}</p>
        </div>

        <aside class="lg:col-span-1">
          <div class="bg-cream rounded-2xl p-6 lg:sticky lg:top-24 text-center">
            <p class="text-navy font-semibold mb-1">{{ loc(job.title) }}</p>
            <p v-if="job.salary" class="text-brand font-extrabold text-xl mb-4">{{ job.salary }}</p>
            <button
              class="w-full gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              @click="modalOpen = true"
            >
              {{ t('common.sendCV') }}
            </button>
          </div>
        </aside>
      </div>
    </section>
  </template>

  <!-- Not found -->
  <section v-else-if="loaded" class="min-h-[50vh] flex items-center justify-center px-6 pt-28 pb-20 text-center">
    <div>
      <h1 class="text-2xl font-extrabold text-gray-900 mb-3">{{ t('vacancies.notFound') }}</h1>
      <RouterLink to="/vacancies" class="text-brand font-semibold">{{ t('vacancies.backToList') }}</RouterLink>
    </div>
  </section>

  <CvModal
    v-model="modalOpen"
    :title="job ? loc(job.title) : ''"
    :sector="job ? loc(job.sector) : ''"
    :vacancy-id="vacancyId"
  />
</template>
