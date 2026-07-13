// Primary navigation links. Editable from the admin CMS (col.nav) so pages can
// be added, removed and re-titled without a code change. `to` is the route path,
// `label` the bilingual title, `badge` an optional count shown next to the item.
export const defaultNav = [
  { to: '/', label: { ka: 'მთავარი', en: 'Home' } },
  { to: '/about', label: { ka: 'ჩვენ შესახებ', en: 'About' } },
  { to: '/services', label: { ka: 'სერვისები', en: 'Services' } },
  { to: '/blog', label: { ka: 'ბლოგი', en: 'Blog' } },
  { to: '/vacancies', label: { ka: 'ვაკანსიები', en: 'Vacancies' }, badge: 6 },
  { to: '/for-companies', label: { ka: 'დამსაქმებლებისთვის', en: 'For employers' } },
]
