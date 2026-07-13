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
  collection,
  saveCollection,
} from '@/composables/content.js'
import { editableContent } from '@/data/editableContent.js'
import { testimonials as defaultTestimonials } from '@/data/social.js'
import { services as defaultServices } from '@/data/services.js'
import { posts as defaultPosts } from '@/data/blog.js'
import { aboutDefault } from '@/data/about.js'
import { partners as defaultPartners } from '@/data/social.js'
import { defaultNav } from '@/data/nav.js'
import { defaultProcess, defaultStats, defaultCompanyForm } from '@/data/lists.js'
import { toast } from '@/composables/toast'
import kaMessages from '@/i18n/ka.js'
import enMessages from '@/i18n/en.js'
import BaseIcon from '@/components/BaseIcon.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'

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
    toast.error(t('admin.err.network'))
  } else {
    toast.error((e && e.message) || 'Error')
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

// These i18n groups are edited inside their dedicated collection blocks
// (page headings live next to the cards/posts), so they are hidden from the
// auto-generated list to avoid a duplicate "Services"/"Blog" section.
const MERGED_GROUPS = new Set(['services', 'blog', 'about', 'nav', 'companyForm'])

// Text fields of a given i18n group (used to render its headings inside a
// collection block and to persist them alongside the collection).
function groupTextItems(groupName) {
  const g = contentGroups.find((x) => x.group === groupName)
  return g ? g.items.filter((it) => it.type === 'text') : []
}
function textItemsPayload(groupName) {
  const items = []
  for (const it of groupTextItems(groupName)) {
    for (const loc of ['ka', 'en']) {
      items.push({
        key: it.key,
        locale: loc,
        value: draft.value[`${it.key}|${loc}`] ?? '',
        type: 'text',
        group: groupName,
      })
    }
  }
  return items
}

// Filter content groups/items by key or by the current ka/en value.
const visibleContentGroups = computed(() => {
  const q = contentSearch.value.trim().toLowerCase()
  const base = contentGroups.filter((g) => !MERGED_GROUPS.has(g.group))
  if (!q) return base
  return base
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

// ---- Collections (structured content: testimonials) ----
const testimonialsDraft = ref([])
const testimonialsSaving = ref(false)
function addTestimonial() {
  testimonialsDraft.value.push({ quote: { ka: '', en: '' }, author: { ka: '', en: '' }, role: { ka: '', en: '' } })
}
function removeTestimonial(i) {
  testimonialsDraft.value.splice(i, 1)
}
async function saveTestimonials() {
  testimonialsSaving.value = true
  try {
    await saveCollection('testimonials', testimonialsDraft.value)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  testimonialsSaving.value = false
}

// ---- Collection: services ----
const servicesDraft = ref([])
const servicesSaving = ref(false)
const svcUploading = ref('')
const iconOptions = ['search', 'clipboard', 'rocket', 'badge', 'layers', 'academic', 'briefcase', 'mail', 'phone', 'globe']
function addService() {
  servicesDraft.value.push({
    slug: 'service-' + Date.now().toString(36),
    icon: 'search',
    image: '',
    title: { ka: '', en: '' },
    summary: { ka: '', en: '' },
    body: { ka: '', en: '' },
    bullets: { ka: [], en: [] },
  })
}
function removeService(i) {
  servicesDraft.value.splice(i, 1)
}
function setBullets(svc, locale, text) {
  if (!svc.bullets) svc.bullets = { ka: [], en: [] }
  svc.bullets[locale] = text.split('\n')
}
async function onServiceImage(svc, e) {
  const f = e.target.files?.[0]
  if (!f) return
  svcUploading.value = svc.slug
  try {
    const res = await uploadContentImage('img.service.' + svc.slug, f, 'services')
    svc.image = res.url
  } catch (err) {
    adminError(err)
  }
  svcUploading.value = ''
}
async function saveServices() {
  servicesSaving.value = true
  try {
    await saveCollection('services', servicesDraft.value)
    const headings = textItemsPayload('services')
    if (headings.length) await saveTexts(headings)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  servicesSaving.value = false
}

// ---- Collection: blog posts ----
const blogDraft = ref([])
const blogSaving = ref(false)
const blogUploading = ref('')
const blogCategories = ['Keynote', 'Team Building', 'Culture', 'HR', 'Events']

// Older posts store body as an array of paragraphs; the WYSIWYG editor needs an
// HTML string, so fold arrays into <p> blocks on load.
function normalizePosts(list) {
  for (const p of list) {
    if (!p.body || typeof p.body !== 'object') p.body = { ka: '', en: '' }
    for (const loc of ['ka', 'en']) {
      const b = p.body[loc]
      if (Array.isArray(b)) p.body[loc] = b.map((x) => `<p>${x}</p>`).join('')
      else if (b == null) p.body[loc] = ''
    }
    if (!Array.isArray(p.tags)) p.tags = []
  }
  return list
}
function addPost() {
  blogDraft.value.push({
    slug: 'post-' + Date.now().toString(36),
    date: new Date().toISOString().slice(0, 10),
    cover: '',
    youtube: '',
    video: '',
    externalLink: '',
    category: { ka: '', en: '' },
    tags: [],
    title: { ka: '', en: '' },
    author: { ka: 'Bound Solutions', en: 'Bound Solutions' },
    excerpt: { ka: '', en: '' },
    body: { ka: '', en: '' },
  })
}
function removePost(i) {
  blogDraft.value.splice(i, 1)
}
function setTags(post, text) {
  post.tags = text.split(',').map((s) => s.trim()).filter(Boolean)
}
async function onPostImage(post, e) {
  const f = e.target.files?.[0]
  if (!f) return
  blogUploading.value = post.slug
  try {
    const res = await uploadContentImage('img.blog.' + post.slug, f, 'blog')
    post.cover = res.url
  } catch (err) {
    adminError(err)
  }
  blogUploading.value = ''
}
async function saveBlog() {
  blogSaving.value = true
  try {
    await saveCollection('blog', blogDraft.value)
    const headings = textItemsPayload('blog')
    if (headings.length) await saveTexts(headings)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  blogSaving.value = false
}

// ---- Collection: About page (company, mission/vision/values, founder, team) ----
const aboutDraft = ref(null)
const aboutSaving = ref(false)
const aboutUploading = ref('')

// Fold legacy paragraph arrays (companyIntro, founder.bio) into HTML for WYSIWYG.
function joinPara(v) {
  return Array.isArray(v) ? v.map((x) => `<p>${x}</p>`).join('') : v || ''
}
function normalizeAbout(a) {
  a.companyIntro = a.companyIntro || { ka: '', en: '' }
  a.companyIntro.ka = joinPara(a.companyIntro.ka)
  a.companyIntro.en = joinPara(a.companyIntro.en)
  a.mission = a.mission || { ka: '', en: '' }
  a.vision = a.vision || { ka: '', en: '' }
  a.values = Array.isArray(a.values) ? a.values : []
  a.founder = a.founder || { name: { ka: '', en: '' }, role: { ka: '', en: '' }, photo: '', linkedin: '', bio: { ka: '', en: '' } }
  a.founder.bio = a.founder.bio || { ka: '', en: '' }
  a.founder.bio.ka = joinPara(a.founder.bio.ka)
  a.founder.bio.en = joinPara(a.founder.bio.en)
  a.team = Array.isArray(a.team) ? a.team : []
  return a
}
function addValue() {
  aboutDraft.value.values.push({ title: { ka: '', en: '' }, text: { ka: '', en: '' } })
}
function removeValue(i) {
  aboutDraft.value.values.splice(i, 1)
}
function addMember() {
  aboutDraft.value.team.push({ name: { ka: '', en: '' }, role: { ka: '', en: '' }, photo: '' })
}
function removeMember(i) {
  aboutDraft.value.team.splice(i, 1)
}
async function onFounderImage(e) {
  const f = e.target.files?.[0]
  if (!f) return
  aboutUploading.value = 'founder'
  try {
    const res = await uploadContentImage('img.about.founder', f, 'about')
    aboutDraft.value.founder.photo = res.url
  } catch (err) {
    adminError(err)
  }
  aboutUploading.value = ''
}
async function onMemberImage(i, e) {
  const f = e.target.files?.[0]
  if (!f) return
  aboutUploading.value = 'member-' + i
  try {
    const res = await uploadContentImage('img.team.' + i, f, 'team')
    aboutDraft.value.team[i].photo = res.url
  } catch (err) {
    adminError(err)
  }
  aboutUploading.value = ''
}
async function saveAbout() {
  aboutSaving.value = true
  try {
    await saveCollection('about', aboutDraft.value)
    const headings = textItemsPayload('about')
    if (headings.length) await saveTexts(headings)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  aboutSaving.value = false
}

// ---- Collection: Partners (logo strip) ----
const partnersDraft = ref([])
const partnersSaving = ref(false)
const partnersUploading = ref('')
function addPartner() {
  partnersDraft.value.push({ name: '', logo: '' })
}
function removePartner(i) {
  partnersDraft.value.splice(i, 1)
}
async function onPartnerImage(i, e) {
  const f = e.target.files?.[0]
  if (!f) return
  partnersUploading.value = 'partner-' + i
  try {
    const res = await uploadContentImage('img.partner.' + i, f, 'partners')
    partnersDraft.value[i].logo = res.url
  } catch (err) {
    adminError(err)
  }
  partnersUploading.value = ''
}
async function savePartners() {
  partnersSaving.value = true
  try {
    await saveCollection('partners', partnersDraft.value)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  partnersSaving.value = false
}

async function loadContentEditor() {
  if (!apiOn) return
  contentLoading.value = true
  const saved = {}
  testimonialsDraft.value = JSON.parse(JSON.stringify(collection('testimonials', defaultTestimonials)))
  servicesDraft.value = JSON.parse(JSON.stringify(collection('services', defaultServices)))
  blogDraft.value = normalizePosts(JSON.parse(JSON.stringify(collection('blog', defaultPosts))))
  aboutDraft.value = normalizeAbout(JSON.parse(JSON.stringify(collection('about', aboutDefault))))
  partnersDraft.value = JSON.parse(JSON.stringify(collection('partners', defaultPartners)))
  navDraft.value = JSON.parse(JSON.stringify(collection('nav', defaultNav)))
  processDraft.value = JSON.parse(JSON.stringify(collection('process', defaultProcess)))
  statsDraft.value = JSON.parse(JSON.stringify(collection('stats', defaultStats)))
  companyFormDraft.value = normalizeCompanyForm(JSON.parse(JSON.stringify(collection('companyForm', defaultCompanyForm))))
  try {
    const rows = await loadAllContent()
    for (const r of rows) {
      if (r.type === 'json' && r.key === 'col.testimonials') {
        try {
          testimonialsDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.services') {
        try {
          servicesDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.blog') {
        try {
          blogDraft.value = normalizePosts(JSON.parse(r.value))
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.about') {
        try {
          aboutDraft.value = normalizeAbout(JSON.parse(r.value))
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.partners') {
        try {
          partnersDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.nav') {
        try {
          navDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.process') {
        try {
          processDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.stats') {
        try {
          statsDraft.value = JSON.parse(r.value)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.companyForm') {
        try {
          companyFormDraft.value = normalizeCompanyForm(JSON.parse(r.value))
        } catch {
          /* keep default */
        }
        continue
      }
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
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2500)
  } catch (e) {
    adminError(e)
  }
  contentSaving.value = false
}

// Save just one auto-generated group's text fields (its own save button).
const groupSaving = ref({})
async function saveGroup(groupName) {
  groupSaving.value = { ...groupSaving.value, [groupName]: true }
  try {
    const items = textItemsPayload(groupName)
    if (items.length) await saveTexts(items)
    toast.success(t('admin.content.saved'))
  } catch (e) {
    adminError(e)
  }
  groupSaving.value = { ...groupSaving.value, [groupName]: false }
}

// ---- Collection: primary navigation (add / remove / re-title pages) ----
const navDraft = ref([])
const navSaving = ref(false)
function addNavItem() {
  navDraft.value.push({ to: '/', label: { ka: '', en: '' } })
}
function removeNavItem(i) {
  navDraft.value.splice(i, 1)
}
async function saveNav() {
  navSaving.value = true
  try {
    // Drop empty rows and coerce badge to a number (or remove it).
    const clean = navDraft.value
      .filter((l) => (l.to || '').trim())
      .map((l) => {
        const item = { to: l.to.trim(), label: { ka: l.label.ka, en: l.label.en } }
        const b = parseInt(l.badge, 10)
        if (!Number.isNaN(b) && b > 0) item.badge = b
        return item
      })
    await saveCollection('nav', clean)
    const labels = textItemsPayload('nav')
    if (labels.length) await saveTexts(labels)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  navSaving.value = false
}

// ---- Collection: process steps (how we work) ----
const processDraft = ref([])
const processSaving = ref(false)
function addStep() {
  processDraft.value.push({ title: { ka: '', en: '' }, text: { ka: '', en: '' } })
}
function removeStep(i) {
  processDraft.value.splice(i, 1)
}
async function saveProcess() {
  processSaving.value = true
  try {
    await saveCollection('process', processDraft.value)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  processSaving.value = false
}

// ---- Collection: hero stats ----
const statsDraft = ref([])
const statsSaving = ref(false)
function addStat() {
  statsDraft.value.push({ v: { ka: '', en: '' }, l: { ka: '', en: '' } })
}
function removeStat(i) {
  statsDraft.value.splice(i, 1)
}
async function saveStats() {
  statsSaving.value = true
  try {
    await saveCollection('stats', statsDraft.value)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  statsSaving.value = false
}

// ---- Collection: company-request form (intro + dropdown options) ----
const companyFormDraft = ref(null)
const companyFormSaving = ref(false)
const companyOptionLists = [
  { key: 'schedule', label: 'სამუშაო გრაფიკი / Schedule' },
  { key: 'contractType', label: 'ხელშეკრულების ტიპი / Contract type' },
  { key: 'contractPeriod', label: 'ხელშეკრულების პერიოდი / Contract period' },
]
function normalizeCompanyForm(cf) {
  cf.intro = cf.intro || { ka: '', en: '' }
  for (const key of ['schedule', 'contractType', 'contractPeriod']) {
    cf[key] = Array.isArray(cf[key]) ? cf[key] : []
  }
  return cf
}
function addOption(list) {
  companyFormDraft.value[list].push({ ka: '', en: '' })
}
function removeOption(list, i) {
  companyFormDraft.value[list].splice(i, 1)
}
async function saveCompanyForm() {
  companyFormSaving.value = true
  try {
    await saveCollection('companyForm', companyFormDraft.value)
    const labels = textItemsPayload('companyForm')
    if (labels.length) await saveTexts(labels)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  companyFormSaving.value = false
}

async function onContentImage(item, e) {
  const f = e.target.files?.[0]
  if (!f) return
  uploadingKey.value = item.key
  try {
    const res = await uploadContentImage(item.key, f, 'images')
    imageOverrides[item.key] = res.url // updates preview + live site reactively
  } catch (err) {
    adminError(err)
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
            <span v-if="contentSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            <BaseIcon v-else name="check" class="w-4 h-4" />
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

          <!-- Collection: Navigation (add / remove / re-title pages) -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              ნავიგაცია / Navigation
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ navDraft.length }})</span>
            </summary>
            <div class="space-y-3 mt-5">
              <div v-for="(l, i) in navDraft" :key="i" class="border border-gray-100 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removeNavItem(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="l.label.ka" placeholder="სათაური (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="l.label.en" placeholder="Title (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="l.to" placeholder="ბმული / Link (მაგ: /about)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="l.badge" type="number" min="0" placeholder="ბეჯი / Badge (არასავალდებულო)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <!-- Footer & CTA link labels (nav.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">ფუტერის / ღილაკის წარწერები · Footer &amp; button labels</p>
                <div v-for="it in groupTextItems('nav')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="1" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="1" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addNavItem">
                  <BaseIcon name="plus" class="w-4 h-4" /> გვერდის დამატება
                </button>
                <button
                  type="button"
                  :disabled="navSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': navSaving }"
                  @click="saveNav"
                >
                  <span v-if="navSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Testimonials -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              შეფასებები / Testimonials
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ testimonialsDraft.length }})</span>
            </summary>
            <div class="space-y-4 mt-5">
              <div v-for="(tm, i) in testimonialsDraft" :key="i" class="border border-gray-100 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removeTestimonial(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ციტატა / Quote</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="tm.quote.ka" rows="3" placeholder="ქარ" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                    <textarea v-model="tm.quote.en" rows="3" placeholder="EN" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  </div>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="tm.author.ka" placeholder="ავტორი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="tm.author.en" placeholder="Author (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="tm.role.ka" placeholder="როლი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="tm.role.en" placeholder="Role (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addTestimonial">
                  <BaseIcon name="plus" class="w-4 h-4" /> დამატება
                </button>
                <button
                  type="button"
                  :disabled="testimonialsSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': testimonialsSaving }"
                  @click="saveTestimonials"
                >
                  <span v-if="testimonialsSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Services (page headings + cards, merged) -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              სერვისები / Services
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ servicesDraft.length }})</span>
            </summary>
            <div class="space-y-5 mt-5">
              <!-- Page headings (services.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">გვერდის სათაურები / Page headings</p>
                <div v-for="it in groupTextItems('services')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="2" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="2" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <div v-for="(svc, i) in servicesDraft" :key="i" class="border border-gray-100 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removeService(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div class="flex items-center gap-4">
                  <div class="w-24 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img v-if="svc.image" :src="svc.image" alt="" class="w-full h-full object-cover" />
                    <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                  </div>
                  <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                    <BaseIcon name="upload" class="w-4 h-4" />
                    {{ svcUploading === svc.slug ? '…' : t('admin.content.changeImage') }}
                    <input type="file" accept="image/*" class="hidden" @change="onServiceImage(svc, $event)" />
                  </label>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="svc.slug" placeholder="slug (URL)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <select v-model="svc.icon" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white">
                    <option v-for="ic in iconOptions" :key="ic" :value="ic">{{ ic }}</option>
                  </select>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="svc.title.ka" placeholder="სათაური (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="svc.title.en" placeholder="Title (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <textarea v-model="svc.summary.ka" rows="2" placeholder="მოკლე აღწერა (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  <textarea v-model="svc.summary.en" rows="2" placeholder="Summary (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">სრული ტექსტი (ქარ)</span>
                    <RichTextEditor v-model="svc.body.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Full text (EN)</span>
                    <RichTextEditor v-model="svc.body.en" />
                  </div>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <textarea :value="(svc.bullets && svc.bullets.ka ? svc.bullets.ka : []).join('\n')" rows="3" placeholder="ბულეთები — თითო ხაზზე (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" @input="setBullets(svc, 'ka', $event.target.value)"></textarea>
                  <textarea :value="(svc.bullets && svc.bullets.en ? svc.bullets.en : []).join('\n')" rows="3" placeholder="Bullets — one per line (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" @input="setBullets(svc, 'en', $event.target.value)"></textarea>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addService">
                  <BaseIcon name="plus" class="w-4 h-4" /> სერვისის დამატება
                </button>
                <button
                  type="button"
                  :disabled="servicesSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': servicesSaving }"
                  @click="saveServices"
                >
                  <span v-if="servicesSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Blog (page headings + posts) -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              ბლოგი / Blog
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ blogDraft.length }})</span>
            </summary>
            <div class="space-y-5 mt-5">
              <!-- Page headings (blog.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">გვერდის სათაურები / Page headings</p>
                <div v-for="it in groupTextItems('blog')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="2" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="2" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <!-- Posts -->
              <div v-for="(post, i) in blogDraft" :key="i" class="border border-gray-100 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removePost(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div class="flex items-center gap-4">
                  <div class="w-24 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img v-if="post.cover" :src="post.cover" alt="" class="w-full h-full object-cover" />
                    <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                  </div>
                  <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                    <BaseIcon name="upload" class="w-4 h-4" />
                    {{ blogUploading === post.slug ? '…' : t('admin.content.changeImage') }}
                    <input type="file" accept="image/*" class="hidden" @change="onPostImage(post, $event)" />
                  </label>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="post.slug" placeholder="slug (URL)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.date" type="date" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="post.title.ka" placeholder="სათაური (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.title.en" placeholder="Title (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="post.category.ka" placeholder="კატეგორია (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.category.en" placeholder="Category (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="post.author.ka" placeholder="ავტორი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.author.en" placeholder="Author (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <textarea v-model="post.excerpt.ka" rows="2" placeholder="მოკლე აღწერა (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  <textarea v-model="post.excerpt.en" rows="2" placeholder="Excerpt (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">სრული ტექსტი (ქარ)</span>
                    <RichTextEditor v-model="post.body.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Full text (EN)</span>
                    <RichTextEditor v-model="post.body.en" />
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">თეგები — მძიმით / Tags — comma-separated</label>
                  <input :value="(post.tags || []).join(', ')" placeholder="Adjara Group, Keynote" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" @input="setTags(post, $event.target.value)" />
                </div>
                <div class="grid sm:grid-cols-3 gap-3">
                  <input v-model="post.youtube" placeholder="YouTube ID" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.video" placeholder="ვიდეო URL / Video URL" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="post.externalLink" placeholder="გარე ბმული / External link" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addPost">
                  <BaseIcon name="plus" class="w-4 h-4" /> სტატიის დამატება
                </button>
                <button
                  type="button"
                  :disabled="blogSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': blogSaving }"
                  @click="saveBlog"
                >
                  <span v-if="blogSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: About page -->
          <details v-if="!contentSearch && aboutDraft" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              ჩვენ შესახებ / About
            </summary>
            <div class="space-y-5 mt-5">
              <!-- Page headings (about.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">გვერდის სათაურები / Page headings</p>
                <div v-for="it in groupTextItems('about')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="2" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="2" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <!-- Company intro (WYSIWYG) -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">კომპანიის აღწერა / Company intro</p>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ქარ</span>
                    <RichTextEditor v-model="aboutDraft.companyIntro.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">EN</span>
                    <RichTextEditor v-model="aboutDraft.companyIntro.en" />
                  </div>
                </div>
              </div>

              <!-- Mission / Vision -->
              <div class="grid sm:grid-cols-2 gap-3">
                <div class="border border-gray-100 rounded-xl p-4 space-y-2">
                  <p class="text-xs font-semibold text-gray-600">მისია / Mission</p>
                  <textarea v-model="aboutDraft.mission.ka" rows="3" placeholder="ქარ" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  <textarea v-model="aboutDraft.mission.en" rows="3" placeholder="EN" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                </div>
                <div class="border border-gray-100 rounded-xl p-4 space-y-2">
                  <p class="text-xs font-semibold text-gray-600">ხედვა / Vision</p>
                  <textarea v-model="aboutDraft.vision.ka" rows="3" placeholder="ქარ" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  <textarea v-model="aboutDraft.vision.en" rows="3" placeholder="EN" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                </div>
              </div>

              <!-- Values -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">ღირებულებები / Values</p>
                <div v-for="(v, i) in aboutDraft.values" :key="i" class="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                    <button type="button" class="text-gray-400 hover:text-red-500" @click="removeValue(i)">
                      <BaseIcon name="close" class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <input v-model="v.title.ka" placeholder="სათაური (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                    <input v-model="v.title.en" placeholder="Title (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  </div>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="v.text.ka" rows="2" placeholder="ტექსტი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                    <textarea v-model="v.text.en" rows="2" placeholder="Text (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  </div>
                </div>
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addValue">
                  <BaseIcon name="plus" class="w-4 h-4" /> ღირებულების დამატება
                </button>
              </div>

              <!-- Founder -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">დამფუძნებელი / Founder</p>
                <div class="flex items-center gap-4">
                  <div class="w-16 h-20 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img v-if="aboutDraft.founder.photo" :src="aboutDraft.founder.photo" alt="" class="w-full h-full object-cover object-top" />
                    <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                  </div>
                  <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                    <BaseIcon name="upload" class="w-4 h-4" />
                    {{ aboutUploading === 'founder' ? '…' : t('admin.content.changeImage') }}
                    <input type="file" accept="image/*" class="hidden" @change="onFounderImage" />
                  </label>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="aboutDraft.founder.name.ka" placeholder="სახელი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="aboutDraft.founder.name.en" placeholder="Name (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="aboutDraft.founder.role.ka" placeholder="პოზიცია (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="aboutDraft.founder.role.en" placeholder="Role (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <input v-model="aboutDraft.founder.linkedin" placeholder="LinkedIn URL" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ბიოგრაფია (ქარ)</span>
                    <RichTextEditor v-model="aboutDraft.founder.bio.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Bio (EN)</span>
                    <RichTextEditor v-model="aboutDraft.founder.bio.en" />
                  </div>
                </div>
              </div>

              <!-- Team -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">გუნდი / Team</p>
                <div v-for="(m, i) in aboutDraft.team" :key="i" class="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                    <button type="button" class="text-gray-400 hover:text-red-500" @click="removeMember(i)">
                      <BaseIcon name="close" class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img v-if="m.photo" :src="m.photo" alt="" class="w-full h-full object-cover object-top" />
                      <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                    </div>
                    <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                      <BaseIcon name="upload" class="w-4 h-4" />
                      {{ aboutUploading === 'member-' + i ? '…' : t('admin.content.changeImage') }}
                      <input type="file" accept="image/*" class="hidden" @change="onMemberImage(i, $event)" />
                    </label>
                  </div>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <input v-model="m.name.ka" placeholder="სახელი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                    <input v-model="m.name.en" placeholder="Name (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                    <input v-model="m.role.ka" placeholder="პოზიცია (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                    <input v-model="m.role.en" placeholder="Role (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  </div>
                </div>
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addMember">
                  <BaseIcon name="plus" class="w-4 h-4" /> წევრის დამატება
                </button>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  :disabled="aboutSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': aboutSaving }"
                  @click="saveAbout"
                >
                  <span v-if="aboutSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Partners -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              პარტნიორები / Partners
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ partnersDraft.length }})</span>
            </summary>
            <div class="space-y-3 mt-5">
              <div v-for="(p, i) in partnersDraft" :key="i" class="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                <div class="w-20 h-12 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img v-if="p.logo" :src="p.logo" alt="" class="w-full h-full object-contain p-1" />
                  <BaseIcon v-else name="image" class="w-5 h-5 text-gray-300" />
                </div>
                <input v-model="p.name" placeholder="სახელი / Name" class="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer flex-shrink-0">
                  <BaseIcon name="upload" class="w-4 h-4" />
                  {{ partnersUploading === 'partner-' + i ? '…' : t('admin.content.changeImage') }}
                  <input type="file" accept="image/*" class="hidden" @change="onPartnerImage(i, $event)" />
                </label>
                <button type="button" class="text-gray-400 hover:text-red-500 flex-shrink-0" @click="removePartner(i)">
                  <BaseIcon name="close" class="w-4 h-4" />
                </button>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addPartner">
                  <BaseIcon name="plus" class="w-4 h-4" /> პარტნიორის დამატება
                </button>
                <button
                  type="button"
                  :disabled="partnersSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': partnersSaving }"
                  @click="savePartners"
                >
                  <span v-if="partnersSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Process steps (how we work) -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              პროცესი / Process
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ processDraft.length }})</span>
            </summary>
            <div class="space-y-3 mt-5">
              <div v-for="(s, i) in processDraft" :key="i" class="border border-gray-100 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removeStep(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="s.title.ka" placeholder="სათაური (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="s.title.en" placeholder="Title (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <textarea v-model="s.text.ka" rows="2" placeholder="ტექსტი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                  <textarea v-model="s.text.en" rows="2" placeholder="Text (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addStep">
                  <BaseIcon name="plus" class="w-4 h-4" /> ნაბიჯის დამატება
                </button>
                <button
                  type="button"
                  :disabled="processSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': processSaving }"
                  @click="saveProcess"
                >
                  <span v-if="processSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Hero stats -->
          <details v-if="!contentSearch" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              სტატისტიკა / Stats
              <span class="text-gray-300 font-sans font-normal normal-case tracking-normal">({{ statsDraft.length }})</span>
            </summary>
            <div class="space-y-3 mt-5">
              <div v-for="(s, i) in statsDraft" :key="i" class="border border-gray-100 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500">#{{ i + 1 }}</span>
                  <button type="button" class="text-gray-400 hover:text-red-500" @click="removeStat(i)">
                    <BaseIcon name="close" class="w-4 h-4" />
                  </button>
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="s.v.ka" placeholder="მაჩვენებელი, მაგ: 500+ (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="s.v.en" placeholder="Value, e.g. 500+ (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="s.l.ka" placeholder="აღწერა (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="s.l.en" placeholder="Label (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addStat">
                  <BaseIcon name="plus" class="w-4 h-4" /> მაჩვენებლის დამატება
                </button>
                <button
                  type="button"
                  :disabled="statsSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': statsSaving }"
                  @click="saveStats"
                >
                  <span v-if="statsSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Collection: Employer request form (intro + dropdown options) -->
          <details v-if="!contentSearch && companyFormDraft" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              დამსაქმებლის ფორმა / Employer form
            </summary>
            <div class="space-y-5 mt-5">
              <!-- Intro (WYSIWYG) -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">შესავალი ტექსტი / Intro text</p>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ქარ</span>
                    <RichTextEditor v-model="companyFormDraft.intro.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">EN</span>
                    <RichTextEditor v-model="companyFormDraft.intro.en" />
                  </div>
                </div>
              </div>

              <!-- Field labels (companyForm.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">ველების წარწერები / Field labels</p>
                <div v-for="it in groupTextItems('companyForm')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="1" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="1" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <!-- Dropdown option lists -->
              <div v-for="list in companyOptionLists" :key="list.key" class="border border-gray-100 rounded-xl p-4 space-y-2">
                <p class="text-xs font-semibold text-gray-600">{{ list.label }}</p>
                <div v-for="(o, i) in companyFormDraft[list.key]" :key="i" class="grid sm:grid-cols-2 gap-3 items-center">
                  <input v-model="o.ka" placeholder="ვარიანტი (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <div class="flex items-center gap-2">
                    <input v-model="o.en" placeholder="Option (EN)" class="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                    <button type="button" class="text-gray-400 hover:text-red-500 flex-shrink-0" @click="removeOption(list.key, i)">
                      <BaseIcon name="close" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button type="button" class="inline-flex items-center gap-1 text-brand text-xs font-semibold" @click="addOption(list.key)">
                  <BaseIcon name="plus" class="w-4 h-4" /> ვარიანტის დამატება
                </button>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  :disabled="companyFormSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': companyFormSaving }"
                  @click="saveCompanyForm"
                >
                  <span v-if="companyFormSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

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

              <!-- Per-section save (text groups only; images upload instantly) -->
              <div v-if="g.group !== 'images'" class="flex justify-end pt-2">
                <button
                  type="button"
                  :disabled="groupSaving[g.group]"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': groupSaving[g.group] }"
                  @click="saveGroup(g.group)"
                >
                  <span v-if="groupSaving[g.group]" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>
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
