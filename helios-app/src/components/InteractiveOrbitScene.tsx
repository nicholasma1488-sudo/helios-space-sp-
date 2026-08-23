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
  ry: number
}

export const LANDING_STATIONS: LandingStation[] = [
  {
    id: 'feed',
    title: 'The Feed',
    body: 'Real updates from people doing the work. Like, reply, and keep the project attached to the post.',
    scroll: 0.28,
    x: -2.8,
    y: 0.16,
    z: 300,
    ry: 0.32,
  },
  {
    id: 'project',
    title: 'Project workspace',
    body: 'The file you are editing stays bound to the Space. Open code, notes, and Live from the same room.',
    scroll: 0.46,
    x: 3.2,
    y: 0.42,
    z: 220,
    ry: -0.36,
  },
  {
    id: 'chat',
    title: 'Project Chat',
    body: 'The conversation sits next to the files. Decisions do not disappear into a separate app.',
    scroll: 0.64,
    x: -2.6,
    y: 0.1,
    z: 140,
    ry: 0.3,
  },
  {
    id: 'live',
    title: 'Live work',
    body: 'Watch someone build in real time. Comments land on the same session, not a clip after the fact.',
    scroll: 0.8,
    x: 2.5,
    y: 0.38,
    z: 70,
    ry: -0.28,
  },
  {
    id: 'apps',
    title: 'Mini Apps',
    body: 'Calculator, notes, whiteboard, and the rest open as workspaces — not toys floating off the project.',
    scroll: 0.94,
    x: 0,
    y: 0.2,
    z: 8,
    ry: 0,
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

const WINDOW_WIDTH = 820
const WINDOW_HEIGHT = 540
const WINDOW_SCALE = 0.0092
const WHEEL_SCALE = 0.32

const OPEN_END = 0.28
const SCROLL_DEADZONE = 0.012

const PATH: CameraKey[] = [
  { t: 0, x: 0.15, y: 9.2, z: 690, lx: 0.1, ly: 1.6, lz: 540, fov: 54 },
  { t: 0.04, x: -0.55, y: 7.1, z: 630, lx: 0.8, ly: 0.9, lz: 510, fov: 48 },
  { t: 0.09, x: 1.15, y: 4.4, z: 560, lx: -1.6, ly: 0.45, lz: 470, fov: 40 },
  { t: 0.14, x: -1.85, y: 2.4, z: 480, lx: 2.2, ly: 0.55, lz: 410, fov: 34 },
  { t: 0.19, x: 1.55, y: 1.5, z: 400, lx: -2.1, ly: 0.28, lz: 340, fov: 30 },
  { t: 0.24, x: -1.7, y: 0.78, z: 338, lx: -2.65, ly: 0.18, lz: 304, fov: 26 },
  { t: 0.28, x: -1.85, y: 0.52, z: 316, lx: -2.8, ly: 0.16, lz: 300, fov: 24 },
  { t: 0.32, x: -1.85, y: 0.5, z: 314, lx: -2.8, ly: 0.16, lz: 300, fov: 24 },
  { t: 0.38, x: 0.85, y: 1.2, z: 274, lx: 2.4, ly: 0.42, lz: 232, fov: 32 },
  { t: 0.44, x: 1.9, y: 0.7, z: 236, lx: 3.1, ly: 0.4, lz: 220, fov: 26 },
  { t: 0.48, x: 1.95, y: 0.58, z: 234, lx: 3.2, ly: 0.4, lz: 220, fov: 24 },
  { t: 0.54, x: -0.4, y: 1.05, z: 192, lx: -2.15, ly: 0.18, lz: 150, fov: 32 },
  { t: 0.62, x: -1.5, y: 0.46, z: 156, lx: -2.5, ly: 0.12, lz: 140, fov: 26 },
  { t: 0.66, x: -1.55, y: 0.4, z: 154, lx: -2.6, ly: 0.1, lz: 140, fov: 24 },
  { t: 0.72, x: 0.65, y: 0.92, z: 116, lx: 2.1, ly: 0.36, lz: 78, fov: 31 },
  { t: 0.78, x: 1.38, y: 0.56, z: 84, lx: 2.45, ly: 0.36, lz: 70, fov: 26 },
  { t: 0.82, x: 1.42, y: 0.5, z: 82, lx: 2.5, ly: 0.36, lz: 70, fov: 24 },
  { t: 0.88, x: 0.22, y: 0.7, z: 42, lx: 0.06, ly: 0.22, lz: 12, fov: 28 },
  { t: 0.94, x: 0, y: 0.46, z: 22, lx: 0, ly: 0.16, lz: 8, fov: 24 },
  { t: 1, x: 0, y: 0.4, z: 18.4, lx: 0, ly: 0.08, lz: 8, fov: 22 },
]

const DECOR: Record<string, Pose> = {
  glow: { x: 0.2, y: 1.8, z: 540, rx: 0.04, ry: 0 },
  leftFar: { x: -5.4, y: 1.4, z: 500, rx: 0.1, ry: 0.52 },
  rightFar: { x: 5.8, y: -0.2, z: 470, rx: -0.08, ry: -0.48 },
  left: { x: -4.6, y: 0.9, z: 410, rx: 0.08, ry: 0.42 },
  right: { x: 5.0, y: -0.25, z: 370, rx: -0.06, ry: -0.38 },
  data: { x: 4.4, y: 1.2, z: 178, rx: 0.05, ry: -0.34 },
  low: { x: -4.6, y: -0.9, z: 104, rx: 0.14, ry: 0.28 },
  brand: { x: 3.8, y: 0.55, z: 36, rx: 0.02, ry: -0.22 },
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
  const eased = progress < OPEN_END
    ? local * (0.45 + 0.55 * local)
    : local * local * (3 - 2 * local)
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

function openingProgress(elapsed: number, skipped: boolean) {
  if (skipped) return 1
  return THREE.MathUtils.clamp((elapsed - 0.18) / 5.6, 0, 1)
}

function mapFlight(openT: number, scroll: number, skipped: boolean) {
  if (skipped) return THREE.MathUtils.clamp(OPEN_END + Math.max(0, scroll - SCROLL_DEADZONE) * (1 - OPEN_END), 0, 1)
  const opening = openT * OPEN_END
  if (scroll <= SCROLL_DEADZONE) return opening
  const usable = (scroll - SCROLL_DEADZONE) / (1 - SCROLL_DEADZONE)
  return THREE.MathUtils.clamp(Math.max(opening, usable), 0, 1)
}

function stationScore(camera: THREE.Vector3, station: LandingStation) {
  const depth = camera.z - station.z
  if (depth < 1.2) return 0
  const planar = Math.hypot(camera.x - station.x, camera.y - station.y)
  const depthScore = 1 - Math.abs(depth - 14) / 22
  const alignScore = 1 - Math.min(planar / 5.5, 1)
  return THREE.MathUtils.clamp(depthScore * 0.72 + alignScore * 0.28, 0, 1)
}

function makeGridTexture(color: string, alpha: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#05070c'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    for (let i = 0; i <= 20; i += 1) {
      const p = (i / 20) * 512
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(10, 28)
  return texture
}

function makeFloor() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 760),
    new THREE.MeshBasicMaterial({
      map: makeGridTexture('rgba(143, 212, 255, 0.9)', 0.22),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, -2.8, 280)
  return mesh
}

function makeCeiling() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 740),
    new THREE.MeshBasicMaterial({
      map: makeGridTexture('rgba(133, 118, 245, 0.9)', 0.14),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  mesh.rotation.x = Math.PI / 2
  mesh.position.set(0, 7.2, 280)
  return mesh
}

function makeCorridor() {
  const group = new THREE.Group()
  const ribMaterial = new THREE.LineBasicMaterial({ color: 0x6ec8ff, transparent: true, opacity: 0.16 })
  const railMaterial = new THREE.LineBasicMaterial({ color: 0x8576f5, transparent: true, opacity: 0.2 })
  for (let z = -10; z <= 680; z += 16) {
    const rib = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(18, 10.4, 0.08)), ribMaterial)
    rib.position.set(0, 1.4, z)
    group.add(rib)
  }
  const leftRail = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-8.6, -2.4, 680),
    new THREE.Vector3(-8.6, -2.4, -16),
  ])
  const rightRail = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(8.6, -2.4, 680),
    new THREE.Vector3(8.6, -2.4, -16),
  ])
  const leftHigh = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-8.6, 6.4, 680),
    new THREE.Vector3(-8.6, 6.4, -16),
  ])
  const rightHigh = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(8.6, 6.4, 680),
    new THREE.Vector3(8.6, 6.4, -16),
  ])
  group.add(
    new THREE.Line(leftRail, railMaterial),
    new THREE.Line(rightRail, railMaterial),
    new THREE.Line(leftHigh, railMaterial.clone()),
    new THREE.Line(rightHigh, railMaterial.clone()),
  )
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x6aa8ff,
    transparent: true,
    opacity: 0.055,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  ;[-7.4, 7.4].forEach(x => {
    for (let z = 20; z <= 640; z += 48) {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 16), beamMaterial)
      beam.position.set(x, 2.2, z)
      group.add(beam)
    }
  })
  return group
}

function makePortal(width: number, height: number) {
  const group = new THREE.Group()
  const frameMaterial = new THREE.LineBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0.55 })
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.55, height + 0.55, 0.7)),
    frameMaterial,
  )
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.1, height + 1.1), glowMaterial)
  glow.position.z = -0.2
  group.add(frame, glow)
  group.userData.hoverMaterials = [frameMaterial, glowMaterial]
  return group
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
    const camera = new THREE.PerspectiveCamera(startShot.fov, 1, 0.08, 1600)
    camera.position.set(startShot.x, startShot.y, startShot.z)
    const look = new THREE.Vector3(startShot.lx, startShot.ly, startShot.lz)
    camera.lookAt(look)

    scene.fog = new THREE.FogExp2(0x070914, 0.0075)

    const ambient = new THREE.AmbientLight(0xb8c4ff, 0.55)
    const keyLight = new THREE.PointLight(0x4fc3f7, 42, 220)
    const fill = new THREE.PointLight(0x8576f5, 26, 180)
    const rim = new THREE.PointLight(0xf2b84b, 16, 140)
    keyLight.position.set(-10, 7, 520)
    fill.position.set(12, -2, 430)
    rim.position.set(0, 8, 360)
    scene.add(ambient, keyLight, fill, rim)

    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(520, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0x120a22,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.97,
        fog: false,
      }),
    )
    nebula.position.set(0, 0, 280)
    scene.add(nebula)
    scene.add(makeFloor())
    scene.add(makeCeiling())
    scene.add(makeCorridor())

    const distantSun = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf2b84b,
        transparent: true,
        opacity: 0.72,
        fog: false,
      }),
    )
    distantSun.position.set(0.15, 1.7, 548)
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(5.4, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x8576f5,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    )
    sunHalo.position.copy(distantSun.position)
    scene.add(distantSun, sunHalo)

    const rings = [560, 430, 240, 80].map((z, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(7 + index * 2.4, 0.02, 8, 96),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0x8576f5 : 0x4fc3f7, transparent: true, opacity: 0.2 }),
      )
      ring.position.set(index === 1 ? 1.4 : -0.6, 1.1, z)
      ring.rotation.x = 1.22 + index * 0.16
      ring.rotation.y = index * 0.45
      scene.add(ring)
      return ring
    })

    const starGroup = new THREE.Group()
    starGroup.add(makeStarfield(420, 70, 420, 0.06), makeStarfield(620, 120, 520, 0.04))
    starGroup.position.set(0, 2, 280)
    scene.add(starGroup)

    const stationPanels: Record<StageMode, THREE.Group> = {
      feed: makePanel('feed', 7.2, 4.7),
      project: makeWorldPanel('project', 7, 4.5),
      chat: makePanel('chat', 6.8, 4.4),
      live: makePanel('code', 6.8, 4.4),
      apps: makeWorldPanel('mini', 7, 4.5),
    }
    const portals = {} as Record<StageMode, THREE.Group>
    LANDING_STATIONS.forEach(station => {
      const panel = stationPanels[station.id]
      applyPose(panel, { x: station.x, y: station.y, z: station.z, rx: 0.02, ry: station.ry })
      panel.userData.stationId = station.id
      panel.children.forEach(child => { child.userData.stationId = station.id })
      setGroupOpacity(panel, 0)
      const portal = makePortal(7.4, 4.9)
      applyPose(portal, { x: station.x, y: station.y, z: station.z, rx: 0.02, ry: station.ry })
      portal.userData.stationId = station.id
      portal.children.forEach(child => { child.userData.stationId = station.id })
      portals[station.id] = portal
      scene.add(panel, portal)
    })

    const decorGlow = makeWorldPanel('brand', 6.4, 3.4)
    const decorLeftFar = makePanel('code', 4.6, 2.8)
    const decorRightFar = makeWorldPanel('mini', 4.5, 2.7)
    const decorLeft = makePanel('code', 4.2, 2.6)
    const decorRight = makeWorldPanel('mini', 4.1, 2.5)
    const decorData = makeWorldPanel('data', 3.8, 2.5)
    const decorLow = makePanel('chat', 4, 2.4)
    const decorBrand = makeWorldPanel('brand', 5.2, 2.9)
    applyPose(decorGlow, DECOR.glow)
    applyPose(decorLeftFar, DECOR.leftFar)
    applyPose(decorRightFar, DECOR.rightFar)
    applyPose(decorLeft, DECOR.left)
    applyPose(decorRight, DECOR.right)
    applyPose(decorData, DECOR.data)
    applyPose(decorLow, DECOR.low)
    applyPose(decorBrand, DECOR.brand)
    ;[decorGlow, decorLeftFar, decorRightFar, decorLeft, decorRight, decorData, decorLow, decorBrand].forEach(panel => {
      setGroupOpacity(panel, 0.22)
      scene.add(panel)
    })

    const dustGeometry = new THREE.BufferGeometry()
    const dustCount = 520
    const dustPositions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions[i * 3] = (seededRandom(i + 201) - 0.5) * 28
      dustPositions[i * 3 + 1] = (seededRandom(i + 277) - 0.5) * 12
      dustPositions[i * 3 + 2] = seededRandom(i + 331) * 700 - 20
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
      object.rotation.set(0.03, station.ry, 0)
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
    const lookBoost = { x: 0, y: 0 }
    const raycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2()
    let dragging = false
    let hoverId: StageMode | null = null
    const onPointerMove = (event: Event) => {
      const pointerEvent = event as PointerEvent
      const rect = host.getBoundingClientRect()
      pointerTarget.x = ((pointerEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointerTarget.y = ((pointerEvent.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1
      if (dragging) {
        lookBoost.x = THREE.MathUtils.clamp(lookBoost.x + pointerEvent.movementX * 0.004, -1.8, 1.8)
        lookBoost.y = THREE.MathUtils.clamp(lookBoost.y + pointerEvent.movementY * 0.003, -1.1, 1.1)
      }
    }
    const onPointerDown = (event: Event) => {
      onInteractRef.current()
      dragging = true
      const pointerEvent = event as PointerEvent
      const rect = host.getBoundingClientRect()
      pointerNdc.x = ((pointerEvent.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointerNdc.y = -(((pointerEvent.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
      raycaster.setFromCamera(pointerNdc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const stationId = hits.find(hit => hit.object.userData.stationId)?.object.userData.stationId as StageMode | undefined
      if (stationId) onSelectStationRef.current(stationId)
    }
    const onPointerUp = () => { dragging = false }
    const forwardWheel = (event: Event) => {
      const wheel = event as WheelEvent
      const scroller = host.closest('.landing-v2') as HTMLElement | null
      if (!scroller) return
      wheel.preventDefault()
      wheel.stopPropagation()
      scroller.scrollTop += wheel.deltaY * WHEEL_SCALE + wheel.deltaX * 0.08
    }
    STAGE_IDS.forEach(id => hosts[id].addEventListener('wheel', forwardWheel, { passive: false }))
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    let frame = 0
    let previous = performance.now()
    let flightTime = 0
    let warmFrames = 0
    let flyT = 0
    let cancelled = false
    let visible = !document.hidden
    let lastStation: StageMode | null = null
    host.dataset.scrollProgress = host.dataset.scrollProgress || '0'
    host.dataset.introReady = '0'
    host.dataset.opening = host.dataset.opening || '1'
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
      if (skipped) flightTime = 8
      else if (warmFrames < 4) warmFrames += 1
      else if (flightTime < 8) flightTime += Math.min(rawDelta, 1 / 20)
      const openT = openingProgress(flightTime, skipped)
      const scroll = THREE.MathUtils.clamp(Number(host.dataset.scrollProgress || 0), 0, 1)
      const pathT = mapFlight(openT, scroll, skipped)
      const approach = THREE.MathUtils.smoothstep(pathT, 0, OPEN_END)
      flyT = damp(flyT, pathT, reducedMotion ? 8 : (pathT < OPEN_END ? 2.35 : 1.2), delta)
      const shot = samplePath(flyT)
      const facing = (z: number, peak = 16, falloff = 20) => {
        const depth = camera.position.z - z
        if (depth < 1) return 0
        return THREE.MathUtils.clamp(1 - Math.abs(depth - peak) / falloff, 0, 1)
      }

      if (!dragging) {
        lookBoost.x = damp(lookBoost.x, 0, 1.6, delta)
        lookBoost.y = damp(lookBoost.y, 0, 1.6, delta)
      }
      pointer.x = damp(pointer.x, reducedMotion ? 0 : pointerTarget.x + lookBoost.x, 3.1, delta)
      pointer.y = damp(pointer.y, reducedMotion ? 0 : pointerTarget.y + lookBoost.y, 3.1, delta)
      camera.position.x = damp(camera.position.x, shot.x + pointer.x * 1.15, 3.4, delta)
      camera.position.y = damp(camera.position.y, shot.y + pointer.y * -0.55, 3.4, delta)
      camera.position.z = damp(camera.position.z, shot.z, 3.8, delta)
      camera.fov = damp(camera.fov, shot.fov, 2.8, delta)
      camera.updateProjectionMatrix()
      look.x = damp(look.x, shot.lx + pointer.x * 1.35, 3.2, delta)
      look.y = damp(look.y, shot.ly - pointer.y * 0.7, 3.2, delta)
      look.z = damp(look.z, shot.lz, 3.2, delta)
      camera.lookAt(look)
      if (!reducedMotion) camera.rotation.z += THREE.MathUtils.clamp((shot.x - camera.position.x) * 0.05, -0.07, 0.07)

      let nearest = LANDING_STATIONS[0]
      let nearestScore = -1
      LANDING_STATIONS.forEach(station => {
        const score = stationScore(camera.position, station)
        if (score > nearestScore) {
          nearest = station
          nearestScore = score
        }
      })
      if (nearest.id !== lastStation && nearestScore > 0.22) {
        lastStation = nearest.id
        onStationChangeRef.current(nearest.id)
      }

      pointerNdc.set(pointerTarget.x, -pointerTarget.y)
      raycaster.setFromCamera(pointerNdc, camera)
      const hoverHit = raycaster.intersectObjects(scene.children, true)
        .find(hit => hit.object.userData.stationId)?.object.userData.stationId as StageMode | undefined
      hoverId = hoverHit ?? null
      host.style.cursor = hoverId ? 'pointer' : ''

      let cssNeeded = false
      STAGE_IDS.forEach(id => {
        const station = LANDING_STATIONS.find(item => item.id === id)!
        const closeness = stationScore(camera.position, station)
        const live = closeness > 0.2
        const object = cssObjects[id]
        object.visible = live
        hosts[id].style.opacity = live ? Math.max(closeness, 0.42).toFixed(3) : '0'
        hosts[id].style.pointerEvents = closeness > 0.28 ? 'auto' : 'none'
        setGroupOpacity(stationPanels[id], live ? 0 : Math.max(closeness, facing(station.z, 28, 36) * 0.55))
        const portalMats = portals[id].userData.hoverMaterials as THREE.Material[]
        portalMats.forEach((material, index) => {
          material.opacity = (hoverId === id ? 0.85 : 0.28 + closeness * 0.4) * (index === 1 ? 0.22 : 1)
        })
        if (live) cssNeeded = true
      })
      setGroupOpacity(decorGlow, Math.max(0.18, facing(DECOR.glow.z, 36, 70) * 0.92))
      setGroupOpacity(decorLeftFar, Math.max(0.16, facing(DECOR.leftFar.z, 20, 32) * 0.88))
      setGroupOpacity(decorRightFar, Math.max(0.16, facing(DECOR.rightFar.z, 20, 32) * 0.86))
      setGroupOpacity(decorLeft, Math.max(0.14, facing(DECOR.left.z, 18, 26) * 0.8))
      setGroupOpacity(decorRight, Math.max(0.14, facing(DECOR.right.z, 18, 26) * 0.78))
      setGroupOpacity(decorData, Math.max(0.1, facing(DECOR.data.z, 18, 24) * 0.7))
      setGroupOpacity(decorLow, Math.max(0.1, facing(DECOR.low.z, 16, 22) * 0.68))
      setGroupOpacity(decorBrand, Math.max(0.1, facing(DECOR.brand.z, 16, 22) * 0.62))

      rings.forEach((ring, index) => {
        ring.rotation.z += delta * (0.04 + index * 0.012)
      })
      keyLight.position.z = camera.position.z - 12
      fill.position.z = camera.position.z + 8
      rim.position.z = camera.position.z - 40

      host.style.setProperty('--hero-scroll', scroll.toFixed(4))
      host.style.setProperty('--hero-intro', approach.toFixed(4))
      host.style.setProperty('--station-strength', Math.max(0, nearestScore * THREE.MathUtils.smoothstep(flyT, 0.22, 0.3)).toFixed(3))
      host.dataset.flightT = flyT.toFixed(3)
      host.dataset.station = nearest.id
      host.dataset.stationStrength = nearestScore.toFixed(3)
      host.dataset.opening = flyT < OPEN_END - 0.02 ? '1' : '0'
      host.dataset.introReady = flyT >= 0.2 ? '1' : '0'
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
      window.removeEventListener('pointerup', onPointerUp)
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
