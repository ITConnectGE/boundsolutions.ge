// Partner testimonials (deck p.14) and partner logos (deck p.15).
// Partners list real Bound Solutions partners; add logo files under
// /public/images/partners/ and set `logo` to enable the logo strip.

export const testimonials = [
  {
    quote: {
      ka: 'ჩვენ გვჯერა, რომ თანამშრომლებზე ზრუნვა მხოლოდ სამუშაო სივრცით არ შემოიფარგლება. ბუნება, თამაშები და ცოცხალი კომუნიკაცია ქმნის იმ მოტივაციას, რომელიც გუნდს უფრო ძლიერს და ბედნიერს ხდის. როცა თანამშრომლები თავს კარგად გრძნობენ — ბიზნესი იზრდება.',
      en: 'We believe that caring for employees goes beyond the workplace. Nature, games, and face-to-face communication create the motivation that makes the team stronger and happier. When employees feel good — the business grows.',
    },
    author: { ka: 'Maizen / მაიზენი', en: 'Maizen' },
    role: { ka: 'პარტნიორი კომპანია', en: 'Partner company' },
  },
  {
    quote: {
      ka: 'შიდა HR-დან გარე პარტნიორობაზე გადასვლა მარტივი აღმოჩნდა. გუნდი გვთავაზობს ცოდნასა და გამოცდილებას, მიწოდებულს პირადი სერვისით.',
      en: 'The transition from internal HR to an external partnership turned out to be easy. The team offers knowledge and experience, delivered with personal service.',
    },
    author: { ka: 'ITConnect', en: 'ITConnect' },
    role: { ka: 'President & CEO', en: 'President & CEO' },
  },
]

// Real partners. Logos live in /public/images/partners/ — each badge shows the logo
// if its file exists, otherwise falls back to the company name as text.
export const partners = [
  { name: 'ITConnect', logo: '/images/partners/itconnect.png' },
  { name: 'Maizen', logo: '/images/partners/maizen.png' },
  { name: 'Holiday Inn Telavi', logo: '/images/partners/holiday-inn-telavi.png' },
  { name: 'MIHOUSE', logo: '/images/partners/mihouse.png' },
  { name: 'Lion Trans', logo: '/images/partners/lion-trans.png' },
  { name: 'MEAMA', logo: '/images/partners/meama.png' },
  { name: 'Kani', logo: '/images/partners/kani.png' },
]
