/** Materials of the figure (wood or grey), of the furniture and of screens, for each shading. */
import * as THREE from 'three'
import { Material, Shading } from '../mannequin-settings'

export enum MaterialRole {
  Figure = 'figure',
  /** Furniture: neutral grey. */
  Prop = 'prop',
  /** Screens and dark parts. */
  Dark = 'dark',
}

export type MaterialSet = Readonly<Record<MaterialRole, THREE.Material>>

const GREY = 0xc9c9c9
const WOOD_TONE = 0xd6b88e

/** Beech grain, drawn once: veins along the pieces, like a studio mannequin. Deterministic. */
function woodTexture(): THREE.Texture | null {
  const W = 256
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return null
  g.fillStyle = '#d6b88e'
  g.fillRect(0, 0, W, H)
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 90; i++) {
    const x0 = rnd() * W
    const width = 0.6 + rnd() * 2.2
    const alpha = 0.05 + rnd() * 0.16
    const amp = 2 + rnd() * 7
    const f = 1 + rnd() * 3
    g.strokeStyle = `rgba(120,80,40,${alpha.toFixed(3)})`
    g.lineWidth = width
    g.beginPath()
    for (let y = 0; y <= H; y += 8) {
      const x = x0 + Math.sin((y / H) * Math.PI * 2 * f + i) * amp
      if (y) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,240,215,${(rnd() * 0.06).toFixed(3)})`
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 6 + rnd() * 30)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

/** Lighting ramp of 2 or 3 flat values. */
function toonRamp(n: 2 | 3): THREE.DataTexture {
  const levels = n === 2 ? [0.25, 1] : [0.18, 0.55, 1]
  const data = new Uint8Array(n * 4)
  levels.forEach((l, i) => {
    const v = Math.round(255 * l)
    data.set([v, v, v, 255], i * 4)
  })
  const texture = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat)
  texture.minFilter = texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}

let wood: THREE.Texture | null | undefined
let ramps: Readonly<Record<'2' | '3', THREE.DataTexture>> | undefined

export function makeMaterials(material: Material, shading: Shading): MaterialSet {
  wood ??= woodTexture()
  ramps ??= { '2': toonRamp(2), '3': toonRamp(3) }
  const woody = material === Material.Wood
  const make = (color: number, map: THREE.Texture | null = null): THREE.Material =>
    shading === Shading.Smooth
      ? new THREE.MeshStandardMaterial({ color, map, roughness: 0.62, metalness: 0 })
      : new THREE.MeshToonMaterial({
          color: map ? WOOD_TONE : color,
          gradientMap: ramps?.[shading === Shading.TwoTones ? '2' : '3'] ?? null,
        })
  return {
    [MaterialRole.Figure]: woody ? make(0xffffff, wood) : make(GREY),
    [MaterialRole.Prop]: make(0x9c9c9c),
    [MaterialRole.Dark]: make(0x2b2b2b),
  }
}

export function disposeMaterials(set: MaterialSet): void {
  for (const m of Object.values(set)) m.dispose()
}
