/**
 * Poses of the mannequin. A pose only gives the joints that leave the neutral pose (standing, arms down).
 * Angles in degrees, in the vocabulary of movement (pose-math turns them into rotations):
 * - body, pelvis, waist, chest, neck, head: [bend forward, lean to its left, turn to its left]
 * - shoulder, hip: [raise forward, spread from the body, turn outwards]
 * - elbow, knee: [bend]
 * - wrist: [bend, turn the palm: + forwards (supination), − backwards (pronation)]
 * - ankle: [toes up]
 * Sides: L = the mannequin's left, R = its right. Names live in the locales (mannequin.poses.<id>).
 */

export enum PoseFamily {
  Standing = 'standing',
  Movement = 'movement',
  Expressive = 'expressive',
  Foreshortening = 'foreshortening',
  Screens = 'screens',
}

/** Furniture placed from the posed figure. */
export enum PropKind {
  /** Under the pelvis. */
  Stool = 'stool',
  Chair = 'chair',
  /** Ordering kiosk whose screen the right fingertips touch. */
  Kiosk = 'kiosk',
}

export enum HeldObject {
  Phone = 'phone',
  Tablet = 'tablet',
}

export enum Side {
  Left = 'L',
  Right = 'R',
}

export type JointName =
  | 'body'
  | 'pelvis'
  | 'waist'
  | 'chest'
  | 'neck'
  | 'head'
  | `${'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle'}${Side}`

export type JointAngles = readonly [number, number?, number?]

export interface Pose {
  readonly id: string
  readonly family: PoseFamily
  readonly joints: Partial<Readonly<Record<JointName, JointAngles>>>
  readonly prop?: PropKind
  /** Height above the ground, in heads (jumps, runs); on the ground otherwise. */
  readonly lift?: number
  /** Suggested camera angle [around, height] in degrees. */
  readonly view?: readonly [number, number]
  readonly held?: Partial<Readonly<Record<Side, HeldObject>>>
}

export const POSES: readonly Pose[] = [
  // Standing
  {
    id: 'rest',
    family: PoseFamily.Standing,
    joints: { shoulderL: [0, 8, 0], shoulderR: [0, 8, 0], elbowL: [10], elbowR: [10] },
  },
  {
    id: 'contrapposto',
    family: PoseFamily.Standing,
    joints: {
      pelvis: [0, 7, 6],
      waist: [0, -5, -3],
      chest: [0, -6, -4],
      neck: [0, 4, 0],
      head: [4, 6, 8],
      hipR: [0, -3, 0],
      hipL: [8, 4, 6],
      kneeL: [22],
      ankleL: [8],
      shoulderL: [6, 10, 0],
      elbowL: [18],
      shoulderR: [-4, 12, 0],
      elbowR: [12],
    },
  },
  {
    id: 'hands-on-hips',
    family: PoseFamily.Standing,
    joints: {
      shoulderL: [-45, 0, -90],
      shoulderR: [-45, 0, -90],
      elbowL: [100],
      elbowR: [100],
      wristL: [0],
      wristR: [0],
      hipL: [0, 6, 0],
      hipR: [0, 6, 0],
    },
  },
  {
    id: 'one-leg',
    family: PoseFamily.Standing,
    joints: {
      hipL: [75, 4, 10],
      kneeL: [95],
      ankleL: [-10],
      shoulderL: [10, 45, 0],
      shoulderR: [10, 45, 0],
      elbowL: [20],
      elbowR: [20],
      waist: [0, -3, 0],
    },
  },
  {
    id: 'stool',
    family: PoseFamily.Standing,
    prop: PropKind.Stool,
    joints: {
      hipL: [88, 6, 0],
      hipR: [88, 6, 0],
      kneeL: [92],
      kneeR: [92],
      ankleL: [4],
      ankleR: [4],
      waist: [6, 0, 0],
      shoulderL: [28, 6, 0],
      shoulderR: [28, 6, 0],
      elbowL: [52],
      elbowR: [52],
      head: [6, 0, 0],
    },
  },
  {
    id: 'crouch',
    family: PoseFamily.Standing,
    joints: {
      body: [18, 0, 0],
      hipL: [110, 14, 8],
      hipR: [110, 14, 8],
      kneeL: [138],
      kneeR: [138],
      ankleL: [22],
      ankleR: [22],
      waist: [14, 0, 0],
      chest: [8, 0, 0],
      head: [-20, 0, 0],
      shoulderL: [55, 8, 0],
      shoulderR: [55, 8, 0],
      elbowL: [45],
      elbowR: [45],
    },
  },
  {
    id: 'kneel',
    family: PoseFamily.Standing,
    joints: {
      kneeL: [92],
      kneeR: [92],
      ankleL: [-40],
      ankleR: [-40],
      shoulderL: [8, 10, 0],
      shoulderR: [8, 10, 0],
      elbowL: [25],
      elbowR: [25],
    },
  },
  // Movement
  {
    id: 'walk',
    family: PoseFamily.Movement,
    joints: {
      hipL: [24, 0, 0],
      kneeL: [8],
      ankleL: [10],
      hipR: [-16, 0, 0],
      kneeR: [22],
      ankleR: [-12],
      shoulderR: [22, 6, 0],
      elbowR: [22],
      shoulderL: [-20, 6, 0],
      elbowL: [12],
      chest: [0, 0, -6],
      head: [0, 0, 4],
    },
  },
  {
    id: 'run',
    family: PoseFamily.Movement,
    lift: 0.35,
    joints: {
      body: [14, 0, 0],
      hipL: [62, 0, 0],
      kneeL: [95],
      ankleL: [10],
      hipR: [-28, 0, 0],
      kneeR: [55],
      ankleR: [-25],
      shoulderL: [-45, 8, 0],
      elbowL: [95],
      shoulderR: [55, 8, 0],
      elbowR: [95],
      chest: [0, 0, -10],
      head: [-10, 0, 6],
    },
  },
  {
    id: 'jump',
    family: PoseFamily.Movement,
    lift: 0.9,
    joints: {
      hipL: [40, 8, 0],
      hipR: [40, 8, 0],
      kneeL: [85],
      kneeR: [85],
      ankleL: [-30],
      ankleR: [-30],
      shoulderL: [165, 18, 0],
      shoulderR: [165, 18, 0],
      elbowL: [10],
      elbowR: [10],
      head: [-15, 0, 0],
      chest: [-8, 0, 0],
    },
  },
  {
    id: 'throw',
    family: PoseFamily.Movement,
    joints: {
      body: [0, 0, -15],
      hipL: [32, 6, 0],
      kneeL: [18],
      hipR: [-14, 4, 0],
      kneeR: [12],
      waist: [0, 4, -25],
      chest: [-6, 6, -20],
      head: [0, 0, 35],
      shoulderR: [10, 100, 30],
      elbowR: [95],
      wristR: [-20],
      shoulderL: [70, 20, 0],
      elbowL: [20],
    },
  },
  {
    id: 'kick',
    family: PoseFamily.Movement,
    joints: {
      body: [-8, 0, 0],
      hipR: [85, 0, 0],
      kneeR: [12],
      ankleR: [-30],
      hipL: [-4, 0, 0],
      kneeL: [10],
      shoulderL: [20, 60, 0],
      shoulderR: [-20, 55, 0],
      elbowL: [30],
      elbowR: [30],
      head: [10, 0, 0],
    },
  },
  {
    id: 'pull-rope',
    family: PoseFamily.Movement,
    joints: {
      body: [-18, 0, 0],
      hipL: [40, 4, 0],
      hipR: [10, 4, 0],
      kneeL: [38],
      kneeR: [40],
      ankleL: [6],
      ankleR: [20],
      waist: [6, 0, 0],
      shoulderL: [72, 0, 0],
      shoulderR: [64, 0, 0],
      elbowL: [22],
      elbowR: [36],
      head: [12, 0, 0],
    },
  },
  // Expressive
  {
    id: 'arms-up',
    family: PoseFamily.Expressive,
    joints: {
      shoulderL: [170, 22, 0],
      shoulderR: [170, 22, 0],
      elbowL: [8],
      elbowR: [8],
      head: [-18, 0, 0],
      chest: [-6, 0, 0],
    },
  },
  {
    id: 'bend-forward',
    family: PoseFamily.Expressive,
    joints: {
      body: [62, 0, 0],
      hipL: [55, 4, 0],
      hipR: [55, 4, 0],
      kneeL: [12],
      kneeR: [12],
      ankleL: [-10],
      ankleR: [-10],
      waist: [10, 0, 0],
      chest: [8, 0, 0],
      head: [-30, 0, 0],
      shoulderL: [70, 6, 0],
      shoulderR: [70, 6, 0],
      elbowL: [10],
      elbowR: [10],
    },
  },
  {
    id: 'turn-round',
    family: PoseFamily.Expressive,
    view: [20, 8],
    joints: {
      waist: [0, 0, 22],
      chest: [0, 0, 24],
      neck: [0, 0, 15],
      head: [0, 0, 28],
      hipL: [6, 4, 0],
      kneeL: [14],
      shoulderR: [35, 10, 0],
      elbowR: [40],
      shoulderL: [-20, 14, 0],
      elbowL: [20],
    },
  },
  {
    id: 'stretch',
    family: PoseFamily.Expressive,
    joints: {
      waist: [0, 10, 0],
      chest: [0, 14, 0],
      head: [0, 8, 0],
      shoulderR: [175, 10, 0],
      elbowR: [5],
      shoulderL: [150, 30, 0],
      elbowL: [50],
      hipR: [0, 18, 0],
      hipL: [0, -2, 0],
    },
  },
  {
    id: 'think',
    family: PoseFamily.Expressive,
    joints: {
      hipL: [6, 2, 0],
      kneeL: [12],
      head: [12, 0, -6],
      neck: [6, 0, 0],
      shoulderR: [35, 0, -45],
      elbowR: [135],
      wristR: [-10],
      shoulderL: [25, 0, -80],
      elbowL: [95],
    },
  },
  // Foreshortening
  {
    id: 'point',
    family: PoseFamily.Foreshortening,
    view: [0, 5],
    joints: {
      shoulderR: [90, 8, 0],
      elbowR: [2],
      shoulderL: [0, 12, 0],
      elbowL: [15],
      chest: [4, 0, 8],
      head: [4, 0, 0],
      hipL: [8, 0, 0],
      kneeL: [10],
    },
  },
  {
    id: 'on-back',
    family: PoseFamily.Foreshortening,
    view: [0, 30],
    joints: {
      body: [-90, 0, 0],
      hipL: [40, 6, 0],
      kneeL: [80],
      hipR: [0, 8, 0],
      shoulderL: [0, 30, 0],
      shoulderR: [0, 30, 0],
      elbowL: [20],
      elbowR: [20],
      ankleL: [10],
      ankleR: [-20],
    },
  },
  {
    id: 'on-side',
    family: PoseFamily.Foreshortening,
    view: [-90, 20],
    joints: {
      body: [0, 90, 0],
      hipL: [20, 0, 0],
      kneeL: [25],
      ankleL: [-10],
      hipR: [70, -26, 0],
      kneeR: [85],
      ankleR: [-20],
      shoulderL: [95, 0, 0],
      elbowL: [30],
      shoulderR: [70, -20, 0],
      elbowR: [60],
      wristR: [20, -60],
      waist: [6, 0, 0],
      head: [4, -6, 0],
    },
  },
  // Screens
  {
    id: 'phone-standing',
    family: PoseFamily.Screens,
    held: { R: HeldObject.Phone },
    joints: {
      shoulderR: [15, 5, 0],
      elbowR: [100],
      wristR: [10, 90],
      shoulderL: [0, 6, 0],
      elbowL: [12],
      hipL: [6, 3, 0],
      kneeL: [14],
      neck: [15, 0, 0],
      head: [25, 0, 0],
    },
  },
  {
    id: 'phone-sitting',
    family: PoseFamily.Screens,
    prop: PropKind.Chair,
    held: { R: HeldObject.Phone },
    joints: {
      hipL: [88, 6, 0],
      hipR: [88, 6, 0],
      kneeL: [88],
      kneeR: [88],
      waist: [8, 0, 0],
      shoulderR: [25, 5, 0],
      elbowR: [95],
      wristR: [10, 90],
      shoulderL: [22, 8, 0],
      elbowL: [50],
      neck: [18, 0, 0],
      head: [25, 0, 0],
    },
  },
  {
    id: 'phone-on-back',
    family: PoseFamily.Screens,
    view: [60, 25],
    held: { R: HeldObject.Phone },
    joints: {
      body: [-90, 0, 0],
      shoulderR: [60, 10, 0],
      elbowR: [80],
      wristR: [60, 90],
      shoulderL: [0, 25, 0],
      elbowL: [20],
      hipL: [45, 4, 0],
      kneeL: [90],
      hipR: [0, 6, 0],
      head: [20, 0, 0],
    },
  },
  {
    id: 'phone-on-front',
    family: PoseFamily.Screens,
    view: [60, 20],
    held: { R: HeldObject.Phone },
    joints: {
      body: [90, 0, 0],
      waist: [-20, 0, 0],
      chest: [-25, 0, 0],
      shoulderL: [45, 10, 0],
      shoulderR: [45, 10, 0],
      elbowL: [90],
      elbowR: [90],
      wristR: [0, 90],
      neck: [10, 0, 0],
      head: [10, 0, 0],
      kneeL: [70],
      kneeR: [40],
    },
  },
  {
    id: 'kiosk',
    family: PoseFamily.Screens,
    prop: PropKind.Kiosk,
    view: [130, 12],
    joints: {
      shoulderR: [48, 4, 0],
      elbowR: [30],
      wristR: [0, 0],
      shoulderL: [0, 6, 0],
      elbowL: [10],
      hipL: [6, 3, 0],
      kneeL: [12],
      head: [10, 0, 0],
    },
  },
  {
    id: 'tablet-standing',
    family: PoseFamily.Screens,
    held: { L: HeldObject.Tablet },
    joints: {
      shoulderL: [20, 0, 0],
      elbowL: [95],
      wristL: [20, 90],
      shoulderR: [30, 0, -20],
      elbowR: [80],
      wristR: [10, -30],
      neck: [15, 0, 0],
      head: [20, 0, 0],
      hipR: [5, 3, 0],
      kneeR: [12],
    },
  },
  {
    id: 'tablet-sitting',
    family: PoseFamily.Screens,
    prop: PropKind.Chair,
    held: { L: HeldObject.Tablet },
    joints: {
      hipL: [88, 6, 0],
      hipR: [88, 6, 0],
      kneeL: [88],
      kneeR: [88],
      waist: [8, 0, 0],
      shoulderL: [20, 0, 0],
      elbowL: [95],
      wristL: [20, 90],
      shoulderR: [30, 0, -20],
      elbowR: [80],
      wristR: [10, -30],
      neck: [18, 0, 0],
      head: [22, 0, 0],
    },
  },
]

export const DEFAULT_POSE: Pose = POSES[0] ?? { id: 'rest', family: PoseFamily.Standing, joints: {} }

export function poseById(id: unknown): Pose | undefined {
  return POSES.find((p) => p.id === id)
}
