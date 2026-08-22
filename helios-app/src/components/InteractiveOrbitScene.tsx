import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

export type StageMode = 'feed' | 'project' | 'chat' | 'live' | 'apps'
export type HeroPhase = 'void' | 'push' | 'flanks' | 'live'

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
  { t: 0, x: 0, y: 5.4, z: 148, lx: 0, ly: 0.35, lz: 0, fov: 20 },
  { t: 0.14, x: 0.55, y: 3.2, z: 96, lx: 0.04, ly: 0.18, lz: 0, fov: 21 },
  { t: 0.3, x: -0.35, y: 1.6, z: 58, lx: 0, ly: 0.08, lz: 0, fov: 22 },
  { t: 0.48, x: 0.18, y: 0.55, z: 34, lx: 0, ly: 0.02, lz: -0.15, fov: 23 },
  { t: 0.7, x: 0.04, y: 0.12, z: 20, lx: 0, ly: 0, lz: -0.35, fov: 24 },
  { t: 1, x: 0, y: 0, z: 12.4, lx: 0, ly: 0, lz: -0.6, fov: 26 },
]

const FEED_HOME: Pose = { x: -9.4, y: 1.15, z: -7.2, rx: 0.04, ry: 0.7 }
const FEED_AWAY: Pose = { x: -30, y: 4.2, z: -48, rx: 0.12, ry: 1.42 }
const CODE_HOME: Pose = { x: 9.6, y: -0.35, z: -9.4, rx: -0.05, ry: -0.68 }
const CODE_AWAY: Pose = { x: 32, y: -3.6, z: -52, rx: -0.1, ry: -1.38 }
const CHAT_HOME: Pose = { x: -2.4, y: -3.1, z: -16, rx: 0.22, ry: 0.08 }
const CHAT_AWAY: Pose = { x: -6, y: -14, z: -56, rx: 0.7, ry: 0.2 }

function damp(current: number, target: number, smoothing: number, delta: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta))
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, t),
    y: THREE.MathUtils.lerp(a.y, b.y, t),
    z: THREE.MathUtils.lerp(a.z, b.z, t),
    rx: THREE.MathUtils.lerp(a.rx, b.rx, t),
    ry: THREE.MathUtils.lerp(a.ry, b.ry, t),
  }
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

function introProgress(elapsed: number, phase: HeroPhase, reducedMotion: boolean) {
  if (reducedMotion) return 0.34
  if (phase === 'live' && elapsed >= 3) return 0.34
  if (elapsed < 1 || phase === 'void') return THREE.MathUtils.smoothstep(elapsed, 0, 1) * 0.07
  if (elapsed < 2 || phase === 'push') return 0.07 + THREE.MathUtils.smoothstep(elapsed, 1, 2) * 0.2
  if (elapsed < 3) return 0.27 + THREE.MathUtils.smoothstep(elapsed, 2, 3) * 0.07
  return 0.34
}

export function InteractiveOrbitScene({ activeMode, phase, hostRef, windowRef, onInteract, children }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const activeModeRef = useRef(activeMode)
  const phaseRef = useRef(phase)
  const onInteractRef = useRef(onInteract)
  const [windowHost] = useState(() => {
    const el = document.createElement('div')
    el.className = 'hero-css3d-window-host'
    el.style.width = `${WINDOW_WIDTH}px`
    el.style.height = `${WINDOW_HEIGHT}px`
    return el
  })

  useEffect(() => { activeModeRef.current = activeMode }, [activeMode])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { onInteractRef.current = onInteract }, [onInteract])

  useEffect(() => {
    const windowEl = windowRef.current
    if (!windowEl) return
    windowEl.classList.add('is-css3d')
    return () => windowEl.classList.remove('is-css3d')
  }, [windowRef])

  useLayoutEffect(() => {
    const mount = mountRef.current
    const host = hostRef.current
    if (!mount || !host) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' })
    } catch {
      host.dataset.webgl = 'unavailable'
      windowHost.classList.add('is-fallback')
      mount.appendChild(windowHost)
      return () => {
        windowHost.classList.remove('is-fallback')
        if (windowHost.parentElement === mount) mount.removeChild(windowHost)
        delete host.dataset.webgl
      }
    }

    host.dataset.webgl = 'ready'
    renderer.setClearColor(0x04060b, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
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
    const camera = new THREE.PerspectiveCamera(20, 1, 0.08, 800)
    camera.position.set(PATH[0].x, PATH[0].y, PATH[0].z)
    const look = new THREE.Vector3(PATH[0].lx, PATH[0].ly, PATH[0].lz)
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

    const feedPanel = makePanel('feed', 5.6, 3.5)
    const codePanel = makePanel('code', 5.2, 3.3)
    const chatPanel = makePanel('chat', 4.6, 2.9)
    applyPose(feedPanel, FEED_AWAY)
    applyPose(codePanel, CODE_AWAY)
    applyPose(chatPanel, CHAT_AWAY)
    scene.add(feedPanel, codePanel, chatPanel)

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
    glow.position.set(0, 0.04, -0.2)
    scene.add(glow)

    const cssObject = new CSS3DObject(windowHost)
    cssObject.scale.setScalar(WINDOW_SCALE)
    cssObject.position.set(0, 0.04, 0)
    cssObject.rotation.set(0.2, -0.34, 0)
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
      const introT = introProgress(elapsed, phaseRef.current, reducedMotion)
      const pathT = THREE.MathUtils.clamp(introT + ease * (1 - introT), 0, 1)
      const shot = samplePath(pathT)
      const flank = reducedMotion ? 1 : THREE.MathUtils.smoothstep(elapsed, 2.02, 2.95)
      const face = THREE.MathUtils.smoothstep(pathT, 0.28, 0.82)
      const mode = activeModeRef.current

      pointer.x = damp(pointer.x, reducedMotion ? 0 : pointerTarget.x, 4.2, delta)
      pointer.y = damp(pointer.y, reducedMotion ? 0 : pointerTarget.y, 4.2, delta)

      camera.position.x = damp(camera.position.x, shot.x + pointer.x * 0.55, 3.6, delta)
      camera.position.y = damp(camera.position.y, shot.y + pointer.y * -0.28, 3.6, delta)
      camera.position.z = damp(camera.position.z, shot.z, 2.35, delta)
      camera.fov = damp(camera.fov, shot.fov, 3.2, delta)
      camera.updateProjectionMatrix()
      look.x = damp(look.x, shot.lx + pointer.x * 0.2, 3.8, delta)
      look.y = damp(look.y, shot.ly - pointer.y * 0.12, 3.8, delta)
      look.z = damp(look.z, shot.lz, 3.8, delta)
      camera.lookAt(look)

      cssObject.visible = pathT > 0.08
      cssObject.rotation.x = damp(cssObject.rotation.x, 0.2 * (1 - face), 3.1, delta)
      cssObject.rotation.y = damp(cssObject.rotation.y, -0.34 * (1 - face), 3.1, delta)
      windowHost.style.opacity = String(THREE.MathUtils.clamp((pathT - 0.08) / 0.12, 0, 1))
      windowHost.style.pointerEvents = pathT > 0.12 ? 'auto' : 'none'

      const feedPose = lerpPose(FEED_AWAY, FEED_HOME, flank)
      const codePose = lerpPose(CODE_AWAY, CODE_HOME, flank)
      const chatPose = lerpPose(CHAT_AWAY, CHAT_HOME, flank)
      const rush = ease * 11
      feedPanel.position.x = damp(feedPanel.position.x, feedPose.x + (mode === 'feed' ? 0.35 : 0), 2.8, delta)
      feedPanel.position.y = damp(feedPanel.position.y, feedPose.y, 2.8, delta)
      feedPanel.position.z = damp(feedPanel.position.z, feedPose.z + rush + (mode === 'feed' ? 1.4 : 0), 2.5, delta)
      feedPanel.rotation.x = damp(feedPanel.rotation.x, feedPose.rx, 2.8, delta)
      feedPanel.rotation.y = damp(feedPanel.rotation.y, feedPose.ry, 2.8, delta)
      codePanel.position.x = damp(codePanel.position.x, codePose.x + (mode === 'project' ? -0.3 : 0), 2.8, delta)
      codePanel.position.y = damp(codePanel.position.y, codePose.y, 2.8, delta)
      codePanel.position.z = damp(codePanel.position.z, codePose.z + rush * 1.1 + (mode === 'project' ? 1.4 : 0), 2.5, delta)
      codePanel.rotation.x = damp(codePanel.rotation.x, codePose.rx, 2.8, delta)
      codePanel.rotation.y = damp(codePanel.rotation.y, codePose.ry, 2.8, delta)
      chatPanel.position.x = damp(chatPanel.position.x, chatPose.x, 2.8, delta)
      chatPanel.position.y = damp(chatPanel.position.y, chatPose.y + (mode === 'chat' ? 0.4 : 0), 2.8, delta)
      chatPanel.position.z = damp(chatPanel.position.z, chatPose.z + rush * 1.25 + (mode === 'chat' ? 1.6 : 0), 2.5, delta)
      chatPanel.rotation.x = damp(chatPanel.rotation.x, chatPose.rx, 2.8, delta)
      chatPanel.rotation.y = damp(chatPanel.rotation.y, chatPose.ry, 2.8, delta)
      setGroupOpacity(feedPanel, flank)
      setGroupOpacity(codePanel, flank)
      setGroupOpacity(chatPanel, flank)

      starGroup.position.z = pathT * 64
      rings.forEach((ring, index) => {
        ring.rotation.z += delta * (0.035 + index * 0.012)
        ring.position.z = pathT * (5 + index * 2.2)
      })
      const glowMat = glow.material as THREE.MeshBasicMaterial
      glowMat.opacity = 0.08 + face * 0.1
      keyLight.intensity = 24 + (1 - pathT) * 16

      host.style.setProperty('--hero-scroll', ease.toFixed(4))
      renderer.render(scene, camera)
      cssRenderer.render(cssScene, camera)
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
    }
  }, [hostRef, windowHost])

  return (
    <div ref={mountRef} className="interactive-orbit-scene">
      {createPortal(children, windowHost)}
    </div>
  )
}
