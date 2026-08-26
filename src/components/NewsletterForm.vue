<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { fieldError } from '@/utils/validation.js'

defineProps({
  dark: Boolean,
  horizontal: Boolean, // input + button side by side
  inputId: { type: String, default: 'nl-email' },
})
const { t } = useI18n()
const email = ref('')
const done = ref(false)
const touched = ref(false)
const error = computed(() => (touched.value ? fieldError('email', email.value) : ''))

function submit() {
  touched.value = true
  if (fieldError('email', email.value)) return // no empty / malformed subscribes
  done.value = true
}
</script>

<template>
  <form
    v-if="!done"
    method="post"
    class="flex"
    :class="horizontal ? 'flex-row flex-wrap gap-2 items-start' : 'flex-col gap-2.5 max-w-sm'"
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
        error ? 'ring-2 ring-red-300 focus:ring-red-400' : '',
        dark
          ? 'bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:ring-2 focus:ring-white/30'
          : 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white',
      ]"
      @blur="touched = true"
    />
    <button
      type="submit"
      class="gradient-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
      :class="horizontal ? 'px-6 py-3 whitespace-nowrap flex-shrink-0' : 'w-full px-4 py-3'"
    >
      {{ t('footer.subscribe') }}
    </button>
    <p
      v-if="error"
      class="text-xs w-full"
      :class="dark ? 'text-red-200' : 'text-red-500'"
    >
      {{ t(error) }}
    </p>
  </form>
  <p v-else class="text-sm font-medium" :class="dark ? 'text-white' : 'text-brand'">
    {{ t('footer.subscribed') }}
  </p>
</template>
