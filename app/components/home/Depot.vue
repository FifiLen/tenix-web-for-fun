<script setup lang="ts">
import { depot } from '~/data/home'
import type { DepotScene, DepotState } from '~/lib/depotScene'

// Depot jako historia: sekcja ma 900svh, widok jest przyklejony (sticky),
// a postęp scrolla przewija oś czasu GSAP, która steruje makietą 3D i rozdziałami.
// Jednostki osi czasu – fazy sceny i początki rozdziałów:
const PHASES = {
  reveal: [0, 0.9],
  energy: [1.15, 1.7],
  chargers: [3.1, 1.3],
  alert: [4.6, 1.25],
  arrive: [6.1, 1.85],
  charge: [8.15, 1.9],
  depart: [10.3, 1.6],
} as const
const CHAPTER_STARTS = [0, 1, 3, 6, 8, 10.2]
// kliknięcie w krok skali przewija do chwili, w której rozdział jest „ustawiony” (scena po swojej fazie)
const CHAPTER_TARGETS = [0.9, 2.9, 5.9, 7.95, 10.1, 12]
const END = 12
const FADE = 0.35

const section = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const copy = ref<HTMLElement | null>(null)
const scale = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
// etykiety i HUD: pozycję, krycie i liczby wpisuje tick wprost do DOM, bez przerysowywania komponentu co klatkę
const energyLabels = ref<HTMLElement[]>([])
const alertLabel = ref<HTMLElement | null>(null)
const focusLabel = ref<HTMLElement | null>(null)
const focusSoc = ref<HTMLElement | null>(null)
const focusBar = ref<HTMLElement | null>(null)
const departLabel = ref<HTMLElement | null>(null)
const hud = ref<HTMLElement | null>(null)
const hudClip = ref<SVGRectElement | null>(null)
const hudSoc = ref<HTMLElement | null>(null)
const hudSavings = ref<HTMLElement | null>(null)
const resultCard = ref<HTMLElement | null>(null)
const chapterEls: HTMLElement[] = []
const segmentEls: HTMLElement[] = []

const chapter = ref(0)
const alertFixed = ref(false)
const reduced = ref(false)
const webgl = ref(true)

const focusBus = depot.buses[6]!
const leadBus = depot.buses[depot.buses.length - 1]!

const segmentFill = (i: number, ch: number, t: number) => {
  if (i < ch) return 1
  if (i > ch) return 0
  const start = CHAPTER_STARTS[i]!
  const end = CHAPTER_STARTS[i + 1] ?? END
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

const { $lenis } = useNuxtApp()
const goTo = (i: number) => {
  const el = section.value
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY
  const y = top + (CHAPTER_TARGETS[i]! / END) * (el.offsetHeight - window.innerHeight)
  const duration = Math.min(2.2, 0.8 + (Math.abs(y - window.scrollY) / window.innerHeight) * 0.15)
  if ($lenis) $lenis.scrollTo(y, { duration })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

let cleanup = () => {}

onMounted(async () => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const state: DepotState = { reveal: 0, energy: 0, chargers: 0, alert: 0, arrive: 0, charge: 0, depart: 0 }

  let scene: DepotScene | null = null
  let disposed = false
  // wolny pas na makietę: między dołem opisów a górą skali
  const insets = () => {
    if (reduced.value || !stage.value || !copy.value || !scale.value) return { top: 0, bottom: 0 }
    const box = stage.value.getBoundingClientRect()
    return {
      top: copy.value.getBoundingClientRect().bottom - box.top,
      bottom: box.bottom - scale.value.getBoundingClientRect().top + 8,
    }
  }
  const STATIC_T = 9
  const resize = () => {
    if (!scene || !canvas.value) return
    scene.resize(canvas.value.clientWidth, canvas.value.clientHeight, insets())
    if (reduced.value) scene.frame(state, 0, STATIC_T)
  }
  const ro = new ResizeObserver(resize)
  if (canvas.value) ro.observe(canvas.value)

  // three.js i budowa sceny – w wolnej chwili albo od razu, gdy sekcja zbliża się do ekranu
  let loading: Promise<void> | null = null
  const loadScene = () =>
    (loading ??= (async () => {
      try {
        const { createDepotScene } = await import('~/lib/depotScene')
        if (disposed || !canvas.value) return
        scene = createDepotScene(canvas.value, {
          buses: depot.buses,
          accent: '#ffb548',
          ink: '#14112a',
          ok: '#2fbf71',
          alert: '#ff5b4a',
        })
        resize()
      } catch (e) {
        console.error(e)
        webgl.value = false
      }
    })())

  // Bez animacji: statyczny widok w trakcie ładowania, rozdziały jeden pod drugim
  if (reduced.value) {
    Object.assign(state, { reveal: 1, energy: 1, chargers: 1, alert: 1, arrive: 1, charge: 0.55 })
    cleanup = () => {
      disposed = true
      ro.disconnect()
      scene?.dispose()
    }
    await loadScene()
    ;(scene as DepotScene | null)?.frame(state, 0, STATIC_T) // TS zawęża `scene` do null – nie widzi przypisania w loadScene
    return
  }

  if ('requestIdleCallback' in window) requestIdleCallback(() => loadScene(), { timeout: 2000 })
  else setTimeout(loadScene, 300)
  const near = new IntersectionObserver(([e]) => e?.isIntersecting && loadScene(), { rootMargin: '60% 0px' })
  if (section.value) near.observe(section.value)

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
  gsap.registerPlugin(ScrollTrigger)

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.to(state, { reveal: 1, duration: PHASES.reveal[1], ease: 'power2.out' }, PHASES.reveal[0])
    .to(state, { energy: 1, duration: PHASES.energy[1] }, PHASES.energy[0])
    .to(state, { chargers: 1, duration: PHASES.chargers[1] }, PHASES.chargers[0])
    .to(state, { alert: 1, duration: PHASES.alert[1] }, PHASES.alert[0])
    .to(state, { arrive: 1, duration: PHASES.arrive[1] }, PHASES.arrive[0])
    .to(state, { charge: 1, duration: PHASES.charge[1], ease: 'power1.inOut' }, PHASES.charge[0])
    .to(state, { depart: 1, duration: PHASES.depart[1] }, PHASES.depart[0])
    .set({}, {}, END)

  const fx: number[] = depot.chapters.map((_, i) => (i === 0 ? 1 : 0))
  const sync = () => {
    const t = tl.time()
    let ch = 0
    CHAPTER_STARTS.forEach((start, i) => {
      if (t >= start) ch = i
    })
    chapter.value = ch
    alertFixed.value = state.alert >= 0.56
    CHAPTER_STARTS.forEach((start, i) => {
      const end = CHAPTER_STARTS[i + 1] ?? Infinity
      const fadeIn = i === 0 ? 1 : Math.min(1, Math.max(0, (t - start) / FADE))
      const fadeOut = Math.min(1, Math.max(0, (end - t) / FADE))
      fx[i] = fadeIn * fadeOut
      const el = chapterEls[i]
      if (el) {
        el.style.opacity = String(fx[i])
        el.style.transform = `translateY(${(1 - fadeIn) * 18 - (1 - fadeOut) * 18}px)`
      }
      const seg = segmentEls[i]
      if (seg) seg.style.transform = `scaleX(${segmentFill(i, ch, t)})`
    })
  }
  tl.eventCallback('onUpdate', sync)
  sync()

  const trigger = ScrollTrigger.create({
    trigger: section.value,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    animation: tl,
  })

  // renderuj tylko, gdy sekcja jest na ekranie
  let visible = false
  const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting), { rootMargin: '100px' })
  if (stage.value) io.observe(stage.value)
  const place = (el: HTMLElement | null | undefined, a: { x: number; y: number; visible: boolean }, opacity: number) => {
    if (!el) return
    el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`
    el.style.opacity = String(a.visible ? opacity : 0)
  }
  const ramp = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)))

  const tick = (time: number) => {
    if (!visible || !scene) return
    const t = tl.time()
    if (!scene.frame(state, time, t)) return

    // Energia: etykiety przy słupach, magazynie i dachu
    const en = scene.energyAnchors()
    const enOn = ramp(0.45, 0.75, state.energy) * fx[1]!
    ;[en.grid, en.storage, en.solar].forEach((a, n) => place(energyLabels.value[n], a, enOn))
    // Ładowarki: alert nad ładowarką 07
    place(alertLabel.value, scene.alertAnchor(), ramp(0.05, 0.15, state.alert) * (1 - ramp(0.9, 1, state.alert)) * fx[2]!)
    // Flota i Smart charging: etykieta autobusu z bieżącym SoC
    const f = scene.focusAnchor()
    place(focusLabel.value, f, f.on * Math.max(fx[3]!, fx[4]!))
    if (focusSoc.value) focusSoc.value.textContent = `${Math.round(f.soc)}%`
    if (focusBar.value) focusBar.value.style.transform = `scaleX(${(f.soc / 100).toFixed(3)})`
    // Odjazd: etykieta jedzie za pierwszym autobusem
    const d = scene.departAnchor()
    place(departLabel.value, d, d.on * fx[5]!)

    // HUD wykresu: odsłania się w rytm nocnego ładowania
    if (hud.value) hud.value.style.opacity = String(fx[4]!)
    if (resultCard.value) resultCard.value.style.opacity = String(fx[5]! * ramp(0.35, 0.65, state.depart))
    hudClip.value?.setAttribute('width', String(320 * state.charge))
    if (hudSoc.value) hudSoc.value.textContent = `${Math.round(scene.fleetSoc())}%`
    if (hudSavings.value) hudSavings.value.style.opacity = String(Math.min(1, Math.max(0, (state.charge - 0.55) / 0.2)))
  }
  gsap.ticker.add(tick)

  cleanup = () => {
    disposed = true
    gsap.ticker.remove(tick)
    trigger.kill()
    tl.kill()
    io.disconnect()
    near.disconnect()
    ro.disconnect()
    scene?.dispose()
  }
})

onBeforeUnmount(() => cleanup())

// ścieżki wykresu (viewBox 320×140): bez zarządzania – szczyt ponad limitem zaraz po zjeździe, z Tenix – płasko pod limitem
const CHART = {
  limit: 46,
  without: 'M0,128 C18,128 26,14 52,12 C86,10 104,58 140,88 C176,116 240,126 320,128',
  with: 'M0,128 C14,128 22,58 44,58 L210,58 C236,58 262,70 280,96 C292,114 304,128 320,128',
}
</script>

<template>
  <section
    id="depot"
    ref="section"
    :aria-label="depot.label"
    class="relative bg-stage text-ink"
    :class="reduced ? 'py-24 lg:py-36' : 'h-[900svh]'"
  >
    <div
      ref="stage"
      class="grid-site"
      :class="reduced ? 'gap-y-12' : 'sticky top-0 h-svh grid-rows-[auto_minmax(0,1fr)_auto] gap-y-4 pt-24 pb-5 lg:pt-28 lg:pb-7'"
    >
      <!-- 1. opisy rozdziałów -->
      <div ref="copy" class="relative z-10 col-[2/14] flex flex-col items-center text-center">
        <ol :class="reduced ? 'flex flex-col gap-16' : 'grid w-full max-w-5xl'">
          <li
            v-for="(c, i) in depot.chapters"
            :key="c.step"
            :ref="(el) => (chapterEls[i] = el as HTMLElement)"
            class="flex flex-col items-center gap-3 lg:gap-4"
            :class="!reduced && ['glass [grid-area:1/1] self-start justify-self-center rounded-2xl px-5 py-4 lg:px-10 lg:py-6', i !== chapter && 'pointer-events-none', i !== 0 && 'opacity-0']"
            :aria-hidden="!reduced && i !== chapter ? 'true' : undefined"
          >
            <p class="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              <span class="size-1.5 rounded-full bg-accent" />
              {{ c.layer || String(i + 1).padStart(2, '0') }} · {{ c.step }}
            </p>
            <h2 class="max-w-3xl text-[clamp(1.625rem,3.2vw,3rem)] leading-[1.03] font-medium tracking-[-0.035em] text-balance">{{ c.title }}</h2>
            <p class="max-w-2xl text-[15px] text-muted text-pretty lg:text-[17px]">{{ c.text }}</p>

            <a
              v-if="i === depot.chapters.length - 1"
              :href="depot.link.href"
              class="inline-flex items-center gap-3 border-b border-ink py-1 font-medium hover:border-accent"
            >
              {{ depot.link.label }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <dl v-if="reduced && i === depot.chapters.length - 1" class="grid grid-cols-3 gap-6">
              <div v-for="r in depot.result" :key="r.label" class="flex flex-col items-center">
                <dt class="order-2 text-sm text-muted">{{ r.label }}</dt>
                <dd class="order-1 text-4xl font-medium tracking-[-0.04em]">{{ r.value }}</dd>
              </div>
            </dl>
          </li>
        </ol>
      </div>

      <!-- 2. scena -->
      <div :class="reduced ? 'relative col-[1/15] h-[64svh]' : 'absolute inset-0'">
        <canvas v-show="webgl" ref="canvas" class="absolute inset-0 block size-full" aria-hidden="true" />

        <!-- etykiety przypięte do makiety (pozycję i krycie ustawia tick, poza Vue) -->
        <div v-if="!reduced" class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <!-- dach hali leży tuż pod opisem, więc etykieta PV wisi pod punktem (kreska w górę), pozostałe stoją nad nim -->
          <div v-for="e in depot.energy" :key="e.key" ref="energyLabels" class="absolute top-0 left-0 opacity-0 will-change-transform">
            <div class="flex -translate-x-1/2 items-center" :class="e.key === 'solar' ? '-translate-y-[3px] flex-col-reverse' : '-translate-y-full flex-col'">
              <span class="flex items-center gap-2.5 rounded-full bg-white py-2 pr-3.5 pl-3 text-[13px] whitespace-nowrap shadow-[0_8px_30px_rgb(20_17_42/0.14)]">
                <span class="size-2 rounded-full bg-accent" />
                {{ e.name }}
                <span class="font-mono text-xs text-muted tabular-nums">{{ e.value }}</span>
              </span>
              <span class="h-8 w-px bg-ink/35 lg:h-12" />
              <span class="size-1.5 rounded-full bg-ink" />
            </div>
          </div>

          <div ref="alertLabel" class="absolute top-0 left-0 opacity-0 will-change-transform">
            <div class="flex -translate-x-1/2 -translate-y-full flex-col items-center">
              <span
                class="flex items-center gap-2.5 rounded-full py-2 pr-3.5 pl-3 text-[13px] whitespace-nowrap text-white shadow-[0_8px_30px_rgb(20_17_42/0.25)] transition-colors duration-300"
                :class="alertFixed ? 'bg-ok' : 'bg-alert'"
              >
                <span class="relative flex size-2">
                  <span v-if="!alertFixed" class="absolute inset-0 animate-ping rounded-full bg-white/80" />
                  <span class="relative size-2 rounded-full bg-white" />
                </span>
                <span class="font-medium">{{ depot.alert.charger }}</span>
                <span class="opacity-85">{{ alertFixed ? depot.alert.fixed : depot.alert.fault }}</span>
              </span>
              <span class="h-8 w-px bg-ink/40 lg:h-10" />
            </div>
          </div>

          <div ref="focusLabel" class="absolute top-0 left-0 opacity-0 will-change-transform">
            <div class="flex -translate-x-1/2 -translate-y-full flex-col items-center">
              <div class="w-52 rounded-xl bg-white p-3 text-[12px] shadow-[0_10px_34px_rgb(20_17_42/0.16)]">
                <div class="flex items-center justify-between">
                  <span class="font-medium">Bus {{ focusBus.id }}</span>
                  <span class="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] text-white">Route {{ focusBus.route }}</span>
                </div>
                <div class="mt-2 flex items-baseline justify-between text-muted">
                  <span>Departs {{ focusBus.departs }}</span>
                  <span class="font-mono tabular-nums"><span ref="focusSoc" class="text-ink">{{ focusBus.soc }}%</span> → {{ focusBus.target }}%</span>
                </div>
                <div class="relative mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <span ref="focusBar" class="absolute inset-0 origin-left rounded-full bg-accent" :style="{ transform: `scaleX(${focusBus.soc / 100})` }" />
                  <span class="absolute inset-y-0 w-px bg-ink" :style="{ left: `${focusBus.target}%` }" />
                </div>
              </div>
              <span class="h-6 w-px bg-ink/35" />
            </div>
          </div>

          <div ref="departLabel" class="absolute top-0 left-0 opacity-0 will-change-transform">
            <div class="flex -translate-x-1/2 -translate-y-full flex-col items-center">
              <span class="flex items-center gap-2.5 rounded-full bg-ink py-2 pr-3.5 pl-3 text-[13px] whitespace-nowrap text-white shadow-[0_8px_30px_rgb(20_17_42/0.25)]">
                <span class="size-2 rounded-full bg-ok" />
                Route {{ leadBus.route }} · {{ leadBus.departs }}
                <span class="font-mono text-xs text-ok">On time · {{ leadBus.target }}%</span>
              </span>
              <span class="h-6 w-px bg-ink/40" />
            </div>
          </div>
        </div>

        <!-- wynik nocy: w miejscu HUD, w ostatnim rozdziale (na wąskim ekranie pod opisem) -->
        <div
          v-if="!reduced"
          ref="resultCard"
          class="glass pointer-events-none absolute right-5 bottom-28 z-10 w-[min(22rem,calc(100%-2.5rem))] rounded-2xl p-5 opacity-0 lg:right-10 lg:bottom-32"
          aria-hidden="true"
        >
          <p class="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">Tonight at Depot 01</p>
          <dl class="mt-4 grid grid-cols-3 gap-3">
            <div v-for="r in depot.result" :key="r.label" class="flex flex-col">
              <dt class="order-2 mt-1 text-xs text-muted">{{ r.label }}</dt>
              <dd class="order-1 text-3xl leading-none font-medium tracking-[-0.045em] tabular-nums">{{ r.value }}</dd>
            </div>
          </dl>
        </div>

        <!-- HUD smart charging: obciążenie depotu tej nocy -->
        <div
          v-if="!reduced"
          ref="hud"
          class="glass pointer-events-none absolute right-5 bottom-28 z-10 w-[min(22rem,calc(100%-2.5rem))] rounded-2xl p-4 opacity-0 max-lg:hidden lg:right-10 lg:bottom-32"
          aria-hidden="true"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{{ depot.chart.title }}</p>
              <p class="mt-1 text-sm text-muted">Fleet SoC <span ref="hudSoc" class="font-mono text-ink tabular-nums">0%</span></p>
            </div>
            <p ref="hudSavings" class="text-right opacity-0">
              <span class="block text-3xl leading-none font-medium tracking-[-0.04em]">{{ depot.chart.savings }}</span>
              <span class="text-xs text-muted">{{ depot.chart.savingsLabel }}</span>
            </p>
          </div>
          <svg viewBox="0 0 320 140" class="mt-3 w-full overflow-visible">
            <defs>
              <clipPath id="hud-clip"><rect ref="hudClip" x="0" y="0" width="0" height="140" /></clipPath>
              <linearGradient id="hud-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#ffb548" stop-opacity="0.35" />
                <stop offset="1" stop-color="#ffb548" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" x2="320" :y1="CHART.limit" :y2="CHART.limit" stroke="#ff5b4a" stroke-width="1" stroke-dasharray="4 4" />
            <text x="320" :y="CHART.limit - 6" text-anchor="end" class="fill-alert font-mono text-[10px]">{{ depot.chart.limit }}</text>
            <g clip-path="url(#hud-clip)">
              <path :d="CHART.without" fill="none" stroke="#14112a" stroke-opacity="0.28" stroke-width="1.5" />
              <path :d="`${CHART.with} L320,128 L0,128 Z`" fill="url(#hud-fill)" />
              <path :d="CHART.with" fill="none" stroke="#ffb548" stroke-width="2.5" />
            </g>
            <line x1="0" x2="320" y1="128" y2="128" stroke="#14112a" stroke-opacity="0.15" />
            <text v-for="(h, n) in depot.chart.hours" :key="h" :x="n * 80" y="140" :text-anchor="n === 0 ? 'start' : n === 4 ? 'end' : 'middle'" class="fill-muted font-mono text-[10px]">{{ h }}:00</text>
          </svg>
          <div class="mt-2 flex gap-4 text-[11px] text-muted">
            <span class="flex items-center gap-1.5"><span class="h-0.5 w-3 bg-accent" />{{ depot.chart.with }}</span>
            <span class="flex items-center gap-1.5"><span class="h-0.5 w-3 bg-ink/30" />{{ depot.chart.without }}</span>
          </div>
        </div>
      </div>

      <!-- 3. skala: 6 kroków, da się kliknąć -->
      <div v-if="!reduced" ref="scale" class="glass relative z-10 col-[2/14] row-start-3 rounded-2xl px-4 pt-1 pb-3 lg:px-5 lg:pb-2">
        <ol class="grid grid-cols-6 gap-1.5" aria-label="Depot steps">
          <li v-for="(c, i) in depot.chapters" :key="c.step">
            <button
              type="button"
              class="group flex w-full flex-col gap-2.5 pt-3 pb-1 text-left"
              :aria-label="`Step ${i + 1}: ${c.step}`"
              :aria-current="i === chapter ? 'step' : undefined"
              @click="goTo(i)"
            >
              <span class="h-0.5 w-full overflow-hidden bg-line transition-colors duration-300 group-hover:bg-ink/25">
                <span
                  :ref="(el) => (segmentEls[i] = el as HTMLElement)"
                  class="block h-full origin-left bg-accent transition-transform duration-300 [transform:scaleX(0)]"
                />
              </span>
              <span
                class="truncate font-mono text-xs transition-colors duration-300 group-hover:text-ink max-lg:hidden"
                :class="i === chapter ? 'text-ink' : 'text-muted'"
                aria-hidden="true"
              >{{ String(i + 1).padStart(2, '0') }} {{ c.step }}</span>
            </button>
          </li>
        </ol>
        <p class="mt-1.5 text-center font-mono text-xs lg:hidden" aria-hidden="true">
          {{ String(chapter + 1).padStart(2, '0') }} {{ depot.chapters[chapter]!.step }}
        </p>
        <p class="sr-only" aria-live="polite">Step {{ chapter + 1 }} of {{ depot.chapters.length }}: {{ depot.chapters[chapter]!.step }}</p>
      </div>
    </div>
  </section>
</template>
