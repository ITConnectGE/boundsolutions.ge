<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLoc } from '@/composables/useLocale'
import { usePageMeta } from '@/composables/usePageMeta'
import { posts as defaultPosts } from '@/data/blog.js'
import { collection } from '@/composables/content.js'
import { formatDate } from '@/utils/date.js'
import VideoEmbed from '@/components/VideoEmbed.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const route = useRoute()
const { t } = useI18n()
const { loc, locale } = useLoc()

// Editable from the admin CMS (falls back to the built-in posts).
const posts = computed(() => collection('blog', defaultPosts))
const post = computed(() => posts.value.find((p) => p.slug === route.params.slug))
const others = computed(() =>
  posts.value.filter((p) => p.slug !== route.params.slug).slice(0, 3),
)

// Body may be an HTML string (WYSIWYG) or an array of paragraphs (legacy);
// normalise to HTML for rendering.
const bodyHtml = computed(() => {
  if (!post.value) return ''
  const b = loc(post.value.body)
  if (Array.isArray(b)) return b.map((p) => `<p>${p}</p>`).join('')
  return b || ''
})

usePageMeta({
  title: () => (post.value ? loc(post.value.title) : t('notFound.title')),
  description: () => (post.value ? loc(post.value.excerpt) : ''),
})
</script>

<template>
  <template v-if="post">
    <!-- HEADER -->
    <section class="relative pt-28 pb-10 lg:pt-36 lg:pb-12 overflow-hidden bg-cream-light">
      <div class="absolute top-6 right-0 w-[420px] h-[420px] bg-brand/5 rounded-full blur-[120px]"></div>
      <div class="max-w-3xl mx-auto px-6 relative">
        <RouterLink
          to="/blog"
          class="inline-flex items-center gap-1.5 text-gray-400 hover:text-brand text-sm mb-6 transition-colors"
        >
          <BaseIcon name="arrowRight" class="w-4 h-4 rotate-180" /> {{ t('common.backToBlog') }}
        </RouterLink>
        <div class="flex items-center gap-2 mb-4">
          <span class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{
            loc(post.category)
          }}</span>
          <span class="text-gray-400 text-xs">{{ formatDate(post.date, locale) }}</span>
        </div>
        <h1 class="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
          {{ loc(post.title) }}
        </h1>
        <p class="text-gray-400">{{ loc(post.author) }}</p>
      </div>
    </section>

    <!-- MEDIA -->
    <section class="max-w-3xl mx-auto px-6 -mt-2 lg:mt-2">
      <VideoEmbed
        v-if="post.youtube || post.video"
        :youtube="post.youtube"
        :src="post.video"
        :poster="post.cover"
        :title="loc(post.title)"
      />
      <img
        v-else
        :src="post.cover"
        :alt="loc(post.title)"
        class="w-full aspect-video object-cover rounded-2xl shadow-xl"
      />
    </section>

    <!-- BODY -->
    <article class="max-w-3xl mx-auto px-6 py-12 lg:py-16">
      <div class="rich blog-body text-gray-600 text-[17px] leading-relaxed" v-html="bodyHtml"></div>

      <div v-if="post.tags?.length" class="flex flex-wrap gap-2 mt-8">
        <span
          v-for="tag in post.tags"
          :key="tag"
          class="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg font-medium"
          >{{ tag }}</span
        >
      </div>

      <a
        v-if="post.externalLink"
        :href="post.externalLink"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 text-brand font-semibold text-sm mt-8 hover:gap-3 transition-all"
      >
        {{ t('blog.watchFull') }} <BaseIcon name="external" class="w-4 h-4" />
      </a>
    </article>

    <!-- RELATED -->
    <section class="pb-20">
      <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8">{{ t('blog.related') }}</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <RouterLink
            v-for="p in others"
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
            <div class="p-5">
              <span class="px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">{{
                loc(p.category)
              }}</span>
              <h3 class="font-bold text-gray-800 mt-3 leading-snug group-hover:text-brand transition-colors">
                {{ loc(p.title) }}
              </h3>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </template>

  <section v-else class="min-h-[60vh] flex items-center justify-center px-6 pt-28 pb-20 text-center">
    <div>
      <h1 class="text-2xl font-extrabold text-gray-900 mb-3">{{ t('notFound.title') }}</h1>
      <RouterLink to="/blog" class="text-brand font-semibold">{{ t('common.backToBlog') }}</RouterLink>
    </div>
  </section>
</template>
