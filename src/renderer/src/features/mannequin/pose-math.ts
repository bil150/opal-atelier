/** From pose angles to joint rotations, and the small geometry of the camera, light and timer. No three.js here. */
import { Side, type JointName, type Pose } from './poses'

export const DEG = Math.PI / 180

const LIMB_JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'] as const
export const TRUNK_JOINTS = [
  'body',
  'pelvis',
  'waist',
  'chest',
  'neck',
  'head',
] as const satisfies readonly JointName[]
export const ALL_JOINTS: readonly JointName[] = [
  ...TRUNK_JOINTS,
  ...LIMB_JOINTS.flatMap((j) => [`${j}${Side.Left}` as const, `${j}${Side.Right}` as const]),
]

export type Rotation = readonly [x: number, y: number, z: number]

/** +1 for the mannequin's left, −1 for its right, +1 for the trunk. */
export function sideSign(name: JointName): 1 | -1 {
  return name.endsWith(Side.Right) && !TRUNK_JOINTS.some((t) => t === name) ? -1 : 1
}

/** How [a, b, c] becomes a rotation (degrees), for each family of joints. */
function axes(name: JointName, a: readonly [number, number?, number?]): Rotation {
  const [p, q = 0, r = 0] = a
  const s = sideSign(name)
  if (TRUNK_JOINTS.some((t) => t === name)) return [p, r, -q] // bend (x), turn (y), lean (z)
  if (name.startsWith('shoulder') || name.startsWith('hip')) return [-p, r * s, q * s] // raise, turn, spread
  if (name.startsWith('wrist')) return [-p, q * s, 0] // bend, then turn the palm
  if (name.startsWith('knee')) return [p, 0, 0]
  return [-p, 0, 0] // elbow, ankle
}

/** Target rotation (radians) of every joint for a pose; joints the pose doesn't give are neutral. */
export function poseRotations(pose: Pose): Readonly<Record<JointName, Rotation>> {
  const out = {} as Record<JointName, Rotation>
  for (const name of ALL_JOINTS) {
    const [x, y, z] = axes(name, pose.joints[name] ?? [0, 0, 0])
    out[name] = [x * DEG, y * DEG, z * DEG]
  }
  return out
}

/** The wrist turns the palm first, then bends; other joints turn about y before x. */
export function rotationOrder(name: JointName): 'XYZ' | 'YXZ' {
  return name.startsWith('wrist') ? 'XYZ' : 'YXZ'
}

/** Quadratic ease in and out, for the short pose transitions. */
export function easeInOut(u: number): number {
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
}

export function interpolate(from: Rotation, to: Rotation, e: number): Rotation {
  return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e]
}

export interface Point3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Point on a sphere around `target`: azimuth from the front (+z), elevation above the horizon, in degrees. */
export function orbitPoint(target: Point3, azimuth: number, elevation: number, distance: number): Point3 {
  const a = azimuth * DEG
  const e = elevation * DEG
  return {
    x: target.x + distance * Math.cos(e) * Math.sin(a),
    y: target.y + distance * Math.sin(e),
    z: target.z + distance * Math.cos(e) * Math.cos(a),
  }
}

export const CAMERA_DISTANCE = { min: 6, max: 60 } as const
export const CAMERA_ELEVATION = { min: -10, max: 85 } as const

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Camera angles after a drag of (dx, dy) screen pixels. */
export function dragOrbit(azimuth: number, elevation: number, dx: number, dy: number): [number, number] {
  return [
    (((azimuth - dx * 0.45) % 360) + 360) % 360,
    clamp(elevation + dy * 0.35, CAMERA_ELEVATION.min, CAMERA_ELEVATION.max),
  ]
}

/** "1:05" */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Random pose without repeats: draws from a bag of the remaining ids, refilled (without the current
 * pose) once empty. `random` returns [0, 1).
 */
export function drawFromBag(
  bag: readonly string[],
  allIds: readonly string[],
  currentId: string,
  random: () => number = Math.random,
): { readonly id: string; readonly bag: string[] } {
  const pool = bag.length ? [...bag] : allIds.filter((id) => id !== currentId)
  const [id = currentId] = pool.splice(Math.floor(random() * pool.length), 1)
  return { id, bag: pool }
}
