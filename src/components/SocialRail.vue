<script setup>
import BaseIcon from './BaseIcon.vue'

const links = [
  { name: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/boundsolutions/' },
  {
    name: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61581814735975',
  },
  { name: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/nino-bartaia-ba619b88/' },
]
</script>

<template>
  <!-- Fixed vertical rail on the left, wide screens only (sits in the gutter) -->
  <div class="hidden xl:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-3">
    <a
      v-for="l in links"
      :key="l.name"
      :href="l.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="l.label"
      class="w-10 h-10 rounded-full bg-white/90 backdrop-blur text-gray-500 shadow-md ring-1 ring-black/5 flex items-center justify-center hover:bg-brand hover:text-white hover:-translate-y-0.5 transition-all duration-200"
    >
      <BaseIcon :name="l.name" class="w-4 h-4" />
    </a>
    <span class="w-px h-16 bg-gradient-to-b from-gray-300 to-transparent mt-1"></span>
  </div>
</template>
