// Cookie consent. Nothing that tracks the visitor runs before they agree, and
// neither Google nor Meta is contacted at all until then:
//
//  - the Tag Manager container (which fires GA4) is loaded from here, after
//    consent. Loading it up front and relying on Consent Mode alone would still
//    let Google receive a cookieless ping, which is not "not loaded".
//    index.html sets every consent type to "denied" before anything else, so
//    the container reads the right state the moment it does load.
//  - the Meta Pixel is not inside Tag Manager, so it is loaded from here too -
//    once, and only after consent.
//
// The answer is kept in localStorage, so the banner is shown once and the choice
// survives later visits.
import { ref, computed } from 'vue'

const KEY = 'bs-cookie-consent' // 'granted' | 'denied'
const PIXEL_ID = '1725901878748031'
const GTM_ID = 'GTM-PQQVVZVJ'

function readStored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null // private mode / storage blocked
  }
}

// null = never answered, so the banner is due.
export const consent = ref(typeof window === 'undefined' ? null : readStored())
// Re-opened from the footer ("cookie settings") even once an answer exists.
export const settingsOpen = ref(false)

export const consentAsked = computed(() => consent.value !== null)
export const bannerVisible = computed(() => !consentAsked.value || settingsOpen.value)

// Tag Manager is told through the same dataLayer gtag() shim index.html defines.
function updateGoogleConsent(state) {
  if (typeof window.gtag !== 'function') return
  window.gtag('consent', 'update', {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  })
}

function trackingAllowedHere() {
  const h = window.location.hostname
  return h !== 'localhost' && h !== '127.0.0.1' && !h.startsWith('portal.')
}

function loadTagManager() {
  if (window.__gtmLoaded || !trackingAllowedHere()) return
  window.__gtmLoaded = true
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
  const first = document.getElementsByTagName('script')[0]
  first.parentNode.insertBefore(s, first)
}

function loadMetaPixel() {
  if (window.fbq || !trackingAllowedHere()) return
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
}

// Record the visitor's answer and apply it straight away.
export function setConsent(value) {
  const previous = consent.value
  consent.value = value
  try {
    localStorage.setItem(KEY, value)
  } catch {
    /* choice still applies to this page */
  }
  settingsOpen.value = false

  updateGoogleConsent(value)

  if (value === 'granted') {
    loadTagManager()
    loadMetaPixel()
  } else if (previous === 'granted') {
    // Withdrawn: the Pixel is already on the page and cannot be unloaded, so
    // reload to get a clean page with nothing tracking.
    window.location.reload()
  }
}

export function openConsentSettings() {
  settingsOpen.value = true
}

// Called once on startup: re-apply an answer given on an earlier visit.
export function initConsent() {
  if (consent.value === 'granted') {
    updateGoogleConsent('granted')
    loadTagManager()
    loadMetaPixel()
  }
}
