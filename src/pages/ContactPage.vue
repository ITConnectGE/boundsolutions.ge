<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { addApplication } from '@/composables/applications.js'
import PageHero from '@/components/PageHero.vue'
import SocialLinks from '@/components/SocialLinks.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t, tm, rt } = useI18n()

usePageMeta({ title: () => t('contact.title'), description: () => t('contact.subtitle') })

const submitted = ref(false)
const sending = ref(false)
const form = ref({ name: '', email: '', phone: '', interest: '', message: '' })

async function submit() {
  if (sending.value) return
  sending.value = true
  try {
    // Persist to the backend (DB) — appears in the admin inbox.
    await addApplication({
      type: 'contact',
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
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
  <PageHero :eyebrow="t('contact.eyebrow')" :title="t('contact.title')" :subtitle="t('contact.subtitle')" />

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

        <form v-if="!submitted" class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.name') }} *</label
            >
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.email') }} *</label
            >
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
              t('contact.form.phone')
            }}</label>
            <input
              v-model="form.phone"
              type="tel"
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
              t('contact.form.interest')
            }}</label>
            <select
              v-model="form.interest"
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            >
              <option value="">{{ t('contact.form.interestChoose') }}</option>
              <option v-for="(opt, i) in tm('contact.interestOptions')" :key="i" :value="rt(opt)">
                {{ rt(opt) }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5"
              >{{ t('contact.form.message') }} *</label
            >
            <textarea
              v-model="form.message"
              required
              rows="4"
              class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            ></textarea>
          </div>
          <button
            type="submit"
            class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold"
          >
            {{ t('contact.form.send') }}
          </button>
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
