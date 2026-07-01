// Inline edit mode: when an admin is logged in they can toggle an "edit" mode and
// edit text directly on the public site (see EditableText.vue).
import { ref, computed } from 'vue'
import { hasApi, authToken } from './api'

// Whether inline editing is currently turned on.
export const editMode = ref(false)

// The admin is able to edit only when an API is configured and they're logged in.
export const canEdit = computed(() => hasApi() && !!authToken.value)

export function toggleEdit() {
  editMode.value = !editMode.value
}
