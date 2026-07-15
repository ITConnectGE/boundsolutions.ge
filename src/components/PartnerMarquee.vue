<script setup>
// Auto-scrolling partner logo strip (marquee). All logos share one height and
// slide horizontally in a seamless loop. The list is duplicated so the track
// can translate by exactly -50% and repeat with no visible jump.
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
        <img
          v-if="p.logo"
          :src="p.logo"
          :alt="p.name"
          class="h-10 lg:h-12 w-auto object-contain"
          loading="lazy"
        />
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
.marquee-item {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2.75rem;
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
