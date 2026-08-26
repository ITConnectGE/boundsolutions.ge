// Blog posts. The HR-summit keynote moved here per the audit (deck p.7):
// long-form / talk content belongs in a blog category, not on the homepage.
export const posts = [
  {
    slug: 'hr-summit-2019',
    date: '2019-11-01',
    cover: '/images/3/boundsolutions 1.jpg',
    youtube: 'HzaXsSdSukY',
    externalLink: 'https://www.facebook.com/watch/?v=788512208213068',
    category: { ka: 'Keynote', en: 'Keynote' },
    tags: ['Adjara Group', 'HR HUB Georgia', 'PSP Insurance', 'Keynote Speaker'],
    title: {
      ka: 'კორპორატიული კულტურა - ჩემი ხელით დაკრეფილი იები',
      en: 'Corporate Culture - Flowers Picked by My Own Hand',
    },
    author: { ka: 'ნინო ბართაია - Keynote Speaker', en: 'Nino Bartaia - Keynote Speaker' },
    excerpt: {
      ka: 'ნინო ბართაიას გამოსვლა საქართველოს მთავარ HR ღონისძიებაზე - HR ბიზნეს სამიტი 2019. როგორ იქმნება კორპორატიული კულტურა რეალურად.',
      en: "Nino Bartaia's talk at Georgia's main HR event - HR Business Summit 2019. How corporate culture is really built.",
    },
    body: {
      ka: [
        'ნინო ბართაიას გამოსვლა საქართველოს მთავარ HR ღონისძიებაზე - HR ბიზნეს სამიტი 2019. თემა: როგორ იქმნება კორპორატიული კულტურა რეალურად, ყოველდღიური ზრუნვით და ადამიანებზე ფოკუსით.',
        'კულტურა არ იქმნება დოკუმენტით - ის იქმნება ყოველდღიური ქცევებით, გადაწყვეტილებებითა და იმით, თუ როგორ ვექცევით ერთმანეთს მაშინ, როცა არავინ გვიყურებს.',
      ],
      en: [
        "Nino Bartaia's talk at Georgia's main HR event - HR Business Summit 2019. The theme: how corporate culture is really built, through everyday care and a focus on people.",
        "Culture is not created by a document - it is created by everyday behaviour, decisions, and how we treat each other when no one is watching.",
      ],
    },
  },
  {
    slug: 'team-building-nature',
    date: '2024-09-01',
    cover: '/images/strong team.jpg',
    video: '/video/itconnect.mp4',
    category: { ka: 'Team Building', en: 'Team Building' },
    tags: ['ITConnect', 'Team Building'],
    title: {
      ka: 'ბუნებასთან სიახლოვე, მოძრაობა და ენერგია',
      en: 'Nature, Movement and Energy',
    },
    author: { ka: 'Bound Solutions', en: 'Bound Solutions' },
    excerpt: {
      ka: 'ბუნებასთან სიახლოვე, მოძრაობა და ჯანსაღი ცხოვრების წახალისება - Team Building-ის დაგეგმვისას ეს ჩვენი მთავარი მიზანია.',
      en: 'Closeness to nature, movement and a healthy lifestyle - our core goal when designing team building.',
    },
    body: {
      ka: [
        'ბუნებასთან სიახლოვე, მოძრაობა და ჯანსაღი ცხოვრების წახალისება - სწორედ ეს არის Bound Solutions-ის მთავარი მიზანი Team Building-ის დაგეგმვისას.',
        'ჩვენ ვქმნით გარემოს, სადაც გუნდი ენერგიით იმუხტება. ენერგიული თანამშრომელი კი ბიზნესის წარმატების უპირობო ნაწილია.',
      ],
      en: [
        'Closeness to nature, movement and encouraging a healthy lifestyle - this is exactly what Bound Solutions aims for when planning team building.',
        'We create an environment that energises the team. And an energised employee is a key driver of business success.',
      ],
    },
  },
  {
    slug: 'people-first',
    date: '2024-11-01',
    cover: '/images/events.jpg',
    video: '/video/mainzen-X-boundsolutions.mp4',
    category: { ka: 'Culture', en: 'Culture' },
    tags: ['Maizen', 'Culture'],
    title: {
      ka: 'გარემო, სადაც ადამიანები იზრდებიან',
      en: 'An Environment Where People Grow',
    },
    author: { ka: 'Bound Solutions', en: 'Bound Solutions' },
    excerpt: {
      ka: 'Bound Solutions ქმნის გარემოს, სადაც თანამშრომლებს აქვთ სწავლის, განვითარების და საკუთარი უფლებების გაცნობიერების რეალური შესაძლებლობა.',
      en: 'Bound Solutions creates an environment where employees can genuinely learn, grow and understand their rights.',
    },
    body: {
      ka: [
        'Bound Solutions ქმნის გარემოს, სადაც თანამშრომლებს აქვთ სწავლის, განვითარების და საკუთარი უფლებების გაცნობიერების რეალური შესაძლებლობა.',
        'ჩვენ მიერ შექმნილი კულტურა აძლიერებს ნდობას გუნდსა და კომპანიას შორის, ხოლო ადამიანებს აძლევს შესაძლებლობას, რომ პროფესიულად გაიზარდონ.',
      ],
      en: [
        'Bound Solutions creates an environment where employees have real opportunities to learn, grow, and fully understand their rights.',
        "The culture we've built strengthens trust between the team and the company, while giving people the chance to develop professionally.",
      ],
    },
  },
]

export const getPost = (slug) => posts.find((p) => p.slug === slug)
