<script setup>
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'
const { t } = useI18n()
usePageMeta({ title: '404' })
</script>

<template>
  <section class="min-h-[60vh] flex items-center justify-center px-6 pt-28 pb-20 text-center">
    <div>
      <p class="text-7xl font-extrabold gradient-text mb-4">404</p>
      <h1 class="text-2xl font-extrabold text-gray-900 mb-3">{{ t('notFound.title') }}</h1>
      <p class="text-gray-500 mb-8">{{ t('notFound.text') }}</p>
      <RouterLink
        to="/"
        class="gradient-bg text-white px-8 py-3.5 rounded-2xl font-semibold text-sm inline-block"
        >{{ t('notFound.home') }}</RouterLink
      >
    </div>
  </section>
</template>
