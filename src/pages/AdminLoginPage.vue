<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useAdminAuth } from '@/composables/useAdminAuth'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const router = useRouter()
const { login, isAuthed, DEMO_EMAIL, DEMO_PASSWORD } = useAdminAuth()

useHead({
  title: () => t('admin.login.title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// Prefilled with the demo credentials for convenience.
const email = ref(DEMO_EMAIL)
const password = ref(DEMO_PASSWORD)
const error = ref(false)

onMounted(() => {
  if (isAuthed()) router.replace('/admin')
})

function submit() {
  if (login(email.value, password.value)) {
    router.replace('/admin')
  } else {
    error.value = true
  }
}
</script>

<template>
  <div class="min-h-screen bg-cream-light flex items-center justify-center px-6 py-12 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px]"></div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-8">
        <img src="/images/BoundSolutions - Nav.png" alt="Bound Solutions" class="h-9 mx-auto mb-6" />
        <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.login.title') }}</h1>
        <p class="text-gray-400 text-sm mt-2">{{ t('admin.login.subtitle') }}</p>
      </div>

      <form class="bg-white rounded-2xl shadow-xl shadow-brand/5 p-8 space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
            t('admin.login.email')
          }}</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="username"
            class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
            t('admin.login.password')
          }}</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
          />
        </div>

        <p v-if="error" class="text-sm text-brand">{{ t('admin.login.error') }}</p>

        <button type="submit" class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm">
          {{ t('admin.login.signIn') }}
        </button>

        <div class="bg-cream-light rounded-xl p-3 text-center">
          <p class="text-[11px] font-semibold text-brand/70 uppercase tracking-wide mb-1">
            {{ t('admin.login.demoHint') }}
          </p>
          <p class="text-xs text-gray-500">{{ DEMO_EMAIL }} · {{ DEMO_PASSWORD }}</p>
        </div>
      </form>

      <div class="text-center mt-6">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-1.5 text-gray-400 hover:text-brand text-sm transition-colors"
        >
          <BaseIcon name="arrowRight" class="w-4 h-4 rotate-180" /> {{ t('admin.login.backToSite') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
