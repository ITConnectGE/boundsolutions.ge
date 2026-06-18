<script setup>
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { posts } from '@/data/blog.js'
import { formatDate } from '@/utils/date.js'
import PageHero from '@/components/PageHero.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const { t } = useI18n()
const { loc, locale } = useLoc()

usePageMeta({ title: () => t('blog.title'), description: () => t('blog.subtitle') })
</script>

<template>
  <PageHero :eyebrow="t('blog.eyebrow')" :title="t('blog.title')" :subtitle="t('blog.subtitle')" />

  <section class="py-20 lg:py-28">
    <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <RouterLink
        v-for="p in posts"
        :key="p.slug"
        :to="`/blog/${p.slug}`"
        class="card-hover fade-in block bg-white rounded-2xl overflow-hidden border border-gray-100 group"
      >
        <div class="aspect-video overflow-hidden">
          <img
            :src="p.cover"
            :alt="loc(p.title)"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div class="p-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{
              loc(p.category)
            }}</span>
            <span class="text-gray-300 text-xs">{{ formatDate(p.date, locale) }}</span>
          </div>
          <h2 class="font-bold text-gray-800 mb-2 leading-snug group-hover:text-brand transition-colors">
            {{ loc(p.title) }}
          </h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-4">{{ loc(p.excerpt) }}</p>
          <span class="inline-flex items-center gap-2 text-brand font-semibold text-sm">
            {{ t('blog.readArticle') }} <BaseIcon name="arrowRight" class="w-4 h-4" />
          </span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
