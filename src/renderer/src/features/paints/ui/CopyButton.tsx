import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyText } from '@renderer/platform/clipboard'

/** Copies a paint's name (and brand); a tick confirms it for a moment, only if the copy happened. */
export function CopyNameButton({ text }: { readonly text: string }) {
  const { t } = useTranslation()
  const [done, setDone] = useState(false)
  const copy = async () => {
    if (!(await copyText(text))) return
    setDone(true)
    setTimeout(() => setDone(false), 1200)
  }
  return (
    <button
      type="button"
      title={done ? t('imageStudy.actions.copied') : t('imageStudy.actions.copy')}
      aria-label={t('imageStudy.actions.copyLabel', { name: text })}
      onClick={(e) => {
        e.stopPropagation()
        void copy()
      }}
      className="grid size-8 flex-none place-items-center rounded-md border border-line bg-paper-2 hover:border-ink"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
      >
        {done ? (
          <path d="M5 13l4 4L19 7" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h8" />
          </>
        )}
      </svg>
    </button>
  )
}
