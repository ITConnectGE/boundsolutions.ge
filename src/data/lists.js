// Bilingual defaults for editable list content (process steps, hero stats, the
// company-request form). Derived from the built-in i18n arrays so there is no
// duplicated copy - each item becomes { field: { ka, en } } and can be
// overridden (add / remove / edit) from the admin CMS as a collection.
import ka from '@/i18n/ka.js'
import en from '@/i18n/en.js'

// Zip a ka + en array of objects into one array of bilingual objects.
const zipObj = (kaArr, enArr, fields) =>
  (kaArr || []).map((item, i) => {
    const o = {}
    for (const f of fields) o[f] = { ka: item[f] ?? '', en: enArr?.[i]?.[f] ?? item[f] ?? '' }
    return o
  })

// Zip a ka + en array of strings into bilingual { ka, en } options.
const zipStr = (kaArr, enArr) =>
  (kaArr || []).map((s, i) => ({ ka: s, en: enArr?.[i] ?? s }))

export const defaultProcess = zipObj(ka.home.process.steps, en.home.process.steps, ['title', 'text'])

export const defaultStats = zipObj(ka.hero.stats, en.hero.stats, ['v', 'l'])

// Join the intro paragraphs into HTML, skipping any empty one, so the built-in
// default matches what the WYSIWYG editor stores (no old-text flash on load).
const introHtml = (a, b) => [a, b].filter((s) => s && s.trim()).map((p) => `<p>${p}</p>`).join('')

// Employer-request form fields, in display order. `section` groups them under a
// legend; `map` links a field to an Application column (unmapped fields go into
// the message summary); `opt` names an option list for a select field. Labels
// come from i18n (companyForm.<key>). Which fields actually show is controlled
// by `enabled` below and editable from the CMS (each field removable).
export const companyFormFields = [
  { key: 'companyName', section: 'company', type: 'text', required: true, map: 'name' },
  { key: 'idCode', section: 'company', type: 'text' },
  { key: 'industry', section: 'company', type: 'text', map: 'sector' },
  { key: 'location', section: 'company', type: 'text' },
  { key: 'positionTitle', section: 'position', type: 'text', required: true, map: 'position' },
  { key: 'salary', section: 'position', type: 'text' },
  { key: 'schedule', section: 'position', type: 'select', opt: 'schedule' },
  { key: 'jobDescription', section: 'position', type: 'textarea' },
  { key: 'structure', section: 'position', type: 'text' },
  { key: 'qualifications', section: 'position', type: 'textarea' },
  { key: 'contractType', section: 'contract', type: 'select', opt: 'contractType' },
  { key: 'contractPeriod', section: 'contract', type: 'select', opt: 'contractPeriod' },
  { key: 'bonus', section: 'contract', type: 'text' },
  { key: 'comment', section: 'contract', type: 'textarea' },
  { key: 'contactName', section: 'contact', type: 'text', map: 'contactName' },
  { key: 'email', section: 'contact', type: 'email', required: true, map: 'email' },
  { key: 'phone', section: 'contact', type: 'tel', required: true, map: 'phone' },
]

// Contact fields that must always be collected: every employer request has to
// arrive with a reachable email AND phone, so these two can't be disabled from
// the CMS and are validated for format on both the frontend and the API.
export const lockedCompanyFields = ['email', 'phone']

// Fields shown by default (the trimmed form): company info + position & salary +
// contact with required email/phone. The rest are hidden until re-enabled.
export const defaultCompanyFormEnabled = [
  'companyName', 'idCode', 'industry', 'location',
  'positionTitle', 'salary',
  'contactName', 'email', 'phone',
]

export const defaultCompanyForm = {
  intro: {
    ka: introHtml(ka.companyForm.intro1, ka.companyForm.intro2),
    en: introHtml(en.companyForm.intro1, en.companyForm.intro2),
  },
  enabled: [...defaultCompanyFormEnabled],
  schedule: zipStr(ka.companyForm.scheduleOptions, en.companyForm.scheduleOptions),
  contractType: zipStr(ka.companyForm.contractTypeOptions, en.companyForm.contractTypeOptions),
  contractPeriod: zipStr(ka.companyForm.contractPeriodOptions, en.companyForm.contractPeriodOptions),
}
