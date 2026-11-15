/**
 * Manufacturer's charts in PDF, read with pdf.js (loaded only when a PDF is first opened). One page at a
 * time is drawn on a white canvas, then read like an image; its text can be read in a zone.
 */
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist'
import type * as PdfJsModule from 'pdfjs-dist'
import type { PositionedText } from './zone-text'

/** Charts have many small swatches: pages are drawn bigger than the reference image. */
const PDF_MAX_SIDE = 2400
export const PDF_MAX_BYTES = 60 * 1024 * 1024

export enum PdfError {
  Password = 'password',
  Invalid = 'invalid',
  Unreadable = 'unreadable',
}

type PdfJs = typeof PdfJsModule
let pdfjs: Promise<PdfJs> | null = null

function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
    ([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default
      return lib
    },
  )
  return pdfjs
}

export interface RenderedPage {
  readonly canvas: HTMLCanvasElement
  /** Text items positioned in canvas pixels, for zone reading. */
  readonly text: () => Promise<PositionedText[]>
}

export class PdfChart {
  readonly #doc: PDFDocumentProxy
  readonly #lib: PdfJs
  readonly #task: PDFDocumentLoadingTask

  private constructor(doc: PDFDocumentProxy, lib: PdfJs, task: PDFDocumentLoadingTask) {
    this.#doc = doc
    this.#lib = lib
    this.#task = task
  }

  static async open(file: File): Promise<PdfChart> {
    const lib = await loadPdfJs()
    try {
      const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
      return new PdfChart(await task.promise, lib, task)
    } catch (e) {
      const name = (e as { name?: string } | null)?.name
      throw new Error(
        name === 'PasswordException'
          ? PdfError.Password
          : name === 'InvalidPDFException'
            ? PdfError.Invalid
            : PdfError.Unreadable,
        { cause: e },
      )
    }
  }

  get pageCount(): number {
    return this.#doc.numPages
  }

  /** Draws a page (1-based) on white: transparent PDF backgrounds would read as black. */
  async renderPage(n: number): Promise<RenderedPage> {
    const page: PDFPageProxy = await this.#doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport: PageViewport = page.getViewport({
      scale: Math.min(4, PDF_MAX_SIDE / Math.max(base.width, base.height)),
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error(PdfError.Unreadable)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const util = this.#lib.Util
    return {
      canvas,
      text: async () => {
        const content = await page.getTextContent()
        return content.items.flatMap((raw) => {
          if (!('str' in raw) || !raw.str.trim()) return []
          const m = util.transform(viewport.transform, raw.transform as number[]) as number[]
          const height = Math.hypot(m[2] ?? 0, m[3] ?? 0) || 10
          const width = (raw.width || 0) * viewport.scale
          return [{ text: raw.str, x: m[4] ?? 0, y: (m[5] ?? 0) - height / 2, width, height }]
        })
      },
    }
  }

  destroy(): void {
    void this.#task.destroy() // also stops the worker
  }
}
