// Scena 3D dla HomeDepot: makieta depotu autobusów elektrycznych w stylu „gliny” (jak makieta hut8) –
// biała podstawa z drogami, hala z fotowoltaiką na dachu, podstacja z liniami z sieci, magazyn energii,
// 10 ładowarek i 10 autobusów, które zjeżdżają na noc, ładują się według planu Tenix i rano wyjeżdżają.
// Stan (0–1 dla każdej fazy) i czas osi `t` (0–12) przychodzą z GSAP; tu tylko liczymy klatkę.
// Jednostka sceny = 1 m. Działka: x −44…44, z −33…21, wierzch podstawy na y = 0.
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  RingGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { arcLine, createEnergyLines, roundedPath, sagLine } from './energyLines'

export interface DepotState {
  reveal: number // podstawa, drogi, hala i drzewa wyrastają
  energy: number // warstwa 1: linie z sieci, podstacja, magazyn, PV na dachu
  chargers: number // warstwa 2: ładowarki wyrastają, kable rysują się od podstacji, ekrany się włączają
  alert: number // ładowarka 07 traci połączenie (0–0.5) i wraca (0.55–1)
  arrive: number // warstwa 3: autobusy zjeżdżają na stanowiska i się podłączają
  charge: number // nocne ładowanie według planu (najpierw najwcześniejsze odjazdy, pod limitem przyłącza)
  depart: number // autobusy wyjeżdżają w kolejności odjazdów
}

interface Options {
  buses: { soc: number; target: number }[] // według stanowisk, od lewej
  accent: string
  ink: string
  ok: string
  alert: string
}

interface Anchor {
  x: number
  y: number
  visible: boolean
}

const PLINTH = 0.8
const BAYS = 10
const BAY_X = (i: number) => -22.5 + 5 * i
const CHARGER_DX = 2.15 // ładowarka stoi z prawej strony stanowiska
const CHARGER_Z = -4.6
const ALERT_BAY = 6 // „Charger 07”
const FOCUS_BAY = 6 // autobus z etykietą w rozdziałach Flota / Smart charging
const ROAD_FRONT = 15.5
const ROAD_BACK = -15.5
const TURN_R = 4.5
const BUS_LEN = 12
const SOC_LEN = 9 // długość paska SoC nad dachem
const ARRIVE_GAP = 0.085 // odstęp startów kolejnych autobusów (w jednostkach fazy)
const DEPART_GAP = 0.075
const SPEED = 330 // m na jednostkę fazy – stała prędkość, więc autobusy jadą w równych odstępach
const BRAKE = 8 // na tylu metrach autobus hamuje / rusza
const MAX_PIXELS = 4.2e6

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const stagger = (p: number, order: number, spread: number) => clamp01((p - order * spread) / (1 - spread))
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => {
  const c = 1.4
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const smoother = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * t * (t * (t * 6 - 15) + 10)
}
const lerpDist = (a: number, b: number, f: number) => Math.exp(MathUtils.lerp(Math.log(a), Math.log(b), f))
const hash = (n: number) => {
  const h = Math.sin(n * 12.9898) * 43758.5453
  return h - Math.floor(h)
}

// Ujęcia kamery w jednostkach osi czasu (t 0–12). k = odległość względem kadru całej działki, tx/tz = punkt, na który patrzy.
// Między ujęciami jedzie gładko (Hermite), więc nie zatrzymuje się na granicach rozdziałów.
const SHOTS = [
  { t: 0, polar: 70, az: -0.75, k: 0.55, tx: -8, tz: 2 }, // nisko przy narożniku, makieta wyrasta
  { t: 1.0, polar: 56, az: -0.38, k: 0.98, tx: 0, tz: -6 }, // cała działka
  { t: 2.2, polar: 47, az: -0.48, k: 0.7, tx: -16, tz: -22 }, // energia: podstacja, magazyn, PV, linie z sieci
  { t: 2.8, polar: 50, az: -0.42, k: 0.72, tx: -14, tz: -14 },
  { t: 3.7, polar: 48, az: -0.22, k: 0.74, tx: 0, tz: -6 }, // ładowarki
  { t: 5.0, polar: 46, az: 0.12, k: 0.44, tx: 9, tz: -4 }, // alert przy ładowarce 07
  { t: 5.8, polar: 50, az: 0.0, k: 0.6, tx: 5, tz: -2 },
  { t: 6.6, polar: 60, az: -0.3, k: 0.86, tx: -6, tz: 2 }, // flota zjeżdża
  { t: 7.6, polar: 54, az: -0.12, k: 0.8, tx: 0, tz: 0 },
  { t: 8.6, polar: 40, az: 0.16, k: 0.86, tx: 0, tz: -4 }, // smart charging: wyżej, widać paski SoC i kable
  { t: 10.0, polar: 42, az: 0.28, k: 0.88, tx: 2, tz: -6 },
  { t: 10.8, polar: 52, az: 0.46, k: 0.9, tx: 8, tz: -8 }, // odjazdy
  { t: 12, polar: 54, az: 0.58, k: 1.0, tx: 2, tz: -6 },
] as const
type ShotKey = 'polar' | 'az' | 'k' | 'tx' | 'tz'

function sampleShots(t: number, key: ShotKey) {
  const last = SHOTS.length - 1
  if (t <= SHOTS[0].t) return SHOTS[0][key]
  if (t >= SHOTS[last]!.t) return SHOTS[last]![key]
  let i = 0
  while (SHOTS[i + 1]!.t < t) i++
  const s0 = SHOTS[Math.max(0, i - 1)]!
  const s1 = SHOTS[i]!
  const s2 = SHOTS[i + 1]!
  const s3 = SHOTS[Math.min(last, i + 2)]!
  const dt = s2.t - s1.t
  const u = (t - s1.t) / dt
  const m1 = s2.t - s0.t > 0 ? ((s2[key] - s0[key]) / (s2.t - s0.t)) * dt : 0
  const m2 = s3.t - s1.t > 0 ? ((s3[key] - s1[key]) / (s3.t - s1.t)) * dt : 0
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * s1[key] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * s2[key] + (u3 - u2) * m2
}

// droga przejechana po trasie długości L przy „surowej” drodze d (stała prędkość):
// arrive – hamuje na ostatnich BRAKE m, depart – rusza na pierwszych BRAKE m (prędkość ciągła na styku)
function brakeAt(d: number, L: number) {
  if (d <= L - BRAKE) return Math.max(0, d)
  const t = clamp01((d - (L - BRAKE)) / (2 * BRAKE))
  return L - BRAKE + BRAKE * (1 - (1 - t) ** 2)
}
function launchAt(d: number) {
  if (d <= 0) return 0
  if (d < 2 * BRAKE) {
    const t = d / (2 * BRAKE)
    return BRAKE * t * t
  }
  return d - BRAKE
}

export function createDepotScene(canvas: HTMLCanvasElement, opts: Options) {
  const small = canvas.clientWidth < 700
  const maxDpr = Math.min(window.devicePixelRatio, small ? 1.5 : 2)
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(maxDpr)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.42
  pmrem.dispose()

  const camera = new PerspectiveCamera(26, 1, 1, 900)
  scene.add(new HemisphereLight(0xffffff, 0xd8d6e0, 0.5))
  const sun = new DirectionalLight(0xffffff, 2.6)
  sun.position.set(-36, 60, 34)
  sun.castShadow = true
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 55, bottom: -55, near: 1, far: 220 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.04
  scene.add(sun)

  const group = new Group()
  scene.add(group)

  const disposables: { dispose: () => void }[] = [env]
  const keep = <T extends BufferGeometry | Material>(x: T) => (disposables.push(x), x)

  // ── materiały: biała „glina”, jasny asfalt, ciemne szyby i bramy ──
  const clay = keep(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 }))
  const asphalt = keep(new MeshStandardMaterial({ color: '#e2e2dc', roughness: 0.95, metalness: 0 }))
  const dark = keep(new MeshStandardMaterial({ color: opts.ink, roughness: 0.55, metalness: 0.1 }))
  const glass = keep(new MeshStandardMaterial({ color: '#2d2a45', roughness: 0.25, metalness: 0.2 }))
  const panelMat = keep(new MeshStandardMaterial({ color: '#3a3660', roughness: 0.35, metalness: 0.3 }))

  const shadowed = <T extends Mesh | InstancedMesh>(o: T, cast = true) => {
    o.castShadow = cast
    o.receiveShadow = true
    return o
  }

  // podłoga: tylko cień (przezroczysta), pod spodem prześwituje tło strony
  const floor = new Mesh(keep(new PlaneGeometry(800, 800)), keep(new ShadowMaterial({ opacity: 0.14 })))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -PLINTH
  floor.receiveShadow = true
  scene.add(floor)

  // ── 0. Podstawa, drogi, oznakowanie, hala, drzewa ──
  const plinth = shadowed(new Mesh(keep(new RoundedBoxGeometry(88, PLINTH, 54, 3, 0.25)), clay))
  plinth.position.set(0, -PLINTH / 2, -6)
  group.add(plinth)

  const ground = new Group() // wszystko, co leży płasko na podstawie
  group.add(ground)
  const slab = (w: number, d: number, x: number, z: number, mat: Material, h = 0.04) => {
    const g = keep(new BoxGeometry(w, h, d))
    g.translate(0, h / 2, 0)
    const m = shadowed(new Mesh(g, mat), false)
    m.position.set(x, 0, z)
    ground.add(m)
    return m
  }
  slab(88, 7, 0, ROAD_FRONT, asphalt)
  slab(88, 7, 0, ROAD_BACK, asphalt)
  slab(52, 24, 0, 0, asphalt)

  // linie stanowisk i przerywana oś dróg (jedna siatka instancji)
  const marks: Matrix4[] = []
  for (let k = 0; k <= BAYS; k++) marks.push(new Matrix4().compose(new Vector3(-25 + 5 * k, 0.04, 0), new Quaternion(), new Vector3(0.16, 1, 14)))
  for (let x = -42; x <= 42; x += 4.5)
    for (const z of [ROAD_FRONT, ROAD_BACK]) marks.push(new Matrix4().compose(new Vector3(x, 0.04, z), new Quaternion(), new Vector3(2, 1, 0.16)))
  const markGeo = keep(new BoxGeometry(1, 0.02, 1))
  markGeo.translate(0, 0.01, 0)
  const markMesh = new InstancedMesh(markGeo, clay, marks.length)
  marks.forEach((mx, i) => markMesh.setMatrixAt(i, mx))
  markMesh.receiveShadow = true
  ground.add(markMesh)

  // hala obsługi z bramami od strony drogi i dachem pod panele
  const hall = new Group()
  hall.position.set(22, 0, -27)
  group.add(hall)
  const hallBody = shadowed(new Mesh(keep(new RoundedBoxGeometry(36, 8, 10, 2, 0.2)), clay))
  hallBody.position.y = 4
  hall.add(hallBody)
  const parapet = shadowed(new Mesh(keep(new BoxGeometry(36.2, 0.5, 10.2)), clay))
  parapet.position.y = 8.1
  hall.add(parapet)
  const doorGeo = keep(new BoxGeometry(4.6, 5.6, 0.1))
  for (const dx of [-14, -7, 0, 7, 14]) {
    const door = new Mesh(doorGeo, dark)
    door.position.set(dx, 2.8, 5.02)
    hall.add(door)
  }
  const strip = new Mesh(keep(new BoxGeometry(34, 0.6, 0.1)), glass)
  strip.position.set(0, 6.9, 5.02)
  hall.add(strip)

  // drzewa (low-poly): dwie kępy po bokach placu
  const treeSpots: Vector3[] = []
  for (const side of [-1, 1])
    for (let n = 0; n < 11; n++) {
      const x = side * (30 + hash(n + side * 7) * 12)
      const z = -10 + (n / 10) * 20 + (hash(n * 3 + side) - 0.5) * 2.5
      treeSpots.push(new Vector3(x, 0, z))
    }
  const trunkGeo = keep(new CylinderGeometry(0.18, 0.24, 1.6, 6))
  trunkGeo.translate(0, 0.8, 0)
  const crownGeo = keep(new IcosahedronGeometry(1.5, 0))
  crownGeo.translate(0, 2.9, 0)
  // Icosahedron nie ma indeksu, walec ma – do scalenia oba muszą być bez indeksu
  const treeGeo = keep(mergeGeometries([trunkGeo.toNonIndexed(), crownGeo])!)
  const trees = shadowed(new InstancedMesh(treeGeo, clay, treeSpots.length))
  trees.instanceMatrix.setUsage(DynamicDrawUsage)
  trees.frustumCulled = false
  group.add(trees)

  // ── 1. Energia: słupy i linie z sieci, podstacja, magazyn energii, PV na dachu hali ──
  const substation = new Group()
  substation.position.set(0, 0, 0)
  group.add(substation)
  const fenceGeo = keep(new BoxGeometry(1, 1.6, 1))
  fenceGeo.translate(0, 0.8, 0)
  const fenceMat = keep(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.7 }))
  for (const [w, d, x, z] of [
    [17, 0.12, -33.5, -21],
    [17, 0.12, -33.5, -32],
    [0.12, 11, -42, -26.5],
    [0.12, 11, -25, -26.5],
  ] as const) {
    const f = shadowed(new Mesh(fenceGeo, fenceMat))
    f.scale.set(w, 1, d)
    f.position.set(x, 0, z)
    substation.add(f)
  }
  const transformer = (x: number, z: number) => {
    const t = new Group()
    t.position.set(x, 0, z)
    const body = shadowed(new Mesh(keep(new RoundedBoxGeometry(3.4, 3, 2.6, 2, 0.12)), clay))
    body.position.y = 1.5
    t.add(body)
    const fin = keep(new BoxGeometry(0.12, 2.4, 0.5))
    for (let n = 0; n < 7; n++)
      for (const s of [-1, 1]) {
        const f = shadowed(new Mesh(fin, clay))
        f.position.set(-1.4 + n * 0.47, 1.4, s * 1.55)
        t.add(f)
      }
    const bush = keep(new CylinderGeometry(0.14, 0.2, 1.1, 8))
    for (let n = 0; n < 3; n++) {
      const b = shadowed(new Mesh(bush, dark))
      b.position.set(-1 + n, 3.55, 0)
      t.add(b)
    }
    substation.add(t)
  }
  transformer(-37, -27)
  transformer(-31.5, -27)
  const house = shadowed(new Mesh(keep(new RoundedBoxGeometry(5, 3.2, 3, 2, 0.12)), clay))
  house.position.set(-36.5, 1.6, -23)
  substation.add(house)
  // bramka, na której kończą się linie z sieci
  const postGeo = keep(new BoxGeometry(0.4, 8.2, 0.4))
  postGeo.translate(0, 4.1, 0)
  for (const z of [-24.2, -29.8]) {
    const post = shadowed(new Mesh(postGeo, clay))
    post.position.set(-40.6, 0, z)
    substation.add(post)
  }
  const beam = shadowed(new Mesh(keep(new BoxGeometry(0.4, 0.4, 6.4)), clay))
  beam.position.set(-40.6, 8, -27)
  substation.add(beam)

  // słupy wysokiego napięcia poza działką (stoją na podłodze strony)
  const TOWER_X = [-96, -79, -62] as const
  const towers = new Group()
  group.add(towers)
  const towerParts: Group[] = []
  const mastGeo = keep(new CylinderGeometry(0.22, 0.6, 13.6, 4))
  mastGeo.translate(0, 6.8, 0)
  const armGeo = keep(new BoxGeometry(0.35, 0.35, 6.8))
  for (const x of TOWER_X) {
    const tw = new Group()
    tw.position.set(x, -PLINTH, -27)
    const mast = shadowed(new Mesh(mastGeo, clay))
    tw.add(mast)
    for (const y of [11.6, 13.2]) {
      const arm = shadowed(new Mesh(armGeo, clay))
      arm.position.y = y
      arm.scale.z = y > 12 ? 0.6 : 1
      tw.add(arm)
    }
    towers.add(tw)
    towerParts.push(tw)
  }

  // magazyn energii: trzy kontenery
  const storage = new Group()
  group.add(storage)
  const containerGeo = keep(new RoundedBoxGeometry(2.44, 2.6, 6.06, 2, 0.08))
  containerGeo.translate(0, 1.3, 0)
  const hvacGeo = keep(new BoxGeometry(1.4, 0.4, 1.2))
  hvacGeo.translate(0, 2.8, 0)
  const ribGeo = keep(new BoxGeometry(0.05, 2.1, 0.1))
  const containers: Group[] = []
  for (const x of [-21, -16, -11]) {
    const c = new Group()
    c.position.set(x, 0, -26.5)
    c.add(shadowed(new Mesh(containerGeo, clay)))
    const hv = shadowed(new Mesh(hvacGeo, clay))
    hv.position.z = 1.8
    c.add(hv)
    for (let n = 0; n < 9; n++) {
      const rib = new Mesh(ribGeo, dark)
      rib.position.set(-0.9 + n * 0.225, 1.3, 3.04)
      c.add(rib)
    }
    storage.add(c)
    containers.push(c)
  }

  // panele PV na dachu hali (instancje, lekko pochylone)
  const PV_COLS = 9
  const PV_ROWS = 3
  const pvGeo = keep(new BoxGeometry(3.2, 0.08, 2.1))
  const pv = shadowed(new InstancedMesh(pvGeo, panelMat, PV_COLS * PV_ROWS))
  pv.instanceMatrix.setUsage(DynamicDrawUsage)
  pv.frustumCulled = false
  group.add(pv)
  const pvPos: Vector3[] = []
  for (let r = 0; r < PV_ROWS; r++) for (let c = 0; c < PV_COLS; c++) pvPos.push(new Vector3(6.4 + c * 3.6, 8.6, -30 + r * 2.8))
  const pvTilt = new Quaternion().setFromEuler(new Euler(-0.2, 0, 0))

  // ── 2. Ładowarki: wysepka, słupek, ekran statusu ──
  const islandGeo = keep(new RoundedBoxGeometry(1.2, 0.2, 2.2, 2, 0.06))
  islandGeo.translate(0, 0.1, 0)
  const pedestalGeo = keep(new RoundedBoxGeometry(0.85, 2.5, 0.62, 2, 0.12))
  pedestalGeo.translate(0, 1.25 + 0.2, 0)
  const chargerGeo = keep(mergeGeometries([islandGeo, pedestalGeo])!)
  const chargers = shadowed(new InstancedMesh(chargerGeo, clay, BAYS))
  const capGeo = keep(new RoundedBoxGeometry(0.9, 0.34, 0.68, 2, 0.1))
  capGeo.translate(0, 2.55 + 0.2, 0)
  const caps = shadowed(new InstancedMesh(capGeo, dark, BAYS), false)
  caps.instanceMatrix.setUsage(DynamicDrawUsage)
  caps.frustumCulled = false
  group.add(caps)
  chargers.instanceMatrix.setUsage(DynamicDrawUsage)
  chargers.frustumCulled = false
  group.add(chargers)
  const screenGeo = keep(new BoxGeometry(0.6, 0.7, 0.04))
  screenGeo.translate(0, 1.95, 0.32)
  const screenMat = keep(new MeshBasicMaterial({ toneMapped: false }))
  const screens = new InstancedMesh(screenGeo, screenMat, BAYS)
  screens.instanceMatrix.setUsage(DynamicDrawUsage)
  screens.frustumCulled = false
  group.add(screens)
  const chargerPos = Array.from({ length: BAYS }, (_, i) => new Vector3(BAY_X(i) + CHARGER_DX, 0, CHARGER_Z))

  // pulsujące pierścienie pod ładowarką z alertem
  const ringMat = keep(new MeshBasicMaterial({ color: opts.alert, transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false }))
  const rings = [0, 1].map(() => {
    const r = new Mesh(keep(new RingGeometry(0.9, 1.05, 48)), ringMat.clone())
    disposables.push(r.material as Material)
    r.rotation.x = -Math.PI / 2
    r.position.copy(chargerPos[ALERT_BAY]!).setY(0.08)
    r.renderOrder = 3
    group.add(r)
    return r
  })

  // ── 3. Autobusy: nadwozie, pas szyb, moduł na dachu, koła; nad dachem pasek SoC ──
  const body = keep(new RoundedBoxGeometry(2.55, 2.8, BUS_LEN, 3, 0.34))
  body.translate(0, 0.34 + 1.4, 0)
  const pod = keep(new RoundedBoxGeometry(1.9, 0.4, 5, 2, 0.14))
  pod.translate(0, 3.14 + 0.2, 0.8)
  const busGeo = keep(mergeGeometries([body, pod])!)
  const band = keep(new RoundedBoxGeometry(2.6, 1.05, BUS_LEN + 0.06, 2, 0.2))
  band.translate(0, 2.25, 0)
  const wheel = new CylinderGeometry(0.52, 0.52, 0.34, 16)
  wheel.rotateZ(Math.PI / 2)
  const wheels = [-3.8, 3.4].flatMap((z) => [-1.14, 1.14].map((x) => wheel.clone().translate(x, 0.52, z)))
  const wheelGeo = keep(mergeGeometries(wheels)!)
  wheel.dispose()
  wheels.forEach((w) => w.dispose())

  const busMat = keep(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.05 }))
  const busBody = shadowed(new InstancedMesh(busGeo, busMat, BAYS))
  const busBand = shadowed(new InstancedMesh(band, glass, BAYS), false)
  const busWheels = shadowed(new InstancedMesh(wheelGeo, dark, BAYS), false)
  for (const im of [busBody, busBand, busWheels]) {
    im.instanceMatrix.setUsage(DynamicDrawUsage)
    im.frustumCulled = false // jeżdżą po całej działce – bounding sphere z pierwszej klatki ucinałby je
    group.add(im)
  }

  const trackGeo = keep(new BoxGeometry(0.7, 0.12, SOC_LEN))
  const fillGeo = keep(new BoxGeometry(0.76, 0.2, 1))
  fillGeo.translate(0, 0, -0.5) // rośnie od tyłu (+z) do przodu autobusu (−z)
  const trackMat = keep(new MeshBasicMaterial({ color: opts.ink, transparent: true, opacity: 0.85, toneMapped: false }))
  const fillMat = keep(new MeshBasicMaterial({ toneMapped: false }))
  const socTrack = new InstancedMesh(trackGeo, trackMat, BAYS)
  const socFill = new InstancedMesh(fillGeo, fillMat, BAYS)
  for (const im of [socTrack, socFill]) {
    im.instanceMatrix.setUsage(DynamicDrawUsage)
    im.frustumCulled = false
    im.renderOrder = 4
    group.add(im)
  }

  // trasy: wjazd z lewej drogą od frontu i skręt na stanowisko; wyjazd przodem na tylną drogę i w prawo
  const arrivePaths = Array.from({ length: BAYS }, (_, i) =>
    roundedPath([new Vector3(-52, 0, ROAD_FRONT), new Vector3(BAY_X(i), 0, ROAD_FRONT), new Vector3(BAY_X(i), 0, 0)], TURN_R),
  )
  const departPaths = Array.from({ length: BAYS }, (_, i) =>
    roundedPath([new Vector3(BAY_X(i), 0, 0), new Vector3(BAY_X(i), 0, ROAD_BACK), new Vector3(54, 0, ROAD_BACK)], TURN_R),
  )
  const arriveLen = arrivePaths.map((p) => p.getLength())
  const departLen = departPaths.map((p) => p.getLength())
  // pierwsze przyjeżdża i pierwsze odjeżdża stanowisko z prawej (depot przelotowy: kto pierwszy wjechał, ten pierwszy wyjeżdża)
  const rank = (i: number) => BAYS - 1 - i

  // plan ładowania: najwcześniejsze odjazdy pierwsze, okno zależy od potrzebnej energii
  const plan = opts.buses.map((b, i) => {
    const start = rank(i) * 0.062
    const dur = 0.22 + ((b.target - b.soc) / 100) * 0.3
    return { start, end: Math.min(1, start + dur) }
  })

  // ── linie energii ──
  const Y = 0.14
  const gridCurves = [-25.2, -28.8].flatMap((z) => {
    const tops = [new Vector3(-140, 11.2, z), ...TOWER_X.map((x) => new Vector3(x, 11.6 - PLINTH + 0.2, z)), new Vector3(-40.6, 8.2, z)]
    return tops.slice(1).map((b, n) => sagLine(tops[n]!, b, n === 0 ? 2.6 : 1.6))
  })
  gridCurves.push(sagLine(new Vector3(-40.6, 8.2, -25.2), new Vector3(-37, 4.1, -27), 0.6))
  gridCurves.push(sagLine(new Vector3(-40.6, 8.2, -28.8), new Vector3(-31.5, 4.1, -27), 0.8))
  const gridLines = createEnergyLines(gridCurves, { base: opts.ink, pulse: opts.accent, radius: 0.07, spacing: 14, baseAlpha: 0.35 })
  group.add(gridLines.mesh)

  // wiązka kabli z podstacji: równoległe linie, każda odbija do swojej ładowarki (zagnieżdżone „L”, więc się nie krzyżują)
  const feederCurves = Array.from({ length: BAYS }, (_, i) => {
    const sx = -31.2 + 0.26 * i
    const z = -8.0 - 0.26 * i
    const c = chargerPos[i]!
    return roundedPath(
      [
        new Vector3(sx, Y, -25.6),
        new Vector3(sx, Y, z),
        new Vector3(c.x, Y, z),
        new Vector3(c.x, Y, c.z - 0.5),
        new Vector3(c.x, 0.9, c.z - 0.26),
      ],
      0.9,
    )
  })
  const STORAGE_LINE = BAYS
  const SOLAR_LINE = BAYS + 1
  feederCurves.push(roundedPath([new Vector3(-16, Y, -23.4), new Vector3(-16, Y, -10.9), new Vector3(-12, Y, -10.9)], 0.9))
  feederCurves.push(roundedPath([new Vector3(9, 8.2, -21.9), new Vector3(9, Y, -21.9), new Vector3(9, Y, -10.9), new Vector3(4, Y, -10.9)], 0.9))
  const feeders = createEnergyLines(feederCurves, { base: opts.ink, pulse: opts.accent, radius: 0.08, spacing: 9, baseAlpha: 0.32 })
  group.add(feeders.mesh)

  // kable ładowarka → gniazdo autobusu (prawy bok, z przodu)
  const plugCurves = Array.from({ length: BAYS }, (_, i) => {
    const c = chargerPos[i]!
    return arcLine(new Vector3(c.x - 0.3, 1.7, c.z + 0.15), new Vector3(BAY_X(i) + 1.3, 1.25, -3.4), 0.55)
  })
  const plugs = createEnergyLines(plugCurves, { base: opts.ink, pulse: opts.accent, radius: 0.06, spacing: 1.6, tail: 4, baseAlpha: 0.7 })
  group.add(plugs.mesh)

  // ── stan klatki ──
  const m = new Matrix4()
  const local = new Matrix4()
  const part = new Matrix4()
  const none = new Quaternion()
  const q = new Quaternion()
  const p = new Vector3()
  const s = new Vector3()
  const v = new Vector3()
  const up = new Vector3(0, 1, 0)
  const target = new Vector3()
  const c = new Color()
  const cOff = new Color('#8e8b9e')
  const cOn = new Color('#ffffff')
  const cAccent = new Color(opts.accent)
  const cOk = new Color(opts.ok)
  const cAlert = new Color(opts.alert)

  const busPos = Array.from({ length: BAYS }, () => new Vector3())
  const busShown = new Float32Array(BAYS) // 0–1: skala autobusu (pojawia się na wjeździe, znika za działką)
  const socNow = new Float32Array(BAYS)
  const barOn = new Float32Array(BAYS)
  const LEAD_BAY = BAYS - 1 // pierwszy odjeżdżający – za nim jedzie etykieta „On time”
  let leadOn = 0
  let alertOn = 0
  let lastTime = 0

  let width = 1
  let height = 1
  let viewH = 1

  function placeBus(i: number, pos: Vector3, dir: Vector3, scale: number) {
    // przód autobusu to lokalne −z: obrót tak, żeby (0,0,−1) wskazywał kierunek jazdy
    q.setFromAxisAngle(up, Math.atan2(-dir.x, -dir.z))
    const sc = Math.max(scale, 0.0001)
    m.compose(pos, q, s.set(sc, sc, sc))
    busBody.setMatrixAt(i, m)
    busBand.setMatrixAt(i, m)
    busWheels.setMatrixAt(i, m)
    busPos[i]!.copy(pos)
    // pasek SoC: nad dachem, w układzie autobusu
    const on = barOn[i]!
    const bs = Math.max(0.0001, easeOutBack(on) * sc)
    local.compose(v.set(0, 4.5, 0), none, s.set(bs, bs, bs))
    socTrack.setMatrixAt(i, part.multiplyMatrices(m, local))
    const fill = (socNow[i]! / 100) * SOC_LEN
    local.compose(v.set(0, 4.52, SOC_LEN / 2), none, s.set(bs, bs, Math.max(0.0001, fill * bs)))
    socFill.setMatrixAt(i, part.multiplyMatrices(m, local))
  }

  function update(st: DepotState, time: number, t: number) {
    const dt = lastTime ? Math.min(0.1, Math.max(0, time - lastTime)) : 0
    lastTime = time

    // 0. podstawa i to, co na niej leży
    const base = easeOut(clamp01(st.reveal * 1.4))
    plinth.scale.set(MathUtils.lerp(0.7, 1, base), Math.max(0.001, base), MathUtils.lerp(0.7, 1, base))
    plinth.position.y = -PLINTH + (PLINTH * Math.max(0.001, base)) / 2
    const flat = smooth(0.3, 0.7, st.reveal)
    ground.visible = flat > 0.001
    ground.scale.set(1, Math.max(0.001, flat), 1)
    ground.position.y = -0.06 * (1 - flat)
    const hallRise = easeOut(smooth(0.45, 1, st.reveal))
    hall.scale.set(1, Math.max(0.001, hallRise), 1)
    hall.visible = hallRise > 0.001
    treeSpots.forEach((spot, n) => {
      const tr = easeOutBack(stagger(smooth(0.5, 1, st.reveal), n / treeSpots.length, 0.6))
      m.compose(spot, none, s.set(Math.max(tr, 0.0001), Math.max(tr, 0.0001), Math.max(tr, 0.0001)))
      trees.setMatrixAt(n, m)
    })
    trees.instanceMatrix.needsUpdate = true

    // 1. energia: słupy, podstacja, magazyn, PV
    const e = st.energy
    towerParts.forEach((tw, n) => {
      const r = easeOut(stagger(smooth(0, 0.5, e), n / TOWER_X.length, 0.5))
      tw.scale.set(1, Math.max(0.001, r), 1)
      tw.visible = r > 0.001
    })
    const subRise = easeOut(smooth(0.15, 0.55, e))
    substation.scale.set(1, Math.max(0.001, subRise), 1)
    substation.visible = subRise > 0.001
    containers.forEach((cn, n) => {
      const r = easeOut(stagger(smooth(0.35, 0.75, e), n / containers.length, 0.5))
      cn.scale.set(1, Math.max(0.001, r), 1)
      cn.visible = r > 0.001
    })
    pvPos.forEach((pos, n) => {
      const r = easeOutBack(stagger(smooth(0.5, 0.95, e), ((n % PV_COLS) + Math.floor(n / PV_COLS) * 2) / 14, 0.55))
      m.compose(pos, pvTilt, s.set(Math.max(r, 0.0001), Math.max(r, 0.0001), Math.max(r, 0.0001)))
      pv.setMatrixAt(n, m)
    })
    pv.instanceMatrix.needsUpdate = true
    const gridOn = smooth(0, 0.25, e)
    const gridReveal = smooth(0.05, 0.7, e)
    for (let n = 0; n < gridLines.count; n++) {
      gridLines.on[n] = gridOn
      // przewody na słupach rysują się po kolei, zjazdy do transformatorów na końcu
      gridLines.reveal[n] = n >= 6 ? smooth(0.55, 0.75, e) : clamp01(gridReveal * 3 - (n % 3))
      gridLines.flow[n] = smooth(0.4, 0.8, e)
    }

    // 2. ładowarki: wyrastają po kolei, kable rysują się od podstacji, ekrany się włączają
    alertOn = smooth(0.05, 0.18, st.alert) * (1 - smooth(0.5, 0.62, st.alert))
    const fixed = smooth(0.55, 0.7, st.alert) * (1 - smooth(0.9, 1, st.alert))
    for (let i = 0; i < BAYS; i++) {
      const order = i / BAYS
      const rise = easeOutBack(stagger(smooth(0, 0.55, st.chargers), order, 0.5))
      const online = stagger(smooth(0.5, 0.95, st.chargers), order, 0.5)
      m.compose(chargerPos[i]!, none, s.set(1, Math.max(rise, 0.0001), 1))
      chargers.setMatrixAt(i, m)
      caps.setMatrixAt(i, m)
      screens.setMatrixAt(i, m)

      // ładowanie tego autobusu
      const pl = plan[i]!
      const u = clamp01((st.charge - pl.start) / (pl.end - pl.start))
      const bus = opts.buses[i]!
      socNow[i] = MathUtils.lerp(bus.soc, bus.target, 1 - (1 - u) ** 1.5) // pod koniec zwalnia (faza CV)
      const charging = u > 0 && u < 1 ? smooth(0, 0.04, u) * (1 - smooth(0.96, 1, u)) : 0

      c.copy(cOff).lerp(cOn, online)
      if (charging > 0) c.lerp(cAccent, Math.min(1, charging * 1.5))
      else if (u >= 1) c.lerp(cOk, 1)
      if (i === ALERT_BAY) {
        if (alertOn > 0) c.lerp(cAlert, alertOn * (0.65 + 0.35 * Math.sin(time * 9)))
        if (fixed > 0) c.lerp(cOk, fixed)
      }
      screens.setColorAt(i, c)

      const reveal = clamp01(smooth(0.15, 0.9, st.chargers) * 1.25 - i * 0.025)
      feeders.on[i] = st.chargers > 0.15 ? 1 : 0
      feeders.reveal[i] = reveal
      // kable „pokazowo” płyną, gdy się rysują, potem tylko pod ładującym się autobusem
      feeders.flow[i] = Math.max(Math.sin(Math.PI * smooth(0.2, 1, st.chargers)) * 0.85, charging)
      if (i === ALERT_BAY) feeders.on[i] = feeders.on[i]! * (1 - alertOn * 0.8)
      plugs.flow[i] = charging
    }
    chargers.instanceMatrix.needsUpdate = true
    caps.instanceMatrix.needsUpdate = true
    screens.instanceMatrix.needsUpdate = true
    if (screens.instanceColor) screens.instanceColor.needsUpdate = true

    // magazyn oddaje energię w szczycie ceny, PV ładuje w dzień (rozdział Energia)
    feeders.on[STORAGE_LINE] = smooth(0.35, 0.6, e)
    feeders.reveal[STORAGE_LINE] = smooth(0.55, 0.85, e)
    feeders.flow[STORAGE_LINE] = smooth(0.25, 0.32, st.charge) * (1 - smooth(0.56, 0.64, st.charge))
    feeders.on[SOLAR_LINE] = smooth(0.5, 0.7, e)
    feeders.reveal[SOLAR_LINE] = smooth(0.65, 0.95, e)
    feeders.flow[SOLAR_LINE] = smooth(0.75, 0.95, e) * (1 - smooth(0.1, 0.4, st.chargers))

    for (const [n, r] of rings.entries()) {
      const ph = (time * 0.7 + n * 0.5) % 1
      r.scale.setScalar(1 + ph * 3.2)
      ;(r.material as MeshBasicMaterial).opacity = (1 - ph) * alertOn * 0.9
      r.visible = alertOn > 0.002
    }

    // 3. autobusy: wjazd → podłączenie → ładowanie → odłączenie → wyjazd
    for (let i = 0; i < BAYS; i++) {
      const k = rank(i)
      const aL = arriveLen[i]!
      const dL = departLen[i]!
      const da = brakeAt((st.arrive - k * ARRIVE_GAP) * SPEED, aL)
      const parkedAt = k * ARRIVE_GAP + (aL + BRAKE) / SPEED // chwila (w fazie arrive), w której autobus stanął
      const plug = smooth(parkedAt, parkedAt + 0.05, st.arrive)
      const depRaw = (st.depart - 0.02 - k * DEPART_GAP) * SPEED
      const unplug = smooth(0.0, 0.025, st.depart - k * DEPART_GAP)
      const dd = launchAt(depRaw - 3)
      barOn[i] = plug * (1 - smooth(0.6, 1, unplug))
      plugs.on[i] = plug * (1 - unplug)
      plugs.reveal[i] = Math.min(plug, 1 - unplug) > 0 ? 1 : 0

      let scale = 1
      if (dd > 0) {
        const u = clamp01(dd / dL)
        departPaths[i]!.getPointAt(u, p)
        departPaths[i]!.getTangentAt(u, v)
        scale = 1 - smooth(dL - 10, dL - 2, dd)
      } else {
        const u = clamp01(da / aL)
        arrivePaths[i]!.getPointAt(u, p)
        arrivePaths[i]!.getTangentAt(u, v)
        scale = st.arrive > k * ARRIVE_GAP ? smooth(0, 7, da) : 0
      }
      busShown[i] = scale
      placeBus(i, p, v, scale)
      if (i === LEAD_BAY) leadOn = smooth(4, 10, dd) * (1 - smooth(dL - 24, dL - 14, dd))

      const goal = opts.buses[i]!.target
      const lvl = clamp01((socNow[i]! - opts.buses[i]!.soc) / Math.max(1, goal - opts.buses[i]!.soc))
      c.copy(cAccent).lerp(cOk, smooth(0.85, 1, lvl))
      socFill.setColorAt(i, c)
    }
    for (const im of [busBody, busBand, busWheels, socTrack, socFill]) im.instanceMatrix.needsUpdate = true
    if (socFill.instanceColor) socFill.instanceColor.needsUpdate = true

    gridLines.update(dt, 10)
    feeders.update(dt, 7)
    plugs.update(dt, 2.2)

    // ── kamera: tor ujęć ──
    const aspect = width / viewH
    const vFov = MathUtils.degToRad(camera.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const fit = (w: number, hh: number) => Math.max(w / 2 / Math.tan(hFov / 2), hh / 2 / Math.tan(vFov / 2)) + 2
    // na wąskim ekranie działka może wychodzić poza boki kadru – inaczej byłaby maleńka
    const narrow = MathUtils.clamp((1.1 - aspect) / 0.6, 0, 1)
    const plotW = MathUtils.lerp(96, 58, narrow)
    const intro = 1 - smoother(0, 1, t) // na starcie kamera dojeżdża z daleka
    const dist = lerpDist(fit(plotW, 42) * sampleShots(t, 'k'), fit(plotW, 42) * 1.6, intro * 0.4)
    // na szerokim ekranie w Smart charging i Odjeździe z prawej leży karta HUD – makieta odsuwa się w lewo
    const wide = MathUtils.clamp((aspect - 1.25) / 0.45, 0, 1)
    const hudShift = smoother(7.9, 8.6, t) * wide * 14
    target.set(sampleShots(t, 'tx') + hudShift, 0, sampleShots(t, 'tz'))
    camera.position
      .setFromSphericalCoords(dist, MathUtils.degToRad(sampleShots(t, 'polar')), sampleShots(t, 'az'))
      .add(target)
    camera.lookAt(target)
    group.updateMatrixWorld()
  }

  // pozycja punktu makiety na ekranie (px względem canvasu); visible = przed kamerą i w kadrze
  function project(x: number, y: number, z: number): Anchor {
    v.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera)
    return {
      x: (v.x * 0.5 + 0.5) * width,
      y: (-v.y * 0.5 + 0.5) * height,
      visible: v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02,
    }
  }

  // Canvas zajmuje cały widok, ale u góry i u dołu leżą na nim teksty (insets, px). Kamera kadruje makietę w wolnym pasie.
  function resize(w: number, h: number, insets = { top: 0, bottom: 0 }) {
    width = Math.max(1, w)
    height = Math.max(1, h)
    let { top, bottom } = insets
    const minView = height * 0.42
    if (height - top - bottom < minView && top + bottom > 0) {
      const k = (height - minView) / (top + bottom)
      top *= k
      bottom *= k
    }
    viewH = Math.max(1, height - top - bottom)
    renderer.setPixelRatio(Math.min(maxDpr, Math.sqrt(MAX_PIXELS / (width * height))))
    renderer.setSize(width, height, false)
    camera.setViewOffset(width, viewH, 0, -top, width, height)
    camera.updateProjectionMatrix()
    dirty = true
  }

  // Klatka na żądanie: liczymy i renderujemy tylko, gdy przesunęła się oś czasu, zmienił się rozmiar
  // albo coś rusza się samo w czasie (impulsy na liniach, migający alert). Stojący scroll bez impulsów = zero pracy GPU.
  let dirty = true
  let lastT = Number.NaN
  function frame(st: DepotState, time: number, t: number) {
    const moving = gridLines.moving() || feeders.moving() || plugs.moving() || alertOn > 0
    if (!dirty && !moving && t === lastT) {
      lastTime = time
      return false
    }
    update(st, time, t)
    renderer.render(scene, camera)
    dirty = false
    lastT = t
    return true
  }

  return {
    frame,
    resize,
    // punkty zaczepienia etykiet HTML
    energyAnchors: () => ({
      grid: project(-40.6, 8.6, -27), // bramka podstacji – tu linie z sieci wchodzą na działkę
      storage: project(-16, 3.4, -26.5),
      solar: project(30, 8.4, -22),
    }),
    alertAnchor: () => project(chargerPos[ALERT_BAY]!.x, 3.4, chargerPos[ALERT_BAY]!.z),
    alertLevel: () => alertOn,
    focusAnchor: () => {
      const b = busPos[FOCUS_BAY]!
      return { ...project(b.x, 5.2, b.z), on: barOn[FOCUS_BAY]! * busShown[FOCUS_BAY]!, soc: socNow[FOCUS_BAY]! }
    },
    departAnchor: () => {
      const b = busPos[LEAD_BAY]!
      return { ...project(b.x, 4.4, b.z), on: leadOn }
    },
    // średni SoC floty na stanowiskach (licznik w HUD)
    fleetSoc: () => {
      let sum = 0
      for (let i = 0; i < BAYS; i++) sum += socNow[i]!
      return sum / BAYS
    },
    dispose: () => {
      for (const d of disposables) d.dispose()
      for (const im of [markMesh, trees, pv, chargers, caps, screens, busBody, busBand, busWheels, socTrack, socFill]) im.dispose()
      gridLines.dispose()
      feeders.dispose()
      plugs.dispose()
      renderer.dispose()
    },
  }
}

export type DepotScene = ReturnType<typeof createDepotScene>
