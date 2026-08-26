<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { addApplication } from '@/composables/applications.js'
import { fieldError, normalizePhone } from '@/utils/validation.js'
import PageHero from '@/components/PageHero.vue'
import SocialLinks from '@/components/SocialLinks.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t, tm, rt } = useI18n()

usePageMeta({ title: () => t('contact.title'), description: () => t('contact.subtitle') })

const submitted = ref(false)
const sending = ref(false)
const form = ref({ name: '', email: '', phone: '', interest: '', message: '' })
// Name, email, phone and message are all mandatory; email and phone must also
// be well formed (same rules the API enforces).
const FIELDS = { name: 'text', email: 'email', phone: 'phone', message: 'text' }
const touched = ref({ name: false, email: false, phone: false, message: false })
const errors = computed(() =>
  Object.fromEntries(Object.entries(FIELDS).map(([k, kind]) => [k, fieldError(kind, form.value[k])])),
)
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))
const showError = (k) => (touched.value[k] ? errors.value[k] : '')

const okCls = 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white'
const errCls = 'bg-red-50 ring-2 ring-red-300 focus:ring-red-400'
const inputCls = 'w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all'

async function submit() {
  touched.value = { name: true, email: true, phone: true, message: true }
  if (hasErrors.value) return // block empty / malformed email + phone
  if (sending.value) return
  sending.value = true
  try {
    // Persist to the backend (DB) - appears in the admin inbox.
    await addApplication({
      type: 'contact',
      name: form.value.name,
      email: form.value.email,
      phone: normalizePhone(form.value.phone),
      message: form.value.message,
      position: form.value.interest || '',
      sector: '',
    })
    submitted.value = true
  } catch (e) {
    alert('Error: ' + (e.message || 'could not send'))
  } finally {
    sending.value = false
  }
}

const cards = [
  { icon: 'mail', labelKey: 'contact.emailLabel', value: 'info@boundsolutions.ge', href: 'mailto:info@boundsolutions.ge' },
  { icon: 'phone', labelKey: 'contact.phoneLabel', value: '+995 577 32 32 23', href: 'tel:+995577323223' },
  { icon: 'pin', labelKey: 'contact.addressLabel', valueKey: 'contact.address', href: '' },
]
</script>

<template>
  <PageHero eyebrow-key="contact.eyebrow" title-key="contact.title" subtitle-key="contact.subtitle" />

  <section class="py-16 lg:py-20">
    <div class="max-w-4xl mx-auto px-6">
      <!-- Quick cards -->
      <div class="grid md:grid-cols-3 gap-6 mb-12">
        <component
          :is="c.href ? 'a' : 'div'"
          v-for="c in cards"
          :key="c.labelKey"
          :href="c.href || undefined"
          class="fade-in text-center p-8 rounded-2xl bg-gray-50 group"
        >
          <BaseIcon :name="c.icon" class="w-6 h-6 text-brand mx-auto mb-3" />
          <p class="font-semibold text-gray-800 group-hover:text-brand transition-colors">
            {{ c.valueKey ? t(c.valueKey) : c.value }}
          </p>
          <p class="text-gray-400 text-xs mt-1">{{ t(c.labelKey) }}</p>
        </component>
      </div>

      <!-- Social (surfaced, audit) -->
      <div class="text-center mb-14">
        <p class="text-gray-400 text-sm mb-4">{{ t('contact.socialHeading') }}</p>
        <div class="flex justify-center">
          <SocialLinks variant="chip" />
        </div>
      </div>

      <!-- Form -->
      <div class="max-w-lg mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-6 text-center">
          {{ t('contact.formTitle') }}
        </h2>

        <form v-if="!submitted" method="post" class="space-y-4" @submit.prevent="submit">
          <div>
            <label for="contact-name" class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.name') }} *</label
            >
            <input
              id="contact-name"
              v-model="form.name"
              name="name"
              type="text"
              required
              autocomplete="name"
              :class="[inputCls, showError('name') ? errCls : okCls]"
              @blur="touched.name = true"
            />
            <p v-if="showError('name')" class="text-red-500 text-xs mt-1.5">{{ t(showError('name')) }}</p>
          </div>
          <div>
            <label for="contact-email" class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.email') }} *</label
            >
            <input
              id="contact-email"
              v-model="form.email"
              name="email"
              type="email"
              required
              autocomplete="email"
              :placeholder="t('common.emailPlaceholder')"
              :class="[inputCls, showError('email') ? errCls : okCls]"
              @blur="touched.email = true"
            />
            <p v-if="showError('email')" class="text-red-500 text-xs mt-1.5">{{ t(showError('email')) }}</p>
          </div>
          <div>
            <label for="contact-phone" class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.phone') }} *</label
            >
            <input
              id="contact-phone"
              v-model="form.phone"
              name="phone"
              type="tel"
              required
              autocomplete="tel"
              inputmode="tel"
              :placeholder="t('common.phonePlaceholder')"
              :class="[inputCls, showError('phone') ? errCls : okCls]"
              @blur="touched.phone = true"
            />
            <p v-if="showError('phone')" class="text-red-500 text-xs mt-1.5">{{ t(showError('phone')) }}</p>
          </div>
          <div>
            <label for="contact-interest" class="block text-xs font-medium text-gray-500 mb-1.5">{{
              t('contact.form.interest')
            }}</label>
            <select
              id="contact-interest"
              v-model="form.interest"
              name="interest"
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            >
              <option value="">{{ t('contact.form.interestChoose') }}</option>
              <option v-for="(opt, i) in tm('contact.interestOptions')" :key="i" :value="rt(opt)">
                {{ rt(opt) }}
              </option>
            </select>
          </div>
          <div>
            <label for="contact-message" class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.message') }} *</label
            >
            <textarea
              id="contact-message"
              v-model="form.message"
              name="message"
              required
              rows="4"
              :class="[inputCls, 'resize-none', showError('message') ? errCls : okCls]"
              @blur="touched.message = true"
            ></textarea>
            <p v-if="showError('message')" class="text-red-500 text-xs mt-1.5">{{ t(showError('message')) }}</p>
          </div>
          <button
            type="submit"
            :disabled="sending"
            class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-60"
          >
            {{ t('contact.form.send') }}
          </button>
          <p class="text-center text-xs text-gray-400">{{ t('common.responsePromise') }}</p>
        </form>

        <div v-else class="text-center py-12">
          <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BaseIcon name="check" class="w-8 h-8 text-green-500" />
          </div>
          <h4 class="text-xl font-extrabold text-gray-900 mb-2">
            {{ t('contact.form.successTitle') }}
          </h4>
          <p class="text-gray-400">{{ t('contact.form.successText') }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- THEMATIC BANNER (audit p.9) -->
  <section class="relative">
    <div class="relative h-64 lg:h-80 overflow-hidden">
      <img
        src="/images/strong team.jpg"
        alt="Bound Solutions"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-navy/60"></div>
      <div class="absolute inset-0 flex items-center justify-center text-center px-6">
        <p class="font-brand text-white text-2xl lg:text-4xl">{{ t('contact.bannerText') }}</p>
      </div>
    </div>
  </section>
</template>
