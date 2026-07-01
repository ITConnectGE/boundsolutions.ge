<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { addApplication } from '@/composables/applications.js'
import PageHero from '@/components/PageHero.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t, tm, rt } = useI18n()

usePageMeta({ title: () => t('companyForm.title'), description: () => t('companyForm.subtitle') })

const submitted = ref(false)

const blank = () => ({
  companyName: '',
  idCode: '',
  industry: '',
  location: '',
  positionTitle: '',
  schedule: '',
  jobDescription: '',
  structure: '',
  qualifications: '',
  contractType: '',
  contractPeriod: '',
  salary: '',
  bonus: '',
  comment: '',
  contactName: '',
  email: '',
  phone: '',
})
const form = ref(blank())

function summary() {
  const f = form.value
  const rows = [
    [t('companyForm.idCode'), f.idCode],
    [t('companyForm.industry'), f.industry],
    [t('companyForm.location'), f.location],
    [t('companyForm.positionTitle'), f.positionTitle],
    [t('companyForm.schedule'), f.schedule],
    [t('companyForm.jobDescription'), f.jobDescription],
    [t('companyForm.structure'), f.structure],
    [t('companyForm.qualifications'), f.qualifications],
    [t('companyForm.contractType'), f.contractType],
    [t('companyForm.contractPeriod'), f.contractPeriod],
    [t('companyForm.salary'), f.salary],
    [t('companyForm.bonus'), f.bonus],
    [t('companyForm.comment'), f.comment],
  ]
  return rows
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

const sending = ref(false)

async function submit() {
  if (sending.value) return
  sending.value = true
  try {
    await addApplication({
      type: 'company',
      name: form.value.companyName,
      email: form.value.email,
      phone: form.value.phone,
      position: form.value.positionTitle,
      sector: form.value.industry,
      message: summary(),
      contactName: form.value.contactName,
    })
    submitted.value = true
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    alert('Error: ' + (e.message || 'could not send'))
  } finally {
    sending.value = false
  }
}

const inputCls =
  'w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all'
</script>

<template>
  <PageHero
    eyebrow-key="companyForm.eyebrow"
    title-key="companyForm.title"
    subtitle-key="companyForm.subtitle"
  />

  <section class="py-14 lg:py-20">
    <div class="max-w-3xl mx-auto px-6">
      <!-- Success -->
      <div v-if="submitted" class="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <BaseIcon name="check" class="w-8 h-8 text-green-500" />
        </div>
        <h2 class="text-2xl font-extrabold text-gray-900 mb-2">{{ t('companyForm.successTitle') }}</h2>
        <p class="text-gray-500">{{ t('companyForm.successText') }}</p>
      </div>

      <template v-else>
        <div class="bg-brand/5 rounded-2xl p-6 mb-8 space-y-3">
          <p class="text-sm text-gray-600 leading-relaxed">{{ t('companyForm.intro1') }}</p>
          <p class="text-sm text-gray-500 leading-relaxed">{{ t('companyForm.intro2') }}</p>
        </div>

        <form class="space-y-10" @submit.prevent="submit">
          <!-- Company -->
          <fieldset class="space-y-4">
            <legend class="font-brand text-sm text-gray-900 mb-3">{{ t('companyForm.sectionCompany') }}</legend>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.companyName') }} *</label>
              <input v-model="form.companyName" type="text" required :class="inputCls" />
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.idCode') }}</label>
                <input v-model="form.idCode" type="text" :class="inputCls" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.location') }}</label>
                <input v-model="form.location" type="text" :class="inputCls" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.industry') }}</label>
              <input v-model="form.industry" type="text" :class="inputCls" />
            </div>
          </fieldset>

          <!-- Position -->
          <fieldset class="space-y-4">
            <legend class="font-brand text-sm text-gray-900 mb-3">{{ t('companyForm.sectionPosition') }}</legend>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.positionTitle') }} *</label>
              <input v-model="form.positionTitle" type="text" required :class="inputCls" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.schedule') }}</label>
              <select v-model="form.schedule" :class="inputCls">
                <option value="">{{ t('companyForm.choose') }}</option>
                <option v-for="(o, i) in tm('companyForm.scheduleOptions')" :key="i" :value="rt(o)">{{ rt(o) }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.jobDescription') }}</label>
              <textarea v-model="form.jobDescription" rows="3" :class="inputCls + ' resize-none'"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.structure') }}</label>
              <input v-model="form.structure" type="text" :class="inputCls" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.qualifications') }}</label>
              <textarea v-model="form.qualifications" rows="3" :class="inputCls + ' resize-none'"></textarea>
            </div>
          </fieldset>

          <!-- Contract -->
          <fieldset class="space-y-4">
            <legend class="font-brand text-sm text-gray-900 mb-3">{{ t('companyForm.sectionContract') }}</legend>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.contractType') }}</label>
                <select v-model="form.contractType" :class="inputCls">
                  <option value="">{{ t('companyForm.choose') }}</option>
                  <option v-for="(o, i) in tm('companyForm.contractTypeOptions')" :key="i" :value="rt(o)">{{ rt(o) }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.contractPeriod') }}</label>
                <select v-model="form.contractPeriod" :class="inputCls">
                  <option value="">{{ t('companyForm.choose') }}</option>
                  <option v-for="(o, i) in tm('companyForm.contractPeriodOptions')" :key="i" :value="rt(o)">{{ rt(o) }}</option>
                </select>
              </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.salary') }}</label>
                <input v-model="form.salary" type="text" :class="inputCls" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.bonus') }}</label>
                <input v-model="form.bonus" type="text" :class="inputCls" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.comment') }}</label>
              <textarea v-model="form.comment" rows="2" :class="inputCls + ' resize-none'"></textarea>
            </div>
          </fieldset>

          <!-- Contact -->
          <fieldset class="space-y-4">
            <legend class="font-brand text-sm text-gray-900 mb-3">{{ t('companyForm.sectionContact') }}</legend>
            <div class="grid sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.contactName') }}</label>
                <input v-model="form.contactName" type="text" :class="inputCls" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.email') }} *</label>
                <input v-model="form.email" type="email" required :class="inputCls" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('companyForm.phone') }}</label>
                <input v-model="form.phone" type="tel" :class="inputCls" />
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {{ t('companyForm.submit') }}
          </button>
        </form>
      </template>
    </div>
  </section>
</template>
