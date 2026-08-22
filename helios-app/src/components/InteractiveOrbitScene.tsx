import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

export type StageMode = 'feed' | 'project' | 'chat' | 'live' | 'apps'
export type HeroPhase = 'void' | 'push' | 'flanks' | 'identity' | 'live'

export const STAGE_IDS: StageMode[] = ['feed', 'project', 'chat', 'live', 'apps']

export type LandingStation = {
  id: StageMode
  title: string
  body: string
  scroll: number
  x: number
  y: number
  z: number
}

export const LANDING_STATIONS: LandingStation[] = [
  {
    id: 'feed',
    title: 'The Feed',
    body: 'Real updates from people doing the work. Like, reply, and keep the project attached to the post.',
    scroll: 0.06,
    x: 0,
    y: 0.08,
    z: 96,
  },
  {
    id: 'project',
    title: 'Project workspace',
    body: 'The file you are editing stays bound to the Space. Open code, notes, and Live from the same room.',
    scroll: 0.28,
    x: 0.14,
    y: 0.06,
    z: 72,
  },
  {
    id: 'chat',
    title: 'Project Chat',
    body: 'The conversation sits next to the files. Decisions do not disappear into a separate app.',
    scroll: 0.48,
    x: -0.12,
    y: 0.04,
    z: 48,
  },
  {
    id: 'live',
    title: 'Live work',
    body: 'Watch someone build in real time. Comments land on the same session, not a clip after the fact.',
    scroll: 0.68,
    x: 0.1,
    y: 0.06,
    z: 26,
  },
  {
    id: 'apps',
    title: 'Mini Apps',
    body: 'Calculator, notes, whiteboard, and the rest open as workspaces — not toys floating off the project.',
    scroll: 0.88,
    x: 0,
    y: 0.1,
    z: 6,
  },
]

interface Props {
  activeMode: StageMode
  phase: HeroPhase
  hostRef: RefObject<HTMLElement | HTMLDivElement | null>
  onInteract: () => void
  onStationChange: (mode: StageMode) => void
  onSelectStation: (mode: StageMode) => void
  windows: Partial<Record<StageMode, ReactNode>>
}

type CameraKey = {
  t: number
  x: number
  y: number
  z: number
  lx: number
  ly: number
  lz: number
  fov: number
}

type Pose = { x: number; y: number; z: number; rx: number; ry: number }

const WINDOW_WIDTH = 760
const WINDOW_HEIGHT = 500
const WINDOW_SCALE = 0.0084

const PATH: CameraKey[] = [
  { t: 0, x: 0.12, y: 1.35, z: 132, lx: 0, ly: 0.22, lz: 108, fov: 34 },
  { t: 0.1, x: 0.04, y: 0.72, z: 114, lx: 0.02, ly: 0.1, lz: 98, fov: 30 },
  { t: 0.2, x: 0, y: 0.52, z: 108, lx: 0, ly: 0.06, lz: 96, fov: 26 },
  { t: 0.32, x: 0.28, y: 0.48, z: 90, lx: 0.16, ly: 0.06, lz: 74, fov: 28 },
  { t: 0.42, x: 0.12, y: 0.46, z: 84, lx: 0.12, ly: 0.04, lz: 72, fov: 25 },
  { t: 0.54, x: -0.22, y: 0.44, z: 66, lx: -0.12, ly: 0.02, lz: 50, fov: 28 },
  { t: 0.64, x: -0.1, y: 0.42, z: 60, lx: -0.1, ly: 0.02, lz: 48, fov: 25 },
  { t: 0.74, x: 0.16, y: 0.44, z: 42, lx: 0.1, ly: 0.03, lz: 28, fov: 27 },
  { t: 0.82, x: 0.08, y: 0.44, z: 38, lx: 0.08, ly: 0.02, lz: 26, fov: 25 },
  { t: 0.92, x: 0.02, y: 0.5, z: 20, lx: 0, ly: -0.06, lz: 8, fov: 24 },
  { t: 1, x: 0, y: 0.52, z: 17.2, lx: 0, ly: -0.16, lz: 6, fov: 22 },
]

const DECOR: Record<string, Pose> = {
  left: { x: -1.35, y: 0.55, z: 104, rx: 0.06, ry: 0.18 },
  right: { x: 1.4, y: -0.2, z: 86, rx: -0.05, ry: -0.16 },
  data: { x: 1.15, y: 0.62, z: 58, rx: 0.04, ry: -0.12 },
  low: { x: -1.2, y: -0.7, z: 38, rx: 0.12, ry: 0.1 },
  brand: { x: 1.05, y: 0.35, z: 14, rx: 0, ry: -0.08 },
}

function damp(current: number, target: number, smoothing: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta))
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function samplePath(t: number): CameraKey {
  const progress = THREE.MathUtils.clamp(t, 0, 1)
  let index = 0
  while (index < PATH.length - 2 && PATH[index + 1].t < progress) index += 1
  const a = PATH[index]
  const b = PATH[index + 1]
  const local = (progress - a.t) / Math.max(b.t - a.t, 0.0001)
  const eased = local * local * (3 - 2 * local)
  return {
    t: progress,
    x: THREE.MathUtils.lerp(a.x, b.x, eased),
    y: THREE.MathUtils.lerp(a.y, b.y, eased),
    z: THREE.MathUtils.lerp(a.z, b.z, eased),
    lx: THREE.MathUtils.lerp(a.lx, b.lx, eased),
    ly: THREE.MathUtils.lerp(a.ly, b.ly, eased),
    lz: THREE.MathUtils.lerp(a.lz, b.lz, eased),
    fov: THREE.MathUtils.lerp(a.fov, b.fov, eased),
  }
}

function makeStarfield(count: number, spread: number, depth: number, size: number) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (seededRandom(i + 1) - 0.5) * spread
    positions[i * 3 + 1] = (seededRandom(i + 19) - 0.5) * spread * 0.52
    positions[i * 3 + 2] = -seededRandom(i + 41) * depth
    const tint = seededRandom(i + 73)
    colors[i * 3] = 0.72 + tint * 0.28
    colors[i * 3 + 1] = 0.78 + tint * 0.18
    colors[i * 3 + 2] = 0.94
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  return new THREE.Points(geometry, material)
}

function paintScreen(kind: 'feed' | 'code' | 'chat') {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#10151c'
  ctx.fillRect(0, 0, 768, 480)
  ctx.fillStyle = '#161c24'
  ctx.fillRect(0, 0, 768, 44)
  ctx.fillStyle = '#ff5f57'
  ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#febc2e'
  ctx.beginPath(); ctx.arc(42, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#28c840'
  ctx.beginPath(); ctx.arc(62, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f4f6fb'
  ctx.font = '600 18px Inter, sans-serif'
  ctx.fillText(kind === 'feed' ? 'Home' : kind === 'code' ? 'Web Code Editor' : 'Project Chat', 86, 28)

  if (kind === 'feed') {
    ;['Alex Morgan  @alexm', 'Lea Stone  @lea', 'Jordan  @jd'].forEach((name, index) => {
      const y = 78 + index * 128
      ctx.fillStyle = '#1d9bf0'
      ctx.beginPath(); ctx.arc(48, y + 18, 18, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f4f6fb'
      ctx.font = '700 20px Inter, sans-serif'
      ctx.fillText(name, 78, y + 12)
      ctx.fillStyle = '#c9d3de'
      ctx.font = '400 18px Inter, sans-serif'
      ctx.fillText(index === 0 ? 'Shipped the orbit camera. The feed stays readable.' : 'Testing the uncomfortable assumption today.', 78, y + 42)
      ctx.fillStyle = '#8b98a5'
      ctx.font = '400 15px Inter, sans-serif'
      ctx.fillText('Reply   Repost   Like   Bookmark', 78, y + 74)
    })
  } else if (kind === 'code') {
    ctx.fillStyle = '#0b0f14'
    ctx.fillRect(0, 44, 168, 436)
    ctx.fillStyle = '#8fd4ff'
    ctx.font = '600 13px Inter, sans-serif'
    ctx.fillText('FILES', 24, 72)
    ctx.fillStyle = '#d7e3ef'
    ctx.font = '400 15px ui-monospace, monospace'
    ;['OrbitStage.tsx', 'FeedHome.tsx', 'LiveRoom.tsx'].forEach((file, index) => {
      if (index === 0) {
        ctx.fillStyle = 'rgba(79,195,247,.16)'
        ctx.fillRect(12, 88, 144, 28)
      }
      ctx.fillStyle = index === 0 ? '#8fd4ff' : '#8b98a5'
      ctx.fillText(file, 24, 108 + index * 34)
    })
    ctx.fillStyle = '#c792ea'
    ctx.font = '500 16px ui-monospace, monospace'
    ctx.fillText('export function HeliosSpace() {', 196, 96)
    ctx.fillStyle = '#82aaff'
    ctx.fillText('  return <Feed />', 196, 128)
    ctx.fillText('}', 196, 160)
  } else {
    ctx.fillStyle = '#1b2733'
    ctx.fillRect(24, 72, 420, 64)
    ctx.fillStyle = '#1d4f73'
    ctx.fillRect(300, 156, 440, 64)
    ctx.fillStyle = '#1b2733'
    ctx.fillRect(24, 240, 480, 64)
    ctx.fillStyle = '#f4f6fb'
    ctx.font = '400 16px Inter, sans-serif'
    ctx.fillText('Can we keep the drill notes next to the clip?', 40, 110)
    ctx.fillText('Yes — I linked File tree → session-04.md', 318, 194)
    ctx.fillText('Helios summary: 2 tasks, 1 Live blocker.', 40, 278)
  }
  return canvas
}

function makePanel(kind: 'feed' | 'code' | 'chat', width: number, height: number) {
  const texture = new THREE.CanvasTexture(paintScreen(kind))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  const group = new THREE.Group()
  const plateMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, opacity: 0 })
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(width, height), plateMaterial)
  const frameMaterial = new THREE.LineBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0 })
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.12)),
    frameMaterial,
  )
  const backMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    metalness: 0.3,
    roughness: 0.45,
    transparent: true,
    opacity: 0,
  })
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.1), backMaterial)
  back.position.z = -0.06
  plate.position.z = 0.07
  group.add(back, plate, frame)
  group.userData.fadeMaterials = [plateMaterial, frameMaterial, backMaterial]
  return group
}

function applyPose(group: THREE.Group, pose: Pose) {
  group.position.set(pose.x, pose.y, pose.z)
  group.rotation.set(pose.rx, pose.ry, 0)
}

function setGroupOpacity(group: THREE.Group, opacity: number) {
  const materials = group.userData.fadeMaterials as THREE.Material[] | undefined
  materials?.forEach(material => {
    material.opacity = opacity
    material.transparent = opacity < 0.98
  })
  group.visible = opacity > 0.02
}

function cinematicProgress(elapsed: number, skipped: boolean) {
  if (skipped) return 1
  return THREE.MathUtils.clamp((elapsed - 0.35) / 2.6, 0, 1)
}

function makeFloor(width: number, depth: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#070910'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(143, 212, 255, 0.16)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 16; i += 1) {
      const p = (i / 16) * 512
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 18)
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = -2.4
  mesh.position.z = 48
  return mesh
}

function paintWorld(kind: 'mini' | 'project' | 'data' | 'brand') {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#10151c'
  ctx.fillRect(0, 0, 768, 480)
  ctx.fillStyle = '#161c24'
  ctx.fillRect(0, 0, 768, 44)
  ctx.fillStyle = '#ff5f57'
  ctx.beginPath(); ctx.arc(22, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#febc2e'
  ctx.beginPath(); ctx.arc(42, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#28c840'
  ctx.beginPath(); ctx.arc(62, 22, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f4f6fb'
  ctx.font = '600 18px Inter, sans-serif'
  if (kind === 'mini') {
    ctx.fillText('Mini Apps', 86, 28)
    ;['Calculator', 'Notes', 'Pomodoro', 'Whiteboard'].forEach((name, index) => {
      const x = 48 + (index % 2) * 340
      const y = 96 + Math.floor(index / 2) * 160
      ctx.fillStyle = 'rgba(79,195,247,.12)'
      ctx.fillRect(x, y, 300, 128)
      ctx.fillStyle = '#8fd4ff'
      ctx.font = '700 28px Inter, sans-serif'
      ctx.fillText(name, x + 22, y + 52)
      ctx.fillStyle = '#c9d3de'
      ctx.font = '400 16px Inter, sans-serif'
      ctx.fillText('Native Helios tool', x + 22, y + 86)
    })
  } else if (kind === 'project') {
    ctx.fillText('Project Workspace', 86, 28)
    ctx.fillStyle = '#f4f6fb'
    ctx.font = '700 36px Inter, sans-serif'
    ctx.fillText('Orbit interface', 48, 140)
    ctx.fillStyle = '#8b98a5'
    ctx.font = '400 20px Inter, sans-serif'
    ctx.fillText('Tasks  ·  Progress  ·  Collaborators', 48, 186)
    ctx.fillStyle = 'rgba(133,118,245,.22)'
    ctx.fillRect(48, 230, 420, 16)
    ctx.fillStyle = '#8576f5'
    ctx.fillRect(48, 230, 260, 16)
  } else if (kind === 'data') {
    ctx.fillText('Live data', 86, 28)
    ctx.fillStyle = '#6ed69a'
    ctx.font = '500 18px ui-monospace, monospace'
    ;['solar: 128', 'streak: 6', 'apps: 17', 'projects: 4'].forEach((line, index) => {
      ctx.fillText(line, 56, 120 + index * 42)
    })
  } else {
    ctx.fillStyle = '#04060b'
    ctx.fillRect(0, 0, 768, 480)
    ctx.fillStyle = '#f4f6fb'
    ctx.font = '400 28px Inter, sans-serif'
    ctx.fillText('helios', 210, 230)
    ctx.fillStyle = '#8fd4ff'
    ctx.font = '800 42px Inter, sans-serif'
    ctx.fillText('space', 318, 230)
    ctx.fillStyle = 'rgba(242,184,75,.8)'
    ctx.font = '600 16px Inter, sans-serif'
    ctx.fillText('ENTER THE ENVIRONMENT', 246, 286)
  }
  return canvas
}

function makeWorldPanel(kind: 'mini' | 'project' | 'data' | 'brand', width: number, height: number) {
  const texture = new THREE.CanvasTexture(paintWorld(kind))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  const group = new THREE.Group()
  const plateMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, opacity: 0 })
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(width, height), plateMaterial)
  const frameMaterial = new THREE.LineBasicMaterial({ color: kind === 'brand' ? 0xf2b84b : 0x8fd4ff, transparent: true, opacity: 0 })
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.12)),
    frameMaterial,
  )
  const backMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    metalness: 0.3,
    roughness: 0.45,
    transparent: true,
    opacity: 0,
  })
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.1), backMaterial)
  back.position.z = -0.06
  plate.position.z = 0.07
  group.add(back, plate, frame)
  group.userData.fadeMaterials = [plateMaterial, frameMaterial, backMaterial]
  return group
}


export function InteractiveOrbitScene({ hostRef, onInteract, onStationChange, onSelectStation, windows }: Props) {
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null)
  const onInteractRef = useRef(onInteract)
  const onStationChangeRef = useRef(onStationChange)
  const onSelectStationRef = useRef(onSelectStation)
  const [hosts] = useState(() => {
    const map = {} as Record<StageMode, HTMLDivElement>
    STAGE_IDS.forEach(id => {
      const el = document.createElement('div')
      el.className = 'hero-css3d-window-host'
      el.dataset.station = id
      el.style.width = `${WINDOW_WIDTH}px`
      el.style.height = `${WINDOW_HEIGHT}px`
      map[id] = el
    })
    return map
  })

  useEffect(() => { onInteractRef.current = onInteract }, [onInteract])
  useEffect(() => { onStationChangeRef.current = onStationChange }, [onStationChange])
  useEffect(() => { onSelectStationRef.current = onSelectStation }, [onSelectStation])

  useLayoutEffect(() => {
    const mount = mountEl
    if (!mount) return
    const host = hostRef.current ?? mount.parentElement ?? mount
    const fallbackHost = hosts.feed

    const showFallbackWindow = () => {
      fallbackHost.classList.add('is-fallback')
      if (fallbackHost.parentElement !== mount) mount.appendChild(fallbackHost)
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' })
    } catch (error) {
      console.error('[Helios hero] WebGL unavailable', error)
      host.dataset.webgl = 'unavailable'
      showFallbackWindow()
      return () => {
        fallbackHost.classList.remove('is-fallback')
        if (fallbackHost.parentElement === mount) mount.removeChild(fallbackHost)
        delete host.dataset.webgl
      }
    }

    host.dataset.webgl = 'ready'
    try {
    renderer.setClearColor(0x04060b, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.1))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = 'interactive-orbit-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.appendChild(renderer.domElement)

    const cssRenderer = new CSS3DRenderer()
    cssRenderer.domElement.className = 'hero-css3d-layer'
    cssRenderer.domElement.style.pointerEvents = 'none'
    mount.appendChild(cssRenderer.domElement)

    const scene = new THREE.Scene()
    const cssScene = new THREE.Scene()
    const startShot = samplePath(0)
    const camera = new THREE.PerspectiveCamera(startShot.fov, 1, 0.08, 800)
    camera.position.set(startShot.x, startShot.y, startShot.z)
    const look = new THREE.Vector3(startShot.lx, startShot.ly, startShot.lz)
    camera.lookAt(look)

    const ambient = new THREE.AmbientLight(0xb8c4ff, 0.5)
    const keyLight = new THREE.PointLight(0x4fc3f7, 36, 160)
    const fill = new THREE.PointLight(0x8576f5, 22, 120)
    const rim = new THREE.PointLight(0xf2b84b, 14, 100)
    keyLight.position.set(-8, 6, 18)
    fill.position.set(10, -3, 8)
    rim.position.set(0, 8, -12)
    scene.add(ambient, keyLight, fill, rim)

    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(180, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0x140c28,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.96,
      }),
    )
    scene.add(nebula)
    scene.add(makeFloor(90, 220))

    const rings = [7, 11, 16].map((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.018, 8, 96),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0x8576f5 : 0x4fc3f7, transparent: true, opacity: 0.18 }),
      )
      ring.rotation.x = 1.22 + index * 0.16
      ring.rotation.y = index * 0.45
      scene.add(ring)
      return ring
    })

    const starGroup = new THREE.Group()
    starGroup.add(makeStarfield(360, 46, 140, 0.055), makeStarfield(520, 96, 260, 0.038))
    scene.add(starGroup)

    const stationPanels: Record<StageMode, THREE.Group> = {
      feed: makePanel('feed', 6.6, 4.3),
      project: makeWorldPanel('project', 6.4, 4.1),
      chat: makePanel('chat', 6.2, 4),
      live: makePanel('code', 6.2, 4),
      apps: makeWorldPanel('mini', 6.4, 4.1),
    }
    LANDING_STATIONS.forEach(station => {
      const panel = stationPanels[station.id]
      applyPose(panel, { x: station.x, y: station.y, z: station.z, rx: 0.02, ry: station.x * 0.12 })
      panel.userData.stationId = station.id
      panel.children.forEach(child => { child.userData.stationId = station.id })
      setGroupOpacity(panel, 0)
      scene.add(panel)
    })

    const decorLeft = makePanel('code', 4.2, 2.6)
    const decorRight = makeWorldPanel('mini', 4.1, 2.5)
    const decorData = makeWorldPanel('data', 3.8, 2.5)
    const decorLow = makePanel('chat', 4, 2.4)
    const decorBrand = makeWorldPanel('brand', 5.2, 2.9)
    applyPose(decorLeft, DECOR.left)
    applyPose(decorRight, DECOR.right)
    applyPose(decorData, DECOR.data)
    applyPose(decorLow, DECOR.low)
    applyPose(decorBrand, DECOR.brand)
    ;[decorLeft, decorRight, decorData, decorLow, decorBrand].forEach(panel => {
      setGroupOpacity(panel, 0)
      scene.add(panel)
    })

    const dustGeometry = new THREE.BufferGeometry()
    const dustCount = 280
    const dustPositions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions[i * 3] = (seededRandom(i + 201) - 0.5) * 22
      dustPositions[i * 3 + 1] = (seededRandom(i + 277) - 0.5) * 10
      dustPositions[i * 3 + 2] = seededRandom(i + 331) * 160
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0xb8d7ff,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }))
    scene.add(dust)

    const cssObjects = {} as Record<StageMode, CSS3DObject>
    STAGE_IDS.forEach(id => {
      const object = new CSS3DObject(hosts[id])
      const station = LANDING_STATIONS.find(item => item.id === id)!
      object.scale.setScalar(WINDOW_SCALE)
      object.position.set(station.x, station.y, station.z)
      object.rotation.set(0.03, station.x * 0.1, 0)
      object.visible = false
      cssScene.add(object)
      cssObjects[id] = object
    })

    const resize = () => {
      const width = host.clientWidth || window.innerWidth
      const height = host.clientHeight || window.innerHeight
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      cssRenderer.setSize(width, height)
      const fit = THREE.MathUtils.clamp(width / 1180, 0.42, 1)
      STAGE_IDS.forEach(id => cssObjects[id].scale.setScalar(WINDOW_SCALE * fit))
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const pointer = { x: 0, y: 0 }
    const pointerTarget = { x: 0, y: 0 }
    const raycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2()
    const onPointerMove = (event: Event) => {
      const pointerEvent = event as PointerEvent
      const rect = host.getBoundingClientRect()
      pointerTarget.x = ((pointerEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointerTarget.y = ((pointerEvent.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1
    }
    const onPointerDown = (event: Event) => {
      onInteractRef.current()
      const pointerEvent = event as PointerEvent
      const rect = host.getBoundingClientRect()
      pointerNdc.x = ((pointerEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointerNdc.y = -(((pointerEvent.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
      raycaster.setFromCamera(pointerNdc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const stationId = hits.find(hit => hit.object.userData.stationId)?.object.userData.stationId as StageMode | undefined
      if (stationId) onSelectStationRef.current(stationId)
    }
    const forwardWheel = (event: Event) => {
      const wheel = event as WheelEvent
      const scroller = host.closest('.landing-v2') as HTMLElement | null
      if (!scroller) return
      scroller.scrollTop += wheel.deltaY
    }
    STAGE_IDS.forEach(id => hosts[id].addEventListener('wheel', forwardWheel, { passive: true }))
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerdown', onPointerDown)

    let frame = 0
    let previous = performance.now()
    let flightTime = 0
    let warmFrames = 0
    let flyT = 0
    let cancelled = false
    let visible = !document.hidden
    let lastStation: StageMode | null = null
    host.dataset.scrollProgress = host.dataset.scrollProgress || '0'
    host.dataset.introReady = '1'
    if (host.dataset.skipIntro !== '1') host.dataset.skipIntro = '0'

    const animate = () => {
      if (cancelled) return
      frame = window.requestAnimationFrame(animate)
      if (!visible) return
      const now = performance.now()
      const rawDelta = Math.max(0, (now - previous) / 1000)
      previous = now
      const delta = Math.min(rawDelta, 0.05)
      const skipped = host.dataset.skipIntro === '1'
      if (skipped) flightTime = 3
      else if (warmFrames < 4) warmFrames += 1
      else if (flightTime < 3) flightTime += Math.min(rawDelta, 1 / 18)
      const introMapped = cinematicProgress(flightTime, skipped) * 0.2
      const scroll = THREE.MathUtils.clamp(Number(host.dataset.scrollProgress || 0), 0, 1)
      const scrollMapped = 0.18 + scroll * 0.82
      const pathT = THREE.MathUtils.clamp(Math.max(introMapped, scroll > 0.004 ? scrollMapped : introMapped), 0, 1)
      flyT = damp(flyT, pathT, reducedMotion ? 10 : 2.6, delta)
      const shot = samplePath(flyT)
      const facing = (z: number, peak = 13, falloff = 12) => {
        const depth = shot.z - z
        if (depth < 1) return 0
        return THREE.MathUtils.clamp(1 - Math.abs(depth - peak) / falloff, 0, 1)
      }

      pointer.x = damp(pointer.x, reducedMotion ? 0 : pointerTarget.x, 4.2, delta)
      pointer.y = damp(pointer.y, reducedMotion ? 0 : pointerTarget.y, 4.2, delta)
      camera.position.x = damp(camera.position.x, shot.x + pointer.x * 0.2, 5.8, delta)
      camera.position.y = damp(camera.position.y, shot.y + pointer.y * -0.12, 5.8, delta)
      camera.position.z = damp(camera.position.z, shot.z, 6.4, delta)
      camera.fov = damp(camera.fov, shot.fov, 4.8, delta)
      camera.updateProjectionMatrix()
      look.x = damp(look.x, shot.lx + pointer.x * 0.1, 5.4, delta)
      look.y = damp(look.y, shot.ly - pointer.y * 0.06, 5.4, delta)
      look.z = damp(look.z, shot.lz, 5.4, delta)
      camera.lookAt(look)
      if (!reducedMotion) camera.rotation.z += Math.sin(flyT * Math.PI) * 0.012

      let nearest = LANDING_STATIONS[0]
      let nearestScore = -1
      LANDING_STATIONS.forEach(station => {
        const score = facing(station.z, 12, 14)
        if (score > nearestScore) {
          nearest = station
          nearestScore = score
        }
      })
      if (nearest.id !== lastStation && nearestScore > 0.28) {
        lastStation = nearest.id
        onStationChangeRef.current(nearest.id)
      }

      let cssNeeded = false
      STAGE_IDS.forEach(id => {
        const station = LANDING_STATIONS.find(item => item.id === id)!
        const closeness = facing(station.z, 12, 16)
        const live = closeness > 0.28
        const object = cssObjects[id]
        object.visible = live
        hosts[id].style.opacity = live ? Math.max(closeness, 0.35).toFixed(3) : '0'
        hosts[id].style.pointerEvents = closeness > 0.4 ? 'auto' : 'none'
        setGroupOpacity(stationPanels[id], live ? 0 : closeness * 0.95)
        if (live) cssNeeded = true
      })
      setGroupOpacity(decorLeft, facing(DECOR.left.z, 11, 10) * 0.7)
      setGroupOpacity(decorRight, facing(DECOR.right.z, 11, 10) * 0.68)
      setGroupOpacity(decorData, facing(DECOR.data.z, 11, 10) * 0.62)
      setGroupOpacity(decorLow, facing(DECOR.low.z, 11, 9) * 0.6)
      setGroupOpacity(decorBrand, facing(DECOR.brand.z, 11, 10) * 0.55)

      dust.position.z = shot.z - 20
      starGroup.position.z = shot.z - 36
      nebula.position.z = shot.z - 8
      rings.forEach((ring, index) => {
        ring.rotation.z += delta * (0.035 + index * 0.012)
        ring.position.z = shot.z - 8 - index * 3
      })
      keyLight.position.z = shot.z - 8
      fill.position.z = shot.z - 4

      host.style.setProperty('--hero-scroll', scroll.toFixed(4))
      host.style.setProperty('--hero-intro', Math.max(introMapped * 5, nearestScore).toFixed(4))
      host.style.setProperty('--station-strength', Math.max(0, nearestScore).toFixed(3))
      host.dataset.flightT = flyT.toFixed(3)
      host.dataset.station = nearest.id
      host.dataset.stationStrength = nearestScore.toFixed(3)
      host.dataset.introReady = '1'
      renderer.render(scene, camera)
      if (cssNeeded) cssRenderer.render(cssScene, camera)
    }

    const onVisibility = () => {
      visible = !document.hidden
      if (visible) previous = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    animate()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      resizeObserver.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerdown', onPointerDown)
      STAGE_IDS.forEach(id => hosts[id].removeEventListener('wheel', forwardWheel))
      delete host.dataset.webgl
      STAGE_IDS.forEach(id => cssScene.remove(cssObjects[id]))
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(material => {
            if ('map' in material && material.map) material.map.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
      cssRenderer.domElement.remove()
      STAGE_IDS.forEach(id => { if (hosts[id].parentElement) hosts[id].remove() })
    }
    } catch (error) {
      console.error('[Helios hero] scene init failed', error)
      renderer.dispose()
      renderer.domElement.remove()
      host.dataset.webgl = 'unavailable'
      showFallbackWindow()
      return () => {
        fallbackHost.classList.remove('is-fallback')
        if (fallbackHost.parentElement === mount) mount.removeChild(fallbackHost)
        delete host.dataset.webgl
      }
    }
  }, [hostRef, hosts, mountEl])

  return (
    <div ref={setMountEl} className="interactive-orbit-scene">
      {STAGE_IDS.map(id => hosts[id] ? createPortal(windows[id] ?? null, hosts[id]) : null)}
    </div>
  )
}
