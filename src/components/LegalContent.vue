<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { collection } from '@/composables/content.js'
import PageHero from './PageHero.vue'

const props = defineProps({
  collectionName: { type: String, required: true },
  defaultPolicy: { type: Object, required: true },
  titleKey: { type: String, required: true },
})

const { t } = useI18n()
const { loc } = useLoc()

// Editable from the admin CMS (falls back to the built-in policy).
const policy = computed(() => collection(props.collectionName, props.defaultPolicy))

usePageMeta({ title: () => t(props.titleKey) })
</script>

<template>
  <PageHero :title="t(titleKey)" :eyebrow="t('footer.legalHeading')">
    <p class="text-gray-400 text-sm mt-4">{{ t('legal.updated') }} {{ loc(policy.updated) }}</p>
  </PageHero>

  <article class="max-w-4xl mx-auto px-6 py-16 lg:py-20">
    <div class="rich text-[15px] leading-relaxed" v-html="loc(policy.body)"></div>
  </article>
</template>
