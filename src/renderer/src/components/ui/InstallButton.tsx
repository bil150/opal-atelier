import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnvironment } from '@renderer/hooks/use-environment'
import { InstallMethod, InstallResult } from '@renderer/platform'

/** Offers to install the PWA. Hidden in the desktop app, in an installed PWA and where install isn't possible. */
export function InstallButton() {
  const { t } = useTranslation()
  const { installMethod, install } = useEnvironment()
  const [showIosHint, setShowIosHint] = useState(false)

  if (installMethod === InstallMethod.None) return null

  const handleClick = async () => {
    const result = await install()
    if (result === InstallResult.ManualStepsRequired) setShowIosHint(true)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        className="rounded-md border border-line bg-paper-2 px-3 py-1 text-sm hover:border-ink"
      >
        {t('install.action')}
      </button>
      {showIosHint ? (
        <p role="status" className="max-w-64 text-right text-xs text-muted">
          {t('install.iosHint')}
        </p>
      ) : null}
    </div>
  )
}
