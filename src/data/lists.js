// Bilingual defaults for editable list content (process steps, hero stats, the
// company-request form). Derived from the built-in i18n arrays so there is no
// duplicated copy — each item becomes { field: { ka, en } } and can be
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

export const defaultCompanyForm = {
  intro: {
    ka: `<p>${ka.companyForm.intro1}</p><p>${ka.companyForm.intro2}</p>`,
    en: `<p>${en.companyForm.intro1}</p><p>${en.companyForm.intro2}</p>`,
  },
  schedule: zipStr(ka.companyForm.scheduleOptions, en.companyForm.scheduleOptions),
  contractType: zipStr(ka.companyForm.contractTypeOptions, en.companyForm.contractTypeOptions),
  contractPeriod: zipStr(ka.companyForm.contractPeriodOptions, en.companyForm.contractPeriodOptions),
}
