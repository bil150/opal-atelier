import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { OpalSymbol } from '@renderer/components/brand/OpalSymbol'
import { PageShell } from '@renderer/components/layout/PageShell'
import { PageWidth } from '@renderer/components/layout/page-width'
import { HOME_SECTIONS, TileTone, type HomeTile } from './home-sections'

const TONE_CLASS: Readonly<Record<TileTone, string>> = {
  [TileTone.Rose]: 'bg-tile-rose',
  [TileTone.Peach]: 'bg-tile-peach',
  [TileTone.Butter]: 'bg-tile-butter',
  [TileTone.Mint]: 'bg-tile-mint',
  [TileTone.Sky]: 'bg-tile-sky',
  [TileTone.Lilac]: 'bg-tile-lilac',
}

const BADGES = ['offline', 'private', 'free'] as const

function Tile({ tile }: { readonly tile: HomeTile }) {
  const { t } = useTranslation()
  return (
    <li className="min-w-0">
      <Link
        to={tile.path}
        className={`group flex h-full min-h-[150px] flex-col gap-1.5 rounded-[20px] p-3.5 sm:min-h-[168px] sm:p-[18px] text-inherit no-underline shadow-[0_1px_0_rgb(0_0_0/.04)] outline-offset-2 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(0_0_0/.35)] focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${TONE_CLASS[tile.tone]}`}
      >
        <span className="flex items-start justify-between">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-2xl bg-paper-2/60 text-[26px] sm:size-14 sm:text-[32px] leading-none transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          >
            {tile.emoji}
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 fill-none stroke-current stroke-2 opacity-0 transition duration-200 [stroke-linecap:round] [stroke-linejoin:round] group-hover:translate-x-0.5 group-hover:opacity-60 group-focus-visible:opacity-60 motion-reduce:transition-none"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
        <b className="mt-1.5 text-base/tight font-bold sm:text-lg/tight">
          {t(`home.tiles.${tile.key}.title`)}
        </b>
        <span className="text-[13px] opacity-75 sm:text-sm">{t(`home.tiles.${tile.key}.description`)}</span>
      </Link>
    </li>
  )
}

/** The home menu: a short welcome, then one section per tool with a tile per entry point. */
export function HomePage() {
  const { t } = useTranslation()

  return (
    <PageShell title={null} breadcrumbs={[{ label: t('app.name') }]} width={PageWidth.Wide}>
      <div className="relative overflow-hidden rounded-[24px] bg-linear-to-br from-tile-sky via-tile-lilac to-tile-rose px-6 py-8 sm:px-9 sm:py-10">
        <OpalSymbol
          width={220}
          height={220}
          className="pointer-events-none absolute -top-10 -right-12 opacity-25 max-sm:hidden"
        />
        <div className="relative flex max-w-[60ch] flex-col gap-3">
          <h1 className="text-3xl/tight font-bold sm:text-4xl/tight">{t('home.welcome')}</h1>
          <p className="text-base/relaxed opacity-80">{t('app.tagline')}</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {BADGES.map((badge) => (
              <li
                key={badge}
                className="rounded-full bg-paper-2/70 px-3 py-1 text-[13px] font-semibold backdrop-blur-sm"
              >
                {t(`home.badges.${badge}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {HOME_SECTIONS.map((section) => (
        <section key={section.key} aria-labelledby={`section-${section.key}`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h2 id={`section-${section.key}`} className="text-xl/snug font-bold">
              {t(`home.sections.${section.key}`)}
            </h2>
            <span className="text-[13px] text-muted">{t('home.tools', { count: section.tiles.length })}</span>
            <p className="basis-full text-sm text-muted">{t(`home.intros.${section.key}`)}</p>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-3">
            {section.tiles.map((tile) => (
              <Tile key={tile.key} tile={tile} />
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  )
}
