// Primary navigation links. Editable from the admin CMS (col.nav) so pages can
// be added, removed and re-titled without a code change. `to` is the route path,
// `label` the bilingual title, `badge` an optional count shown next to the item.
// Paths end with "/" (the canonical URL form); SiteNav also normalises values
// typed into the CMS, so a link saved as "/about" still renders "/about/".
export const defaultNav = [
  { to: '/', label: { ka: 'მთავარი', en: 'Home' } },
  { to: '/about/', label: { ka: 'ჩვენ შესახებ', en: 'About' } },
  { to: '/services/', label: { ka: 'სერვისები', en: 'Services' } },
  { to: '/blog/', label: { ka: 'ბლოგი', en: 'Blog' } },
  // No badge value here: SiteNav always shows the live number of open vacancies.
  { to: '/vacancies/', label: { ka: 'ვაკანსიები', en: 'Vacancies' } },
  { to: '/for-companies/', label: { ka: 'დამსაქმებლებისთვის', en: 'For employers' } },
]
