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
import { downloadApplicationsCsv } from '@/composables/exportCsv.js'
import { getJobs, saveJob, deleteJob } from '@/composables/jobs.js'
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
const typeFilter = ref('all') // all | cv | company | contact
const user = ref('')
const view = ref('inbox') // inbox | jobs

function reload() {
  apps.value = getApplications()
}

// ---- Vacancy management ----
const jobs = ref([])
const jobCategories = ['horeca', 'finance', 'events', 'hr', 'sales']
const jobModalOpen = ref(false)
const editingJob = ref(null)

function reloadJobs() {
  jobs.value = getJobs()
}

function blankJob() {
  return {
    id: '',
    category: 'hr',
    titleKa: '',
    titleEn: '',
    sectorKa: '',
    sectorEn: '',
    salary: '',
    image: '',
  }
}

function openJobModal(job) {
  editingJob.value = job
    ? {
        id: job.id,
        category: job.category || 'hr',
        titleKa: job.title?.ka || '',
        titleEn: job.title?.en || '',
        sectorKa: job.sector?.ka || '',
        sectorEn: job.sector?.en || '',
        salary: job.salary || '',
        image: job.image || '',
      }
    : blankJob()
  jobModalOpen.value = true
}

function onJobImage(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    editingJob.value.image = reader.result
  }
  reader.readAsDataURL(f)
}

function saveJobForm() {
  const j = editingJob.value
  saveJob({
    id: j.id || undefined,
    category: j.category,
    title: { ka: j.titleKa, en: j.titleEn || j.titleKa },
    sector: { ka: j.sectorKa, en: j.sectorEn || j.sectorKa },
    salary: j.salary,
    image: j.image || '',
  })
  jobModalOpen.value = false
  reloadJobs()
}

function removeJob(id) {
  deleteJob(id)
  reloadJobs()
}

onMounted(() => {
  if (!isAuthed()) {
    router.replace('/admin/login')
    return
  }
  user.value = currentUser() || ''
  reload()
  reloadJobs()
  ready.value = true
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return apps.value.filter((a) => {
    if (statusFilter.value !== 'all' && a.status !== statusFilter.value) return false
    if (typeFilter.value !== 'all' && a.type !== typeFilter.value) return false
    if (q) {
      const hay =
        `${a.name} ${a.contactName || ''} ${a.email} ${a.position} ${a.sector} ${a.phone}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: apps.value.length,
  new: apps.value.filter((a) => a.status === 'new').length,
  cv: apps.value.filter((a) => a.type === 'cv').length,
  company: apps.value.filter((a) => a.type === 'company').length,
  contact: apps.value.filter((a) => a.type === 'contact').length,
}))

function exportCsv() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadApplicationsCsv(filtered.value, `bound-applications-${stamp}.csv`)
}

const typeBadge = (type) =>
  type === 'cv'
    ? 'bg-brand/10 text-brand'
    : type === 'company'
      ? 'bg-indigo-50 text-indigo-600'
      : 'bg-gray-100 text-gray-500'

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
  { key: 'company', value: stats.value.company, icon: 'briefcase' },
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
      <!-- View tabs -->
      <div class="inline-flex bg-white border border-gray-100 rounded-xl p-1 mb-6">
        <button
          v-for="v in ['inbox', 'jobs']"
          :key="v"
          class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          :class="view === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'"
          @click="view = v"
        >
          {{ t(`admin.tabs.${v}`) }}
        </button>
      </div>

      <!-- ================= INBOX ================= -->
      <template v-if="view === 'inbox'">
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
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
            v-for="ty in [['all', 'all'], ['cv', 'typeCv'], ['company', 'typeCompany'], ['contact', 'typeContact']]"
            :key="ty[0]"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            :class="typeFilter === ty[0] ? 'bg-brand text-white' : 'bg-white border border-gray-100 text-gray-500 hover:text-gray-900'"
            @click="typeFilter = ty[0]"
          >
            {{ t(`admin.filters.${ty[1]}`) }}
          </button>
        </div>
        <button
          class="inline-flex items-center justify-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap"
          @click="exportCsv"
        >
          <BaseIcon name="download" class="w-4 h-4" /> {{ t('admin.export') }}
        </button>
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
                :class="typeBadge(a.type)"
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
            <p v-if="a.position || a.sector" class="text-sm text-gray-600 font-medium">
              {{ a.position }}<span v-if="a.sector" class="text-gray-400"> · {{ a.sector }}</span>
            </p>
            <p v-if="a.contactName" class="text-xs text-gray-400 mt-0.5">{{ a.contactName }}</p>
            <p class="text-xs text-gray-400 mt-1">
              <a :href="`mailto:${a.email}`" class="hover:text-brand">{{ a.email }}</a>
              <span v-if="a.phone"> · </span>
              <a v-if="a.phone" :href="`tel:${a.phone}`" class="hover:text-brand">{{ a.phone }}</a>
            </p>
            <p
              v-if="a.message"
              class="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line"
            >
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
      </template>

      <!-- ================= VACANCIES ================= -->
      <template v-else>
        <div class="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.jobs.title') }}</h1>
            <p class="text-gray-400 text-sm mt-1">{{ t('admin.jobs.subtitle') }}</p>
          </div>
          <button
            class="inline-flex items-center gap-1.5 gradient-bg text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0"
            @click="openJobModal(null)"
          >
            <BaseIcon name="plus" class="w-4 h-4" /> {{ t('admin.jobs.add') }}
          </button>
        </div>

        <div v-if="jobs.length" class="space-y-3">
          <div
            v-for="job in jobs"
            :key="job.id"
            class="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"
          >
            <div
              class="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center"
            >
              <img v-if="job.image" :src="job.image" alt="" class="w-full h-full object-cover" />
              <BaseIcon v-else name="briefcase" class="w-6 h-6 text-gray-300" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-800 truncate">
                {{ job.title?.ka || job.title?.en }}
              </h3>
              <p class="text-xs text-gray-400 mt-0.5 truncate">
                {{ job.sector?.ka || job.sector?.en }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-1.5">
                <span class="px-2 py-0.5 bg-brand/10 text-brand text-[11px] font-semibold rounded-md">
                  {{ t(`vacancies.filters.${job.category}`) }}
                </span>
                <span v-if="job.salary" class="text-[11px] text-gray-500 font-medium">{{ job.salary }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                class="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-brand hover:border-brand/30 flex items-center justify-center transition-colors"
                :aria-label="t('admin.jobs.edit')"
                @click="openJobModal(job)"
              >
                <BaseIcon name="pencil" class="w-4 h-4" />
              </button>
              <button
                class="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors"
                :aria-label="t('admin.actions.delete')"
                @click="removeJob(job.id)"
              >
                <BaseIcon name="close" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">
          {{ t('admin.jobs.empty') }}
        </div>
      </template>
    </main>

    <!-- JOB EDITOR MODAL -->
    <Transition name="page">
      <div v-if="jobModalOpen" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="jobModalOpen = false"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="jobModalOpen = false">
          <div class="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
            <button
              class="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
              :aria-label="t('admin.jobs.cancel')"
              @click="jobModalOpen = false"
            >
              <BaseIcon name="close" class="w-6 h-6" />
            </button>
            <h3 class="text-lg font-extrabold text-gray-900 mb-5">
              {{ editingJob.id ? t('admin.jobs.edit') : t('admin.jobs.add') }}
            </h3>

            <form class="space-y-4" @submit.prevent="saveJobForm">
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.titleKa') }} *</label>
                  <input v-model="editingJob.titleKa" type="text" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.titleEn') }}</label>
                  <input v-model="editingJob.titleEn" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.sectorKa') }}</label>
                  <input v-model="editingJob.sectorKa" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.sectorEn') }}</label>
                  <input v-model="editingJob.sectorEn" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.category') }}</label>
                  <select v-model="editingJob.category" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white">
                    <option v-for="c in jobCategories" :key="c" :value="c">{{ t(`vacancies.filters.${c}`) }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.salary') }}</label>
                  <input v-model="editingJob.salary" type="text" placeholder="2,000–3,000 ₾" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>

              <!-- Image -->
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.image') }}</label>
                <div class="flex items-center gap-4">
                  <div class="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img v-if="editingJob.image" :src="editingJob.image" alt="" class="w-full h-full object-cover" />
                    <BaseIcon v-else name="image" class="w-6 h-6 text-gray-300" />
                  </div>
                  <div class="flex-1">
                    <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
                      <BaseIcon name="upload" class="w-4 h-4" /> {{ t('admin.jobs.form.chooseImage') }}
                      <input type="file" accept="image/*" class="hidden" @change="onJobImage" />
                    </label>
                    <button
                      v-if="editingJob.image"
                      type="button"
                      class="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                      @click="editingJob.image = ''"
                    >
                      {{ t('admin.jobs.form.removeImage') }}
                    </button>
                    <p class="text-[11px] text-gray-300 mt-1.5">{{ t('admin.jobs.form.imageHint') }}</p>
                  </div>
                </div>
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors" @click="jobModalOpen = false">
                  {{ t('admin.jobs.cancel') }}
                </button>
                <button type="submit" class="flex-1 gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                  {{ t('admin.jobs.form.save') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
