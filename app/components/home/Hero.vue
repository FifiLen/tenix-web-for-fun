<script setup lang="ts">
import { hero } from '~/data/home'

// Hero na ciemnym tle: wiązka kabli z impulsami (ten sam język co makieta depotu niżej)
// i karta „live” depotu. Linie i liczby animuje CSS, więc hero działa bez czekania na JS.
const LINES = 9
const lines = Array.from({ length: LINES }, (_, i) => {
  // zagnieżdżone „L”: z lewej krawędzi w poziomie, potem w dół do swojego punktu – jak wiązka w makiecie
  const y = 120 + i * 14
  const x = 620 + i * 70
  return { d: `M-20 ${y} H${x - 30} Q${x} ${y} ${x} ${y + 30} V${900}`, delay: (i * 0.37) % 2.4 }
})
const live = [
  { label: 'Vehicles in depot', value: '42' },
  { label: 'Charging now', value: '18' },
  { label: 'Ready to depart', value: '24' },
]
</script>

<template>
  <section id="top" class="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink text-white">
    <svg class="absolute inset-0 -z-10 size-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke-linecap="round">
        <path v-for="(l, i) in lines" :key="`b${i}`" :d="l.d" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1.5" />
        <path
          v-for="(l, i) in lines"
          :key="`p${i}`"
          :d="l.d"
          pathLength="100"
          class="hero-pulse"
          :style="{ animationDelay: `${-l.delay}s` }"
          stroke="#ffb548"
          stroke-width="2"
        />
      </g>
    </svg>
    <div class="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_20%_100%,rgb(20_17_42/0.0),rgb(20_17_42/0.85))]" aria-hidden="true" />

    <div class="grid-site flex-1 content-end gap-y-10 pt-32 pb-10 lg:pb-14">
      <div class="col-[2/14] lg:col-[2/10]">
        <p class="hero-in flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted-dark uppercase" style="--d: 0.05s">
          <span class="size-1.5 rounded-full bg-accent" />{{ hero.eyebrow }}
        </p>
        <h1 class="mt-6 text-h1 font-medium">
          <span v-for="(line, i) in hero.title" :key="line" class="block overflow-hidden pb-[0.06em]">
            <span class="hero-line block" :style="{ '--d': `${0.12 + i * 0.1}s` }">{{ line }}</span>
          </span>
        </h1>
        <p class="hero-in mt-8 max-w-xl text-[17px] text-muted-dark lg:text-lg" style="--d: 0.45s">{{ hero.text }}</p>
        <div class="hero-in mt-8 flex flex-wrap gap-3" style="--d: 0.55s">
          <a href="#contact" class="rounded-full bg-accent px-6 py-3.5 font-medium text-ink transition-colors hover:bg-white">Book a demo</a>
          <a href="#depot" class="rounded-full border border-white/20 px-6 py-3.5 font-medium transition-colors hover:border-white">See how it works</a>
        </div>
      </div>

      <aside class="hero-in col-[2/14] self-end rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md lg:col-[10/14]" style="--d: 0.7s" aria-label="Example depot status">
        <div class="flex items-center justify-between">
          <p class="font-mono text-xs tracking-[0.12em] text-muted-dark uppercase">Depot 01</p>
          <p class="flex items-center gap-2 text-xs text-ok"><span class="size-1.5 animate-pulse rounded-full bg-ok" />Live</p>
        </div>
        <dl class="mt-5 grid grid-cols-3 gap-3">
          <div v-for="l in live" :key="l.label">
            <dd class="text-3xl font-medium tracking-[-0.04em] tabular-nums">{{ l.value }}</dd>
            <dt class="mt-1 text-xs text-muted-dark">{{ l.label }}</dt>
          </div>
        </dl>
        <div class="mt-5">
          <div class="flex justify-between text-xs text-muted-dark"><span>Grid load</span><span class="font-mono text-white">2.9 / 4.0 MW</span></div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><span class="hero-load block h-full w-[72%] origin-left rounded-full bg-accent" /></div>
        </div>
      </aside>
    </div>

    <a href="#statement" class="grid-site border-t border-white/10 py-5 text-sm text-muted-dark transition-colors hover:text-white">
      <span class="col-[2/14] flex items-center justify-between">
        {{ hero.scroll }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
      </span>
    </a>
  </section>
</template>

<style scoped>
/* impuls: krótki odcinek linii jedzie wzdłuż ścieżki (pathLength = 100) */
.hero-pulse {
  stroke-dasharray: 6 94;
  animation: pulse 2.4s linear infinite;
}
@keyframes pulse {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
.hero-line {
  animation: rise 1.1s var(--ease-out-quint) var(--d, 0s) both;
}
.hero-in {
  animation: fade 1.1s var(--ease-out-quint) var(--d, 0s) both;
}
.hero-load {
  animation: load 1.6s var(--ease-out-quint) 0.9s both;
}
@keyframes rise {
  from { transform: translateY(105%); }
}
@keyframes fade {
  from { opacity: 0; transform: translateY(20px); }
}
@keyframes load {
  from { transform: scaleX(0); }
}
</style>
