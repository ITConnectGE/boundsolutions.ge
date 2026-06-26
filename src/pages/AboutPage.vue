<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { company, founder, mission, vision, values, team } from '@/data/about.js'
import { partners } from '@/data/social.js'
import PageHero from '@/components/PageHero.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import TeamMemberCard from '@/components/TeamMemberCard.vue'
import PartnerBadge from '@/components/PartnerBadge.vue'
import Testimonials from '@/components/Testimonials.vue'
import ContactCta from '@/components/ContactCta.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const { loc } = useLoc()
const founderImgFailed = ref(false)

usePageMeta({ title: () => t('about.title'), description: () => loc(mission) })
</script>

<template>
  <PageHero :eyebrow="t('about.eyebrow')" :title="t('about.title')" :subtitle="t('about.subtitle')" />

  <!-- COMPANY INTRO — lead with the company, not the founder -->
  <section class="py-20 lg:py-28">
    <div class="max-w-3xl mx-auto px-6 text-center fade-in">
      <p class="text-brand font-semibold text-sm mb-4 tracking-wide">{{ t('about.companyEyebrow') }}</p>
      <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-8 leading-tight">
        {{ t('about.companyTitle') }}
      </h2>
      <p
        v-for="(p, i) in loc(company.intro)"
        :key="i"
        class="text-gray-500 text-[15px] lg:text-base leading-relaxed mb-5"
      >
        {{ p }}
      </p>
    </div>
  </section>

  <!-- MISSION / VISION / VALUES — company first (PPT-style band) -->
  <section class="gradient-bg text-white py-20 lg:py-28">
    <div class="max-w-4xl mx-auto px-6 text-center">
      <div class="fade-in">
        <h2 class="font-brand text-xl lg:text-2xl mb-5 text-white">{{ t('about.missionTitle') }}</h2>
        <p class="text-white/80 text-lg leading-relaxed">{{ loc(mission) }}</p>
      </div>

      <div class="w-12 h-0.5 bg-white/40 mx-auto my-12"></div>

      <div class="fade-in">
        <h2 class="font-brand text-xl lg:text-2xl mb-5 text-white">{{ t('about.visionTitle') }}</h2>
        <p class="text-white/80 text-lg leading-relaxed">{{ loc(vision) }}</p>
      </div>

      <div class="w-12 h-0.5 bg-white/40 mx-auto my-12"></div>

      <div class="fade-in">
        <h2 class="font-brand text-xl lg:text-2xl mb-6 text-white">{{ t('about.valuesTitle') }}</h2>
        <ul class="space-y-3 text-left max-w-2xl mx-auto">
          <li v-for="v in values" :key="v.key" class="flex gap-3">
            <BaseIcon name="check" class="w-4 h-4 text-white mt-1 flex-shrink-0" />
            <span class="text-white/90 leading-relaxed">
              <strong class="text-white">{{ loc(v.title) }}</strong> — {{ loc(v.text) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- FOUNDER (Nino) — secondary, after the company story -->
  <section class="py-20 lg:py-28">
    <div class="max-w-5xl mx-auto px-6">
      <div class="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start fade-in">
        <div class="lg:col-span-2">
          <img
            v-if="!founderImgFailed"
            :src="founder.photo"
            :alt="loc(founder.name)"
            class="w-full aspect-[4/5] object-cover object-top rounded-2xl bg-gray-100"
            @error="founderImgFailed = true"
          />
          <div
            v-else
            class="w-full aspect-[4/5] rounded-2xl bg-cream flex items-center justify-center"
          >
            <img src="/images/BoundSolutions - Nav.png" alt="" class="h-10 opacity-40" />
          </div>
          <a
            :href="founder.linkedin"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex items-center gap-2 text-gray-400 hover:text-brand text-sm transition-colors"
          >
            <BaseIcon name="linkedin" class="w-4 h-4" /> LinkedIn
          </a>
        </div>
        <div class="lg:col-span-3">
          <p class="text-brand font-semibold text-sm mb-4 tracking-wide">
            {{ t('about.founderEyebrow') }}
          </p>
          <h2 class="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
            {{ loc(founder.name) }}
          </h2>
          <p class="text-gray-400 mb-6">{{ loc(founder.role) }}</p>
          <p
            v-for="(p, i) in loc(founder.bio)"
            :key="i"
            class="text-gray-500 text-[15px] leading-relaxed mb-4"
          >
            {{ p }}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- MANAGEMENT TEAM -->
  <section class="py-20 lg:py-28 bg-gray-50/80">
    <div class="max-w-6xl mx-auto px-6">
      <SectionHeading
        :eyebrow="t('about.teamTitle')"
        :title="t('about.teamTitle')"
        :subtitle="t('about.teamSubtitle')"
        center
        class="mb-14"
      />
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <TeamMemberCard v-for="(m, i) in team" :key="i" :member="m" variant="compact" />
      </div>
      <div class="text-center mt-10">
        <RouterLink
          to="/team"
          class="inline-flex items-center gap-2 text-brand font-semibold text-sm hover:gap-3 transition-all"
        >
          {{ t('team.title') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- PARTNER REVIEWS -->
  <Testimonials />

  <!-- PARTNERS -->
  <section class="py-16 lg:py-20">
    <div class="max-w-6xl mx-auto px-6">
      <SectionHeading
        :eyebrow="t('home.partners.eyebrow')"
        :title="t('home.partners.title')"
        center
        class="mb-10"
      />
      <div class="fade-in bg-white border border-gray-100 rounded-2xl px-6 py-10">
        <div class="flex flex-wrap items-center justify-center gap-x-12 gap-y-7">
          <PartnerBadge v-for="p in partners" :key="p.name" :partner="p" />
        </div>
      </div>
    </div>
  </section>

  <ContactCta />
</template>
