<script setup>
import BaseIcon from './BaseIcon.vue'

defineProps({
  variant: { type: String, default: 'circle' }, // 'circle' | 'chip' | 'footer'
})

const styles = {
  circle:
    'w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-brand/10 hover:text-brand transition-colors',
  footer:
    'w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/80 hover:bg-brand hover:text-white transition-colors',
  chip: 'flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-50 text-gray-500 text-sm font-medium hover:text-brand transition-colors',
}

const links = [
  { name: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/boundsolutions/' },
  {
    name: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61581814735975',
  },
  {
    name: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/human-bound-solutions/',
  },
]
</script>

<template>
  <div class="flex items-center gap-3" :class="variant === 'chip' ? 'flex-wrap' : ''">
    <a
      v-for="l in links"
      :key="l.name"
      :href="l.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="l.label"
      :class="styles[variant] || styles.circle"
    >
      <BaseIcon :name="l.name" :class="variant === 'chip' ? 'w-5 h-5' : 'w-4 h-4'" />
      <span v-if="variant === 'chip'">{{ l.label }}</span>
    </a>
  </div>
</template>
