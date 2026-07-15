<script setup>
// Reusable "send CV" modal (used by the vacancies list and each vacancy page).
// Pass the vacancy title/sector/id so the application is tied to that vacancy;
// with no title it acts as a general application.
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { addApplication } from '@/composables/applications.js'
import { isValidEmail } from '@/utils/validation.js'
import BaseIcon from './BaseIcon.vue'

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  sector: { type: String, default: '' },
  vacancyId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue'])

const { t, tm, rt } = useI18n()

const submitted = ref(false)
const fileName = ref('')
const cvFileObj = ref(null)
const form = ref({ name: '', email: '', phone: '', message: '' })
const agreed = ref(false)
const consentOpen = ref(false)
const sending = ref(false)
const emailTouched = ref(false)
const emailError = computed(
  () => emailTouched.value && form.value.email.length > 0 && !isValidEmail(form.value.email),
)

// Reset each time it opens.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    submitted.value = false
    fileName.value = ''
    cvFileObj.value = null
    agreed.value = false
    emailTouched.value = false
    form.value = { name: '', email: '', phone: '', message: '' }
  },
)

const headerTitle = computed(() => props.title || t('vacancies.modal.generalTitle'))

function close() {
  emit('update:modelValue', false)
}
function onFile(e) {
  const f = e.target.files?.[0]
  if (f) {
    fileName.value = f.name
    cvFileObj.value = f
  }
}
async function submit() {
  emailTouched.value = true
  if (!isValidEmail(form.value.email)) return
  if (!agreed.value || sending.value) return
  sending.value = true
  try {
    await addApplication(
      {
        type: 'cv',
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone,
        message: form.value.message,
        position: props.title,
        sector: props.sector,
        vacancyId: props.vacancyId,
        consent: true,
      },
      cvFileObj.value,
    )
    submitted.value = true
  } catch (e) {
    alert('Error: ' + (e.message || 'could not send'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Transition name="page">
    <div v-if="modelValue" class="fixed inset-0 z-[60]">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="close">
        <div class="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl">
          <button
            class="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
            :aria-label="t('vacancies.modal.submit')"
            @click="close"
          >
            <BaseIcon name="close" class="w-6 h-6" />
          </button>

          <template v-if="!submitted">
            <h3 class="text-xl font-extrabold text-gray-900 mb-1">{{ t('vacancies.modal.title') }}</h3>
            <p class="text-sm text-gray-400 mb-5">
              {{ headerTitle }}<span v-if="sector"> — {{ sector }}</span>
            </p>

            <form method="post" class="space-y-4" @submit.prevent="submit">
              <div>
                <label for="cv-name" class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('vacancies.modal.name') }}</label>
                <input id="cv-name" v-model="form.name" name="name" type="text" required autocomplete="name" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all" />
              </div>
              <div>
                <label for="cv-email" class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('vacancies.modal.email') }}</label>
                <input
                  id="cv-email"
                  v-model="form.email"
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="name@example.com"
                  class="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  :class="emailError ? 'bg-red-50 ring-2 ring-red-300 focus:ring-red-400' : 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white'"
                  @blur="emailTouched = true"
                />
                <p v-if="emailError" class="text-red-500 text-xs mt-1.5">{{ t('common.invalidEmail') }}</p>
              </div>
              <div>
                <label for="cv-phone" class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('vacancies.modal.phone') }}</label>
                <input id="cv-phone" v-model="form.phone" name="phone" type="tel" required autocomplete="tel" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all" />
              </div>
              <div>
                <label for="cv-message" class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('vacancies.modal.message') }}</label>
                <textarea id="cv-message" v-model="form.message" name="message" rows="3" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('vacancies.modal.cvLabel') }}</label>
                <div class="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand/40 transition-colors">
                  <input type="file" accept=".pdf,.doc,.docx" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" @change="onFile" />
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
              <label class="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input v-model="agreed" type="checkbox" required class="mt-0.5 w-4 h-4 flex-shrink-0 accent-brand cursor-pointer" />
                <span class="text-xs text-gray-500 leading-relaxed">
                  {{ t('vacancies.consent.checkbox') }}
                  <button type="button" class="text-brand font-medium underline underline-offset-2" @click="consentOpen = true">
                    {{ t('vacancies.consent.link') }}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                :disabled="!agreed || sending"
                class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-base mt-2 transition-opacity"
                :class="agreed && !sending ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'"
              >
                {{ t('vacancies.modal.submit') }}
              </button>
              <p class="text-center text-xs text-gray-400">{{ t('common.responsePromise') }}</p>
            </form>
          </template>

          <div v-else class="text-center py-8">
            <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BaseIcon name="check" class="w-8 h-8 text-green-500" />
            </div>
            <h4 class="text-xl font-extrabold text-gray-900 mb-2">{{ t('vacancies.modal.successTitle') }}</h4>
            <p class="text-gray-400">{{ t('vacancies.modal.successText') }}</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Consent (personal-data) modal -->
  <Transition name="page">
    <div v-if="consentOpen" class="fixed inset-0 z-[70]">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="consentOpen = false"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="consentOpen = false">
        <div class="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
          <h3 class="text-lg font-extrabold text-gray-900 mb-4 pr-6">{{ t('vacancies.consent.title') }}</h3>
          <p class="text-sm text-gray-600 mb-3">{{ t('vacancies.consent.intro') }}</p>
          <ul class="space-y-2.5 mb-4">
            <li v-for="(p, i) in tm('vacancies.consent.points')" :key="i" class="flex gap-2.5 text-[13px] text-gray-500 leading-relaxed">
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"></span>
              <span>{{ rt(p) }}</span>
            </li>
          </ul>
          <p class="text-[13px] text-gray-400 leading-relaxed mb-6">{{ t('vacancies.consent.outro') }}</p>
          <button type="button" class="w-full gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity" @click="consentOpen = false">
            {{ t('vacancies.consent.close') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
