// Linie energii z biegnącymi impulsami (jak ścieżki na makiecie hut8): cienkie rurki z jasną „głową” impulsu
// i gasnącym ogonem. Wszystkie linie siedzą w jednej siatce, ale każda ma własne sterowanie:
// on – widoczność linii, reveal – na ile jest narysowana od początku, flow – siła impulsów (0 = sama cienka linia).
// Impulsy liczymy w jednostkach długości, więc na krótkich i długich liniach jadą tak samo szybko.
import {
  Color,
  CubicBezierCurve3,
  type Curve,
  CurvePath,
  Float32BufferAttribute,
  LineCurve3,
  Mesh,
  QuadraticBezierCurve3,
  ShaderMaterial,
  TubeGeometry,
  type Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const MAX_LINES = 32

interface LineOptions {
  base: string // kolor samej linii
  pulse: string // kolor impulsu
  radius: number
  spacing: number // odstęp między impulsami (jednostki sceny)
  tail?: number // im większy, tym krótszy ogon impulsu (domyślnie 9)
  baseAlpha?: number // krycie linii bez impulsu
}

export function createEnergyLines(curves: Curve<Vector3>[], opts: LineOptions) {
  if (curves.length > MAX_LINES) throw new Error(`energyLines: max ${MAX_LINES} lines`)
  const geometries = curves.map((curve, n) => {
    const length = curve.getLength()
    const g = new TubeGeometry(curve, Math.max(24, Math.round(length * 3)), opts.radius, 6, false)
    const count = g.attributes.position!.count
    g.setAttribute('aLen', new Float32BufferAttribute(new Float32Array(count).fill(length), 1))
    g.setAttribute('aLine', new Float32BufferAttribute(new Float32Array(count).fill(n), 1))
    // przesunięcie fazy, żeby impulsy na sąsiednich liniach nie biegły w równym szyku
    g.setAttribute('aPhase', new Float32BufferAttribute(new Float32Array(count).fill((n * 2.37) % opts.spacing), 1))
    return g
  })
  const geometry = mergeGeometries(geometries)!
  geometries.forEach((g) => g.dispose())

  const on = new Float32Array(MAX_LINES)
  const reveal = new Float32Array(MAX_LINES)
  const flow = new Float32Array(MAX_LINES)

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uBase: { value: new Color(opts.base) },
      uPulse: { value: new Color(opts.pulse) },
      uOffset: { value: 0 },
      uSpacing: { value: opts.spacing },
      uTail: { value: opts.tail ?? 9 },
      uBaseAlpha: { value: opts.baseAlpha ?? 0.3 },
      uOn: { value: on },
      uReveal: { value: reveal },
      uFlow: { value: flow },
    },
    vertexShader: /* glsl */ `
      #define MAX_LINES ${MAX_LINES}
      attribute float aLen;
      attribute float aLine;
      attribute float aPhase;
      uniform float uOn[MAX_LINES];
      uniform float uReveal[MAX_LINES];
      uniform float uFlow[MAX_LINES];
      varying float vDist;
      varying float vU;
      varying float vOn;
      varying float vReveal;
      varying float vFlow;
      void main() {
        int i = int(aLine + 0.5);
        vOn = uOn[i];
        vReveal = uReveal[i];
        vFlow = uFlow[i];
        vU = uv.x;
        vDist = uv.x * aLen + aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uPulse;
      uniform float uOffset;
      uniform float uSpacing;
      uniform float uTail;
      uniform float uBaseAlpha;
      varying float vDist;
      varying float vU;
      varying float vOn;
      varying float vReveal;
      varying float vFlow;
      void main() {
        if (vOn < 0.002 || vU > vReveal) discard;
        float p = fract((vDist - uOffset) / uSpacing);
        float pulse = pow(p, uTail) * vFlow; // ostra głowa z przodu, ogon gaśnie do tyłu
        vec3 col = mix(uBase, uPulse, clamp(pulse * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(col, vOn * mix(uBaseAlpha, 1.0, pulse));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })

  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 2
  mesh.frustumCulled = false

  let offset = 0
  return {
    mesh,
    count: curves.length,
    on,
    reveal,
    flow,
    // speed: jednostki/s, znak = kierunek (dodatni: od początku do końca linii)
    update(dt: number, speed: number) {
      offset += dt * speed
      material.uniforms.uOffset!.value = offset
      let any = false
      for (let i = 0; i < curves.length; i++) if (on[i]! > 0.002 && reveal[i]! > 0.002) any = true
      mesh.visible = any
    },
    // czy coś na liniach się rusza (impulsy) – wtedy scena musi renderować się co klatkę
    moving() {
      for (let i = 0; i < curves.length; i++) if (on[i]! > 0.002 && flow[i]! > 0.002 && reveal[i]! > 0.002) return true
      return false
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

// Łamana z zaokrąglonymi narożnikami (jak kable w korytach): proste odcinki + łuki o promieniu `r` w narożnikach.
export function roundedPath(points: Vector3[], r = 0.8) {
  const path = new CurvePath<Vector3>()
  let from = points[0]!.clone()
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i]!
    const prev = points[i - 1]!
    const next = points[i + 1]!
    const inLen = corner.distanceTo(prev)
    const outLen = corner.distanceTo(next)
    const rr = Math.min(r, inLen / 2, outLen / 2)
    const a = corner.clone().add(prev.clone().sub(corner).setLength(rr))
    const b = corner.clone().add(next.clone().sub(corner).setLength(rr))
    if (from.distanceTo(a) > 1e-4) path.add(new LineCurve3(from, a))
    path.add(new QuadraticBezierCurve3(a, corner.clone(), b))
    from = b
  }
  path.add(new LineCurve3(from, points[points.length - 1]!.clone()))
  return path
}

// Przewód wiszący między dwoma punktami (lekki zwis pośrodku)
export function sagLine(a: Vector3, b: Vector3, sag: number) {
  const c1 = a.clone().lerp(b, 0.33)
  const c2 = a.clone().lerp(b, 0.67)
  c1.y -= sag
  c2.y -= sag
  return new CubicBezierCurve3(a, c1, c2, b)
}

// Łuk nad ziemią (kabel ładowarka → pojazd)
export function arcLine(a: Vector3, b: Vector3, lift: number) {
  const mid = a.clone().lerp(b, 0.5)
  mid.y = Math.max(a.y, b.y) + lift
  return new QuadraticBezierCurve3(a, mid, b)
}
