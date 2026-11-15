/** Plane geometry for the wheels and charts (SVG coordinates: y grows downwards, 0° points up). */

export type Point = readonly [x: number, y: number]

/** Point at `angle` degrees clockwise from the top, at radius r. */
export function polar(angle: number, r: number): Point {
  const rad = (angle * Math.PI) / 180
  return [r * Math.sin(rad), -r * Math.cos(rad)]
}

const f2 = (v: number) => v.toFixed(2)

/** Ring sector from angle a0 to a1, between radii rInner and rOuter (SVG path). */
export function sectorPath(a0: number, a1: number, rOuter: number, rInner: number): string {
  const [x0, y0] = polar(a0, rOuter)
  const [x1, y1] = polar(a1, rOuter)
  const [x2, y2] = polar(a1, rInner)
  const [x3, y3] = polar(a0, rInner)
  const big = a1 - a0 > 180 ? 1 : 0
  return `M${f2(x0)} ${f2(y0)}A${rOuter} ${rOuter} 0 ${big} 1 ${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}A${rInner} ${rInner} 0 ${big} 0 ${f2(x3)} ${f2(y3)}Z`
}

/** Closed polygon (SVG path). */
export function polygonPath(points: readonly Point[]): string {
  return `M${points.map((p) => `${f2(p[0])} ${f2(p[1])}`).join('L')}Z`
}

/** Convex hull, Andrew's monotone chain. */
export function convexHull(points: readonly Point[]): Point[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Point[] = []
  const upper: Point[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop()
    lower.push(q)
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop()
    upper.push(q)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** Area of a simple polygon (shoelace formula). */
export function polygonArea(points: readonly Point[]): number {
  let a = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    a += p[0] * q[1] - q[0] * p[1]
  })
  return Math.abs(a) / 2
}
