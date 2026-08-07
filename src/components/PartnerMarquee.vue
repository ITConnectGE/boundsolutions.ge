<script setup>
// Partner logo strip: a horizontally scrollable track with a gentle auto-scroll
// (pauses on hover) plus prev/next arrows and native touch-swipe. Every logo
// sits in the same fixed box (object-contain) so mixed sizes read as one size.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BaseIcon from './BaseIcon.vue'

defineProps({
  partners: { type: Array, required: true },
})

const track = ref(null)
const hovering = ref(false)
let raf = null
let manualHold = false
let resumeT = null
const SPEED = 0.5 // px per frame for the ambient auto-scroll

function loop() {
  const el = track.value
  if (el && !hovering.value && !manualHold) {
    el.scrollLeft += SPEED
    // The list is duplicated, so wrapping at the halfway point is seamless.
    const half = el.scrollWidth / 2
    if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half
  }
  raf = requestAnimationFrame(loop)
}

function nudge(dir) {
  const el = track.value
  if (!el) return
  manualHold = true // hold the auto-scroll while the smooth manual scroll runs
  el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 440), behavior: 'smooth' })
  clearTimeout(resumeT)
  resumeT = setTimeout(() => (manualHold = false), 1000)
}

onMounted(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!reduce) raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  clearTimeout(resumeT)
})
</script>

<template>
  <div class="marquee-wrap" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <button type="button" class="nav-btn nav-prev" aria-label="Previous" @click="nudge(-1)">
      <BaseIcon name="arrowRight" class="w-5 h-5 rotate-180" />
    </button>

    <div ref="track" class="marquee-scroll">
      <div
        v-for="(p, i) in [...partners, ...partners]"
        :key="i"
        class="marquee-item"
        aria-hidden="true"
      >
        <img v-if="p.logo" :src="p.logo" :alt="p.name" class="marquee-logo" loading="lazy" />
        <span v-else class="font-brand text-gray-400 text-lg whitespace-nowrap">{{ p.name }}</span>
      </div>
    </div>

    <button type="button" class="nav-btn nav-next" aria-label="Next" @click="nudge(1)">
      <BaseIcon name="arrowRight" class="w-5 h-5" />
    </button>
  </div>
</template>

<style scoped>
.marquee-wrap {
  position: relative;
  width: 100%;
}
.marquee-scroll {
  display: flex;
  align-items: center;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  /* fade the left/right edges so logos ease in and out */
  -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
}
.marquee-scroll::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
/* Every logo gets the SAME fixed box; object-contain scales each one to fit it,
   so mixed sizes/aspect ratios all read as one uniform footprint. */
.marquee-item {
  flex: 0 0 auto;
  box-sizing: content-box;
  width: 13rem;
  height: 5.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.75rem;
}
.marquee-logo {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
@media (min-width: 1024px) {
  .marquee-item {
    width: 18rem;
    height: 7rem;
    padding: 0 2.25rem;
  }
}

/* Modern circular arrow controls */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  background: #fff;
  color: var(--color-navy, #1a2b4a);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 6px 20px -6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}
.nav-btn:hover {
  color: var(--color-brand, #f05553);
  box-shadow: 0 10px 26px -8px rgba(0, 0, 0, 0.35);
  transform: translateY(-50%) scale(1.08);
}
.nav-btn:active {
  transform: translateY(-50%) scale(0.96);
}
.nav-prev {
  left: -0.5rem;
}
.nav-next {
  right: -0.5rem;
}
@media (min-width: 1024px) {
  .nav-prev {
    left: -1.75rem;
  }
  .nav-next {
    right: -1.75rem;
  }
}
</style>
