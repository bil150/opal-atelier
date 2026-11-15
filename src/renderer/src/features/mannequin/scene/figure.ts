/**
 * The studio mannequin: tapered wooden pieces joined by ball joints. Unit: the head height. At 7.5 heads
 * the knee is at 2, the hip at 3.9, the elbow at the waist, the wrist at the crotch, the fingertips at
 * mid-thigh, shoulders 2 heads wide. The proportion setting stretches everything but the head.
 */
import * as THREE from 'three'
import { BodyShape } from '../mannequin-settings'
import { HeldObject, Side, type JointName } from '../poses'
import { MaterialRole, type MaterialSet } from './materials'

const BASE = {
  foot: 0.3,
  shin: 1.75,
  thigh: 1.85,
  hipY: 0.15,
  waist: 0.4,
  abdomen: 0.35,
  chest: 1.45,
  shoulderY: 1.25,
  neck: 0.3,
  arm: 1.4,
  forearm: 1.15,
  hand: 0.75,
  shoulderX: 0.82,
  hipX: 0.45,
}

export interface Figure {
  readonly root: THREE.Group
  readonly joints: Readonly<Record<JointName, THREE.Group>>
  /** Objects kept in the hands, shown by the poses that hold them: "phoneL", "tabletR"… */
  readonly held: Readonly<Record<`${HeldObject}${Side}`, THREE.Group>>
  /** Fingertips (the kiosk is placed so the right ones touch its screen). */
  readonly tips: Readonly<Record<Side, THREE.Object3D>>
  /** The pelvis piece (furniture is placed under it). */
  readonly pelvis: THREE.Mesh
}

const BALL = new THREE.SphereGeometry(1, 32, 20)

/** A turned piece (as on a wood lathe): profile [radius, height] from bottom to top. */
const lathe = (points: readonly (readonly [number, number])[]) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  )

/** Limb segment hanging from its joint: r0 at the top, rb the bulge, r1 at the bottom. */
function limb(len: number, r0: number, rb: number, r1: number, gapTop: number, gapBottom: number) {
  const a = -gapTop
  const b = -len + gapBottom
  const h = a - b
  return lathe([
    [0, b],
    [r1 * 0.75, b],
    [r1, b + h * 0.06],
    [rb * 0.92, b + h * 0.55],
    [rb, b + h * 0.72],
    [r0, a - h * 0.06],
    [r0 * 0.75, a],
    [0, a],
  ])
}

/** Wedge foot: side profile (front = +z), extruded across. */
function footGeometry(len: number): THREE.BufferGeometry {
  const s = new THREE.Shape()
  const k = len / 1.05
  const y0 = -BASE.foot + 0.035
  s.moveTo(-0.22, y0)
  s.lineTo(0.78 * k, y0)
  s.quadraticCurveTo(0.9 * k, y0, 0.88 * k, y0 + 0.08)
  s.quadraticCurveTo(0.8 * k, y0 + 0.17, 0.42 * k, -0.1)
  s.quadraticCurveTo(0.12, 0.04, -0.12, 0.02)
  s.quadraticCurveTo(-0.28, 0, -0.28, -0.12)
  s.quadraticCurveTo(-0.28, y0, -0.22, y0)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 10,
  })
  g.rotateY(-Math.PI / 2)
  g.translate(0.15, 0, 0)
  return g
}

type Vec = readonly [number, number, number]

export function buildFigure(heads: number, shape: BodyShape, materials: MaterialSet): Figure {
  const joints = {} as Record<JointName, THREE.Group>
  const held = {} as Record<`${HeldObject}${Side}`, THREE.Group>
  const tips = {} as Record<Side, THREE.Object3D>

  const part = (
    geometry: THREE.BufferGeometry,
    parent: THREE.Object3D,
    pos?: Vec,
    scale?: Vec,
    role = MaterialRole.Figure,
    rot?: Vec,
  ) => {
    const m = new THREE.Mesh(geometry, materials[role])
    m.userData.role = role
    m.castShadow = m.receiveShadow = true
    if (pos) m.position.set(...pos)
    if (scale) m.scale.set(...scale)
    if (rot) m.rotation.set(...rot)
    parent.add(m)
    return m
  }
  const joint = (name: JointName, parent: THREE.Object3D, pos: Vec) => {
    const g = new THREE.Group()
    g.position.set(...pos)
    parent.add(g)
    joints[name] = g
    return g
  }

  const k = (heads - 1) / (7.5 - 1) // stretch of the body (the head keeps its size)
  const L = Object.fromEntries(Object.entries(BASE).map(([n, v]) => [n, v * k])) as Record<
    keyof typeof BASE,
    number
  >
  L.shoulderX = BASE.shoulderX
  L.hipX = BASE.hipX
  L.foot = BASE.foot
  // Female shape: narrower shoulders, finer waist, wider pelvis, slimmer limbs.
  const female = shape === BodyShape.Female
  const W = female
    ? { chest: 0.9, waist: 0.84, pelvis: 1.2, limb: 0.88, thigh: 1.04, neck: 0.88 }
    : { chest: 1.04, waist: 1, pelvis: 1.05, limb: 1, thigh: 1, neck: 1 }
  if (female) {
    L.shoulderX = 0.7
    L.hipX = 0.52
  }

  const root = new THREE.Group()
  const body = joint('body', root, [0, 0, 0])
  // pelvis: turned block, wider than deep, narrowing towards the crotch
  const pelvisJoint = joint('pelvis', body, [0, 0, 0])
  const pelvis = part(
    lathe([
      [0, -0.46],
      [0.26, -0.45],
      [0.5, -0.32],
      [0.6, -0.1],
      [0.6, 0.12],
      [0.53, 0.32],
      [0.36, 0.42],
      [0, 0.44],
    ]),
    pelvisJoint,
    [0, 0, 0],
    [W.pelvis, 1, female ? 0.72 : 0.68],
  )
  // abdomen: short piece between pelvis and chest; the waist bends here
  const waist = joint('waist', pelvisJoint, [0, L.waist, 0])
  part(
    lathe([
      [0, -0.12],
      [0.36, -0.1],
      [0.44, 0.06],
      [0.43, L.abdomen * 0.7],
      [0.3, L.abdomen + 0.05],
      [0, L.abdomen + 0.08],
    ]),
    waist,
    [0, 0, 0],
    [W.waist, 1, 0.72 * (female ? 0.92 : 1)],
  )
  // chest: block flared towards the shoulders, flattened front to back
  const chest = joint('chest', waist, [0, L.abdomen, 0])
  const T = L.chest
  const profile: [number, number][] = female
    ? [
        [0, 0],
        [0.38, 0],
        [0.5, T * 0.14],
        [0.66, T * 0.5],
        [0.7, T * 0.64],
        [0.64, T * 0.8],
        [0.62, T * 0.88],
        [0.44, T * 0.97],
        [0, T],
      ]
    : [
        [0, 0],
        [0.42, 0],
        [0.55, T * 0.12],
        [0.68, T * 0.45],
        [0.74, T * 0.72],
        [0.68, T * 0.88],
        [0.46, T * 0.97],
        [0, T],
      ]
  part(lathe(profile), chest, [0, 0, -0.02], [W.chest, 1, female ? 0.66 : 0.64])
  const neck = joint('neck', chest, [0, T, -0.04])
  part(
    lathe([
      [0, -0.2],
      [0.2, -0.2],
      [0.18, L.neck * 0.5],
      [0.17, L.neck + 0.05],
      [0, L.neck + 0.06],
    ]),
    neck,
    [0, 0, 0],
    [W.neck, 1, W.neck],
  )
  part(BALL, neck, [0, 0.02, 0], [0.19, 0.12, 0.19])
  // head: faceless egg, chin down and forward
  const head = joint('head', neck, [0, L.neck, 0])
  part(
    lathe([
      [0, 0],
      [0.16, 0.03],
      [0.27, 0.18],
      [0.34, 0.42],
      [0.36, 0.64],
      [0.33, 0.82],
      [0.22, 0.95],
      [0, 1],
    ]),
    head,
    [0, -0.06, 0.08],
    [1, 1, 1.18],
    MaterialRole.Figure,
    [-0.3, 0, 0],
  )

  for (const [side, sd] of [
    [Side.Left, 1],
    [Side.Right, -1],
  ] as const) {
    // arm
    const shoulder = joint(`shoulder${side}`, chest, [sd * L.shoulderX, L.shoulderY, -0.04])
    part(BALL, shoulder, [0, 0, 0], [0.235, 0.235, 0.235])
    part(limb(L.arm, 0.2 * W.limb, 0.21 * W.limb, 0.13 * W.limb, 0.12, 0.08), shoulder)
    const elbow = joint(`elbow${side}`, shoulder, [0, -L.arm, 0])
    part(BALL, elbow, [0, 0, 0], [0.14, 0.14, 0.14])
    part(limb(L.forearm, 0.155 * W.limb, 0.165 * W.limb, 0.1 * W.limb, 0.07, 0.06), elbow)
    const wrist = joint(`wrist${side}`, elbow, [0, -L.forearm, 0])
    part(BALL, wrist, [0, 0, 0], [0.1, 0.1, 0.1])
    // paddle hand (palm towards the body when the arm hangs), thumb forward
    const M = L.hand
    part(BALL, wrist, [0, -M * 0.3, 0], [0.085, M * 0.3, 0.2])
    part(BALL, wrist, [-sd * 0.012, -M * 0.66, 0], [0.07, M * 0.31, 0.185])
    part(
      lathe([
        [0, -0.3],
        [0.045, -0.28],
        [0.055, -0.1],
        [0.05, 0],
        [0, 0.01],
      ]),
      wrist,
      [-sd * 0.04, -M * 0.16, 0.15],
      [1, M / 0.75, 1],
      MaterialRole.Figure,
      [-0.3, 0, -sd * 0.2],
    )
    const tip = new THREE.Object3D()
    tip.position.set(0, -M, 0)
    wrist.add(tip)
    tips[side] = tip
    // leg
    const hip = joint(`hip${side}`, pelvisJoint, [sd * L.hipX, -L.hipY, 0])
    part(BALL, hip, [0, 0, 0], [0.28, 0.28, 0.28])
    part(limb(L.thigh, 0.32 * W.thigh, 0.31 * W.thigh, 0.18, 0.12, 0.1), hip)
    const knee = joint(`knee${side}`, hip, [0, -L.thigh, 0])
    part(BALL, knee, [0, 0, 0], [0.19, 0.19, 0.19])
    part(limb(L.shin, 0.19 * W.limb, 0.215 * W.limb, 0.115 * W.limb, 0.08, 0.08), knee)
    const ankle = joint(`ankle${side}`, knee, [0, -L.shin, 0])
    part(BALL, ankle, [0, 0, 0], [0.12, 0.12, 0.12])
    part(footGeometry(1.05 * Math.max(1, k * 0.9)), ankle)

    // objects held in the hand, stored by the hand and shown by the poses that hold them
    const hold = (object: HeldObject, width: number, height: number, pos: Vec) => {
      const g = new THREE.Group()
      g.visible = false
      part(new THREE.BoxGeometry(0.045, height, width), g, [0, 0, 0], undefined, MaterialRole.Dark)
      part(
        new THREE.BoxGeometry(0.01, height * 0.9, width * 0.88),
        g,
        [-sd * 0.026, 0, 0],
        undefined,
        MaterialRole.Prop,
      )
      g.position.set(...pos)
      wrist.add(g)
      held[`${object}${side}`] = g
    }
    hold(HeldObject.Phone, 0.33, 0.68, [-sd * 0.13, -M * 0.48, 0.03])
    hold(HeldObject.Tablet, 1.05, 0.75, [-sd * 0.13, -M * 0.55, -0.3])
  }

  return { root, joints, held, tips, pelvis }
}

/** Frees the geometries of a figure (the shared ball is kept). */
export function disposeFigure(figure: Figure): void {
  figure.root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry !== BALL) (o.geometry as THREE.BufferGeometry).dispose()
  })
}

/** Bounding box of the visible meshes only (objects stored in a hand don't count). */
export function visibleBox(object: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty()
  object.updateMatrixWorld(true)
  object.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) out.expandByObject(o)
  })
  return out
}
