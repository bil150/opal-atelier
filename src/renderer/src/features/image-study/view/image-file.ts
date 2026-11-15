/** Loading pictures (reference image, manufacturer's chart) into canvases. */

/** The image is reduced beyond this size, to keep the page fluid. */
export const MAX_IMAGE_SIDE = 1600

export enum ImageLoadError {
  NotAnImage = 'not-an-image',
  Unreadable = 'unreadable',
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  if (!isImageFile(file)) return Promise.reject(new Error(ImageLoadError.NotAnImage))
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(ImageLoadError.Unreadable))
    }
    img.src = url
  })
}

/** Size after reduction so the longest side is at most `max`. */
export function fitSize(width: number, height: number, max: number): { width: number; height: number } {
  const k = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

/** Draws the image reduced, on white (transparent images would read as black). */
export function shrinkToCanvas(
  img: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  max = MAX_IMAGE_SIDE,
): HTMLCanvasElement {
  const size = fitSize(img.naturalWidth, img.naturalHeight, max)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (ctx) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.drawImage(img, 0, 0, size.width, size.height)
  }
  return canvas
}

/** File name → safe base name for exports: "My photo (1).jpg" → "My-photo-1". */
export function exportBaseName(fileName: string): string {
  return (
    fileName
      .replace(/\.[^.]*$/, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image'
  ).slice(0, 60)
}

/** Lower-case ASCII slug for file names: "Été d’or" → "ete-d-or". */
export function slugify(text: string, fallback: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  )
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png')
  })
}
