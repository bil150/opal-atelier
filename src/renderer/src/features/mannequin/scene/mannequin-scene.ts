/**
 * The 3D studio: the mannequin on a floor under a sky dome, one directional light, a camera orbiting the
 * figure. Renders on demand only. The page drives it through these methods.
 */
import * as THREE from 'three'
import { Shading, type MannequinSettings } from '../mannequin-settings'
import {
  ALL_JOINTS,
  CAMERA_DISTANCE,
  DEG,
  clamp,
  easeInOut,
  interpolate,
  orbitPoint,
  poseRotations,
  rotationOrder,
  type Rotation,
} from '../pose-math'
import { HeldObject, Side, type JointName, type Pose } from '../poses'
import { buildFigure, disposeFigure, visibleBox, type Figure } from './figure'
import { MaterialRole, disposeMaterials, makeMaterials, type MaterialSet } from './materials'
import { placeProps } from './props'

const TRANSITION_MS = 380

export interface CameraAngles {
  readonly azimuth: number
  readonly elevation: number
}

const grey = (v: number) => {
  const h = Math.round(clamp(v, 0, 1) * 255)
  return new THREE.Color(`rgb(${h},${h},${h})`)
}

export class MannequinScene {
  readonly #renderer: THREE.WebGLRenderer
  readonly #scene = new THREE.Scene()
  readonly #camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200)
  readonly #hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.55)
  readonly #sun = new THREE.DirectionalLight(0xffffff, 2.2)
  readonly #floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
  readonly #grid = new THREE.GridHelper(24, 24, 0x888888, 0x888888)
  readonly #sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  readonly #fog = new THREE.Fog(0x808080, 40, 140)
  readonly #box = new THREE.Box3()
  #settings: MannequinSettings
  #materials: MaterialSet
  #figure: Figure
  #props: THREE.Mesh[] = []
  #pose: Pose | null = null
  #animation = 0
  #pending = 0
  readonly #cam = { azimuth: 35, elevation: 10, distance: 22, target: new THREE.Vector3(0, 3.8, 0) }

  constructor(canvas: HTMLCanvasElement, settings: MannequinSettings) {
    this.#settings = settings
    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    this.#renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
    this.#renderer.shadowMap.enabled = true
    this.#renderer.shadowMap.type = THREE.PCFShadowMap

    const sun = this.#sun
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = sun.shadow.camera.bottom = -7
    sun.shadow.camera.right = sun.shadow.camera.top = 7
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 60
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.02
    this.#scene.add(this.#hemi, sun, sun.target)

    // A single-tone floor that melts into the horizon; a gradient sky dome around the camera.
    this.#floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 1, metalness: 0 }),
    )
    this.#floor.rotation.x = -Math.PI / 2
    this.#floor.receiveShadow = true
    this.#scene.fog = this.#fog
    this.#sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader:
          'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
void main() { float h = smoothstep(0.0, 0.75, normalize(vDir).y); gl_FragColor = vec4(mix(horizon, top, h), 1.0);
#include <colorspace_fragment>
}`,
      }),
    )
    this.#sky.scale.setScalar(150)
    this.#sky.renderOrder = -1
    this.#sky.frustumCulled = false
    const gridMaterial = this.#grid.material as THREE.Material
    gridMaterial.transparent = true
    gridMaterial.opacity = 0.12
    this.#grid.position.y = 0.01
    this.#scene.add(this.#sky, this.#floor, this.#grid)

    this.#materials = makeMaterials(settings.material, settings.shading)
    this.#figure = buildFigure(settings.heads, settings.shape, this.#materials)
    this.#scene.add(this.#figure.root)
  }

  /** Applies new settings: rebuilds the figure or the materials only when needed. */
  setSettings(next: MannequinSettings): void {
    const before = this.#settings
    this.#settings = next
    if (before.material !== next.material || before.shading !== next.shading) {
      const old = this.#materials
      this.#materials = makeMaterials(next.material, next.shading)
      const roleOf = (o: THREE.Object3D): MaterialRole =>
        Object.values(MaterialRole).find((r) => r === o.userData.role) ?? MaterialRole.Figure
      this.#figure.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = this.#materials[roleOf(o)]
      })
      for (const m of this.#props) m.material = this.#materials[roleOf(m)]
      disposeMaterials(old)
    }
    if (before.heads !== next.heads || before.shape !== next.shape) {
      this.#scene.remove(this.#figure.root)
      disposeFigure(this.#figure)
      this.#figure = buildFigure(next.heads, next.shape, this.#materials)
      this.#scene.add(this.#figure.root)
      if (this.#pose) {
        this.#setRotations(poseRotations(this.#pose))
        this.#placeOnGround(this.#pose)
        this.#frame()
      }
    }
    this.render()
  }

  /** Light and dark greys of the floor and sky, following the page's backdrop. */
  setBackdrop(light: boolean): void {
    const top = light ? grey(0.62) : grey(0.07)
    const horizon = light ? grey(0.93) : grey(0.32)
    const uniforms = this.#sky.material.uniforms as Record<'top' | 'horizon', { value: THREE.Color }>
    uniforms.top.value.copy(top)
    uniforms.horizon.value.copy(horizon)
    this.#scene.background = horizon
    this.#fog.color.copy(horizon)
    this.#floor.material.color.copy(light ? grey(0.68) : grey(0.2))
    this.#grid.material.color.set(light ? 0x000000 : 0xffffff)
    this.render()
  }

  /** Moves to a pose; a short transition unless `instant`. */
  showPose(pose: Pose, instant: boolean): void {
    cancelAnimationFrame(this.#animation)
    const to = poseRotations(pose)
    const first = this.#pose === null
    this.#pose = pose
    if (instant || first) {
      this.#setRotations(to)
      this.#placeOnGround(pose)
      this.#frame()
      this.render()
      return
    }
    const from = {} as Record<JointName, Rotation>
    for (const n of ALL_JOINTS) {
      const r = this.#figure.joints[n].rotation
      from[n] = [r.x, r.y, r.z]
    }
    const start = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / TRANSITION_MS)
      const e = easeInOut(u)
      const mid = {} as Record<JointName, Rotation>
      for (const n of ALL_JOINTS) mid[n] = interpolate(from[n], to[n], e)
      this.#setRotations(mid)
      this.#placeOnGround(pose, u < 1)
      if (u < 1) this.#animation = requestAnimationFrame(step)
      else this.#frame()
      this.#draw()
    }
    this.#animation = requestAnimationFrame(step)
  }

  get camera(): CameraAngles {
    return { azimuth: this.#cam.azimuth, elevation: this.#cam.elevation }
  }

  setCamera(azimuth: number, elevation: number): void {
    this.#cam.azimuth = ((azimuth % 360) + 360) % 360
    this.#cam.elevation = elevation
    this.#updateCamera()
    this.render()
  }

  /** Multiplies the camera distance (zoom out > 1, zoom in < 1). */
  zoom(factor: number): void {
    this.#cam.distance = clamp(this.#cam.distance * factor, CAMERA_DISTANCE.min, CAMERA_DISTANCE.max)
    this.#updateCamera()
    this.render()
  }

  get distance(): number {
    return this.#cam.distance
  }

  setDistance(distance: number): void {
    this.#cam.distance = clamp(distance, CAMERA_DISTANCE.min, CAMERA_DISTANCE.max)
    this.#updateCamera()
    this.render()
  }

  /** Fits the figure again at the current angles (view presets). */
  refit(): void {
    this.#cam.distance = this.#fitDistance()
    this.#updateCamera()
    this.render()
  }

  resize(width: number, height: number): void {
    this.#renderer.setSize(Math.max(1, width), Math.max(1, height), false)
    this.#camera.aspect = Math.max(1, width) / Math.max(1, height)
    this.#camera.updateProjectionMatrix()
    if (!this.#box.isEmpty()) this.refit()
    else this.render()
  }

  /** The current picture as PNG. */
  toPng(): Promise<Blob | null> {
    this.#draw()
    return new Promise((resolve) => {
      this.#renderer.domElement.toBlob(resolve, 'image/png')
    })
  }

  /** Draws at the next frame (several requests in a frame give one drawing). */
  render(): void {
    if (this.#pending) return
    this.#pending = requestAnimationFrame(() => {
      this.#pending = 0
      this.#draw()
    })
  }

  dispose(): void {
    cancelAnimationFrame(this.#animation)
    cancelAnimationFrame(this.#pending)
    disposeFigure(this.#figure)
    for (const m of this.#props) m.geometry.dispose()
    disposeMaterials(this.#materials)
    this.#renderer.dispose()
  }

  #draw(): void {
    this.#applyLight()
    this.#renderer.render(this.#scene, this.#camera)
  }

  #setRotations(rotations: Readonly<Record<JointName, Rotation>>): void {
    for (const n of ALL_JOINTS) this.#figure.joints[n].rotation.set(...rotations[n], rotationOrder(n))
  }

  /** Stands the figure on the floor (or lifted), centred on the grid, then places its furniture. */
  #placeOnGround(pose: Pose, moving = false): void {
    for (const object of Object.values(HeldObject))
      for (const side of Object.values(Side))
        this.#figure.held[`${object}${side}`].visible = pose.held?.[side] === object
    const root = this.#figure.root
    root.position.set(0, 0, 0)
    visibleBox(root, this.#box)
    root.position.set(
      -(this.#box.min.x + this.#box.max.x) / 2,
      -this.#box.min.y + (pose.lift ?? 0),
      -(this.#box.min.z + this.#box.max.z) / 2,
    )
    visibleBox(root, this.#box)
    for (const m of this.#props) {
      this.#scene.remove(m)
      m.geometry.dispose()
    }
    this.#props = moving ? [] : placeProps(this.#scene, this.#figure, pose.prop, this.#materials)
  }

  #fitDistance(): number {
    const size = this.#box.getSize(new THREE.Vector3())
    const r = (Math.max(size.x, size.y, size.z) * 0.5) / 0.82 // half size, with an 18 % margin
    const vf = this.#camera.fov * DEG
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.#camera.aspect)
    return clamp(
      r / Math.tan(Math.min(vf, hf) / 2) + Math.max(size.x, size.z) * 0.5,
      CAMERA_DISTANCE.min,
      CAMERA_DISTANCE.max,
    )
  }

  #frame(): void {
    this.#box.getCenter(this.#cam.target)
    this.#cam.distance = this.#fitDistance()
    this.#updateCamera()
  }

  #updateCamera(): void {
    const p = orbitPoint(this.#cam.target, this.#cam.azimuth, this.#cam.elevation, this.#cam.distance)
    this.#camera.position.set(p.x, p.y, p.z)
    this.#camera.lookAt(this.#cam.target)
    this.#sky.position.copy(this.#camera.position)
  }

  #applyLight(): void {
    const s = this.#settings
    const p = orbitPoint(this.#cam.target, s.lightAzimuth, s.lightElevation, 20)
    this.#sun.position.set(p.x, p.y, p.z)
    this.#sun.target.position.copy(this.#cam.target)
    this.#sun.castShadow = s.shadow
    // With 2 or 3 values, little ambient light: the shadow side falls clearly into the dark tone.
    const smooth = s.shading === Shading.Smooth
    this.#hemi.intensity = smooth ? 0.55 : 0.08
    this.#sun.intensity = smooth ? 2.2 : 2.6
    this.#grid.visible = s.floorGrid
  }
}
