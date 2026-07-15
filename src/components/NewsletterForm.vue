<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps({
  dark: Boolean,
  horizontal: Boolean, // input + button side by side
  inputId: { type: String, default: 'nl-email' },
})
const { t } = useI18n()
const email = ref('')
const done = ref(false)

function submit() {
  if (email.value) done.value = true
}
</script>

<template>
  <form
    v-if="!done"
    method="post"
    class="flex"
    :class="horizontal ? 'flex-row gap-2 items-stretch' : 'flex-col gap-2.5 max-w-sm'"
    @submit.prevent="submit"
  >
    <label class="sr-only" :for="inputId">{{ t('footer.newsletterPlaceholder') }}</label>
    <input
      :id="inputId"
      v-model="email"
      name="email"
      type="email"
      required
      autocomplete="email"
      :placeholder="t('footer.newsletterPlaceholder')"
      class="px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
      :class="[
        horizontal ? 'flex-1 min-w-0' : 'w-full',
        dark
          ? 'bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:ring-2 focus:ring-white/30'
          : 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white',
      ]"
    />
    <button
      type="submit"
      class="gradient-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
      :class="horizontal ? 'px-6 py-3 whitespace-nowrap flex-shrink-0' : 'w-full px-4 py-3'"
    >
      {{ t('footer.subscribe') }}
    </button>
  </form>
  <p v-else class="text-sm font-medium" :class="dark ? 'text-white' : 'text-brand'">
    {{ t('footer.subscribed') }}
  </p>
</template>
