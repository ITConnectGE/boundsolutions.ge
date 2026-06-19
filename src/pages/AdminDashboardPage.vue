<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useAdminAuth } from '@/composables/useAdminAuth'
import {
  getApplications,
  setApplicationStatus,
  deleteApplication,
} from '@/composables/applications.js'
import BaseIcon from '@/components/BaseIcon.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'

const { t, locale } = useI18n()
const router = useRouter()
const { isAuthed, currentUser, logout } = useAdminAuth()

useHead({
  title: () => t('admin.dash.title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const apps = ref([])
const ready = ref(false)
const search = ref('')
const statusFilter = ref('all') // all | new | reviewed
const typeFilter = ref('all') // all | cv | contact
const user = ref('')

function reload() {
  apps.value = getApplications()
}

onMounted(() => {
  if (!isAuthed()) {
    router.replace('/admin/login')
    return
  }
  user.value = currentUser() || ''
  reload()
  ready.value = true
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return apps.value.filter((a) => {
    if (statusFilter.value !== 'all' && a.status !== statusFilter.value) return false
    if (typeFilter.value !== 'all' && a.type !== typeFilter.value) return false
    if (q) {
      const hay = `${a.name} ${a.email} ${a.position} ${a.sector} ${a.phone}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: apps.value.length,
  new: apps.value.filter((a) => a.status === 'new').length,
  cv: apps.value.filter((a) => a.type === 'cv').length,
  contact: apps.value.filter((a) => a.type === 'contact').length,
}))

function fmt(iso) {
  try {
    return new Intl.DateTimeFormat(locale.value === 'ka' ? 'ka-GE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso?.slice(0, 10) || ''
  }
}

function toggleStatus(a) {
  setApplicationStatus(a.id, a.status === 'new' ? 'reviewed' : 'new')
  reload()
}
function remove(a) {
  deleteApplication(a.id)
  reload()
}
function doLogout() {
  logout()
  router.replace('/admin/login')
}

const statCards = computed(() => [
  { key: 'total', value: stats.value.total, icon: 'clipboard' },
  { key: 'new', value: stats.value.new, icon: 'mail', accent: true },
  { key: 'cv', value: stats.value.cv, icon: 'fileCheck' },
  { key: 'contact', value: stats.value.contact, icon: 'phone' },
])
</script>

<template>
  <div v-if="ready" class="min-h-screen bg-gray-50">
    <!-- Top bar -->
    <header class="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img src="/images/BoundSolutions - Nav.png" alt="Bound Solutions" class="h-8" />
          <span class="hidden sm:block text-sm font-semibold text-gray-700 border-l border-gray-200 pl-3">
            {{ t('admin.dash.title') }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <LangSwitcher />
          <span class="hidden md:block text-xs text-gray-400">{{ user }}</span>
          <button
            class="inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
            @click="doLogout"
          >
            {{ t('admin.dash.logout') }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.dash.title') }}</h1>
          <p class="text-gray-400 text-sm mt-1">{{ t('admin.dash.subtitle') }}</p>
        </div>
      </div>

      <!-- Demo note -->
      <div class="bg-brand/5 text-brand/80 text-xs rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2">
        <BaseIcon name="badge" class="w-4 h-4 flex-shrink-0" /> {{ t('admin.demoNote') }}
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="c in statCards"
          :key="c.key"
          class="bg-white rounded-2xl border border-gray-100 p-5"
        >
          <div class="flex items-center justify-between mb-2">
            <span
              class="w-9 h-9 rounded-xl flex items-center justify-center"
              :class="c.accent ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-500'"
            >
              <BaseIcon :name="c.icon" class="w-4 h-4" />
            </span>
          </div>
          <div class="text-2xl font-extrabold text-gray-900">{{ c.value }}</div>
          <p class="text-xs text-gray-400 mt-0.5">{{ t(`admin.stats.${c.key}`) }}</p>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div class="relative flex-1">
          <BaseIcon name="search" class="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="search"
            type="text"
            :placeholder="t('admin.filters.search')"
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
        <div class="flex gap-2">
          <button
            v-for="s in ['all', 'new', 'reviewed']"
            :key="s"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            :class="statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100 text-gray-500 hover:text-gray-900'"
            @click="statusFilter = s"
          >
            {{ t(`admin.filters.${s}`) }}
          </button>
        </div>
        <div class="flex gap-2">
          <button
            v-for="ty in [['all', 'all'], ['cv', 'typeCv'], ['contact', 'typeContact']]"
            :key="ty[0]"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            :class="typeFilter === ty[0] ? 'bg-brand text-white' : 'bg-white border border-gray-100 text-gray-500 hover:text-gray-900'"
            @click="typeFilter = ty[0]"
          >
            {{ t(`admin.filters.${ty[1]}`) }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div v-if="filtered.length" class="space-y-3">
        <div
          v-for="a in filtered"
          :key="a.id"
          class="bg-white rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-start gap-4 transition-colors"
          :class="a.status === 'new' ? 'border-brand/30' : 'border-gray-100'"
        >
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h3 class="font-bold text-gray-800">{{ a.name }}</h3>
              <span
                class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
                :class="a.type === 'cv' ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-500'"
              >
                {{ t(`admin.type.${a.type}`) }}
              </span>
              <span
                v-if="a.status === 'new'"
                class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-green-50 text-green-600"
              >
                {{ t('admin.status.new') }}
              </span>
            </div>
            <p class="text-sm text-gray-600 font-medium">
              {{ a.position }}<span v-if="a.sector" class="text-gray-400"> · {{ a.sector }}</span>
            </p>
            <p class="text-xs text-gray-400 mt-1">
              <a :href="`mailto:${a.email}`" class="hover:text-brand">{{ a.email }}</a>
              <span v-if="a.phone"> · </span>
              <a v-if="a.phone" :href="`tel:${a.phone}`" class="hover:text-brand">{{ a.phone }}</a>
            </p>
            <p v-if="a.message" class="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
              {{ a.message }}
            </p>
            <p
              v-if="a.cvFile"
              class="text-xs text-brand mt-2 inline-flex items-center gap-1.5 font-medium"
            >
              <BaseIcon name="fileCheck" class="w-4 h-4" /> {{ a.cvFile }}
            </p>
          </div>

          <div class="flex lg:flex-col items-center lg:items-end gap-2 flex-shrink-0">
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ fmt(a.date) }}</span>
            <div class="flex gap-2">
              <button
                class="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
                :class="a.status === 'new'
                  ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  : 'border-brand/30 text-brand hover:bg-brand/5'"
                @click="toggleStatus(a)"
              >
                {{ a.status === 'new' ? t('admin.actions.markReviewed') : t('admin.actions.markNew') }}
              </button>
              <button
                class="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors"
                :aria-label="t('admin.actions.delete')"
                @click="remove(a)"
              >
                <BaseIcon name="close" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">
        {{ t('admin.empty') }}
      </div>
    </main>
  </div>
</template>
