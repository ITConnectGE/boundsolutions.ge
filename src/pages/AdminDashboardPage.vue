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
import { hasApi } from '@/composables/api.js'
import {
  loadAllContent,
  saveTexts,
  uploadContentImage,
  imageOverrides,
  getNested,
} from '@/composables/content.js'
import { editableContent } from '@/data/editableContent.js'
import kaMessages from '@/i18n/ka.js'
import enMessages from '@/i18n/en.js'
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
const view = ref('inbox') // inbox | jobs | content
const connError = ref(false)

// Friendly handling for failed API calls (e.g. backend not running).
function adminError(e) {
  if (e?.status === 401) {
    doLogout()
    return
  }
  const msg = ((e && e.message) || '').toLowerCase()
  if (e?.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('network')) {
    alert(t('admin.err.network'))
  } else {
    alert((e && e.message) || 'Error')
  }
}

async function reload() {
  try {
    apps.value = await getApplications()
    connError.value = false
  } catch (e) {
    apps.value = []
    if (hasApi()) connError.value = true
  }
}

// ---- Vacancy management ----
const jobs = ref([])
const jobCategories = ['horeca', 'finance', 'events', 'hr', 'sales']
const jobModalOpen = ref(false)
const editingJob = ref(null)

async function reloadJobs() {
  try {
    jobs.value = await getJobs()
    connError.value = false
  } catch (e) {
    jobs.value = []
    if (hasApi()) connError.value = true
  }
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
    imageFile: null,
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
        imageFile: null,
      }
    : blankJob()
  jobModalOpen.value = true
}

function onJobImage(e) {
  const f = e.target.files?.[0]
  if (!f) return
  editingJob.value.imageFile = f // sent to the API
  const reader = new FileReader()
  reader.onload = () => {
    editingJob.value.image = reader.result // preview / localStorage fallback
  }
  reader.readAsDataURL(f)
}

async function saveJobForm() {
  const j = editingJob.value
  try {
    await saveJob(
      {
        id: j.id || undefined,
        category: j.category,
        title: { ka: j.titleKa, en: j.titleEn || j.titleKa },
        sector: { ka: j.sectorKa, en: j.sectorEn || j.sectorKa },
        salary: j.salary,
        image: j.image || '',
      },
      j.imageFile || null,
    )
    jobModalOpen.value = false
    reloadJobs()
  } catch (e) {
    adminError(e)
  }
}

async function removeJob(id) {
  try {
    await deleteJob(id)
    reloadJobs()
  } catch (e) {
    adminError(e)
  }
}

// ---- Content editor (CMS) ----
const apiOn = hasApi()
const contentGroups = editableContent
const draft = ref({}) // `${key}|${locale}` -> text value
const contentLoading = ref(false)
const contentSaving = ref(false)
const contentSaved = ref(false)
const uploadingKey = ref('')
const defaultMsgs = { ka: kaMessages, en: enMessages }
const contentSearch = ref('')

// Filter content groups/items by key or by the current ka/en value.
const visibleContentGroups = computed(() => {
  const q = contentSearch.value.trim().toLowerCase()
  if (!q) return contentGroups
  return contentGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (it.key.toLowerCase().includes(q) || (it.label || '').toLowerCase().includes(q)) return true
        if (it.type === 'text') {
          const ka = String(draft.value[`${it.key}|ka`] || '').toLowerCase()
          const en = String(draft.value[`${it.key}|en`] || '').toLowerCase()
          return ka.includes(q) || en.includes(q)
        }
        return false
      }),
    }))
    .filter((g) => g.items.length)
})

function imgFor(item) {
  return imageOverrides[item.key] || item.default || ''
}

async function loadContentEditor() {
  if (!apiOn) return
  contentLoading.value = true
  const saved = {}
  try {
    const rows = await loadAllContent()
    for (const r of rows) {
      if (r.type !== 'image') saved[`${r.key}|${r.locale}`] = r.value
    }
  } catch {
    // ignore — fall back to defaults
  }
  const d = {}
  for (const g of contentGroups) {
    for (const it of g.items) {
      if (it.type === 'image') continue
      for (const loc of ['ka', 'en']) {
        const k = `${it.key}|${loc}`
        d[k] = saved[k] ?? getNested(defaultMsgs[loc], it.key) ?? ''
      }
    }
  }
  draft.value = d
  contentLoading.value = false
}

async function saveContent() {
  contentSaving.value = true
  contentSaved.value = false
  const items = []
  for (const g of contentGroups) {
    for (const it of g.items) {
      if (it.type === 'image') continue
      for (const loc of ['ka', 'en']) {
        items.push({
          key: it.key,
          locale: loc,
          value: draft.value[`${it.key}|${loc}`] ?? '',
          type: 'text',
          group: g.group,
        })
      }
    }
  }
  try {
    await saveTexts(items)
    contentSaved.value = true
    setTimeout(() => (contentSaved.value = false), 2500)
  } catch (e) {
    alert('Save failed: ' + (e.message || ''))
  }
  contentSaving.value = false
}

async function onContentImage(item, e) {
  const f = e.target.files?.[0]
  if (!f) return
  uploadingKey.value = item.key
  try {
    const res = await uploadContentImage(item.key, f, 'images')
    imageOverrides[item.key] = res.url // updates preview + live site reactively
  } catch (err) {
    alert('Upload failed: ' + (err.message || ''))
  }
  uploadingKey.value = ''
}

onMounted(() => {
  if (!isAuthed()) {
    router.replace('/admin/login')
    return
  }
  user.value = currentUser() || ''
  reload()
  reloadJobs()
  loadContentEditor()
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

async function toggleStatus(a) {
  try {
    await setApplicationStatus(a.id, a.status === 'new' ? 'reviewed' : 'new')
    reload()
  } catch (e) {
    adminError(e)
  }
}
async function remove(a) {
  try {
    await deleteApplication(a.id)
    reload()
  } catch (e) {
    adminError(e)
  }
}
async function doLogout() {
  await logout()
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
            class="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors"
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
          v-for="v in ['inbox', 'jobs', 'content']"
          :key="v"
          class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          :class="view === v ? 'bg-navy text-white' : 'text-gray-500 hover:text-gray-900'"
          @click="view = v"
        >
          {{ t(`admin.tabs.${v}`) }}
        </button>
      </div>

      <!-- Connection error (backend unreachable) -->
      <div
        v-if="connError"
        class="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2"
      >
        <BaseIcon name="badge" class="w-4 h-4 flex-shrink-0" /> {{ t('admin.err.network') }}
      </div>

      <!-- ================= INBOX ================= -->
      <template v-if="view === 'inbox'">
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.dash.title') }}</h1>
          <p class="text-gray-400 text-sm mt-1">{{ t('admin.dash.subtitle') }}</p>
        </div>
      </div>

      <!-- Demo note — only when no backend/DB is connected -->
      <div
        v-if="!apiOn"
        class="bg-brand/5 text-brand/80 text-xs rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2"
      >
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
            :class="statusFilter === s ? 'bg-navy text-white' : 'bg-white border border-gray-100 text-gray-500 hover:text-gray-900'"
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
          class="inline-flex items-center justify-center gap-1.5 bg-navy text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition-colors whitespace-nowrap"
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
            <a
              v-if="a.cvFile"
              :href="a.cvUrl || undefined"
              :target="a.cvUrl ? '_blank' : undefined"
              rel="noopener noreferrer"
              class="text-xs text-brand mt-2 inline-flex items-center gap-1.5 font-medium"
              :class="a.cvUrl ? 'hover:underline' : ''"
            >
              <BaseIcon name="fileCheck" class="w-4 h-4" /> {{ a.cvFile }}
            </a>
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
      <template v-else-if="view === 'jobs'">
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

      <!-- ================= CONTENT (CMS) ================= -->
      <template v-else>
        <div class="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.content.title') }}</h1>
            <p class="text-gray-400 text-sm mt-1">{{ t('admin.content.subtitle') }}</p>
          </div>
          <button
            v-if="apiOn"
            :disabled="contentSaving"
            class="inline-flex items-center gap-1.5 gradient-bg text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex-shrink-0"
            :class="{ 'opacity-60': contentSaving }"
            @click="saveContent"
          >
            <BaseIcon name="check" class="w-4 h-4" />
            {{ contentSaved ? t('admin.content.saved') : t('admin.content.save') }}
          </button>
        </div>

        <!-- No backend configured -->
        <div v-if="!apiOn" class="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3 mb-6">
          {{ t('admin.content.needApi') }}
        </div>

        <div v-else class="space-y-4">
          <!-- Search -->
          <div class="relative">
            <BaseIcon name="search" class="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="contentSearch"
              type="text"
              :placeholder="t('admin.content.search')"
              class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <p v-if="contentSearch && !visibleContentGroups.length" class="text-center text-gray-400 text-sm py-8">
            {{ t('admin.empty') }}
          </p>

          <details
            v-for="g in visibleContentGroups"
            :key="g.label"
            :open="!!contentSearch"
            class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4"
          >
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none flex items-center gap-2">
              {{ g.label }}
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ g.items.length }})</span>
            </summary>
            <div class="space-y-5 mt-5">
              <div v-for="it in g.items" :key="it.key">
                <!-- Text field: ka + en -->
                <template v-if="it.type === 'text'">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.label }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <div>
                      <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ქარ</span>
                      <textarea
                        v-model="draft[`${it.key}|ka`]"
                        rows="2"
                        class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"
                      ></textarea>
                    </div>
                    <div>
                      <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">EN</span>
                      <textarea
                        v-model="draft[`${it.key}|en`]"
                        rows="2"
                        class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"
                      ></textarea>
                    </div>
                  </div>
                </template>

                <!-- Image field -->
                <template v-else>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.label }}</label>
                  <div class="flex items-center gap-4">
                    <div class="w-24 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img v-if="imgFor(it)" :src="imgFor(it)" alt="" class="w-full h-full object-cover" />
                      <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                    </div>
                    <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
                      <BaseIcon name="upload" class="w-4 h-4" />
                      {{ uploadingKey === it.key ? '…' : t('admin.content.changeImage') }}
                      <input type="file" accept="image/*" class="hidden" @change="onContentImage(it, $event)" />
                    </label>
                  </div>
                </template>
              </div>
            </div>
          </details>

          <div class="flex justify-end">
            <button
              :disabled="contentSaving"
              class="inline-flex items-center gap-1.5 gradient-bg text-white text-sm font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              :class="{ 'opacity-60': contentSaving }"
              @click="saveContent"
            >
              <BaseIcon name="check" class="w-4 h-4" />
              {{ contentSaved ? t('admin.content.saved') : t('admin.content.save') }}
            </button>
          </div>
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
