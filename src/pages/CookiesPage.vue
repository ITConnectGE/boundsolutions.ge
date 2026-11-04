<script setup>
import LegalContent from '@/components/LegalContent.vue'
import { cookiesDefault } from '@/data/legal.js'
</script>

<template>
  <LegalContent collection-name="cookies" :default-policy="cookiesDefault" title-key="legal.cookiesTitle" />
</template>
