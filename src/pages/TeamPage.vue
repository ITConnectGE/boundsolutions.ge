<script setup>
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { team } from '@/data/about.js'
import PageHero from '@/components/PageHero.vue'
import TeamMemberCard from '@/components/TeamMemberCard.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const { loc } = useLoc()

usePageMeta({ title: () => t('team.title'), description: () => t('team.subtitle') })
</script>

<template>
  <PageHero :eyebrow="t('team.eyebrow')" :title="t('team.title')" :subtitle="t('team.subtitle')" />

  <!-- TEAM GRID -->
  <section class="py-20 lg:py-28">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <TeamMemberCard v-for="(m, i) in team" :key="i" :member="m" variant="grid" />
      </div>
    </div>
  </section>

  <!-- JOIN CTA -->
  <section class="pb-24">
    <div class="max-w-4xl mx-auto px-6">
      <div
        class="fade-in rounded-3xl p-10 lg:p-14 text-center relative overflow-hidden gradient-bg text-white"
      >
        <div class="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div class="relative">
          <h2 class="text-2xl lg:text-3xl font-extrabold mb-3">{{ t('team.joinTitle') }}</h2>
          <p class="text-white/80 max-w-md mx-auto mb-8">{{ t('team.joinText') }}</p>
          <RouterLink
            to="/vacancies"
            class="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/90 transition-all"
          >
            {{ t('nav.vacancies') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
