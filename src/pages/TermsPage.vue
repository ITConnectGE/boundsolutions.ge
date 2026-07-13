<script setup>
import LegalContent from '@/components/LegalContent.vue'
import { termsDefault } from '@/data/legal.js'
</script>

<template>
  <LegalContent collection-name="terms" :default-policy="termsDefault" title-key="legal.termsTitle" />
</template>
