<script setup>
// Two steps: sign in, and - for an admin still holding the temporary password
// from an invite - choose a real password. The panel is unreachable until then.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { passwordError } from '@/utils/validation.js'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const router = useRouter()
const { login, setPassword, isAuthed, needsPasswordReset } = useAdminAuth()

useHead({
  title: () => t('admin.login.title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const step = ref('signIn') // signIn | setPassword
const email = ref('')
const password = ref('')
const error = ref(false)
const loading = ref(false)

// ---- new-password step ----
const newPassword = ref('')
const confirmPassword = ref('')
const touched = ref(false)
const apiError = ref('')
const pwError = computed(() =>
  touched.value ? passwordError(newPassword.value, confirmPassword.value) : '',
)

onMounted(() => {
  if (!isAuthed()) return
  if (needsPasswordReset()) step.value = 'setPassword'
  else router.replace('/admin')
})

async function submit() {
  error.value = false
  loading.value = true
  try {
    const { ok, mustReset } = await login(email.value, password.value)
    if (!ok) {
      error.value = true
      return
    }
    if (mustReset) {
      step.value = 'setPassword'
      password.value = ''
      return
    }
    router.replace('/admin')
  } finally {
    loading.value = false
  }
}

async function submitPassword() {
  touched.value = true
  apiError.value = ''
  if (pwError.value) return
  loading.value = true
  try {
    await setPassword(newPassword.value, confirmPassword.value)
    router.replace('/admin')
  } catch (e) {
    apiError.value = e.message || t('admin.password.failed')
  } finally {
    loading.value = false
  }
}

const inputCls =
  'w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all'
</script>

<template>
  <div class="min-h-screen bg-cream-light flex items-center justify-center px-6 py-12 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px]"></div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-8">
        <img src="/images/BoundSolutions - Nav.png" alt="Bound Solutions" class="h-9 mx-auto mb-6" />
        <h1 class="text-2xl font-extrabold text-gray-900">
          {{ step === 'signIn' ? t('admin.login.title') : t('admin.password.title') }}
        </h1>
        <p class="text-gray-400 text-sm mt-2">
          {{ step === 'signIn' ? t('admin.login.subtitle') : t('admin.password.subtitle') }}
        </p>
      </div>

      <!-- ---- Sign in ---- -->
      <form
        v-if="step === 'signIn'"
        class="bg-white rounded-2xl shadow-xl shadow-brand/5 p-8 space-y-4"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
            t('admin.login.email')
          }}</label>
          <input v-model="email" type="email" required autocomplete="username" :class="inputCls" />
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
            :class="inputCls"
          />
        </div>

        <p v-if="error" class="text-sm text-brand">{{ t('admin.login.error') }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm transition-opacity"
          :class="loading ? 'opacity-60' : 'hover:opacity-90'"
        >
          {{ t('admin.login.signIn') }}
        </button>
      </form>

      <!-- ---- Choose a password (temporary password holders) ---- -->
      <form
        v-else
        class="bg-white rounded-2xl shadow-xl shadow-brand/5 p-8 space-y-4"
        @submit.prevent="submitPassword"
      >
        <p class="text-xs text-gray-500 bg-cream rounded-xl px-4 py-3 leading-relaxed">
          {{ t('admin.password.hint') }}
        </p>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
            t('admin.password.newPassword')
          }}</label>
          <input
            v-model="newPassword"
            type="password"
            required
            autocomplete="new-password"
            :class="inputCls"
            @blur="touched = true"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">{{
            t('admin.password.confirmPassword')
          }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            :class="inputCls"
            @blur="touched = true"
          />
        </div>

        <p v-if="pwError" class="text-sm text-brand">{{ t(pwError) }}</p>
        <p v-else-if="apiError" class="text-sm text-brand">{{ apiError }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm transition-opacity"
          :class="loading ? 'opacity-60' : 'hover:opacity-90'"
        >
          {{ loading ? t('admin.password.saving') : t('admin.password.submit') }}
        </button>
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
