// What the admin can edit from the dashboard "Content" tab. Text items reference
// an i18n key (overrides merge over the ka/en defaults). Image items use an
// "img.*" key resolved by img() in the components. Add rows here to expose more.
export const editableContent = [
  {
    group: 'home',
    label: 'მთავარი — ჰირო / Home — Hero',
    items: [
      { key: 'hero.slogan1', type: 'text', label: 'სლოგანი (ხაზი 1)' },
      { key: 'hero.slogan2', type: 'text', label: 'სლოგანი (ხაზი 2)' },
      { key: 'hero.subtitle', type: 'text', label: 'ქვესათაური' },
      { key: 'hero.ctaPrimary', type: 'text', label: 'ღილაკი 1' },
      { key: 'hero.ctaSecondary', type: 'text', label: 'ღილაკი 2' },
      { key: 'img.hero.slide1', type: 'image', label: 'სლაიდი 1', default: '/images/3/boundsolutions 1.jpg' },
      { key: 'img.hero.slide2', type: 'image', label: 'სლაიდი 2', default: '/images/bound.jpg' },
      { key: 'img.hero.slide3', type: 'image', label: 'სლაიდი 3', default: '/images/3/team building.jpg' },
      { key: 'img.hero.slide4', type: 'image', label: 'სლაიდი 4', default: '/images/bound.jpg' },
    ],
  },
  {
    group: 'home',
    label: 'მთავარი — სექციები / Home — Sections',
    items: [
      { key: 'home.aboutTeaser.eyebrow', type: 'text', label: 'ჩვენ შესახებ — ზედა' },
      { key: 'home.aboutTeaser.title', type: 'text', label: 'ჩვენ შესახებ — სათაური' },
      { key: 'home.aboutTeaser.text', type: 'text', label: 'ჩვენ შესახებ — ტექსტი' },
      { key: 'home.aboutTeaser.cta', type: 'text', label: 'ჩვენ შესახებ — ღილაკი' },
      { key: 'home.services.eyebrow', type: 'text', label: 'სერვისები — ზედა' },
      { key: 'home.services.title', type: 'text', label: 'სერვისები — სათაური' },
      { key: 'home.services.subtitle', type: 'text', label: 'სერვისები — ქვესათაური' },
      { key: 'home.testimonials.eyebrow', type: 'text', label: 'შეფასებები — ზედა' },
      { key: 'home.testimonials.title', type: 'text', label: 'შეფასებები — სათაური' },
      { key: 'home.contactCta.title', type: 'text', label: 'CTA — სათაური' },
      { key: 'home.contactCta.text', type: 'text', label: 'CTA — ტექსტი' },
      { key: 'home.contactCta.button', type: 'text', label: 'CTA — ღილაკი' },
    ],
  },
  {
    group: 'about',
    label: 'ჩვენ შესახებ / About',
    items: [
      { key: 'about.title', type: 'text', label: 'სათაური' },
      { key: 'about.subtitle', type: 'text', label: 'ქვესათაური' },
      { key: 'about.companyTitle', type: 'text', label: 'კომპანიის სათაური' },
      { key: 'about.missionTitle', type: 'text', label: 'მისიის სათაური' },
      { key: 'about.visionTitle', type: 'text', label: 'ხედვის სათაური' },
      { key: 'about.valuesTitle', type: 'text', label: 'ღირებულებების სათაური' },
      { key: 'img.about.founder', type: 'image', label: 'დამფუძნებლის ფოტო', default: '/images/team/nina.jpg' },
    ],
  },
  {
    group: 'contact',
    label: 'კონტაქტი / Contact',
    items: [
      { key: 'contact.title', type: 'text', label: 'სათაური' },
      { key: 'contact.subtitle', type: 'text', label: 'ქვესათაური' },
    ],
  },
  {
    group: 'footer',
    label: 'ფუტერი / Footer',
    items: [{ key: 'footer.tagline', type: 'text', label: 'სლოგანი' }],
  },
]
