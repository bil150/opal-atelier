import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyText } from '@renderer/platform/clipboard'

/** Copies a text and shows "Copied" (or "Couldn’t copy") next to the button for a moment. */
export function useCopyMessage(): readonly [string, (text: string) => void] {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const copy = (text: string) => {
    void copyText(text).then((ok) => {
      setMessage(ok ? t('imageStudy.actions.copied') : t('imageStudy.actions.copyFailed'))
      if (ok) setTimeout(() => setMessage(''), 1600)
    })
  }
  return [message, copy] as const
}
