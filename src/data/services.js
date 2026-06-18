// Bilingual service catalogue. `slug` drives the /services/:slug detail routes
// (pre-rendered by vite-ssg). EN copy is a draft pending the client's review.
export const services = [
  {
    slug: 'recruiting',
    icon: 'search',
    image: '/images/3/boundsolutions 2.jpg',
    title: { ka: 'რეკრუტინგი', en: 'Recruitment' },
    summary: {
      ka: 'სრული ციკლის რეკრუტინგი — ვაკანსიის ანალიზიდან წარმატებულ დასაქმებამდე.',
      en: 'Full-cycle recruitment — from role analysis to a successful hire.',
    },
    body: {
      ka: 'ვპოულობთ ადამიანებს, რომლებიც პროფესიონალიზმთან ერთად იზიარებენ თქვენი კომპანიის ღირებულებებს. ვმუშაობთ ვაკანსიის ღრმა ანალიზიდან, კანდიდატების მოძიება-შეფასებიდან, ინტერვიუებიდან საბოლოო შერჩევამდე — და ვაგრძელებთ მხარდაჭერას ადაპტაციის პერიოდშიც.',
      en: 'We find people who match your culture and your standards. We work from a deep role analysis through sourcing, screening and interviews to the final selection — and stay involved through onboarding.',
    },
    bullets: {
      ka: ['ვაკანსიის პროფილის შედგენა', 'კანდიდატების მოძიება და სკრინინგი', 'სტრუქტურირებული ინტერვიუები', 'ადაპტაციის მხარდაჭერა'],
      en: ['Role profiling', 'Sourcing & screening', 'Structured interviews', 'Onboarding support'],
    },
  },
  {
    slug: 'hr-consulting',
    icon: 'clipboard',
    image: '/images/3/boundsolutions 1.jpg',
    title: { ka: 'HR კონსალტინგი', en: 'HR Consulting' },
    summary: {
      ka: 'პროცესების აუდიტი, პოლიტიკების შემუშავება და ორგანიზაციული ოპტიმიზაცია.',
      en: 'Process audits, policy design and organisational optimisation.',
    },
    body: {
      ka: 'ვაფასებთ თქვენი HR პროცესების მდგომარეობას და ვქმნით სისტემას, რომელიც რეალურად მუშაობს. პოლიტიკები, სტრუქტურა, შეფასების სისტემები და კულტურა — ყველაფერი მორგებული თქვენს ბიზნესზე.',
      en: "We assess the state of your HR processes and build a system that actually works — policies, structure, performance frameworks and culture, all tailored to your business.",
    },
    bullets: {
      ka: ['HR პროცესების აუდიტი', 'პოლიტიკებისა და პროცედურების შემუშავება', 'ორგანიზაციული სტრუქტურა', 'შეფასების სისტემები (KPI)'],
      en: ['HR process audit', 'Policy & procedure design', 'Org structure', 'Performance systems (KPI)'],
    },
  },
  {
    slug: 'career',
    icon: 'rocket',
    image: 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=800&q=80',
    title: { ka: 'კარიერული განვითარება', en: 'Career Development' },
    summary: {
      ka: 'ინდივიდუალური კონსულტაცია, CV გაუმჯობესება და ინტერვიუსთვის მომზადება.',
      en: 'One-to-one coaching, CV improvement and interview preparation.',
    },
    body: {
      ka: 'ვეხმარებით ადამიანებს გაიაზრონ საკუთარი ძლიერი მხარეები და სწორად წარმოაჩინონ ისინი. ინდივიდუალური კონსულტაცია, CV-ისა და LinkedIn პროფილის გაუმჯობესება, ინტერვიუსთვის მზადება.',
      en: 'We help people understand their strengths and present them well — individual coaching, CV and LinkedIn improvement, and interview preparation.',
    },
    bullets: {
      ka: ['კარიერული კონსულტაცია', 'CV და LinkedIn', 'ინტერვიუს სიმულაცია', 'განვითარების გეგმა'],
      en: ['Career coaching', 'CV & LinkedIn', 'Mock interviews', 'Development plan'],
    },
  },
  {
    slug: 'employer-branding',
    icon: 'badge',
    image: '/images/branding.jpg',
    title: { ka: 'დამსაქმებლის ბრენდინგი', en: 'Employer Branding' },
    summary: {
      ka: 'EVP შემუშავება და დამსაქმებლის ბრენდის გაძლიერება.',
      en: 'EVP design and strengthening your employer brand.',
    },
    body: {
      ka: 'ვეხმარებით კომპანიებს გახდნენ ის ადგილი, სადაც ნიჭიერ ადამიანებს უნდათ მუშაობა. ვამუშავებთ ღირებულებით შეთავაზებას (EVP) და კომუნიკაციის სტრატეგიას.',
      en: 'We help companies become the place talented people want to work — building your Employee Value Proposition (EVP) and communication strategy.',
    },
    bullets: {
      ka: ['EVP შემუშავება', 'დამსაქმებლის ბრენდის სტრატეგია', 'შიდა კომუნიკაცია', 'სოციალური მედია'],
      en: ['EVP design', 'Employer brand strategy', 'Internal communication', 'Social media'],
    },
  },
  {
    slug: 'hr-outsourcing',
    icon: 'layers',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    title: { ka: 'HR აუთსორსინგი', en: 'HR Outsourcing' },
    summary: {
      ka: 'სრული HR ფუნქციის მართვა მზარდი კომპანიებისთვის.',
      en: 'Running the full HR function for growing companies.',
    },
    body: {
      ka: 'მზარდი კომპანიებისთვის ვიღებთ HR ფუნქციის სრულ ან ნაწილობრივ მართვას — დაქირავებიდან დოკუმენტბრუნვამდე, ისე რომ თქვენ ბიზნესზე იყოთ ფოკუსირებული.',
      en: "For growing companies we take on full or partial management of the HR function — from hiring to documentation — so you can stay focused on the business.",
    },
    bullets: {
      ka: ['HR ადმინისტრირება', 'დოკუმენტბრუნვა', 'პერსონალის მართვა', 'რეპორტინგი'],
      en: ['HR administration', 'Documentation', 'People operations', 'Reporting'],
    },
  },
  {
    slug: 'training',
    icon: 'academic',
    image: '/images/3/team building.jpg',
    title: { ka: 'ტრენინგი და განვითარება', en: 'Training & Development' },
    summary: {
      ka: 'ლიდერშიპის ტრენინგები და გუნდური ეფექტურობის ამაღლება.',
      en: 'Leadership training and improving team effectiveness.',
    },
    body: {
      ka: 'ვქმნით სასწავლო პროგრამებსა და გუნდურ ივენთებს, რომლებიც ავითარებენ უნარებს, აძლიერებენ კავშირებს და ზრდიან მოტივაციას.',
      en: 'We design learning programmes and team events that build skills, strengthen relationships and raise motivation.',
    },
    bullets: {
      ka: ['ლიდერშიპის ტრენინგი', 'გუნდური ივენთები (Team Building)', 'სოფტ-სქილების განვითარება', 'მენტორინგი'],
      en: ['Leadership training', 'Team building events', 'Soft-skills development', 'Mentoring'],
    },
  },
]

export const getService = (slug) => services.find((s) => s.slug === slug)
