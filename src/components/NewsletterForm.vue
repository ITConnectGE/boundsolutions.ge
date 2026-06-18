<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ dark: Boolean })
const { t } = useI18n()
const email = ref('')
const done = ref(false)

function submit() {
  if (email.value) done.value = true
}
</script>

<template>
  <form v-if="!done" class="flex flex-col gap-2.5 max-w-sm" @submit.prevent="submit">
    <label class="sr-only" for="nl-email">{{ t('footer.newsletterPlaceholder') }}</label>
    <input
      id="nl-email"
      v-model="email"
      type="email"
      required
      :placeholder="t('footer.newsletterPlaceholder')"
      class="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
      :class="
        dark
          ? 'bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:ring-2 focus:ring-white/30'
          : 'bg-gray-50 focus:ring-2 focus:ring-brand/20 focus:bg-white'
      "
    />
    <button
      type="submit"
      class="w-full px-4 py-3 rounded-xl text-sm font-semibold"
      :class="dark ? 'gradient-bg text-white hover:shadow-lg hover:shadow-black/20' : 'gradient-bg text-white'"
    >
      {{ t('footer.subscribe') }}
    </button>
  </form>
  <p v-else class="text-sm font-medium" :class="dark ? 'text-white' : 'text-brand'">
    {{ t('footer.subscribed') }}
  </p>
</template>
