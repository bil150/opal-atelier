import { OpalSymbol } from './OpalSymbol'
import { WORDMARK } from './wordmark-paths'

interface LogoProps {
  /** Rendered height in CSS pixels; the width follows. */
  readonly height?: number
  readonly className?: string
}

/** Opal mark + "Opal / ATELIER" wordmark. The wordmark uses currentColor, so it follows the theme. */
export function Logo({ height = 48, className }: LogoProps) {
  const symbolSize = WORDMARK.height * 1.12
  const gap = symbolSize * 0.25
  const width = symbolSize + gap + WORDMARK.width

  return (
    <svg
      viewBox={`0 0 ${width} ${symbolSize}`}
      height={height}
      role="img"
      aria-label="Opal Atelier"
      className={className}
    >
      <OpalSymbol width={symbolSize} height={symbolSize} />
      <g
        transform={`translate(${symbolSize + gap} ${(symbolSize - WORDMARK.height) / 2})`}
        fill="currentColor"
      >
        <path d={WORDMARK.opal} />
        <path d={WORDMARK.atelier} />
      </g>
    </svg>
  )
}
