<script setup>
import { ref } from 'vue'
import BaseIcon from './BaseIcon.vue'

defineProps({
  youtube: String,
  src: String,
  poster: String,
  title: String,
})

const loaded = ref(false)
</script>

<template>
  <div class="relative rounded-2xl overflow-hidden shadow-xl bg-gray-900 aspect-video">
    <!-- direct mp4 -->
    <video
      v-if="src"
      class="w-full h-full object-cover"
      controls
      playsinline
      preload="metadata"
      :poster="poster"
    >
      <source :src="src" type="video/mp4" />
    </video>

    <!-- youtube (click to load, privacy-friendly) -->
    <template v-else-if="youtube">
      <button
        v-if="!loaded"
        type="button"
        class="absolute inset-0 w-full h-full flex items-center justify-center group"
        :aria-label="title"
        @click="loaded = true"
      >
        <img
          v-if="poster"
          :src="poster"
          alt=""
          class="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <span
          class="relative w-16 h-16 gradient-bg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-brand/30"
        >
          <BaseIcon name="play" class="w-7 h-7 text-white ml-1" />
        </span>
      </button>
      <iframe
        v-else
        class="w-full h-full"
        :src="`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&modestbranding=1`"
        :title="title"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </template>
  </div>
</template>
