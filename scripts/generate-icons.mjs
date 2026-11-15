/**
 * Renders build/icon.svg into every icon the app needs, using Electron's Chromium.
 * Run with: npm run icons
 *
 * Outputs
 *   src/renderer/public/icons/favicon.svg         flat logo symbol (build/logo-symbol.svg), crisp at 16 px
 *   src/renderer/public/icons/icon-192.png        PWA
 *   src/renderer/public/icons/icon-512.png        PWA
 *   src/renderer/public/icons/maskable-512.png    PWA (Android adaptive icon, disc inside the safe zone)
 *   src/renderer/public/icons/apple-touch-icon.png  iOS home screen (opaque, 180×180)
 *   build/icon.png                                electron-builder (1024×1024, ico/icns derived from it)
 */
import { app, BrowserWindow } from 'electron'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER = resolve(ROOT, 'build/icon.svg')
const PUBLIC_ICONS = resolve(ROOT, 'src/renderer/public/icons')

/** Background behind the disc for icons that must be opaque. */
const OPAQUE_BACKGROUND = '#0F141D'

const targets = [
  { file: resolve(PUBLIC_ICONS, 'icon-192.png'), size: 192, scale: 1, background: null },
  { file: resolve(PUBLIC_ICONS, 'icon-512.png'), size: 512, scale: 1, background: null },
  // Maskable: the safe zone is the centred circle of 80 % diameter.
  { file: resolve(PUBLIC_ICONS, 'maskable-512.png'), size: 512, scale: 0.78, background: OPAQUE_BACKGROUND },
  {
    file: resolve(PUBLIC_ICONS, 'apple-touch-icon.png'),
    size: 180,
    scale: 0.86,
    background: OPAQUE_BACKGROUND,
  },
  { file: resolve(ROOT, 'build/icon.png'), size: 1024, scale: 1, background: null },
]

/** Draws the SVG on a canvas inside Chromium and returns the PNG bytes. */
async function render(window, svg, target) {
  const dataUrl = await window.webContents.executeJavaScript(`(async () => {
    const { size, scale, background, svg } = ${JSON.stringify({ ...target, svg })}
    const image = new Image()
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const context = canvas.getContext("2d")
    if (background) { context.fillStyle = background; context.fillRect(0, 0, size, size) }
    const inner = size * scale
    context.imageSmoothingQuality = "high"
    context.drawImage(image, (size - inner) / 2, (size - inner) / 2, inner, inner)
    return canvas.toDataURL("image/png")
  })()`)
  await writeFile(target.file, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log(`✓ ${target.file.slice(ROOT.length + 1)} (${target.size}×${target.size})`)
}

app.whenReady().then(async () => {
  try {
    const svg = await readFile(MASTER, 'utf8')
    await copyFile(resolve(ROOT, 'build/logo-symbol.svg'), resolve(PUBLIC_ICONS, 'favicon.svg'))
    console.log('✓ src/renderer/public/icons/favicon.svg')
    const window = new BrowserWindow({ show: false })
    await window.loadURL('about:blank')
    for (const target of targets) await render(window, svg, target)
    window.destroy()
    app.exit(0)
  } catch (error) {
    console.error(error)
    app.exit(1)
  }
})
