<script setup>
defineProps({
  eyebrow: String,
  title: String,
  subtitle: String,
  center: Boolean,
})
</script>

<template>
  <div :class="['max-w-2xl fade-in', center ? 'mx-auto text-center' : '']">
    <p v-if="eyebrow" class="text-brand font-semibold text-sm mb-3 tracking-wide">{{ eyebrow }}</p>
    <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{{ title }}</h2>
    <p v-if="subtitle" class="text-gray-500 text-[15px] leading-relaxed">{{ subtitle }}</p>
  </div>
</template>
