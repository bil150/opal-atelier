import { useId, type SVGProps } from 'react'

/** Flat opal mark — same drawing as build/logo-symbol.svg. Decorative unless given a title. */
export function OpalSymbol({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  const clipId = useId()

  return (
    <svg
      viewBox="0 0 120 120"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="120" height="120" fill="#E9F4F3" />
        <path d="M0 74 C22 62 40 82 64 70 S100 58 120 66 V120 H0Z" fill="#8FE0C8" />
        <path d="M0 94 C26 86 46 104 72 94 S104 86 120 92 V120 H0Z" fill="#9DB8FF" />
        <path d="M0 30 C18 24 34 40 54 34 S82 20 96 28 C84 44 58 50 36 50 S6 46 0 44Z" fill="#FFB0D6" />
        <path d="M64 46 C78 38 98 40 120 44 V64 C100 58 84 62 70 58 S58 50 64 46Z" fill="#C3B4FF" />
        <path d="M44 62 C52 56 64 58 70 64 C62 68 50 68 44 62Z" fill="#FFC48A" />
        <path d="M78 80 C86 76 96 78 100 84 C92 88 84 88 78 80Z" fill="#FFE17A" />
        <ellipse cx="40" cy="30" rx="26" ry="14" fill="#FFFFFF" opacity="0.7" transform="rotate(-18 40 30)" />
      </g>
      <circle
        cx="60"
        cy="60"
        r="55.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />
    </svg>
  )
}
