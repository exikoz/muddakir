/**
 * Device detection — determines if the user is on a mobile device.
 *
 * Strategy: User-Agent + touch capability + platform check.
 * We intentionally do NOT use viewport width so that resizing a
 * desktop browser window never triggers mobile mode.
 *
 * Override: Add `?view=mobile` to force mobile view on desktop (for dev/testing).
 *           Add `?view=desktop` to force desktop view on mobile.
 *
 * Evaluated once at boot and cached.
 */

let _cached: boolean | null = null

function checkUrlOverride(): boolean | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  if (view === 'mobile') return true
  if (view === 'desktop') return false
  return null
}

export function isMobileDevice(): boolean {
  if (_cached !== null) return _cached

  // URL override takes priority — lets you test mobile view on desktop
  const override = checkUrlOverride()
  if (override !== null) {
    _cached = override
    return _cached
  }

  if (typeof navigator === 'undefined') {
    _cached = false
    return false
  }

  const ua = navigator.userAgent || ''

  // 1. User-Agent mobile OS identifiers
  const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)

  // 2. Coarse pointer = touch-primary device
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false

  // 3. maxTouchPoints > 0 catches iPads in desktop-mode Safari
  const hasTouchPoints = navigator.maxTouchPoints > 0

  // 4. Platform string for mobile OS
  const mobilePlatform = /Android|iPhone|iPad|iPod/i.test(navigator.platform || '')

  // Match UA directly, OR all three secondary signals together
  // (prevents desktop touchscreens from false-positive)
  _cached = mobileUA || (coarsePointer && hasTouchPoints && mobilePlatform)
  return _cached
}

/** Reset cache — only useful for testing */
export function _resetDeviceCache() {
  _cached = null
}
