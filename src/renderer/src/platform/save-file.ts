export enum SaveOutcome {
  Saved = 'saved',
  Cancelled = 'cancelled',
}

export interface SaveFileOptions {
  readonly suggestedName: string
  readonly mimeType: string
  /** With the leading dot, e.g. ['.json']. */
  readonly extensions: readonly string[]
  /** Shown in the system dialog's file-type list. */
  readonly description: string
}

interface SaveFilePickerOptions {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}

interface WindowWithSavePicker extends Window {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
}

/**
 * Saves a file the best way the platform allows:
 * - native "Save as" dialog where the File System Access API exists (Electron, desktop Chrome/Edge);
 * - otherwise a regular download (Firefox, Safari, mobile browsers).
 */
export async function saveFile(
  blob: Blob,
  options: SaveFileOptions,
  win: Window = window,
): Promise<SaveOutcome> {
  const picker = (win as WindowWithSavePicker).showSaveFilePicker
  if (!picker) {
    download(blob, options.suggestedName, win.document)
    return SaveOutcome.Saved
  }

  try {
    const handle = await picker.call(win, {
      suggestedName: options.suggestedName,
      types: [{ description: options.description, accept: { [options.mimeType]: [...options.extensions] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return SaveOutcome.Saved
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return SaveOutcome.Cancelled
    throw error
  }
}

function download(blob: Blob, fileName: string, document: Document): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
