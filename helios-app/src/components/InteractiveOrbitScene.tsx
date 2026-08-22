import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

export type StageMode = 'feed' | 'project' | 'chat' | 'live' | 'apps'
export type HeroPhase = 'void' | 'push' | 'flanks' | 'identity' | 'live'

interface Props {
  activeMode: StageMode
  phase: HeroPhase
  hostRef: RefObject<HTMLElement | HTMLDivElement | null>
  windowRef: RefObject<HTMLElement | null>
  onInteract: () => void
  children: ReactNode
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

const WINDOW_WIDTH = 920
const WINDOW_HEIGHT = 600
const WINDOW_SCALE = 0.008

const PATH: CameraKey[] = [
  { t: 0, x: 0.28, y: 10.8, z: 410, lx: 0.2, ly: 0.55, lz: 48, fov: 30 },
  { t: 0.16, x: 0.9, y: 7.1, z: 348, lx: 1.05, ly: 0.32, lz: 26, fov: 27 },
  { t: 0.28, x: -0.75, y: 4.4, z: 300, lx: -1.1, ly: 0.16, lz: 16, fov: 26 },
  { t: 0.4, x: -0.32, y: 2.6, z: 236, lx: -0.7, ly: 0.2, lz: 9, fov: 25 },
  { t: 0.52, x: 0.92, y: 1.55, z: 178, lx: 0.82, ly: 0, lz: 5, fov: 24 },
  { t: 0.64, x: -0.42, y: 1.08, z: 118, lx: -0.18, ly: -0.16, lz: 2.6, fov: 23 },
  { t: 0.76, x: 0.18, y: 0.72, z: 70, lx: 0.12, ly: 0.04, lz: 1.2, fov: 24 },
  { t: 0.88, x: 0.04, y: 0.6, z: 34, lx: 0, ly: -0.14, lz: 0.25, fov: 23 },
  { t: 1, x: 0, y: 0.55, z: 18.4, lx: 0, ly: -0.22, lz: 0, fov: 22 },
]

const FEED_HOME: Pose = { x: -3.05, y: 1.05, z: 210, rx: 0.06, ry: 0.28 }
const CODE_HOME: Pose = { x: 3.15, y: -0.85, z: 148, rx: -0.05, ry: -0.28 }
const CHAT_HOME: Pose = { x: -2.75, y: -1.55, z: 92, rx: 0.14, ry: 0.2 }
const MINI_HOME: Pose = { x: 2.85, y: 1.35, z: 66, rx: -0.08, ry: -0.22 }
const PROJECT_HOME: Pose = { x: -3.35, y: 0.45, z: 292, rx: 0.04, ry: 0.3 }
const DATA_HOME: Pose = { x: 3.15, y: 1.55, z: 340, rx: 0.08, ry: -0.26 }
const BRAND_HOME: Pose = { x: 0, y: 0.12, z: 38, rx: 0, ry: 0 }
const CLOSE_LEFT: Pose = { x: -1.65, y: 0.88, z: 248, rx: 0.1, ry: 0.4 }
const CLOSE_RIGHT: Pose = { x: 1.78, y: -0.42, z: 176, rx: -0.06, ry: -0.36 }
const CLOSE_LOW: Pose = { x: -1.4, y: -1.28, z: 118, rx: 0.18, ry: 0.14 }

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

function cinematicProgress(elapsed: number, reducedMotion: boolean) {
  if (reducedMotion) {
    const t = THREE.MathUtils.clamp(elapsed / 2.2, 0, 1)
    return 0.62 + 0.38 * t * t * (3 - 2 * t)
  }
  const t = THREE.MathUtils.clamp(elapsed / 7, 0, 1)
  if (t < 0.1) return (t / 0.1) * (t / 0.1) * 0.1
  if (t > 0.88) {
    const u = (t - 0.88) / 0.12
    return 0.88 + (1 - (1 - u) * (1 - u)) * 0.12
  }
  return t
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

export function InteractiveOrbitScene({ phase, hostRef, windowRef, onInteract, children }: Props) {
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null)
  const phaseRef = useRef(phase)
  const onInteractRef = useRef(onInteract)
  const [windowHost] = useState(() => {
    const el = document.createElement('div')
    el.className = 'hero-css3d-window-host'
    el.style.width = `${WINDOW_WIDTH}px`
    el.style.height = `${WINDOW_HEIGHT}px`
    return el
  })

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { onInteractRef.current = onInteract }, [onInteract])

  useEffect(() => {
    const windowEl = windowRef.current
    if (!windowEl) return
    windowEl.classList.add('is-css3d')
    return () => windowEl.classList.remove('is-css3d')
  }, [windowRef])

  useLayoutEffect(() => {
    const mount = mountEl
    if (!mount) return
    const host = hostRef.current ?? mount.parentElement ?? mount

    const showFallbackWindow = () => {
      windowHost.classList.add('is-fallback')
      if (windowHost.parentElement !== mount) mount.appendChild(windowHost)
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
        windowHost.classList.remove('is-fallback')
        if (windowHost.parentElement === mount) mount.removeChild(windowHost)
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
    const startShot = samplePath(cinematicProgress(0, reducedMotion))
    const camera = new THREE.PerspectiveCamera(startShot.fov, 1, 0.08, 800)
    camera.position.set(startShot.x, startShot.y, startShot.z)
    const look = new THREE.Vector3(startShot.lx, startShot.ly, startShot.lz)
    camera.lookAt(look)

    const ambient = new THREE.AmbientLight(0xb8c4ff, 0.42)
    const keyLight = new THREE.PointLight(0x4fc3f7, 36, 140)
    const fill = new THREE.PointLight(0x8576f5, 22, 110)
    const rim = new THREE.PointLight(0xf2b84b, 14, 90)
    keyLight.position.set(-8, 6, 18)
    fill.position.set(10, -3, 8)
    rim.position.set(0, 8, -12)
    scene.add(ambient, keyLight, fill, rim)

    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(160, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x140c28,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.94,
      }),
    )
    scene.add(nebula)

    const rings = [8.5, 13, 19].map((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.016, 8, 96),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0x8576f5 : 0x4fc3f7, transparent: true, opacity: 0.2 }),
      )
      ring.rotation.x = 1.22 + index * 0.16
      ring.rotation.y = index * 0.45
      scene.add(ring)
      return ring
    })

    const starGroup = new THREE.Group()
    starGroup.add(makeStarfield(280, 40, 110, 0.055), makeStarfield(420, 88, 220, 0.038))
    scene.add(starGroup)

    const feedPanel = makePanel('feed', 6.2, 3.9)
    const codePanel = makePanel('code', 5.8, 3.6)
    const chatPanel = makePanel('chat', 5.2, 3.2)
    const miniPanel = makeWorldPanel('mini', 5.6, 3.5)
    const projectPanel = makeWorldPanel('project', 5.8, 3.6)
    const dataPanel = makeWorldPanel('data', 4.2, 2.8)
    const brandPanel = makeWorldPanel('brand', 7.6, 4.2)
    const closeLeft = makePanel('code', 5.0, 3.1)
    const closeRight = makeWorldPanel('mini', 4.8, 2.9)
    const closeLow = makePanel('chat', 4.6, 2.8)
    applyPose(feedPanel, FEED_HOME)
    applyPose(codePanel, CODE_HOME)
    applyPose(chatPanel, CHAT_HOME)
    applyPose(miniPanel, MINI_HOME)
    applyPose(projectPanel, PROJECT_HOME)
    applyPose(dataPanel, DATA_HOME)
    applyPose(brandPanel, BRAND_HOME)
    applyPose(closeLeft, CLOSE_LEFT)
    applyPose(closeRight, CLOSE_RIGHT)
    applyPose(closeLow, CLOSE_LOW)
    ;[feedPanel, codePanel, chatPanel, miniPanel, projectPanel, dataPanel, brandPanel, closeLeft, closeRight, closeLow].forEach(panel => setGroupOpacity(panel, 0))
    scene.add(feedPanel, codePanel, chatPanel, miniPanel, projectPanel, dataPanel, brandPanel, closeLeft, closeRight, closeLow)

    const dustGeometry = new THREE.BufferGeometry()
    const dustCount = 260
    const dustPositions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      const nearField = i % 5 === 0
      dustPositions[i * 3] = (seededRandom(i + 201) - 0.5) * (nearField ? 8 : 28)
      dustPositions[i * 3 + 1] = (seededRandom(i + 277) - 0.5) * (nearField ? 5 : 16)
      dustPositions[i * 3 + 2] = seededRandom(i + 331) * 360
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      color: 0xb8d7ff,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }))
    scene.add(dust)

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 5.6),
      new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    glow.position.set(0, -1.15, -0.2)
    scene.add(glow)

    const cssObject = new CSS3DObject(windowHost)
    cssObject.scale.setScalar(WINDOW_SCALE)
    cssObject.position.set(0, -1.15, 0)
    cssObject.rotation.set(0.08, -0.06, 0)
    cssObject.visible = false
    cssScene.add(cssObject)

    const resize = () => {
      const width = host.clientWidth || window.innerWidth
      const height = host.clientHeight || window.innerHeight
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      cssRenderer.setSize(width, height)
      const fit = THREE.MathUtils.clamp(width / 1180, 0.42, 1)
      cssObject.scale.setScalar(WINDOW_SCALE * fit)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const pointer = { x: 0, y: 0 }
    const pointerTarget = { x: 0, y: 0 }
    const onPointerMove = (event: Event) => {
      const pointerEvent = event as PointerEvent
      const rect = host.getBoundingClientRect()
      pointerTarget.x = ((pointerEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointerTarget.y = ((pointerEvent.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1
    }
    const onPointerDown = () => onInteractRef.current()
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerdown', onPointerDown)

    let frame = 0
    let previous = performance.now()
    const started = previous
    let visible = !document.hidden

    const animate = () => {
      frame = window.requestAnimationFrame(animate)
      if (!visible) return
      const now = performance.now()
      const delta = Math.min((now - previous) / 1000, 0.05)
      previous = now
      const elapsed = (now - started) / 1000
      const scroll = THREE.MathUtils.clamp(Number(host.dataset.scrollProgress || 0), 0, 1)
      const ease = scroll * scroll * (3 - 2 * scroll)
      const introT = cinematicProgress(elapsed, reducedMotion)
      const pathT = THREE.MathUtils.clamp(Math.max(introT, ease), 0, 1)
      const shot = samplePath(pathT)
      const enter = THREE.MathUtils.smoothstep(pathT, 0.84, 1)
      const near = (z: number, width = 36) => {
        const distance = Math.abs(shot.z - z)
        return THREE.MathUtils.smoothstep(1 - distance / width, 0, 1)
      }

      pointer.x = damp(pointer.x, reducedMotion ? 0 : pointerTarget.x, 4.2, delta)
      pointer.y = damp(pointer.y, reducedMotion ? 0 : pointerTarget.y, 4.2, delta)

      const follow = reducedMotion ? 7.4 : 11.2
      const bank = reducedMotion ? 0 : Math.sin(pathT * Math.PI) * 0.06 * (1 - enter)
      camera.position.x = damp(camera.position.x, shot.x + pointer.x * 0.28, follow, delta)
      camera.position.y = damp(camera.position.y, shot.y + pointer.y * -0.16, follow, delta)
      camera.position.z = damp(camera.position.z, shot.z, follow + 1.4, delta)
      camera.fov = damp(camera.fov, shot.fov, 6.4, delta)
      camera.updateProjectionMatrix()
      look.x = damp(look.x, shot.lx + pointer.x * 0.1, follow, delta)
      look.y = damp(look.y, shot.ly - pointer.y * 0.07, follow, delta)
      look.z = damp(look.z, shot.lz, follow, delta)
      camera.lookAt(look)
      camera.rotation.z += bank

      const windowReveal = reducedMotion
        ? THREE.MathUtils.smoothstep(pathT, 0.86, 0.98)
        : THREE.MathUtils.smoothstep(pathT, 0.84, 0.98)
      cssObject.visible = windowReveal > 0.04
      cssObject.rotation.x = damp(cssObject.rotation.x, 0.08 * (1 - enter * 0.4), 3.4, delta)
      cssObject.rotation.y = damp(cssObject.rotation.y, -0.06 * (1 - enter * 0.4), 3.4, delta)
      windowHost.style.opacity = windowReveal.toFixed(3)
      windowHost.style.pointerEvents = windowReveal > 0.72 ? 'auto' : 'none'

      setGroupOpacity(dataPanel, near(DATA_HOME.z, 42) * 0.86)
      setGroupOpacity(projectPanel, near(PROJECT_HOME.z, 38) * 0.9)
      setGroupOpacity(closeLeft, near(CLOSE_LEFT.z, 16) * 0.98)
      setGroupOpacity(feedPanel, near(FEED_HOME.z, 32) * 0.92)
      setGroupOpacity(closeRight, near(CLOSE_RIGHT.z, 15) * 0.98)
      setGroupOpacity(codePanel, near(CODE_HOME.z, 30) * 0.9)
      setGroupOpacity(closeLow, near(CLOSE_LOW.z, 14) * 0.96)
      setGroupOpacity(chatPanel, near(CHAT_HOME.z, 26) * 0.86)
      setGroupOpacity(miniPanel, near(MINI_HOME.z, 24) * 0.88)
      setGroupOpacity(brandPanel, near(BRAND_HOME.z, 28) * (1 - windowReveal) * 1)
      dust.position.z = pathT * 160
      starGroup.position.z = pathT * 290
      rings.forEach((ring, index) => {
        ring.rotation.z += delta * (0.04 + index * 0.014)
        ring.position.z = pathT * (18 + index * 7)
      })
      const glowMat = glow.material as THREE.MeshBasicMaterial
      glowMat.opacity = 0.04 + enter * 0.14
      keyLight.intensity = 18 + (1 - pathT) * 22

      host.style.setProperty('--hero-scroll', ease.toFixed(4))
      renderer.render(scene, camera)
      if (windowReveal > 0.04) cssRenderer.render(cssScene, camera)
    }

    const onVisibility = () => {
      visible = !document.hidden
      if (visible) previous = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    animate()

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      resizeObserver.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerdown', onPointerDown)
      delete host.dataset.webgl
      cssScene.remove(cssObject)
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
      if (windowHost.parentElement) windowHost.remove()
    }
    } catch (error) {
      console.error('[Helios hero] scene init failed', error)
      renderer.dispose()
      renderer.domElement.remove()
      host.dataset.webgl = 'unavailable'
      showFallbackWindow()
      return () => {
        windowHost.classList.remove('is-fallback')
        if (windowHost.parentElement === mount) mount.removeChild(windowHost)
        delete host.dataset.webgl
      }
    }
  }, [hostRef, windowHost, mountEl])

  return (
    <div ref={setMountEl} className="interactive-orbit-scene">
      {createPortal(children, windowHost)}
    </div>
  )
}
