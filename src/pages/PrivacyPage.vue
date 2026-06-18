<script setup>
import LegalContent from '@/components/LegalContent.vue'
import { privacy } from '@/data/legal.js'
</script>

<template>
  <LegalContent :policy="privacy" title-key="legal.privacyTitle" />
</template>
