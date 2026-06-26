<script setup>
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { services } from '@/data/services.js'
import SocialLinks from './SocialLinks.vue'
import NewsletterForm from './NewsletterForm.vue'
import BaseIcon from './BaseIcon.vue'

const { t } = useI18n()
const { loc } = useLoc()
const year = 2026
</script>

<template>
  <footer class="bg-navy text-white pt-20 pb-12 border-t-4 border-accent">
    <div class="max-w-7xl mx-auto px-6 lg:px-10">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-20 mb-16">
        <!-- Brand + social -->
        <div>
          <img
            src="/images/BoundSolutions - Nav.png"
            alt="Bound Solutions"
            class="h-9 mb-4 brightness-0 invert"
          />
          <p class="text-white/60 text-sm leading-relaxed mb-5">{{ t('footer.tagline') }}</p>
          <SocialLinks variant="footer" />
        </div>

        <!-- Company -->
        <div>
          <h4 class="footer-h">{{ t('footer.companyHeading') }}</h4>
          <div class="space-y-2.5 text-sm">
            <RouterLink to="/about" class="footer-link">{{ t('nav.about') }}</RouterLink>
            <RouterLink to="/vacancies" class="footer-link">{{ t('nav.vacancies') }}</RouterLink>
            <RouterLink to="/blog" class="footer-link">{{ t('nav.blog') }}</RouterLink>
            <RouterLink to="/privacy" class="footer-link">{{ t('footer.privacy') }}</RouterLink>
            <RouterLink to="/terms" class="footer-link">{{ t('footer.terms') }}</RouterLink>
          </div>
        </div>

        <!-- Services -->
        <div>
          <h4 class="footer-h">{{ t('nav.services') }}</h4>
          <div class="space-y-2.5 text-sm">
            <RouterLink
              v-for="s in services"
              :key="s.slug"
              :to="`/services/${s.slug}`"
              class="footer-link"
              >{{ loc(s.title) }}</RouterLink
            >
          </div>
        </div>

        <!-- Contact + newsletter -->
        <div>
          <h4 class="footer-h">{{ t('footer.contactHeading') }}</h4>
          <div class="space-y-2.5 text-sm mb-6">
            <a href="mailto:info@boundsolutions.ge" class="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <BaseIcon name="mail" class="w-4 h-4 opacity-70" /> info@boundsolutions.ge
            </a>
            <a href="tel:+995577323223" class="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <BaseIcon name="phone" class="w-4 h-4 opacity-70" /> +995 577 32 32 23
            </a>
            <p class="text-white/60 flex items-center gap-2">
              <BaseIcon name="pin" class="w-4 h-4 opacity-70" /> {{ t('contact.address') }}
            </p>
          </div>
          <p class="text-white/60 text-xs mb-2">{{ t('footer.newsletterText') }}</p>
          <NewsletterForm dark />
        </div>
      </div>

      <div
        class="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/50"
      >
        <p>&copy; {{ year }} Bound Solutions</p>
        <p class="text-xs">
          {{ t('footer.websiteBy') }}
          <a
            href="https://itconnect.ge"
            target="_blank"
            rel="noopener noreferrer"
            class="text-white/80 hover:text-white"
            >ITConnect.ge</a
          >
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-h {
  font-weight: 700;
  font-size: 0.875rem;
  color: #fff;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 2px solid #8CCDE9;
  display: inline-block;
}
.footer-link {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s;
}
.footer-link:hover {
  color: #8CCDE9;
}
</style>
