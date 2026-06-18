<script setup>
import LegalContent from '@/components/LegalContent.vue'
import { terms } from '@/data/legal.js'
</script>

<template>
  <LegalContent :policy="terms" title-key="legal.termsTitle" />
</template>
