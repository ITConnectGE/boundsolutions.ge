<script setup>
// Pass *Key props (i18n keys) to make the heading inline-editable; the plain
// string props still work for backward compatibility.
import EditableText from './EditableText.vue'

defineProps({
  eyebrow: String,
  title: String,
  subtitle: String,
  center: Boolean,
  eyebrowKey: String,
  titleKey: String,
  subtitleKey: String,
})
</script>

<template>
  <div :class="['max-w-2xl fade-in', center ? 'mx-auto text-center' : '']">
    <p v-if="eyebrowKey || eyebrow" class="text-brand font-semibold text-sm mb-3 tracking-wide">
      <EditableText v-if="eyebrowKey" :tkey="eyebrowKey" /><template v-else>{{ eyebrow }}</template>
    </p>
    <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
      <EditableText v-if="titleKey" :tkey="titleKey" /><template v-else>{{ title }}</template>
    </h2>
    <p v-if="subtitleKey || subtitle" class="text-gray-500 text-[15px] leading-relaxed">
      <EditableText v-if="subtitleKey" :tkey="subtitleKey" /><template v-else>{{ subtitle }}</template>
    </p>
  </div>
</template>
