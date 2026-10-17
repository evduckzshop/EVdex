// Copy to clipboard with a fallback for older iOS Safari and any context
// where the async Clipboard API isn't available. Must be called from a real
// user gesture (a tap), or both paths are refused by the browser.

export async function copyText(text) {
  if (!text) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permission denied or non-secure context — try the legacy path.
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    // Keep it off-screen but still selectable; display:none would break copy.
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
