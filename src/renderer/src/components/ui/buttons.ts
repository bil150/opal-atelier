/** Shared button looks (Tailwind classes), as on the original site. */

/** Main action: filled with the ink colour. */
export const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-paper enabled:hover:opacity-90 disabled:cursor-default disabled:opacity-40'

/** Secondary action. */
export const BUTTON_GHOST =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper-2 px-4 text-sm font-medium text-ink enabled:hover:border-ink disabled:cursor-default disabled:opacity-40'

/** Destructive action. */
export const BUTTON_DANGER =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-bad bg-bad-bg px-4 text-sm font-medium text-bad enabled:hover:opacity-90'

/** Small tool button. */
export const TOOL_BUTTON =
  'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-line bg-paper-2 px-3 text-[13px] font-medium text-ink enabled:hover:border-ink aria-pressed:bg-ink aria-pressed:text-paper disabled:cursor-default disabled:opacity-40'

/** Text field. */
export const FIELD =
  'min-h-11 w-full rounded-md border border-line bg-paper-2 px-2.5 text-ellipsis focus:border-ink'

export const LABEL = 'text-[13px] text-muted'
