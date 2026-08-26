<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { addApplication } from '@/composables/applications.js'
import { collection } from '@/composables/content.js'
import {
  defaultCompanyForm,
  companyFormFields,
  defaultCompanyFormEnabled,
  lockedCompanyFields,
} from '@/data/lists.js'
import { useLoc } from '@/composables/useLocale'
import { fieldError, normalizePhone } from '@/utils/validation.js'
import PageHero from '@/components/PageHero.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const { loc } = useLoc()

// Editable from the admin CMS: intro, which fields show (enabled), and the
// dropdown options for select fields.
const cf = computed(() => collection('companyForm', defaultCompanyForm))
// Email + phone are forced back in even if the CMS list drops them.
const enabledKeys = computed(() => [
  ...new Set([...(cf.value.enabled || defaultCompanyFormEnabled), ...lockedCompanyFields]),
])
const visibleFields = computed(() => companyFormFields.filter((f) => enabledKeys.value.includes(f.key)))

// Group visible fields under their section legend, in a fixed order.
const SECTIONS = [
  { key: 'company', legend: 'sectionCompany' },
  { key: 'position', legend: 'sectionPosition' },
  { key: 'contract', legend: 'sectionContract' },
  { key: 'contact', legend: 'sectionContact' },
]
const sections = computed(() =>
  SECTIONS.map((s) => ({ ...s, fields: visibleFields.value.filter((f) => f.section === s.key) })).filter(
    (s) => s.fields.length,
  ),
)
const optionsFor = (f) => (f.opt ? cf.value[f.opt] || [] : [])

usePageMeta({ title: () => t('companyForm.title'), description: () => t('companyForm.subtitle') })

const submitted = ref(false)
const sending = ref(false)
// A value slot for every possible field (unused ones stay empty).
const values = reactive(Object.fromEntries(companyFormFields.map((f) => [f.key, ''])))

// Per-field validation. Required fields must be filled; email and phone must
// also match the format the API enforces.
const isRequired = (f) => Boolean(f.required) || lockedCompanyFields.includes(f.key)
const kindOf = (f) => (f.key === 'email' ? 'email' : f.key === 'phone' ? 'phone' : 'text')
const touched = reactive({})
const errors = computed(() =>
  Object.fromEntries(
    visibleFields.value.map((f) => [f.key, fieldError(kindOf(f), values[f.key], isRequired(f))]),
  ),
)
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))
const showError = (key) => (touched[key] ? errors.value[key] || '' : '')
const placeholderFor = (f) => {
  if (f.type === 'email') return t('common.emailPlaceholder')
  if (f.type === 'tel') return t('common.phonePlaceholder')
  return ''
}

function summary() {
  const rows = []
  for (const f of visibleFields.value) {
    if (f.map) continue // mapped to a column, not the free-text summary
    const v = values[f.key]
    if (v && String(v).trim()) rows.push(`${t('companyForm.' + f.key)}: ${v}`)
  }
  return rows.join('\n')
}

async function submit() {
  for (const f of visibleFields.value) touched[f.key] = true
  if (hasErrors.value) return // block empty / malformed required fields
  if (sending.value) return
  sending.value = true
  try {
    await addApplication({
      type: 'company',
      name: values.companyName,
      email: values.email,
      phone: normalizePhone(values.phone),
      position: values.positionTitle,
      sector: values.industry,
      message: summary(),
      contactName: values.contactName,
    })
    submitted.value = true
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    alert('Error: ' + (e.message || 'could not send'))
  } finally {
    sending.value = false
  }
}

const inputCls = 'w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all'
const okCls = 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white'
const errCls = 'bg-red-50 ring-2 ring-red-300 focus:ring-red-400'
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
        <div class="bg-brand/5 rounded-2xl p-6 mb-8">
          <div class="rich text-sm text-gray-600 leading-relaxed" v-html="loc(cf.intro)"></div>
        </div>

        <form method="post" class="space-y-10" @submit.prevent="submit">
          <fieldset v-for="sec in sections" :key="sec.key" class="space-y-4">
            <legend class="font-brand text-sm text-gray-900 mb-3">{{ t('companyForm.' + sec.legend) }}</legend>
            <div v-for="f in sec.fields" :key="f.key">
              <label :for="'cf-' + f.key" class="block text-xs font-medium text-gray-500 mb-1.5">
                {{ t('companyForm.' + f.key) }}<span v-if="isRequired(f)"> *</span>
              </label>

              <!-- text / email / tel -->
              <template v-if="f.type === 'text' || f.type === 'email' || f.type === 'tel'">
                <input
                  :id="'cf-' + f.key"
                  v-model="values[f.key]"
                  :name="f.key"
                  :type="f.type"
                  :required="isRequired(f)"
                  :inputmode="f.type === 'tel' ? 'tel' : undefined"
                  :placeholder="placeholderFor(f)"
                  :class="[inputCls, showError(f.key) ? errCls : okCls]"
                  @blur="touched[f.key] = true"
                />
                <p v-if="showError(f.key)" class="text-red-500 text-xs mt-1">{{ t(showError(f.key)) }}</p>
              </template>

              <!-- textarea -->
              <template v-else-if="f.type === 'textarea'">
                <textarea
                  :id="'cf-' + f.key"
                  v-model="values[f.key]"
                  :name="f.key"
                  rows="3"
                  :required="isRequired(f)"
                  :class="[inputCls, 'resize-none', showError(f.key) ? errCls : okCls]"
                  @blur="touched[f.key] = true"
                ></textarea>
                <p v-if="showError(f.key)" class="text-red-500 text-xs mt-1">{{ t(showError(f.key)) }}</p>
              </template>

              <!-- select -->
              <select
                v-else-if="f.type === 'select'"
                :id="'cf-' + f.key"
                v-model="values[f.key]"
                :name="f.key"
                :required="isRequired(f)"
                :class="[inputCls, okCls]"
              >
                <option value="">{{ t('companyForm.choose') }}</option>
                <option v-for="(o, i) in optionsFor(f)" :key="i" :value="loc(o)">{{ loc(o) }}</option>
              </select>
            </div>
          </fieldset>

          <div>
            <button
              type="submit"
              :disabled="sending"
              class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {{ t('companyForm.submit') }}
            </button>
            <p class="text-center text-xs text-gray-400 mt-3">{{ t('common.responsePromise') }}</p>
          </div>
        </form>
      </template>
    </div>
  </section>
</template>
