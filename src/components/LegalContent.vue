<script setup>
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import PageHero from './PageHero.vue'

const props = defineProps({
  policy: { type: Object, required: true },
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
const { loc } = useLoc()

usePageMeta({ title: () => t(props.titleKey) })
</script>

<template>
  <PageHero :title="t(titleKey)" :eyebrow="t('footer.legalHeading')">
    <p class="text-gray-400 text-sm mt-4">{{ t('legal.updated') }} {{ loc(policy.updated) }}</p>
  </PageHero>

  <article class="max-w-4xl mx-auto px-6 py-16 lg:py-20">
    <div class="space-y-10 text-[15px] leading-relaxed">
      <section v-for="(s, i) in policy.sections" :key="i" class="fade-in">
        <h2 class="text-xl font-bold text-gray-900 mb-3">{{ loc(s.title) }}</h2>
        <p v-for="(p, pi) in loc(s.paras)" :key="pi" class="text-gray-500 mb-3">{{ p }}</p>
        <ul v-if="s.bullets" class="space-y-2 text-gray-500 mt-2">
          <li v-for="(b, bi) in loc(s.bullets)" :key="bi" class="flex gap-2">
            <span class="text-brand mt-1">•</span><span>{{ b }}</span>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>
