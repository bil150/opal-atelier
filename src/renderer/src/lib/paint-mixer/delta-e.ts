import type { Lab } from './color'

const RAD = Math.PI / 180
const POW_25_7 = 6103515625 // 25^7

/** CIE76: straight Euclidean distance in L*a*b*. Fast, used for coarse searches. */
export function deltaE76(x: Lab, y: Lab): number {
  const dl = x[0] - y[0]
  const da = x[1] - y[1]
  const db = x[2] - y[2]
  return Math.sqrt(dl * dl + da * da + db * db)
}

function hueDegrees(b: number, a: number): number {
  if (a === 0 && b === 0) return 0
  const h = Math.atan2(b, a) / RAD
  return h < 0 ? h + 360 : h
}

/** CIEDE2000 colour difference (Sharma, Wu & Dalal, 2005). About 1 = just noticeable. */
export function deltaE2000(x: Lab, y: Lab): number {
  const [l1, a1, b1] = x
  const [l2, a2, b2] = y
  const c1 = Math.sqrt(a1 * a1 + b1 * b1)
  const c2 = Math.sqrt(a2 * a2 + b2 * b2)
  const cMean7 = Math.pow((c1 + c2) / 2, 7)
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + POW_25_7)))
  const a1p = (1 + g) * a1
  const a2p = (1 + g) * a2
  const c1p = Math.sqrt(a1p * a1p + b1 * b1)
  const c2p = Math.sqrt(a2p * a2p + b2 * b2)
  const h1p = hueDegrees(b1, a1p)
  const h2p = hueDegrees(b2, a2p)
  const dLp = l2 - l1
  const dCp = c2p - c1p
  const cc = c1p * c2p

  let dhp = 0
  if (cc !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(cc) * Math.sin((dhp * RAD) / 2)
  const lpMean = (l1 + l2) / 2
  const cpMean = (c1p + c2p) / 2

  let hpMean: number
  if (cc === 0) hpMean = h1p + h2p
  else if (Math.abs(h1p - h2p) <= 180) hpMean = (h1p + h2p) / 2
  else hpMean = (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2

  const t =
    1 -
    0.17 * Math.cos((hpMean - 30) * RAD) +
    0.24 * Math.cos(2 * hpMean * RAD) +
    0.32 * Math.cos((3 * hpMean + 6) * RAD) -
    0.2 * Math.cos((4 * hpMean - 63) * RAD)
  const dTheta = 30 * Math.exp(-Math.pow((hpMean - 275) / 25, 2))
  const cpMean7 = Math.pow(cpMean, 7)
  const rc = 2 * Math.sqrt(cpMean7 / (cpMean7 + POW_25_7))
  const lm = (lpMean - 50) * (lpMean - 50)
  const sl = 1 + (0.015 * lm) / Math.sqrt(20 + lm)
  const sc = 1 + 0.045 * cpMean
  const sh = 1 + 0.015 * cpMean * t
  const rt = -Math.sin(2 * dTheta * RAD) * rc
  const tl = dLp / sl
  const tc = dCp / sc
  const th = dHp / sh
  return Math.sqrt(tl * tl + tc * tc + th * th + rt * tc * th)
}
