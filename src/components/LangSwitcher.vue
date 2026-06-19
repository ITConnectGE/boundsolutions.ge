<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import BaseIcon from './BaseIcon.vue'

const { locale } = useI18n()
const { setLocale } = useLocale()

const langs = [
  { code: 'ka', label: 'ქართული', short: 'ქარ' },
  { code: 'en', label: 'English', short: 'EN' },
]

const open = ref(false)
const root = ref(null)
const current = computed(() => langs.find((l) => l.code === locale.value) || langs[0])

function choose(code) {
  setLocale(code)
  open.value = false
}
function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      class="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors text-sm font-semibold"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-label="Language"
      @click="open = !open"
    >
      <BaseIcon name="globe" class="w-4 h-4" />
      <span>{{ current.short }}</span>
      <BaseIcon
        name="chevronDown"
        class="w-3.5 h-3.5 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <transition name="page">
      <ul
        v-if="open"
        class="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-1 z-[60]"
        role="listbox"
      >
        <li v-for="l in langs" :key="l.code">
          <button
            class="w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors hover:bg-gray-50"
            :class="l.code === locale ? 'text-brand font-semibold' : 'text-gray-600'"
            role="option"
            :aria-selected="l.code === locale"
            @click="choose(l.code)"
          >
            {{ l.label }}
            <BaseIcon v-if="l.code === locale" name="check" class="w-4 h-4" />
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>
