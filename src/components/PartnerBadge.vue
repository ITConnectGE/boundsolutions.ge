<script setup>
import { ref } from 'vue'

defineProps({ partner: { type: Object, required: true } })
const failed = ref(false)
</script>

<template>
  <img
    v-if="partner.logo && !failed"
    :src="partner.logo"
    :alt="partner.name"
    class="h-9 lg:h-11 object-contain opacity-90 hover:opacity-100 transition-opacity"
    loading="lazy"
    @error="failed = true"
  />
  <span
    v-else
    class="font-brand text-gray-400 hover:text-brand transition-colors text-lg"
    >{{ partner.name }}</span
  >
</template>
