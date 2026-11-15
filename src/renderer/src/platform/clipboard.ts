/** Copies text; resolves true only if the copy really happened (so "Copied" is never a lie). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return legacyCopy(text) // no Clipboard API (insecure context, old browser) or permission refused
  }
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  try {
    // Deprecated, but the only fallback where the Clipboard API is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}
