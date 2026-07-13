<script setup>
import LegalContent from '@/components/LegalContent.vue'
import { privacyDefault } from '@/data/legal.js'
</script>

<template>
  <LegalContent collection-name="privacy" :default-policy="privacyDefault" title-key="legal.privacyTitle" />
</template>
