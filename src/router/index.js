export const routes = [
  { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
  { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
  { path: '/team', name: 'team', component: () => import('@/pages/TeamPage.vue') },
  { path: '/services', name: 'services', component: () => import('@/pages/ServicesPage.vue') },
  {
    path: '/services/:slug',
    name: 'service',
    component: () => import('@/pages/ServiceDetailPage.vue'),
  },
  { path: '/blog', name: 'blog', component: () => import('@/pages/BlogPage.vue') },
  { path: '/blog/:slug', name: 'post', component: () => import('@/pages/BlogPostPage.vue') },
  { path: '/vacancies', name: 'vacancies', component: () => import('@/pages/VacanciesPage.vue') },
  {
    path: '/for-companies',
    name: 'for-companies',
    component: () => import('@/pages/CompanyRequestPage.vue'),
  },
  { path: '/contact', name: 'contact', component: () => import('@/pages/ContactPage.vue') },
  { path: '/privacy', name: 'privacy', component: () => import('@/pages/PrivacyPage.vue') },
  { path: '/terms', name: 'terms', component: () => import('@/pages/TermsPage.vue') },
  // Admin (demo, client-only — not linked publicly, not in the sitemap)
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/pages/AdminLoginPage.vue'),
  },
  { path: '/admin', name: 'admin', component: () => import('@/pages/AdminDashboardPage.vue') },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]
