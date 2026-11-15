import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Logo } from '@renderer/components/brand/Logo'

export interface Crumb {
  readonly label: string
  /** Omitted for the current page (last crumb). */
  readonly to?: string
}

/** The trail of the current page; its first step, the app itself, is shown as the logo. */
export function Breadcrumbs({ items }: { readonly items: readonly Crumb[] }) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('nav.breadcrumb')} className="mr-auto">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 ? (
              <li aria-hidden="true" className="text-muted">
                /
              </li>
            ) : null}
            <li className="font-semibold">
              {i === 0 ? (
                item.to ? (
                  <Link to={item.to} className="block text-ink no-underline hover:opacity-80">
                    <Logo height={48} />
                  </Link>
                ) : (
                  <span aria-current="page" className="block">
                    <Logo height={48} />
                  </span>
                )
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="font-medium text-muted no-underline hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
