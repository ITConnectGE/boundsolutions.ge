<script setup>
// Inline-editable text bound to an i18n key. Renders t(tkey) normally; when the
// admin is in edit mode, clicking it opens an inline editor that saves the value
// to the DB (overrides) and updates the page live.
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { editMode, canEdit } from '@/composables/editMode'
import { saveTexts, applyOne } from '@/composables/content'

const props = defineProps({
  tkey: { type: String, required: true },
  tag: { type: String, default: 'span' },
})

const { t, locale } = useI18n()
const active = computed(() => editMode.value && canEdit.value)
const editing = ref(false)
const saving = ref(false)
const draft = ref('')
const box = ref(null)

async function onClick(e) {
  if (!active.value) return // not in edit mode → behave normally (links navigate etc.)
  e.preventDefault()
  e.stopPropagation()
  draft.value = t(props.tkey)
  editing.value = true
  await nextTick()
  box.value?.focus()
}

async function save() {
  saving.value = true
  try {
    await saveTexts([
      { key: props.tkey, locale: locale.value, value: draft.value, type: 'text', group: props.tkey.split('.')[0] },
    ])
    applyOne(locale.value, props.tkey, draft.value)
    editing.value = false
  } catch (e) {
    alert('ვერ შეინახა / Could not save: ' + (e.message || ''))
  }
  saving.value = false
}
</script>

<template>
  <!-- Inline editor -->
  <span v-if="editing" class="bs-edit-box" @click.stop>
    <textarea
      ref="box"
      v-model="draft"
      rows="3"
      @keydown.esc="editing = false"
      @keydown.enter.exact.prevent="save"
    ></textarea>
    <span class="bs-edit-actions">
      <button type="button" class="bs-save" :disabled="saving" @click="save">✓ შენახვა</button>
      <button type="button" class="bs-cancel" @click="editing = false">✕</button>
    </span>
  </span>

  <!-- Normal render (editable outline when in edit mode) -->
  <component
    :is="tag"
    v-else
    :class="active ? 'bs-editable' : ''"
    :title="active ? 'დააკლიკე რედაქტირებისთვის' : null"
    @click="onClick"
  >{{ t(tkey) }}</component>
</template>

<style>
.bs-editable {
  outline: 1px dashed rgba(240, 85, 83, 0.7);
  outline-offset: 3px;
  border-radius: 3px;
  cursor: text;
  transition: background 0.15s;
}
.bs-editable:hover {
  outline-style: solid;
  background: rgba(240, 85, 83, 0.08);
}
.bs-edit-box {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  vertical-align: top;
  text-align: left;
}
.bs-edit-box textarea {
  min-width: 260px;
  max-width: 90vw;
  padding: 8px 10px;
  border: 2px solid #f05553;
  border-radius: 8px;
  font: 400 14px/1.4 'Montserrat', 'Noto Sans Georgian', sans-serif;
  color: #111827;
  background: #fff;
  resize: vertical;
}
.bs-edit-actions {
  display: inline-flex;
  gap: 6px;
}
.bs-edit-actions button {
  font: 600 12px/1 'Montserrat', sans-serif;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
}
.bs-edit-actions .bs-save {
  background: #f05553;
  color: #fff;
}
.bs-edit-actions .bs-save:disabled {
  opacity: 0.6;
}
.bs-edit-actions .bs-cancel {
  background: #e5e7eb;
  color: #374151;
}
</style>
