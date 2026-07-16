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
import {
  getJobs,
  saveJob,
  deleteJob,
  getVacancyCategories,
  saveVacancyCategories,
} from '@/composables/jobs.js'
import { hasApi } from '@/composables/api.js'
import {
  getInbox,
  getEmail,
  replyEmail,
  deleteEmail,
  downloadAttachment,
} from '@/composables/inbox.js'
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
import {
  defaultProcess,
  defaultStats,
  defaultCompanyForm,
  companyFormFields,
  defaultCompanyFormEnabled,
} from '@/data/lists.js'
import { defaultVacancyCategories } from '@/data/jobs.js'
import { privacyDefault, termsDefault } from '@/data/legal.js'
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
const user = ref('')
const view = ref('inbox') // inbox | email | jobs | content
const connError = ref(false)

// ---- Received email (laravel-mailbox) ----
const emails = ref([])
const emailUnread = ref(0)
const emailLoading = ref(false)
const emailLoaded = ref(false)
const emailSearch = ref('')
const selectedEmail = ref(null) // full detail of the open email
const emailOpening = ref(false)
const replyBody = ref('')
const replySending = ref(false)

async function loadInbox() {
  if (!apiOn) return
  emailLoading.value = true
  try {
    const res = await getInbox({ q: emailSearch.value })
    emails.value = res.data || []
    emailUnread.value = res.unread || 0
    emailLoaded.value = true
  } catch (e) {
    adminError(e)
  } finally {
    emailLoading.value = false
  }
}

function selectView(v) {
  view.value = v
  if (v === 'email' && !emailLoaded.value) loadInbox()
}

async function openEmail(row) {
  emailOpening.value = true
  replyBody.value = ''
  try {
    selectedEmail.value = await getEmail(row.id)
    // reflect the now-read state in the list
    const inList = emails.value.find((e) => e.id === row.id)
    if (inList && !inList.read_at) {
      inList.read_at = new Date().toISOString()
      emailUnread.value = Math.max(0, emailUnread.value - 1)
    }
  } catch (e) {
    adminError(e)
  } finally {
    emailOpening.value = false
  }
}

function closeEmail() {
  selectedEmail.value = null
  replyBody.value = ''
}

async function sendReply() {
  if (!selectedEmail.value || !replyBody.value.trim() || replySending.value) return
  replySending.value = true
  try {
    await replyEmail(selectedEmail.value.id, replyBody.value.trim())
    toast.success(t('admin.email.replySent'))
    replyBody.value = ''
  } catch (e) {
    toast.error(e?.data?.message || e.message || t('admin.email.replyFailed'))
  } finally {
    replySending.value = false
  }
}

function removeEmail(row) {
  const target = row || selectedEmail.value
  if (!target) return
  askConfirm(t('admin.email.deleteMsg'), async () => {
    try {
      await deleteEmail(target.id)
      emails.value = emails.value.filter((e) => e.id !== target.id)
      if (selectedEmail.value && selectedEmail.value.id === target.id) closeEmail()
    } catch (e) {
      adminError(e)
    }
  })
}

async function saveAttachment(att) {
  if (!selectedEmail.value) return
  try {
    await downloadAttachment(selectedEmail.value.id, att.index, att.filename)
  } catch (e) {
    toast.error(e.message || 'Download failed')
  }
}

function fmtBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// srcdoc for the sandboxed iframe that renders (untrusted) email HTML safely.
const emailFrameDoc = computed(() => {
  const e = selectedEmail.value
  if (!e) return ''
  const inner = e.html
    ? e.html
    : `<pre style="white-space:pre-wrap;font:14px/1.5 -apple-system,sans-serif;color:#111">${(e.text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</pre>`
  return `<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:12px;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;word-wrap:break-word}img{max-width:100%;height:auto}a{color:#f05553}</style>${inner}`
})

// Per-application expand/collapse for the details block.
const expanded = ref({})
function toggleExpanded(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

// Reusable confirmation dialog: { message, onConfirm }.
const confirmDialog = ref(null)
const confirmBusy = ref(false)
function askConfirm(message, onConfirm) {
  confirmDialog.value = { message, onConfirm }
}
async function runConfirm() {
  const cb = confirmDialog.value?.onConfirm
  if (!cb) {
    confirmDialog.value = null
    return
  }
  confirmBusy.value = true
  try {
    await cb()
  } finally {
    confirmBusy.value = false
    confirmDialog.value = null
  }
}

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

// ---- Vacancy management (inline, free-text categories) ----
// Categories are just typed per vacancy; the public filter bar derives itself
// from the distinct categories in use, so there is no fixed list to maintain.
const jobsDraft = ref([])

function toJobDraft(job) {
  return {
    id: job?.id || '',
    category: job?.category || '',
    titleKa: job?.title?.ka || '',
    titleEn: job?.title?.en || '',
    sectorKa: job?.sector?.ka || '',
    sectorEn: job?.sector?.en || '',
    descriptionKa: job?.description?.ka || '',
    descriptionEn: job?.description?.en || '',
    salary: job?.salary || '',
    image: job?.image || '',
    imageFile: null,
    saving: false,
  }
}

async function reloadJobs() {
  try {
    const list = await getJobs()
    jobsDraft.value = list.map(toJobDraft)
    connError.value = false
  } catch (e) {
    jobsDraft.value = []
    if (hasApi()) connError.value = true
  }
}

function onJobRowImage(row, e) {
  const f = e.target.files?.[0]
  if (!f) return
  row.imageFile = f
  const reader = new FileReader()
  reader.onload = () => {
    row.image = reader.result // instant preview
  }
  reader.readAsDataURL(f)
}

function confirmDeleteJob(row) {
  askConfirm(t('admin.jobs.confirmDelete'), async () => {
    try {
      await deleteJob(row.id)
      await reloadJobs()
      toast.success(t('admin.content.saved'))
    } catch (e) {
      adminError(e)
    }
  })
}

// ---- Managed vacancy categories (stored in vacancy_categories, add/remove here) ----
const categoriesDraft = ref([])
const categoriesSaving = ref(false)
const newCategory = ref('')
async function reloadCategories() {
  try {
    categoriesDraft.value = await getVacancyCategories()
  } catch {
    categoriesDraft.value = [...defaultVacancyCategories]
  }
}
function addCategory() {
  const c = newCategory.value.trim()
  if (!c || categoriesDraft.value.some((x) => x.toLowerCase() === c.toLowerCase())) {
    newCategory.value = ''
    return
  }
  categoriesDraft.value.push(c)
  newCategory.value = ''
}
function removeCategory(i) {
  categoriesDraft.value.splice(i, 1)
}
async function saveCategories() {
  addCategory() // commit any category still typed in the input before saving
  categoriesSaving.value = true
  try {
    categoriesDraft.value = await saveVacancyCategories(categoriesDraft.value)
    toast.success(t('admin.content.saved'))
  } catch (e) {
    adminError(e)
  }
  categoriesSaving.value = false
}

// ---- Vacancy add/edit modal ----
const jobModalOpen = ref(false)
const jobForm = ref(null)
// Show the managed category label for a stored category (legacy "sales" -> "Sales").
const catLabel = (cat) =>
  categoriesDraft.value.find((c) => c.toLowerCase() === (cat || '').toLowerCase()) || cat
function openJobModal(row) {
  jobForm.value = row ? { ...row, imageFile: null, saving: false } : toJobDraft(null)
  jobModalOpen.value = true
}
async function saveJobModal() {
  const row = jobForm.value
  if (!row.titleKa.trim() || !row.category.trim()) {
    toast.error(t('admin.jobs.needTitleCategory'))
    return
  }
  row.saving = true
  try {
    await saveJob(
      {
        id: row.id || undefined,
        category: row.category.trim(),
        title: { ka: row.titleKa, en: row.titleEn || row.titleKa },
        sector: { ka: row.sectorKa, en: row.sectorEn || row.sectorKa },
        description: { ka: row.descriptionKa, en: row.descriptionEn },
        salary: row.salary,
      },
      row.imageFile || null,
    )
    jobModalOpen.value = false
    toast.success(t('admin.content.saved'))
    await reloadJobs()
  } catch (e) {
    adminError(e)
    row.saving = false
  }
}

// ---- Legal pages (Privacy & Terms — WYSIWYG) ----
const privacyDraft = ref(null)
const termsDraft = ref(null)
const legalSaving = ref(false)
function normalizePolicy(p, fallback) {
  if (!p || typeof p !== 'object') return JSON.parse(JSON.stringify(fallback))
  p.updated = p.updated || { ka: '', en: '' }
  p.body = p.body || { ka: '', en: '' }
  return p
}
async function saveLegal() {
  legalSaving.value = true
  try {
    await saveCollection('privacy', privacyDraft.value)
    await saveCollection('terms', termsDraft.value)
    const labels = textItemsPayload('legal')
    if (labels.length) await saveTexts(labels)
    contentSaved.value = true
    toast.success(t('admin.content.saved'))
    setTimeout(() => (contentSaved.value = false), 2000)
  } catch (e) {
    adminError(e)
  }
  legalSaving.value = false
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
const MERGED_GROUPS = new Set(['services', 'blog', 'about', 'nav', 'companyForm', 'legal'])

// Friendly labels for the second-level key segment (a sub-section heading).
const SUBSECTION_LABELS = {
  _: 'ზოგადი / General',
  aboutTeaser: 'ჩვენ შესახებ — მოკლე ბლოკი / About teaser',
  services: 'სერვისები — სათაური / Services heading',
  testimonials: 'შეფასებები — სათაური / Testimonials heading',
  partners: 'პარტნიორები — სათაური / Partners heading',
  process: 'პროცესი — სათაური / Process heading',
  contactCta: 'კონტაქტის ბლოკი / Contact CTA',
  filters: 'ფილტრები / Filters',
  noPosition: 'ვაკანსია ვერ იპოვეთ / No position',
  modal: 'CV ფორმა / CV form',
  consent: 'პერსონალურ მონაცემთა თანხმობა / Consent',
  form: 'ფორმა / Form',
  interestOptions: 'ინტერესის ვარიანტები / Interest options',
  hero: 'სლაიდები / Slides',
}
// Group a list of content items by their second-level key into sub-sections
// (top-level fields collect under '_', shown first without a heading).
function subGroups(items) {
  const map = new Map()
  for (const it of items) {
    const parts = it.key.split('.')
    const sub = parts.length > 2 ? parts[1] : '_'
    if (!map.has(sub)) map.set(sub, [])
    map.get(sub).push(it)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] === '_' ? -1 : b[0] === '_' ? 1 : 0))
    .map(([sub, list]) => ({ sub, label: SUBSECTION_LABELS[sub] || sub, items: list }))
}
// A short field label = the key path after the sub-section segment.
function subFieldLabel(key) {
  const parts = key.split('.')
  return parts.slice(parts.length > 2 ? 2 : 1).join('.')
}

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
  privacyDraft.value = normalizePolicy(JSON.parse(JSON.stringify(collection('privacy', privacyDefault))), privacyDefault)
  termsDraft.value = normalizePolicy(JSON.parse(JSON.stringify(collection('terms', termsDefault))), termsDefault)
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
      if (r.type === 'json' && r.key === 'col.privacy') {
        try {
          privacyDraft.value = normalizePolicy(JSON.parse(r.value), privacyDefault)
        } catch {
          /* keep default */
        }
        continue
      }
      if (r.type === 'json' && r.key === 'col.terms') {
        try {
          termsDraft.value = normalizePolicy(JSON.parse(r.value), termsDefault)
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
  cf.enabled = Array.isArray(cf.enabled) ? cf.enabled : [...defaultCompanyFormEnabled]
  return cf
}
// Toggle a form field on/off (removes it from the public employer form).
function toggleCompanyField(key) {
  const arr = companyFormDraft.value.enabled
  const i = arr.indexOf(key)
  if (i === -1) arr.push(key)
  else arr.splice(i, 1)
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
  reloadCategories()
  loadContentEditor()
  loadInbox() // populate the unread-email badge
  ready.value = true
})

function matchesSearchStatus(a) {
  if (statusFilter.value !== 'all' && a.status !== statusFilter.value) return false
  const q = search.value.trim().toLowerCase()
  if (q) {
    const hay =
      `${a.name} ${a.contactName || ''} ${a.email} ${a.position} ${a.sector} ${a.phone}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}
const filtered = computed(() => apps.value.filter(matchesSearchStatus))

const stats = computed(() => ({
  total: apps.value.length,
  new: apps.value.filter((a) => a.status === 'new').length,
  cv: apps.value.filter((a) => a.type === 'cv').length,
  company: apps.value.filter((a) => a.type === 'company').length,
  contact: apps.value.filter((a) => a.type === 'contact').length,
}))

// ---- Inbox as a folder tree: CVs grouped by the vacancy they applied to,
// general (no-position) CVs, employer requests, and contact messages ----
const folder = ref('') // selected folder id
const generalTitles = [
  kaMessages.vacancies?.modal?.generalTitle,
  enMessages.vacancies?.modal?.generalTitle,
].filter(Boolean)

const folders = computed(() => {
  const cvGroups = new Map()
  const general = []
  const company = []
  const contact = []
  for (const a of apps.value) {
    if (a.type === 'company') { company.push(a); continue }
    if (a.type === 'contact') { contact.push(a); continue }
    const pos = (a.position || '').trim() // CV
    // General = no vacancy link and no (or generic) position title.
    if (!a.vacancyId && (!pos || generalTitles.includes(pos))) { general.push(a); continue }
    // Group by vacancy id when present (robust across locales), else by title.
    const gkey = a.vacancyId ? 'id:' + a.vacancyId : 'pos:' + pos
    if (!cvGroups.has(gkey)) cvGroups.set(gkey, { label: pos || '#' + a.vacancyId, items: [] })
    cvGroups.get(gkey).items.push(a)
  }
  const list = [...cvGroups.entries()]
    .map(([gkey, g]) => ({ id: 'vac:' + gkey, label: g.label, icon: 'briefcase', items: g.items }))
    .sort((a, b) => a.label.localeCompare(b.label))
  if (general.length) list.push({ id: 'general', label: t('admin.folders.general'), icon: 'fileCheck', items: general })
  if (company.length) list.push({ id: 'company', label: t('admin.folders.company'), icon: 'briefcase', items: company })
  if (contact.length) list.push({ id: 'contact', label: t('admin.folders.contact'), icon: 'mail', items: contact })
  return list
})
const currentFolder = computed(() => folders.value.find((f) => f.id === folder.value) || folders.value[0] || null)
const currentItems = computed(() => (currentFolder.value ? currentFolder.value.items.filter(matchesSearchStatus) : []))

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
function remove(a) {
  askConfirm(t('admin.confirmDeleteApp'), async () => {
    try {
      await deleteApplication(a.id)
      reload()
    } catch (e) {
      adminError(e)
    }
  })
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
          v-for="v in ['inbox', 'email', 'jobs', 'content']"
          :key="v"
          class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
          :class="view === v ? 'bg-navy text-white' : 'text-gray-500 hover:text-gray-900'"
          @click="selectView(v)"
        >
          {{ t(`admin.tabs.${v}`) }}
          <span
            v-if="v === 'email' && emailUnread > 0"
            class="min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold inline-flex items-center justify-center"
          >{{ emailUnread }}</span>
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
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
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
        <button
          class="inline-flex items-center justify-center gap-1.5 bg-navy text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition-colors whitespace-nowrap"
          @click="exportCsv"
        >
          <BaseIcon name="download" class="w-4 h-4" /> {{ t('admin.export') }}
        </button>
      </div>

      <!-- Folder tree (by vacancy) + compact table -->
      <div v-if="folders.length" class="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
        <!-- Tree -->
        <div class="bg-white rounded-2xl border border-gray-100 p-2 lg:sticky lg:top-24">
          <button
            v-for="f in folders"
            :key="f.id"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors"
            :class="(currentFolder && currentFolder.id === f.id) ? 'bg-brand/10 text-brand font-semibold' : 'text-gray-600 hover:bg-gray-50'"
            @click="folder = f.id"
          >
            <BaseIcon :name="f.icon" class="w-4 h-4 flex-shrink-0 opacity-70" />
            <span class="truncate flex-1">{{ f.label }}</span>
            <span class="text-xs text-gray-400 flex-shrink-0">{{ f.items.length }}</span>
          </button>
        </div>

        <!-- Table for the selected folder -->
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <BaseIcon :name="currentFolder ? currentFolder.icon : 'clipboard'" class="w-4 h-4 text-gray-400" />
            <h3 class="font-bold text-gray-800 text-sm truncate">{{ currentFolder ? currentFolder.label : '' }}</h3>
            <span class="text-xs text-gray-400">· {{ currentItems.length }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th class="px-5 py-2.5 font-semibold">{{ t('admin.table.applicant') }}</th>
                  <th class="px-3 py-2.5 font-semibold">{{ t('admin.table.contact') }}</th>
                  <th class="px-3 py-2.5 font-semibold whitespace-nowrap">{{ t('admin.table.date') }}</th>
                  <th class="px-3 py-2.5 font-semibold text-right">{{ t('admin.table.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="a in currentItems" :key="a.id">
                  <tr class="border-b border-gray-50 hover:bg-gray-50/60 align-top">
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-2">
                        <span
                          v-if="a.status === 'new'"
                          class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"
                          :title="t('admin.status.new')"
                        ></span>
                        <span class="font-semibold text-gray-800">{{ a.name }}</span>
                      </div>
                      <div v-if="a.contactName" class="text-xs text-gray-400 mt-0.5">{{ a.contactName }}</div>
                      <div class="flex items-center gap-3 mt-1.5">
                        <a
                          v-if="a.cvFile"
                          :href="a.cvUrl || undefined"
                          :target="a.cvUrl ? '_blank' : undefined"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                          :class="a.cvUrl ? '' : 'opacity-60 pointer-events-none'"
                        >
                          <BaseIcon name="fileCheck" class="w-3.5 h-3.5" /> {{ t('admin.downloadCv') }}
                        </a>
                        <button
                          v-if="a.message"
                          type="button"
                          class="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-brand"
                          @click="toggleExpanded(a.id)"
                        >
                          <BaseIcon name="chevronDown" class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': expanded[a.id] }" />
                          {{ expanded[a.id] ? t('admin.hideDetails') : t('admin.showDetails') }}
                        </button>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-xs">
                      <a :href="`mailto:${a.email}`" class="text-gray-600 hover:text-brand block truncate max-w-[180px]">{{ a.email }}</a>
                      <a v-if="a.phone" :href="`tel:${a.phone}`" class="text-gray-400 hover:text-brand">{{ a.phone }}</a>
                    </td>
                    <td class="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{{ fmt(a.date) }}</td>
                    <td class="px-3 py-3">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap"
                          :class="a.status === 'new' ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-brand/30 text-brand hover:bg-brand/5'"
                          @click="toggleStatus(a)"
                        >
                          {{ a.status === 'new' ? t('admin.actions.markReviewed') : t('admin.actions.markNew') }}
                        </button>
                        <button
                          class="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors flex-shrink-0"
                          :aria-label="t('admin.actions.delete')"
                          @click="remove(a)"
                        >
                          <BaseIcon name="close" class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="a.message && expanded[a.id]" :key="a.id + '-d'">
                    <td colspan="4" class="px-5 pb-4">
                      <p class="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">{{ a.message }}</p>
                    </td>
                  </tr>
                </template>
                <tr v-if="!currentItems.length">
                  <td colspan="4" class="px-5 py-16 text-center text-gray-400">{{ t('admin.empty') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">
        {{ t('admin.empty') }}
      </div>
      </template>

      <!-- ================= EMAIL (received) ================= -->
      <template v-else-if="view === 'email'">
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900">{{ t('admin.email.title') }}</h1>
            <p class="text-gray-400 text-sm mt-1">{{ t('admin.email.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input
                v-model="emailSearch"
                type="search"
                :placeholder="t('admin.email.searchPlaceholder')"
                class="w-52 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                @keyup.enter="loadInbox"
              />
              <BaseIcon name="search" class="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              class="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"
              :disabled="emailLoading"
              @click="loadInbox"
            >
              <BaseIcon name="refresh" class="w-4 h-4" :class="emailLoading ? 'animate-spin' : ''" />
              {{ t('admin.email.refresh') }}
            </button>
          </div>
        </div>

        <div v-if="!apiOn" class="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3 mb-6">
          {{ t('admin.email.needBackend') }}
        </div>
        <div
          v-else-if="emailLoading && !emailLoaded"
          class="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400"
        >
          {{ t('admin.email.loading') }}
        </div>
        <div
          v-else-if="emails.length === 0"
          class="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400"
        >
          <BaseIcon name="mail" class="w-10 h-10 mx-auto mb-3 text-gray-200" />
          {{ t('admin.email.empty') }}
        </div>
        <div v-else class="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          <button
            v-for="e in emails"
            :key="e.id"
            class="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3"
            :class="!e.read_at ? 'bg-brand/[0.03]' : ''"
            @click="openEmail(e)"
          >
            <span
              class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
              :class="!e.read_at ? 'bg-brand' : 'bg-transparent'"
            ></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <span
                  class="text-sm text-gray-900 truncate"
                  :class="!e.read_at ? 'font-bold' : 'font-medium'"
                >{{ e.from_name || e.from_email }}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">{{ fmt(e.received_at) }}</span>
              </div>
              <div class="text-sm text-gray-700 truncate flex items-center gap-1.5" :class="!e.read_at ? 'font-semibold' : ''">
                <span class="truncate">{{ e.subject || t('admin.email.noSubject') }}</span>
                <BaseIcon v-if="e.has_attachments" name="paperclip" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </div>
              <div class="text-xs text-gray-400 truncate mt-0.5">{{ e.preview }}</div>
            </div>
          </button>
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

        <!-- Managed categories: add / remove — these feed the vacancy dropdown and the site filters -->
        <div class="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p class="text-xs font-semibold text-gray-600 mb-3">{{ t('admin.jobs.categories') }}</p>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span
              v-for="(c, i) in categoriesDraft"
              :key="c"
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg"
            >
              {{ c }}
              <button type="button" class="hover:text-red-500" @click="removeCategory(i)">
                <BaseIcon name="close" class="w-3.5 h-3.5" />
              </button>
            </span>
            <span v-if="!categoriesDraft.length" class="text-xs text-gray-400">{{ t('admin.jobs.noCategories') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="newCategory"
              :placeholder="t('admin.jobs.newCategory')"
              class="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"
              @keydown.enter.prevent="addCategory"
            />
            <button
              type="button"
              class="inline-flex items-center gap-1 bg-brand/10 text-brand text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand/20 transition-colors"
              @click="addCategory"
            >
              <BaseIcon name="plus" class="w-4 h-4" /> {{ t('admin.jobs.addCategory') }}
            </button>
            <button
              type="button"
              :disabled="categoriesSaving"
              class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              :class="{ 'opacity-60': categoriesSaving }"
              @click="saveCategories"
            >
              <span v-if="categoriesSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
              <BaseIcon v-else name="check" class="w-4 h-4 inline" /> {{ t('admin.jobs.form.save') }}
            </button>
          </div>
        </div>

        <!-- Category options for every vacancy's dropdown -->
        <datalist id="job-categories">
          <option v-for="c in categoriesDraft" :key="c" :value="c" />
        </datalist>

        <div v-if="jobsDraft.length" class="space-y-3">
          <div
            v-for="row in jobsDraft"
            :key="row.id"
            class="bg-white border border-gray-100 rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center gap-4"
          >
            <img
              v-if="row.image"
              :src="row.image"
              :alt="row.titleKa || row.titleEn"
              class="w-full lg:w-28 h-32 lg:h-20 object-cover rounded-xl flex-shrink-0"
            />
            <div
              v-else
              class="w-full lg:w-28 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
            >
              <BaseIcon name="briefcase" class="w-6 h-6 text-gray-300" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-800 truncate">{{ row.titleKa || row.titleEn }}</h3>
              <p class="text-gray-400 text-sm mt-0.5 truncate">{{ row.sectorKa || row.sectorEn }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="row.category" class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{ catLabel(row.category) }}</span>
              <span class="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">{{ t('vacancies.location') }}</span>
              <span class="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">{{ t('vacancies.fullTime') }}</span>
              <span v-if="row.salary" class="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">{{ row.salary }}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                class="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-brand hover:border-brand/30 flex items-center justify-center transition-colors"
                :aria-label="t('admin.jobs.edit')"
                @click="openJobModal(row)"
              >
                <BaseIcon name="pencil" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors"
                :aria-label="t('admin.actions.delete')"
                @click="confirmDeleteJob(row)"
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

              <!-- Fields: show / hide (each field removable from the public form) -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-2">
                <p class="text-xs font-semibold text-gray-600">ველები / Form fields</p>
                <p class="text-[11px] text-gray-400">მოხსენით მონიშვნა, რომ ველი ფორმიდან წაიშალოს.</p>
                <div class="grid sm:grid-cols-2 gap-x-4">
                  <label
                    v-for="f in companyFormFields"
                    :key="f.key"
                    class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1.5"
                  >
                    <input
                      type="checkbox"
                      :checked="companyFormDraft.enabled.includes(f.key)"
                      class="w-4 h-4 accent-brand flex-shrink-0"
                      @change="toggleCompanyField(f.key)"
                    />
                    <span>{{ t('companyForm.' + f.key) }}<span v-if="f.required" class="text-brand"> *</span></span>
                  </label>
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

          <!-- Collection: Legal pages (Privacy & Terms, WYSIWYG) -->
          <details v-if="!contentSearch && privacyDraft && termsDraft" class="bg-white rounded-2xl border border-gray-100 px-5 lg:px-6 py-4">
            <summary class="font-brand text-sm text-gray-900 cursor-pointer select-none">
              იურიდიული — Privacy &amp; Terms
            </summary>
            <div class="space-y-5 mt-5">
              <!-- Page labels (legal.*) -->
              <div class="border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">გვერდის წარწერები / Page labels</p>
                <div v-for="it in groupTextItems('legal')" :key="it.key">
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ it.key.split('.').slice(1).join('.') }}</label>
                  <div class="grid sm:grid-cols-2 gap-3">
                    <textarea v-model="draft[`${it.key}|ka`]" rows="1" placeholder="ქარ" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                    <textarea v-model="draft[`${it.key}|en`]" rows="1" placeholder="EN" class="w-full px-3 py-2 bg-white rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
                  </div>
                </div>
              </div>

              <!-- Privacy policy -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">კონფიდენციალურობა / Privacy policy</p>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="privacyDraft.updated.ka" placeholder="განახლდა (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="privacyDraft.updated.en" placeholder="Updated (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ტექსტი (ქარ)</span>
                    <RichTextEditor v-model="privacyDraft.body.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Text (EN)</span>
                    <RichTextEditor v-model="privacyDraft.body.en" />
                  </div>
                </div>
              </div>

              <!-- Terms -->
              <div class="border border-gray-100 rounded-xl p-4 space-y-3">
                <p class="text-xs font-semibold text-gray-600">წესები და პირობები / Terms &amp; Conditions</p>
                <div class="grid sm:grid-cols-2 gap-3">
                  <input v-model="termsDraft.updated.ka" placeholder="განახლდა (ქარ)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                  <input v-model="termsDraft.updated.en" placeholder="Updated (EN)" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">ტექსტი (ქარ)</span>
                    <RichTextEditor v-model="termsDraft.body.ka" />
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wide text-gray-300 mb-1">Text (EN)</span>
                    <RichTextEditor v-model="termsDraft.body.en" />
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  :disabled="legalSaving"
                  class="gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  :class="{ 'opacity-60': legalSaving }"
                  @click="saveLegal"
                >
                  <span v-if="legalSaving" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block align-middle"></span>
                  <BaseIcon v-else name="check" class="w-4 h-4 inline" /> შენახვა
                </button>
              </div>
            </div>
          </details>

          <!-- Every content group as a structured block (sub-sections) -->
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
            <div class="space-y-4 mt-5">
              <div
                v-for="section in subGroups(g.items)"
                :key="section.sub"
                class="border border-gray-100 rounded-xl p-4 space-y-3"
              >
                <p v-if="section.sub !== '_'" class="text-xs font-semibold text-gray-600">{{ section.label }}</p>
                <div v-for="it in section.items" :key="it.key">
                  <!-- Text field: ka + en -->
                  <template v-if="it.type === 'text'">
                    <label class="block text-[11px] font-medium text-gray-400 mb-1">{{ subFieldLabel(it.key) }}</label>
                    <div class="grid sm:grid-cols-2 gap-3">
                      <textarea v-model="draft[`${it.key}|ka`]" rows="2" placeholder="ქარ" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                      <textarea v-model="draft[`${it.key}|en`]" rows="2" placeholder="EN" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white"></textarea>
                    </div>
                  </template>

                  <!-- Image field -->
                  <template v-else>
                    <label class="block text-[11px] font-medium text-gray-400 mb-1">{{ subFieldLabel(it.key) }}</label>
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

    <!-- EMAIL READER + REPLY -->
    <Transition name="page">
      <div v-if="selectedEmail" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeEmail"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="closeEmail">
          <div class="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <!-- header -->
            <div class="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
              <div class="min-w-0">
                <h3 class="text-lg font-extrabold text-gray-900 break-words">
                  {{ selectedEmail.subject || t('admin.email.noSubject') }}
                </h3>
                <p class="text-sm text-gray-500 mt-1 truncate">
                  <span class="font-medium text-gray-700">{{ selectedEmail.from_name || selectedEmail.from_email }}</span>
                  <span v-if="selectedEmail.from_name" class="text-gray-400"> &lt;{{ selectedEmail.from_email }}&gt;</span>
                </p>
                <p class="text-xs text-gray-400 mt-0.5 truncate">
                  {{ t('admin.email.to') }}: {{ selectedEmail.to_email }} · {{ fmt(selectedEmail.received_at) }}
                </p>
              </div>
              <button class="text-gray-300 hover:text-gray-600 flex-shrink-0" aria-label="Close" @click="closeEmail">
                <BaseIcon name="close" class="w-6 h-6" />
              </button>
            </div>

            <!-- body + attachments -->
            <div class="flex-1 overflow-y-auto min-h-0">
              <iframe
                :srcdoc="emailFrameDoc"
                sandbox=""
                class="w-full border-0 block"
                style="height: 42vh"
                :title="selectedEmail.subject || 'Email'"
              ></iframe>

              <div
                v-if="selectedEmail.attachments && selectedEmail.attachments.length"
                class="px-5 py-3 border-t border-gray-100"
              >
                <p class="text-xs font-semibold text-gray-500 mb-2">{{ t('admin.email.attachments') }}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="att in selectedEmail.attachments"
                    :key="att.index"
                    class="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    @click="saveAttachment(att)"
                  >
                    <BaseIcon name="download" class="w-3.5 h-3.5 text-gray-400" />
                    <span class="max-w-[180px] truncate">{{ att.filename }}</span>
                    <span class="text-gray-400">{{ fmtBytes(att.size) }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- reply -->
            <div class="border-t border-gray-100 p-4 bg-gray-50/60 flex-shrink-0">
              <label class="block text-xs font-medium text-gray-500 mb-1.5">
                {{ t('admin.email.replyTo') }} {{ selectedEmail.from_email }}
              </label>
              <textarea
                v-model="replyBody"
                rows="3"
                :placeholder="t('admin.email.replyPlaceholder')"
                class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"
              ></textarea>
              <div class="flex items-center justify-between gap-3 mt-3">
                <button
                  class="text-xs text-red-500 hover:text-red-600 font-medium inline-flex items-center gap-1.5"
                  @click="removeEmail()"
                >
                  <BaseIcon name="trash" class="w-4 h-4" /> {{ t('admin.actions.delete') }}
                </button>
                <button
                  class="gradient-bg text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity"
                  :class="replyBody.trim() && !replySending ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'"
                  :disabled="!replyBody.trim() || replySending"
                  @click="sendReply"
                >
                  {{ replySending ? t('admin.email.sending') : t('admin.email.send') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- CONFIRMATION MODAL (delete) -->
    <Transition name="page">
      <div v-if="confirmDialog" class="fixed inset-0 z-[70]">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="confirmDialog = null"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="confirmDialog = null">
          <div class="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 shadow-2xl text-center">
            <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BaseIcon name="close" class="w-7 h-7 text-red-500" />
            </div>
            <h3 class="text-lg font-extrabold text-gray-900 mb-2">{{ t('admin.confirm.title') }}</h3>
            <p class="text-sm text-gray-500 mb-6">{{ confirmDialog.message }}</p>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                @click="confirmDialog = null"
              >
                {{ t('admin.confirm.cancel') }}
              </button>
              <button
                type="button"
                :disabled="confirmBusy"
                class="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors inline-flex items-center justify-center gap-2"
                :class="{ 'opacity-60': confirmBusy }"
                @click="runConfirm"
              >
                <span v-if="confirmBusy" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ t('admin.confirm.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- VACANCY ADD / EDIT MODAL -->
    <Transition name="page">
      <div v-if="jobModalOpen && jobForm" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="jobModalOpen = false"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4" @click.self="jobModalOpen = false">
          <div class="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
            <button
              class="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
              :aria-label="t('admin.jobs.cancel')"
              @click="jobModalOpen = false"
            >
              <BaseIcon name="close" class="w-6 h-6" />
            </button>
            <h3 class="text-lg font-extrabold text-gray-900 mb-5">
              {{ jobForm.id ? t('admin.jobs.edit') : t('admin.jobs.add') }}
            </h3>

            <form class="space-y-4" @submit.prevent="saveJobModal">
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img v-if="jobForm.image" :src="jobForm.image" alt="" class="w-full h-full object-cover" />
                  <BaseIcon v-else name="briefcase" class="w-6 h-6 text-gray-300" />
                </div>
                <label class="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                  <BaseIcon name="upload" class="w-4 h-4" /> {{ t('admin.jobs.form.chooseImage') }}
                  <input type="file" accept="image/*" class="hidden" @change="onJobRowImage(jobForm, $event)" />
                </label>
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.titleKa') }} *</label>
                  <input v-model="jobForm.titleKa" type="text" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.titleEn') }}</label>
                  <input v-model="jobForm.titleEn" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.sectorKa') }}</label>
                  <input v-model="jobForm.sectorKa" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.sectorEn') }}</label>
                  <input v-model="jobForm.sectorEn" type="text" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.category') }} *</label>
                  <input v-model="jobForm.category" list="job-categories" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.salary') }}</label>
                  <input v-model="jobForm.salary" type="text" placeholder="2,000–3,000 ₾" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white" />
                </div>
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.descriptionKa') }}</label>
                  <RichTextEditor v-model="jobForm.descriptionKa" min-height="160px" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ t('admin.jobs.form.descriptionEn') }}</label>
                  <RichTextEditor v-model="jobForm.descriptionEn" min-height="160px" />
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors" @click="jobModalOpen = false">
                  {{ t('admin.jobs.cancel') }}
                </button>
                <button
                  type="submit"
                  :disabled="jobForm.saving"
                  class="flex-1 gradient-bg text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                  :class="{ 'opacity-60': jobForm.saving }"
                >
                  <span v-if="jobForm.saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
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

<style scoped>
/* Consistent left-side expand/collapse chevron on every section header */
details > summary {
  list-style: none;
}
details > summary::-webkit-details-marker {
  display: none;
}
details > summary::before {
  content: '';
  display: inline-block;
  width: 0.45em;
  height: 0.45em;
  margin-right: 0.7em;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
  vertical-align: middle;
  opacity: 0.45;
}
details[open] > summary::before {
  transform: rotate(45deg);
}
</style>
