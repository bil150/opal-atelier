import { describe, expect, it } from 'vitest'
import {
  ALL_JOINTS,
  CAMERA_ELEVATION,
  DEG,
  dragOrbit,
  drawFromBag,
  easeInOut,
  formatTime,
  interpolate,
  orbitPoint,
  poseRotations,
  rotationOrder,
  sideSign,
} from './pose-math'
import { POSES, PoseFamily, poseById, type Pose } from './poses'

const pose = (joints: Pose['joints']): Pose => ({ id: 't', family: PoseFamily.Standing, joints })

describe('poses', () => {
  it('keeps the 28 poses of the original page, with unique ids, in five families', () => {
    expect(POSES).toHaveLength(28)
    expect(new Set(POSES.map((p) => p.id)).size).toBe(28)
    expect(new Set(POSES.map((p) => p.family))).toEqual(new Set(Object.values(PoseFamily)))
  })

  it('only uses known joints, with angles inside a human range', () => {
    for (const p of POSES)
      for (const [name, angles] of Object.entries(p.joints)) {
        expect(ALL_JOINTS).toContain(name)
        for (const a of angles) if (a !== undefined) expect(Math.abs(a)).toBeLessThanOrEqual(180)
      }
  })

  it('finds a pose by id', () => {
    expect(poseById('walk')?.family).toBe(PoseFamily.Movement)
    expect(poseById('nope')).toBeUndefined()
  })
})

describe('poseRotations', () => {
  it('leaves the joints a pose doesn’t give neutral', () => {
    const r = poseRotations(pose({}))
    expect(Object.keys(r)).toHaveLength(ALL_JOINTS.length)
    for (const v of Object.values(r)) expect(v.map((x) => Math.abs(x))).toEqual([0, 0, 0])
  })

  it('maps the trunk: bend on x, turn on y, lean on −z', () => {
    expect(poseRotations(pose({ chest: [10, 20, 30] })).chest).toEqual([10 * DEG, 30 * DEG, -20 * DEG])
  })

  it('mirrors limb spread and turn for the right side', () => {
    const r = poseRotations(pose({ shoulderL: [10, 20, 30], shoulderR: [10, 20, 30] }))
    expect(r.shoulderL).toEqual([-10 * DEG, 30 * DEG, 20 * DEG])
    expect(r.shoulderR).toEqual([-10 * DEG, -30 * DEG, -20 * DEG])
  })

  it('bends knees one way and elbows, ankles the other', () => {
    const r = poseRotations(pose({ kneeL: [90], elbowL: [90], ankleL: [10] }))
    expect(r.kneeL[0]).toBeCloseTo(Math.PI / 2)
    expect(r.elbowL[0]).toBeCloseTo(-Math.PI / 2)
    expect(r.ankleL[0]).toBeCloseTo(-10 * DEG)
  })

  it('turns the palm with the wrist, mirrored by side', () => {
    const r = poseRotations(pose({ wristL: [0, 40], wristR: [0, 40] }))
    expect(r.wristL[1]).toBeCloseTo(40 * DEG)
    expect(r.wristR[1]).toBeCloseTo(-40 * DEG)
    expect(rotationOrder('wristL')).toBe('XYZ')
    expect(rotationOrder('hipR')).toBe('YXZ')
    expect(sideSign('head')).toBe(1)
  })
})

describe('transitions and camera', () => {
  it('eases in and out', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.25)).toBeLessThan(0.25)
    expect(interpolate([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3])
  })

  it('places the camera on a sphere around the target', () => {
    const front = orbitPoint({ x: 0, y: 4, z: 0 }, 0, 0, 10)
    expect(front.x).toBeCloseTo(0)
    expect(front.y).toBeCloseTo(4)
    expect(front.z).toBeCloseTo(10)
    const side = orbitPoint({ x: 0, y: 0, z: 0 }, 90, 0, 10)
    expect(side.x).toBeCloseTo(10)
    expect(orbitPoint({ x: 0, y: 0, z: 0 }, 0, 90, 10).y).toBeCloseTo(10)
  })

  it('turns around with a drag, keeping the height in range', () => {
    expect(dragOrbit(10, 20, 100, 0)[0]).toBeCloseTo(325)
    expect(dragOrbit(10, 80, 0, 100)[1]).toBe(CAMERA_ELEVATION.max)
    expect(dragOrbit(10, 0, 0, -1000)[1]).toBe(CAMERA_ELEVATION.min)
  })
})

describe('timer and random poses', () => {
  it('formats the remaining time', () => {
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(4.2)).toBe('0:05')
    expect(formatTime(300)).toBe('5:00')
    expect(formatTime(-3)).toBe('0:00')
  })

  it('never repeats a pose before every other one was drawn', () => {
    const ids = ['a', 'b', 'c', 'd']
    let bag: string[] = []
    let current = 'a'
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      const next = drawFromBag(bag, ids, current, () => 0)
      bag = next.bag
      current = next.id
      seen.push(next.id)
    }
    expect(new Set(seen)).toEqual(new Set(['b', 'c', 'd']))
    expect(bag).toEqual([])
    expect(drawFromBag([], ['a'], 'a').id).toBe('a') // a single pose: it stays
  })
})
