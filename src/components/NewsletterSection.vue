<script setup>
// Full-width newsletter band, shown before the footer on public pages. A solid
// accent-blue band so it reads distinctly from the cream Contact-CTA above and
// the navy footer below.
import { useI18n } from 'vue-i18n'
import NewsletterForm from './NewsletterForm.vue'
import BaseIcon from './BaseIcon.vue'

const { t } = useI18n()
</script>

<template>
  <section class="bg-accent relative overflow-hidden">
    <div class="absolute -top-24 -right-16 w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
    <div class="absolute -bottom-24 -left-16 w-96 h-96 bg-navy/10 rounded-full blur-[100px]"></div>

    <div class="relative max-w-6xl mx-auto px-6 py-14 lg:py-16">
      <div class="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
        <div class="flex items-start gap-4 flex-1 text-left">
          <div class="w-12 h-12 rounded-2xl bg-navy/10 flex items-center justify-center flex-shrink-0">
            <BaseIcon name="mail" class="w-5 h-5 text-navy" />
          </div>
          <div>
            <h2 class="text-2xl lg:text-3xl font-extrabold text-navy leading-tight">
              {{ t('footer.newsletterTitle') }}
            </h2>
            <p class="text-navy/70 mt-1.5">{{ t('footer.newsletterText') }}</p>
          </div>
        </div>
        <div class="w-full lg:w-auto lg:min-w-[400px]">
          <NewsletterForm input-id="nl-email-section" horizontal />
        </div>
      </div>
    </div>
  </section>
</template>
