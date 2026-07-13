<script setup>
import { toasts } from '@/composables/toast'
import BaseIcon from './BaseIcon.vue'
</script>

<template>
  <div class="fixed top-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-2 pl-3 pr-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white"
        :class="t.type === 'error' ? 'bg-red-500' : 'bg-green-600'"
      >
        <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <BaseIcon :name="t.type === 'error' ? 'close' : 'check'" class="w-4 h-4" />
        </span>
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
