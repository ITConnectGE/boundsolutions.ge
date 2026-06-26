<script setup>
import { useI18n } from 'vue-i18n'
import BaseIcon from './BaseIcon.vue'

defineProps({ title: String, text: String, button: String })
const { t } = useI18n()
</script>

<template>
  <section class="py-20 lg:py-28">
    <div class="max-w-4xl mx-auto px-6">
      <div
        class="fade-in rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden"
        style="background: #FFF4EA"
      >
        <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand/10 rounded-full blur-3xl"></div>
        <div class="relative">
          <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
            {{ title || t('home.contactCta.title') }}
          </h2>
          <p class="text-gray-500 max-w-md mx-auto mb-8">{{ text || t('home.contactCta.text') }}</p>
          <RouterLink
            to="/contact"
            class="inline-flex items-center gap-2 gradient-bg text-white px-8 py-3.5 rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-brand/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            {{ button || t('home.contactCta.button') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
