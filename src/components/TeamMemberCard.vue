<script setup>
import { ref } from 'vue'
import { useLoc } from '@/composables/useLocale'

defineProps({
  member: { type: Object, required: true },
  variant: { type: String, default: 'grid' }, // 'grid' (Team page) | 'compact' (About)
})

const { loc } = useLoc()
const failed = ref(false)

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
</script>

<template>
  <!-- Team page: full card -->
  <div
    v-if="variant === 'grid'"
    class="fade-in card-hover bg-white rounded-2xl border border-gray-100 overflow-hidden text-center"
  >
    <div class="aspect-square bg-cream flex items-center justify-center overflow-hidden">
      <img
        v-if="member.photo && !failed"
        :src="member.photo"
        :alt="loc(member.name)"
        class="w-full h-full object-cover object-top"
        loading="lazy"
        @error="failed = true"
      />
      <span v-else class="text-4xl font-extrabold gradient-text">{{ initials(loc(member.name)) }}</span>
    </div>
    <div class="p-6">
      <h3 class="font-bold text-gray-800">{{ loc(member.name) }}</h3>
      <p class="text-sm text-gray-400 mt-1">{{ loc(member.role) }}</p>
    </div>
  </div>

  <!-- About page: compact card -->
  <div v-else class="fade-in text-center rounded-2xl p-6 bg-white border border-gray-100">
    <div
      class="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-cream flex items-center justify-center"
    >
      <img
        v-if="member.photo && !failed"
        :src="member.photo"
        :alt="loc(member.name)"
        class="w-full h-full object-cover object-top"
        loading="lazy"
        @error="failed = true"
      />
      <span v-else class="text-xl font-extrabold gradient-text">{{ initials(loc(member.name)) }}</span>
    </div>
    <h3 class="font-bold text-gray-800">{{ loc(member.name) }}</h3>
    <p class="text-xs text-gray-400 mt-1">{{ loc(member.role) }}</p>
  </div>
</template>
