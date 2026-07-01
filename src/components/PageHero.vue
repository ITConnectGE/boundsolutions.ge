<script setup>
// Pass *Key props (i18n keys) to make the hero text inline-editable; the plain
// string props still work for backward compatibility.
import EditableText from './EditableText.vue'

defineProps({
  eyebrow: String,
  title: String,
  subtitle: String,
  eyebrowKey: String,
  titleKey: String,
  subtitleKey: String,
})
</script>

<template>
  <section class="relative pt-28 pb-14 lg:pt-36 lg:pb-20 overflow-hidden bg-cream-light">
    <div
      class="absolute inset-0 opacity-[0.02]"
      style="background-image: radial-gradient(circle, #8CCDE9 1px, transparent 1px); background-size: 32px 32px"
    ></div>
    <div class="absolute top-6 right-0 w-[420px] h-[420px] bg-brand/5 rounded-full blur-[120px]"></div>
    <div class="max-w-6xl mx-auto px-6 relative">
      <p v-if="eyebrowKey || eyebrow" class="text-brand font-semibold text-sm mb-3 tracking-wide">
        <EditableText v-if="eyebrowKey" :tkey="eyebrowKey" /><template v-else>{{ eyebrow }}</template>
      </p>
      <h1 class="text-3xl lg:text-5xl font-extrabold text-gray-900 leading-[1.15] max-w-3xl">
        <EditableText v-if="titleKey" :tkey="titleKey" /><template v-else>{{ title }}</template>
      </h1>
      <p v-if="subtitleKey || subtitle" class="text-gray-500 text-lg mt-5 max-w-2xl leading-relaxed">
        <EditableText v-if="subtitleKey" :tkey="subtitleKey" /><template v-else>{{ subtitle }}</template>
      </p>
      <slot />
    </div>
  </section>
</template>
