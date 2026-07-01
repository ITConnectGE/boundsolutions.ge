<script setup>
// Inline-editable CTA. Pass *Key props to point at different i18n keys; defaults
// to the homepage CTA copy.
import EditableText from './EditableText.vue'
import BaseIcon from './BaseIcon.vue'

defineProps({
  titleKey: { type: String, default: 'home.contactCta.title' },
  textKey: { type: String, default: 'home.contactCta.text' },
  buttonKey: { type: String, default: 'home.contactCta.button' },
})
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
            <EditableText :tkey="titleKey" />
          </h2>
          <p class="text-gray-500 max-w-md mx-auto mb-8"><EditableText :tkey="textKey" /></p>
          <RouterLink
            to="/contact"
            class="inline-flex items-center gap-2 gradient-bg text-white px-8 py-3.5 rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-brand/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            <EditableText :tkey="buttonKey" /> <BaseIcon name="arrowRight" class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
