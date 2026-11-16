import { useId, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Note, Panel } from '@renderer/components/ui/Panel'
import { Segmented } from '@renderer/components/ui/Segmented'
import {
  cssColor,
  desaturate,
  fromOklab,
  hexToRgb01,
  hueDifference,
  mod,
  painterColor,
  polar,
  polygonPath,
  readableInk,
  sectorPath,
  toGrey,
  toOklab,
  type Rgb01,
} from '@renderer/lib/color-theory'

/**
 * Colour theory cards: short notions, each with an illustration to play with. Original texts and
 * figures; the 7 contrasts are cited after J. Itten (1961), without reproducing his plates.
 */
export function TheoryView() {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] content-start gap-5 pb-2">
      <PrimariesCard />
      <ComplementsCard />
      <TemperatureCard />
      <ValuesCard />
      <ContrastsCard />
      <p className="col-span-full mx-1 mt-1 text-[13px] opacity-70">
        <Trans i18nKey="color.theory.source" />
      </p>
      <span className="sr-only">{t('color.tabs.theory')}</span>
    </div>
  )
}

const card = 'gap-3 [&_h2]:text-[15px] [&_h2]:opacity-100'
const text = 'text-sm/[1.45]'
const fill = (c: Rgb01) => cssColor(c)

function HueSlider({
  label,
  value,
  onChange,
}: {
  readonly label: string
  readonly value: number
  readonly onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <>
      <label htmlFor={id} className="-mb-1.5 text-[13px] font-semibold opacity-70">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={330}
        step={30}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
    </>
  )
}

enum Rank {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary',
}

function PrimariesCard() {
  const { t } = useTranslation()
  const [rank, setRank] = useState(Rank.Primary)
  const names = t('color.hues.ryb', { returnObjects: true })
  const highlighted = (i: number) =>
    rank === Rank.Tertiary ? i % 2 === 1 : rank === Rank.Primary ? i % 4 === 0 : i % 4 === 2
  const lines = t(`color.theory.primaries.lines.${rank}`, { returnObjects: true })
  const linked = rank === Rank.Primary ? [0, 120, 240] : rank === Rank.Secondary ? [60, 180, 300] : null

  return (
    <Panel as="article" title={t('color.theory.primaries.title')} className={card}>
      <p className={text}>
        <Trans i18nKey="color.theory.primaries.text" />
      </p>
      <Segmented
        label={t('color.theory.primaries.rank')}
        value={rank}
        onChange={setRank}
        stretch
        options={Object.values(Rank).map((r) => ({
          value: r,
          label: t(`color.theory.primaries.ranks.${r}`),
        }))}
      />
      <svg
        viewBox="-105 -105 210 210"
        role="img"
        aria-label={t('color.theory.primaries.figure', {
          list: names.filter((_, i) => highlighted(i)).join(', '),
        })}
        className="mx-auto block w-[min(100%,260px)]"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={sectorPath(i * 30 - 15, i * 30 + 15, 100, 56)}
            fill={fill(painterColor(i * 30))}
            className={`stroke-panel stroke-1 transition-opacity duration-200 ${highlighted(i) ? 'opacity-100' : 'opacity-[.16]'}`}
          />
        ))}
        {linked ? (
          <path
            d={polygonPath(linked.map((a) => polar(a, 52)))}
            className="fill-none stroke-ink stroke-1 opacity-50 [stroke-dasharray:3_3]"
          />
        ) : null}
        {lines.map((line, k) => (
          <text
            key={line}
            x={0}
            y={(k - (lines.length - 1) / 2) * 11 + 3}
            className="fill-ink text-[8px] font-semibold [text-anchor:middle]"
          >
            {line}
          </text>
        ))}
      </svg>
    </Panel>
  )
}

enum Pattern {
  Square = 'square',
  Stripes = 'stripes',
  Checks = 'checks',
}
enum Nuance {
  Pure = 'pure',
  Pastel = 'pastel',
  Broken = 'broken',
}
const SHIFTS = [45, 60, 75] as const

/** Pastel = lightened with white and softened; broken = greyed at equal lightness (OKLab). */
function applyNuance(c: Rgb01, nuance: Nuance): Rgb01 {
  if (nuance === Nuance.Pastel) {
    const [L, A, B] = toOklab(c)
    return fromOklab([L + (1 - L) * 0.55, A * 0.55, B * 0.55])
  }
  return nuance === Nuance.Broken ? desaturate(c, 0.45) : c
}

function ComplementsCard() {
  const { t } = useTranslation()
  const [hue, setHue] = useState(120)
  const [pattern, setPattern] = useState(Pattern.Square)
  const [shift, setShift] = useState<number>(45)
  const [nuance, setNuance] = useState(Nuance.Pastel)
  const names = t('color.hues.ryb', { returnObjects: true })
  const nameAt = (angle: number) => (names[mod(Math.round(mod(angle, 360) / 30), 12)] ?? '').toLowerCase()
  const base = painterColor(hue)

  const figure = (angle: number, caption: string, withNuance: boolean) => {
    const partner = withNuance ? applyNuance(painterColor(angle), nuance) : painterColor(angle)
    const A = fill(base)
    const B = fill(partner)
    const name =
      withNuance && nuance === Nuance.Pastel
        ? t('color.theory.complements.pale', { name: nameAt(angle) })
        : withNuance && nuance === Nuance.Broken
          ? t('color.theory.complements.broken', { name: nameAt(angle) })
          : nameAt(angle)
    const background =
      pattern === Pattern.Stripes
        ? `repeating-linear-gradient(90deg, ${A} 0 9px, ${B} 9px 18px)`
        : pattern === Pattern.Checks
          ? `repeating-conic-gradient(${A} 0 25%, ${B} 0 50%) 0 0 / 22px 22px`
          : A
    return (
      <figure className="flex flex-col gap-1.5 text-center text-xs font-semibold">
        <div
          role="img"
          aria-label={t('color.theory.complements.pair', { a: names[hue / 30] ?? '', b: name })}
          className="grid aspect-square place-items-center rounded-[10px] border border-line"
          style={{ background }}
        >
          {pattern === Pattern.Square ? (
            <span className="aspect-square w-[42%] rounded" style={{ background: B }} />
          ) : null}
        </div>
        <figcaption>
          {caption}
          <br />
          <small className="font-normal opacity-70">{name}</small>
        </figcaption>
      </figure>
    )
  }

  const row = (label: string, control: ReactNode) => (
    <div className="flex items-center gap-2.5">
      <span className="flex-[0_0_56px] text-[13px] font-semibold opacity-70">{label}</span>
      <div className="flex-1">{control}</div>
    </div>
  )

  return (
    <Panel as="article" title={t('color.theory.complements.title')} className={card}>
      <p className={text}>{t('color.theory.complements.intro')}</p>
      <ul className="-mt-1 flex list-disc flex-col gap-1 pl-[18px] text-sm/snug">
        {(['complementary', 'near', 'shifted'] as const).map((key) => (
          <li key={key}>
            <Trans i18nKey={`color.theory.complements.items.${key}`} />
          </li>
        ))}
      </ul>
      <Note>{t('color.theory.complements.note')}</Note>
      <HueSlider label={t('color.theory.complements.colour')} value={hue} onChange={setHue} />
      <div className="flex flex-col gap-1.5">
        {row(
          t('color.theory.complements.pattern'),
          <Segmented
            label={t('color.theory.complements.pattern')}
            value={pattern}
            onChange={setPattern}
            stretch
            options={Object.values(Pattern).map((p) => ({
              value: p,
              label: t(`color.theory.complements.patterns.${p}`),
            }))}
          />,
        )}
        {row(
          t('color.theory.complements.shift'),
          <Segmented<number>
            label={t('color.theory.complements.shiftLabel')}
            value={shift}
            onChange={setShift}
            stretch
            options={SHIFTS.map((s) => ({ value: s, label: `${s}°` }))}
          />,
        )}
        {row(
          t('color.theory.complements.nuance'),
          <Segmented
            label={t('color.theory.complements.nuanceLabel')}
            value={nuance}
            onChange={setNuance}
            stretch
            options={Object.values(Nuance).map((n) => ({
              value: n,
              label: t(`color.theory.complements.nuances.${n}`),
            }))}
          />,
        )}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {figure(hue + 180, t('color.theory.complements.complementary'), false)}
        {figure(hue + 150, t('color.theory.complements.near'), false)}
        {figure(hue + 180 - shift, t('color.theory.complements.shifted'), true)}
      </div>
    </Panel>
  )
}

function Surround({
  outer,
  inner,
  className = '',
}: {
  readonly outer: Rgb01
  readonly inner: Rgb01
  readonly className?: string
}) {
  return (
    <div
      className={`grid aspect-square w-full place-items-center rounded-lg border border-line ${className}`}
      style={{ background: fill(outer) }}
    >
      <div className="aspect-square w-[44%] rounded-[3px]" style={{ background: fill(inner) }} />
    </div>
  )
}

function TemperatureCard() {
  const { t } = useTranslation()
  const [hue, setHue] = useState(210)
  // Warmer neighbour: towards orange (60°); cooler: towards blue (240°), on the painter's wheel.
  const neighbour = (target: number) => {
    const d = hueDifference(hue, target)
    return Math.abs(d) < 1 ? null : hue + Math.sign(d) * 60
  }
  const rows: [number | null, string, string][] = [
    [neighbour(60), t('color.theory.temperature.amongWarmer'), t('color.theory.temperature.warmest')],
    [neighbour(240), t('color.theory.temperature.amongCooler'), t('color.theory.temperature.coolest')],
  ]
  return (
    <Panel as="article" title={t('color.theory.temperature.title')} className={card}>
      <p className={text}>
        <Trans i18nKey="color.theory.temperature.text" />
      </p>
      <HueSlider label={t('color.theory.temperature.colour')} value={hue} onChange={setHue} />
      <div className="flex flex-col gap-2.5">
        {rows.map(([n, sentence, already]) => (
          <div key={sentence} className="grid grid-cols-[96px_1fr] items-center gap-3">
            <Surround outer={painterColor(n ?? hue)} inner={painterColor(hue)} />
            <p className="text-[13px]/[1.4]">{n === null ? already : sentence}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const LIGHTNESSES = [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32]
const CHROMAS = [0.1, 0.25, 0.45, 0.65, 0.85, 1]

function ValuesCard() {
  const { t } = useTranslation()
  const [hue, setHue] = useState(0)
  const [grey, setGrey] = useState(false)
  const [, A, B] = toOklab(painterColor(hue))
  const norm = Math.hypot(A, B) || 1
  const switchId = useId()
  return (
    <Panel as="article" title={t('color.theory.values.title')} className={card}>
      <p className={text}>
        <Trans i18nKey="color.theory.values.text" />
      </p>
      <HueSlider label={t('color.theory.values.hue')} value={hue} onChange={setHue} />
      <div
        role="img"
        aria-label={t('color.theory.values.figure')}
        className="grid grid-cols-6 gap-0.5 overflow-hidden rounded-lg"
      >
        {LIGHTNESSES.flatMap((L) =>
          CHROMAS.map((s) => {
            const C = s * 0.17
            const c = fromOklab([L, (A / norm) * C, (B / norm) * C])
            return (
              <div
                key={`${L}-${s}`}
                className="aspect-[1.6]"
                style={{ background: fill(grey ? toGrey(c) : c) }}
              />
            )
          }),
        )}
      </div>
      <p className="-mt-1 flex justify-between gap-2 text-xs opacity-65">
        <span>{t('color.theory.values.lighter')}</span>
        <span>{t('color.theory.values.duller')}</span>
      </p>
      <label htmlFor={switchId} className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          id={switchId}
          type="checkbox"
          checked={grey}
          onChange={(e) => setGrey(e.target.checked)}
          className="size-5 accent-ink"
        />
        {t('studio.greyView')}
      </label>
    </Panel>
  )
}

function Strip({
  colors,
  flex,
  labels,
}: {
  readonly colors: readonly Rgb01[]
  readonly flex?: readonly number[]
  readonly labels?: readonly string[]
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-[10px]">
      {colors.map((c, i) => (
        <div
          key={i}
          className="grid flex-1 place-items-center text-[15px] font-bold"
          style={{ background: fill(c), flex: flex?.[i], color: labels ? readableInk(c, 0.55) : undefined }}
        >
          {labels?.[i]}
        </div>
      ))}
    </div>
  )
}

function Contrast({
  n,
  title,
  children,
  caption,
}: {
  readonly n: number
  readonly title: string
  readonly children: ReactNode
  readonly caption: string
}) {
  return (
    <article className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-paper-2 p-3.5">
      {/* Fixed figure area: whatever is drawn in it never spills onto the neighbouring cards. */}
      <div className="flex h-[150px] flex-col justify-center gap-1.5 overflow-hidden">{children}</div>
      <div className="flex items-center gap-2.5">
        <span className="grid size-[26px] flex-none place-items-center rounded-full bg-ink text-[13px] font-bold text-paper">
          {n}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <p className="text-[13px]/[1.45] opacity-80">{caption}</p>
    </article>
  )
}

function ContrastsCard() {
  const { t } = useTranslation()
  const [connect, setConnect] = useState(false)
  const connectId = useId()
  const c = (key: 'hue' | 'lightDark' | 'warmCool' | 'complementary' | 'saturation' | 'extension') => ({
    title: t(`color.theory.contrasts.${key}.title`),
    caption: t(`color.theory.contrasts.${key}.text`),
  })
  const grey = fromOklab([0.62, 0, 0])
  const sim = (bg: Rgb01, inner: Rgb01, caption: string) => (
    <figure className="flex flex-col items-center gap-2 text-center text-xs/[1.35]">
      <div
        className="grid aspect-square w-full place-items-center rounded-[10px] border border-line sm:w-[150px]"
        style={{ background: fill(bg) }}
      >
        <div className="aspect-square w-[30%] rounded-[3px]" style={{ background: fill(inner) }} />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )

  return (
    <Panel as="article" title={t('color.theory.contrasts.title')} className={`${card} col-span-full`}>
      <p className={text}>{t('color.theory.contrasts.intro')}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
        <Contrast n={1} {...c('hue')}>
          <Strip colors={[painterColor(0), painterColor(120), painterColor(240)]} />
        </Contrast>
        <Contrast n={2} {...c('lightDark')}>
          <Strip colors={[0.96, 0.78, 0.6, 0.42, 0.24, 0.1].map((L) => fromOklab([L, 0, 0]))} />
        </Contrast>
        <Contrast n={3} {...c('warmCool')}>
          <div className="flex h-full overflow-hidden rounded-[10px]">
            <div className="flex-1" style={{ background: fill(painterColor(60)) }} />
            <div className="flex-1" style={{ background: fill(painterColor(255)) }} />
          </div>
        </Contrast>
        <Contrast n={4} {...c('complementary')}>
          {/* two halves, each holding a spark of the other */}
          <div className="flex h-full overflow-hidden rounded-[10px]">
            {(
              [
                [120, 300],
                [300, 120],
              ] as const
            ).map(([a, b]) => (
              <div
                key={a}
                className="grid flex-1 place-items-center"
                style={{ background: fill(painterColor(a)) }}
              >
                <div
                  className="aspect-square w-[26%] rounded-full"
                  style={{ background: fill(painterColor(b)) }}
                />
              </div>
            ))}
          </div>
        </Contrast>
        <Contrast n={5} {...c('saturation')}>
          {/* A square as tall as the figure area (150 px), whatever the card's width. */}
          <div className="aspect-square h-full self-center">
            <Surround
              outer={desaturate(painterColor(120), 0.3)}
              inner={painterColor(120)}
              className="rounded-[10px]"
            />
          </div>
        </Contrast>
        <Contrast n={6} {...c('extension')}>
          <Strip colors={[painterColor(0), painterColor(180)]} flex={[1, 3]} labels={['1', '3']} />
          <Strip colors={[painterColor(60), painterColor(240)]} flex={[1, 2]} labels={['1', '2']} />
          <Strip colors={[painterColor(120), painterColor(300)]} flex={[1, 1]} labels={['1', '1']} />
        </Contrast>

        {/* Simultaneous contrast: very saturated grounds make the effect obvious. */}
        <article className="col-span-full flex flex-col gap-2.5 rounded-[14px] border border-line bg-paper-2 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-[26px] flex-none place-items-center rounded-full bg-ink text-[13px] font-bold text-paper">
              7
            </span>
            <h3 className="text-[15px] font-semibold">{t('color.theory.contrasts.simultaneous.title')}</h3>
          </div>
          <div className="grid gap-4 min-[900px]:grid-cols-[minmax(260px,1fr)_auto] min-[900px]:gap-7">
            <div className="flex max-w-[62ch] flex-col gap-2">
              <p className="text-[15px] font-semibold">{t('color.theory.contrasts.simultaneous.lead')}</p>
              <p className="text-sm/normal opacity-85">{t('color.theory.contrasts.simultaneous.text')}</p>
              <p className="text-sm/normal opacity-85">{t('color.theory.contrasts.simultaneous.extra')}</p>
            </div>
            <div className="flex flex-col items-start gap-2.5">
              <div className="relative grid grid-cols-3 gap-2 sm:grid-cols-[repeat(3,150px)] sm:gap-3.5">
                {sim(hexToRgb01('#E8202A'), grey, t('color.theory.contrasts.simultaneous.onRed'))}
                {sim(hexToRgb01('#00A060'), grey, t('color.theory.contrasts.simultaneous.onGreen'))}
                {sim(
                  hexToRgb01('#1D3FC4'),
                  hexToRgb01('#FF7A00'),
                  t('color.theory.contrasts.simultaneous.orangeOnBlue'),
                )}
                {connect ? (
                  <div
                    aria-hidden="true"
                    className="absolute top-[75px] left-[75px] h-5 w-[164px] -translate-y-1/2 rounded-[2px] max-sm:hidden"
                    style={{ background: fill(grey) }}
                  />
                ) : null}
              </div>
              <label
                htmlFor={connectId}
                className="flex min-h-11 items-center gap-2 text-sm font-medium max-sm:hidden"
              >
                <input
                  id={connectId}
                  type="checkbox"
                  checked={connect}
                  onChange={(e) => setConnect(e.target.checked)}
                  className="size-5 accent-ink"
                />
                {t('color.theory.contrasts.simultaneous.connect')}
              </label>
            </div>
          </div>
        </article>
      </div>
    </Panel>
  )
}
