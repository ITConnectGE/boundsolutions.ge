<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { getJobs, getJobsSeed } from '@/composables/jobs.js'
import { addApplication } from '@/composables/applications.js'
import PageHero from '@/components/PageHero.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t, tm, rt } = useI18n()
const { loc } = useLoc()

usePageMeta({ title: () => t('vacancies.title'), description: () => t('vacancies.subtitle') })

const filterKeys = ['all', 'horeca', 'finance', 'events', 'hr', 'sales']
const active = ref('all')
// Seed for SSR/first paint; refresh from the (admin-managed) store after mount.
const jobsList = ref(getJobsSeed())
onMounted(() => {
  jobsList.value = getJobs()
})
const filtered = computed(() =>
  active.value === 'all'
    ? jobsList.value
    : jobsList.value.filter((j) => j.category === active.value),
)

// CV modal state
const modalOpen = ref(false)
const submitted = ref(false)
const currentTitle = ref('')
const currentSector = ref('')
const fileName = ref('')
const form = ref({ name: '', email: '', phone: '', message: '' })
const agreed = ref(false)
const consentOpen = ref(false)

function openModal(job) {
  if (job) {
    currentTitle.value = loc(job.title)
    currentSector.value = loc(job.sector)
  } else {
    currentTitle.value = t('vacancies.modal.generalTitle')
    currentSector.value = ''
  }
  submitted.value = false
  fileName.value = ''
  agreed.value = false
  form.value = { name: '', email: '', phone: '', message: '' }
  modalOpen.value = true
}
function closeModal() {
  modalOpen.value = false
}
function onFile(e) {
  const f = e.target.files?.[0]
  if (f) fileName.value = f.name
}
function submit() {
  if (!agreed.value) return
  // Save into the (demo) applications store so it shows in the admin dashboard
  addApplication({
    type: 'cv',
    name: form.value.name,
    email: form.value.email,
    phone: form.value.phone,
    message: form.value.message,
    position: currentTitle.value,
    sector: currentSector.value,
    cvFile: fileName.value || '',
    consent: true,
  })

  const subject = encodeURIComponent('CV — ' + currentTitle.value)
  const body = encodeURIComponent(
    `${currentTitle.value}${currentSector.value ? ' — ' + currentSector.value : ''}\n\n` +
      `${t('vacancies.modal.name')}: ${form.value.name}\n` +
      `${t('vacancies.modal.email')}: ${form.value.email}\n` +
      `${t('vacancies.modal.phone')}: ${form.value.phone}\n` +
      (form.value.message ? `${t('vacancies.modal.message')}: ${form.value.message}\n` : ''),
  )
  window.location.href = `mailto:recruitment@boundsolutions.ge?subject=${subject}&body=${body}`
  submitted.value = true
}
</script>

<template>
  <PageHero
    :eyebrow="t('vacancies.eyebrow')"
    :title="t('vacancies.title')"
    :subtitle="t('vacancies.subtitle')"
  />

  <section class="py-14 lg:py-20">
    <div class="max-w-6xl mx-auto px-6">
      <!-- Filters -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="k in filterKeys"
          :key="k"
          class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          :class="
            active === k
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-500 hover:text-gray-900'
          "
          @click="active = k"
        >
          {{ t(`vacancies.filters.${k}`) }}
        </button>
      </div>

      <!-- Jobs -->
      <div class="space-y-3">
        <div
          v-for="job in filtered"
          :key="job.id"
          class="fade-in bg-gray-50 rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center gap-4"
        >
          <img
            v-if="job.image"
            :src="job.image"
            :alt="loc(job.title)"
            class="w-full lg:w-28 h-32 lg:h-20 object-cover rounded-xl flex-shrink-0"
          />
          <div class="flex-1">
            <h3 class="font-bold text-gray-800">{{ loc(job.title) }}</h3>
            <p class="text-gray-400 text-sm mt-0.5">{{ loc(job.sector) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{
              t(`vacancies.filters.${job.category}`)
            }}</span>
            <span class="px-3 py-1 bg-white text-gray-500 text-xs rounded-lg">{{
              t('vacancies.location')
            }}</span>
            <span class="px-3 py-1 bg-white text-gray-500 text-xs rounded-lg">{{
              t('vacancies.fullTime')
            }}</span>
            <span class="px-3 py-1 bg-white text-gray-600 text-xs font-semibold rounded-lg">{{
              job.salary
            }}</span>
          </div>
          <button
            class="gradient-bg text-white px-5 py-2.5 rounded-xl text-xs font-semibold text-center whitespace-nowrap"
            @click="openModal(job)"
          >
            {{ t('common.sendCV') }}
          </button>
        </div>
      </div>

      <!-- No position -->
      <div class="mt-16 rounded-2xl p-8 lg:p-14 text-center" style="background: #ECF7FC">
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
            class="bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-semibold text-sm"
            >+995 577 32 32 23</a
          >
        </div>
      </div>
    </div>
  </section>

  <!-- CV MODAL -->
  <Transition name="page">
    <div v-if="modalOpen" class="fixed inset-0 z-[60]">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeModal"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="closeModal">
        <div class="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl">
          <button
            class="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
            :aria-label="t('vacancies.modal.submit')"
            @click="closeModal"
          >
            <BaseIcon name="close" class="w-6 h-6" />
          </button>

          <template v-if="!submitted">
            <h3 class="text-xl font-extrabold text-gray-900 mb-1">{{ t('vacancies.modal.title') }}</h3>
            <p class="text-sm text-gray-400 mb-5">
              {{ currentTitle }}<span v-if="currentSector"> — {{ currentSector }}</span>
            </p>

            <form class="space-y-4" @submit.prevent="submit">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
                  t('vacancies.modal.name')
                }}</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
                  t('vacancies.modal.email')
                }}</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
                  t('vacancies.modal.phone')
                }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  required
                  class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
                  t('vacancies.modal.message')
                }}</label>
                <textarea
                  v-model="form.message"
                  rows="3"
                  class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
                ></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
                  t('vacancies.modal.cvLabel')
                }}</label>
                <div
                  class="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand/40 transition-colors"
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    @change="onFile"
                  />
                  <div v-if="!fileName">
                    <BaseIcon name="upload" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p class="text-gray-400 text-sm">
                      {{ t('vacancies.modal.dropText') }}
                      <span class="text-brand font-medium">{{ t('vacancies.modal.dropChoose') }}</span>
                    </p>
                    <p class="text-gray-300 text-xs mt-1">{{ t('vacancies.modal.formats') }}</p>
                  </div>
                  <div v-else>
                    <BaseIcon name="fileCheck" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p class="text-gray-600 text-sm font-medium">{{ fileName }}</p>
                  </div>
                </div>
              </div>
              <!-- Consent (required) -->
              <label class="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  v-model="agreed"
                  type="checkbox"
                  required
                  class="mt-0.5 w-4 h-4 flex-shrink-0 accent-brand cursor-pointer"
                />
                <span class="text-xs text-gray-500 leading-relaxed">
                  {{ t('vacancies.consent.checkbox') }}
                  <button
                    type="button"
                    class="text-brand font-medium underline underline-offset-2"
                    @click="consentOpen = true"
                  >
                    {{ t('vacancies.consent.link') }}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                :disabled="!agreed"
                class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm mt-2 transition-opacity"
                :class="agreed ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'"
              >
                {{ t('vacancies.modal.submit') }}
              </button>
            </form>
          </template>

          <div v-else class="text-center py-8">
            <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BaseIcon name="check" class="w-8 h-8 text-green-500" />
            </div>
            <h4 class="text-xl font-extrabold text-gray-900 mb-2">
              {{ t('vacancies.modal.successTitle') }}
            </h4>
            <p class="text-gray-400">{{ t('vacancies.modal.successText') }}</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- CONSENT (personal-data) MODAL -->
  <Transition name="page">
    <div v-if="consentOpen" class="fixed inset-0 z-[70]">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="consentOpen = false"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="consentOpen = false">
        <div class="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
          <h3 class="text-lg font-extrabold text-gray-900 mb-4 pr-6">
            {{ t('vacancies.consent.title') }}
          </h3>
          <p class="text-sm text-gray-600 mb-3">{{ t('vacancies.consent.intro') }}</p>
          <ul class="space-y-2.5 mb-4">
            <li
              v-for="(p, i) in tm('vacancies.consent.points')"
              :key="i"
              class="flex gap-2.5 text-[13px] text-gray-500 leading-relaxed"
            >
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"></span>
              <span>{{ rt(p) }}</span>
            </li>
          </ul>
          <p class="text-[13px] text-gray-400 leading-relaxed mb-6">{{ t('vacancies.consent.outro') }}</p>
          <button
            type="button"
            class="w-full gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            @click="consentOpen = false"
          >
            {{ t('vacancies.consent.close') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
