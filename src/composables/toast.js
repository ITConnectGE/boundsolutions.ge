// Tiny global toast queue. Usage: toast.success('Saved'), toast.error('Failed').
import { reactive } from 'vue'

export const toasts = reactive([])
let seq = 0

export function showToast(message, type = 'success', ms = 2800) {
  const id = ++seq
  toasts.push({ id, message, type })
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === id)
    if (i !== -1) toasts.splice(i, 1)
  }, ms)
}

export const toast = {
  success: (m) => showToast(m, 'success'),
  error: (m) => showToast(m, 'error'),
}
