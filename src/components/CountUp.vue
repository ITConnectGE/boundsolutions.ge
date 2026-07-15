<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Animates a stat value (e.g. "500+", "20+", "1,200", "95%") from 0 up to its
// number the first time it scrolls into view. Any prefix/suffix ("+", "%", "$")
// and thousands grouping are preserved.
const props = defineProps({
  value: { type: [String, Number], default: '' },
  duration: { type: Number, default: 1800 },
})

const el = ref(null)
const display = ref('')

function parse(v) {
  const s = String(v ?? '')
  const m = s.match(/^(\D*)([\d.,]+)(.*)$/s)
  if (!m) return { valid: false, raw: s }
  const num = m[2]
  const clean = num.replace(/,/g, '')
  return {
    valid: true,
    prefix: m[1],
    suffix: m[3],
    target: parseFloat(clean) || 0,
    decimals: clean.includes('.') ? clean.split('.')[1].length : 0,
    grouped: num.includes(','),
  }
}

function format(n, p) {
  let str = n.toFixed(p.decimals)
  if (p.grouped) {
    const [int, dec] = str.split('.')
    str = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '')
  }
  return p.prefix + str + p.suffix
}

// Render the final value up front (correct for SSR / no-JS / first paint).
const parsed = parse(props.value)
display.value = parsed.valid ? format(parsed.target, parsed) : parsed.raw

let raf
function animate() {
  if (!parsed.valid) return
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    display.value = format(parsed.target * eased, parsed)
    if (t < 1) raf = requestAnimationFrame(tick)
    else display.value = format(parsed.target, parsed)
  }
  raf = requestAnimationFrame(tick)
}

let io
onMounted(() => {
  if (!parsed.valid) return
  if (typeof IntersectionObserver === 'undefined') return // keep final value
  display.value = format(0, parsed) // reset to 0, then count up when visible
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate()
          io.disconnect()
        }
      })
    },
    { threshold: 0.4 },
  )
  if (el.value) io.observe(el.value)
})
onBeforeUnmount(() => {
  if (io) io.disconnect()
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <span ref="el">{{ display }}</span>
</template>
