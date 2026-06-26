<script setup>
import { useLoc } from '@/composables/useLocale'
import BaseIcon from './BaseIcon.vue'

defineProps({ service: { type: Object, required: true } })
const { loc } = useLoc()
</script>

<template>
  <RouterLink
    :to="`/services/${service.slug}`"
    class="card-hover fade-in block rounded-2xl p-6 group"
    style="background: #FFF4EA"
  >
    <div class="rounded-xl overflow-hidden mb-5 aspect-video bg-white/40">
      <img
        :src="service.image"
        :alt="loc(service.title)"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
    </div>
    <div class="flex items-center gap-2.5 mb-2">
      <span
        class="w-9 h-9 rounded-xl gradient-bg text-white flex items-center justify-center flex-shrink-0"
      >
        <BaseIcon :name="service.icon" class="w-5 h-5" />
      </span>
      <h3 class="font-bold text-gray-800 group-hover:text-brand transition-colors">
        {{ loc(service.title) }}
      </h3>
    </div>
    <p class="text-sm text-gray-500 leading-relaxed">{{ loc(service.summary) }}</p>
  </RouterLink>
</template>
