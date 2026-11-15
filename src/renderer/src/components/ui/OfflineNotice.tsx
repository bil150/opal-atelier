import { useTranslation } from 'react-i18next'
import { useEnvironment } from '@renderer/hooks/use-environment'

/** Reassures web/PWA users that the tools keep working without a connection. */
export function OfflineNotice() {
  const { t } = useTranslation()
  const { isOnline, isDesktop } = useEnvironment()

  if (isOnline || isDesktop) return null

  return (
    <p role="status" className="rounded-md bg-highlight px-3 py-1 text-sm">
      {t('status.offline')}
    </p>
  )
}
