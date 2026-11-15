/** Furniture placed from the posed figure (neutral grey; it doesn't count in the framing). */
import * as THREE from 'three'
import { clamp } from '../pose-math'
import { PropKind, Side } from '../poses'
import { visibleBox, type Figure } from './figure'
import { MaterialRole, type MaterialSet } from './materials'

/** Plate with rounded corners (width, height, thickness, corner radius), centred. */
function slab(w: number, h: number, d: number, radius: number): THREE.BufferGeometry {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  const r = Math.min(radius, w / 2, h / 2)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const b = Math.min(0.04, d / 4)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 8,
  })
  g.translate(0, 0, -(d - 2 * b) / 2)
  return g
}

/** Builds the furniture of a pose around the posed figure; returns the meshes added to `scene`. */
export function placeProps(
  scene: THREE.Scene,
  figure: Figure,
  kind: PropKind | undefined,
  materials: MaterialSet,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  if (!kind) return meshes
  const add = (
    geometry: THREE.BufferGeometry,
    pos: readonly [number, number, number],
    role = MaterialRole.Prop,
  ) => {
    const m = new THREE.Mesh(geometry, materials[role])
    m.userData.role = role
    m.position.set(...pos)
    m.castShadow = m.receiveShadow = true
    scene.add(m)
    meshes.push(m)
  }
  const pb = visibleBox(figure.pelvis, new THREE.Box3())
  const pc = pb.getCenter(new THREE.Vector3())

  if (kind === PropKind.Stool || kind === PropKind.Chair) {
    const h = Math.max(0.3, pb.min.y)
    if (kind === PropKind.Stool) {
      const r = 0.8
      const cz = pc.z - 0.15
      add(new THREE.CylinderGeometry(r, r, 0.14, 32), [pc.x, h - 0.07, cz])
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + 0.4
        add(new THREE.CylinderGeometry(0.06, 0.07, h - 0.14, 12), [
          pc.x + Math.cos(a) * r * 0.62,
          (h - 0.14) / 2,
          cz + Math.sin(a) * r * 0.62,
        ])
      }
    } else {
      const w = 1.9
      const d = 1.8
      const sz = pb.min.z - 0.15 + d / 2 // the back of the seat touches the lower back
      add(new THREE.BoxGeometry(w, 0.14, d), [pc.x, h - 0.07, sz])
      for (const [i, j] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const)
        add(new THREE.BoxGeometry(0.12, h - 0.14, 0.12), [
          pc.x + i * (w / 2 - 0.1),
          (h - 0.14) / 2,
          sz + j * (d / 2 - 0.1),
        ])
      const bz = sz - d / 2 + 0.06
      const bh = 2.3
      for (const i of [-1, 1])
        add(new THREE.BoxGeometry(0.12, bh, 0.12), [pc.x + i * (w / 2 - 0.1), h + bh / 2, bz])
      add(new THREE.BoxGeometry(w, 0.7, 0.1), [pc.x, h + bh - 0.45, bz])
    }
  }

  if (kind === PropKind.Kiosk) {
    // ordering kiosk: rounded column (about 1.90 m), large upright screen, card reader and ticket slot,
    // on a foot; the right fingertips touch the screen
    const t = figure.tips[Side.Right].getWorldPosition(new THREE.Vector3())
    const W = 2.4
    const H = 8.2
    const D = 0.9
    const front = t.z + 0.03
    const cz = front + D / 2
    const x = t.x
    add(slab(2.9, 0.14, 1.5, 0.12), [x, 0.07, cz + 0.1])
    add(slab(W, H - 0.14, D, 0.3), [x, 0.14 + (H - 0.14) / 2, cz])
    const sy = clamp(t.y + 0.6, 4.2, 6.2)
    add(slab(W - 0.36, 3.7, 0.04, 0.12), [x, sy, front - 0.01], MaterialRole.Dark)
    add(slab(0.8, 0.5, 0.32, 0.08), [x, sy - 2.35, front - 0.14])
    add(slab(0.5, 0.18, 0.02, 0.06), [x, sy - 2.35, front - 0.31], MaterialRole.Dark)
    add(slab(0.9, 0.08, 0.02, 0.03), [x, sy - 2.95, front - 0.01], MaterialRole.Dark)
  }
  return meshes
}
