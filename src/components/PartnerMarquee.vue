<script setup>
// Auto-scrolling partner logo strip (marquee). Every logo sits in the same
// fixed box (object-contain) so mixed sizes/formats read as one size. The list
// is duplicated so the track can translate by exactly -50% and loop seamlessly.
defineProps({
  partners: { type: Array, required: true },
})
</script>

<template>
  <div class="marquee">
    <div class="marquee-track">
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
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  width: 100%;
  /* fade the left/right edges so logos ease in and out */
  -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
}
.marquee-track {
  display: flex;
  align-items: center;
  width: max-content;
  animation: marquee-scroll 32s linear infinite;
}
.marquee:hover .marquee-track {
  animation-play-state: paused;
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
@keyframes marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.5rem 0;
  }
}
</style>
