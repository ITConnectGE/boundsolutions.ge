<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { getJobs, getJobsSeed, getVacancyCategories } from '@/composables/jobs.js'
import { defaultVacancyCategories } from '@/data/jobs.js'
import PageHero from '@/components/PageHero.vue'
import BaseIcon from '@/components/BaseIcon.vue'
import CvModal from '@/components/CvModal.vue'

const { t, tm, rt } = useI18n()
const { loc } = useLoc()

usePageMeta({ title: () => t('vacancies.title'), description: () => t('vacancies.subtitle') })

const active = ref('all')
// Seed for SSR/first paint; refresh from the (admin-managed) DB after mount.
const jobsList = ref(getJobsSeed())
const managedCats = ref([...defaultVacancyCategories])
onMounted(async () => {
  try {
    jobsList.value = await getJobs()
  } catch {
    // keep the seed if the API is unreachable
  }
  try {
    managedCats.value = await getVacancyCategories()
  } catch {
    // keep the default categories if the API is unreachable
  }
})

// Filters come from the admin-managed categories (vacancy_categories table), in
// admin order, showing only those that actually have vacancies. Matching is
// case-insensitive so legacy lowercase categories (hr, sales…) still line up.
const norm = (c) => (c || '').trim().toLowerCase()
const categories = computed(() => {
  const used = new Set(jobsList.value.map((j) => norm(j.category)).filter(Boolean))
  return managedCats.value.filter((c) => used.has(norm(c)))
})
// Show the managed DB label for a vacancy's category (so a legacy "sales" shows as "Sales").
const catLabel = (cat) => managedCats.value.find((c) => norm(c) === norm(cat)) || cat

const filtered = computed(() =>
  active.value === 'all'
    ? jobsList.value
    : jobsList.value.filter((j) => norm(j.category) === norm(active.value)),
)

// JobPosting structured data so vacancies can appear in Google's job results.
const jobsSchema = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const posts = jobsList.value.map((j) => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: loc(j.title),
    description: loc(j.sector) || loc(j.title),
    datePosted: today,
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
  }))
  return JSON.stringify(posts)
})
useHead({ script: [{ type: 'application/ld+json', innerHTML: jobsSchema }] })

// CV modal (the form lives in CvModal) - set the vacancy context and open it.
const modalOpen = ref(false)
const currentTitle = ref('')
const currentSector = ref('')
const currentVacancyId = ref(null)
const jobUrl = (job) => `/vacancies/${String(job.id).replace(/^v/, '')}`
function openModal(job) {
  currentTitle.value = job ? loc(job.title) : ''
  currentSector.value = job ? loc(job.sector) : ''
  currentVacancyId.value = job ? String(job.id).replace(/^v/, '') : null
  modalOpen.value = true
}
</script>

<template>
  <PageHero
    eyebrow-key="vacancies.eyebrow"
    title-key="vacancies.title"
    subtitle-key="vacancies.subtitle"
  />

  <section class="py-14 lg:py-20">
    <div class="max-w-6xl mx-auto px-6">
      <!-- Filters (auto-derived from the vacancies' categories) -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          :class="active === 'all' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'"
          @click="active = 'all'"
        >
          {{ t('vacancies.filters.all') }}
        </button>
        <button
          v-for="c in categories"
          :key="c"
          class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          :class="active === c ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'"
          @click="active = c"
        >
          {{ c }}
        </button>
      </div>

      <!-- Jobs -->
      <div class="space-y-3">
        <div
          v-for="job in filtered"
          :key="job.id"
          class="bg-white border border-gray-100 rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center gap-4"
        >
          <img
            v-if="job.image"
            :src="job.image"
            :alt="loc(job.title)"
            class="w-full lg:w-28 h-32 lg:h-20 object-cover rounded-xl flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <RouterLink :to="jobUrl(job)" class="font-bold text-gray-800 hover:text-brand transition-colors">
              {{ loc(job.title) }}
            </RouterLink>
            <p class="text-gray-400 text-sm mt-0.5">{{ loc(job.sector) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="job.category" class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{
              catLabel(job.category)
            }}</span>
            <span class="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">{{
              t('vacancies.location')
            }}</span>
            <span class="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">{{
              t('vacancies.fullTime')
            }}</span>
            <span class="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">{{
              job.salary
            }}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <RouterLink
              :to="jobUrl(job)"
              class="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-semibold hover:border-brand/30 hover:text-brand transition-colors whitespace-nowrap"
            >
              {{ t('vacancies.details') }}
            </RouterLink>
            <button
              class="gradient-bg text-white px-5 py-2.5 rounded-xl text-xs font-semibold text-center whitespace-nowrap"
              @click="openModal(job)"
            >
              {{ t('common.sendCV') }}
            </button>
          </div>
        </div>
      </div>

      <!-- No position -->
      <div class="mt-16 rounded-2xl p-8 lg:p-14 text-center" style="background: #FFF4EA">
        <h2 class="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3">
          {{ t('vacancies.noPosition.title') }}
        </h2>
        <p class="text-gray-500 max-w-md mx-auto mb-6">{{ t('vacancies.noPosition.text') }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <button
            class="gradient-bg text-white px-8 py-3.5 rounded-2xl font-semibold text-sm"
            @click="openModal(null)"
          >
            {{ t('vacancies.noPosition.send') }}
          </button>
          <a
            href="tel:+995577323223"
            class="bg-navy text-white px-8 py-3.5 rounded-2xl font-semibold text-sm"
            >+995 577 32 32 23</a
          >
        </div>
      </div>
    </div>
  </section>

  <CvModal
    v-model="modalOpen"
    :title="currentTitle"
    :sector="currentSector"
    :vacancy-id="currentVacancyId"
  />
</template>
