<script setup lang="ts">
import { stats } from '~/data/home'

// Liczby odliczają się od zera, gdy sekcja wchodzi na ekran (raz)
const figures = ref<HTMLElement[]>([])
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
let kill = () => {}

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
  gsap.registerPlugin(ScrollTrigger)
  const triggers = stats.items.map((item, i) => {
    const el = figures.value[i]
    if (!el || item.after) return null
    const o = { v: 0 }
    el.textContent = fmt(0)
    return gsap.to(o, {
      v: item.value,
      duration: 2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = fmt(o.v)),
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    })
  })
  kill = () => triggers.forEach((t) => t?.scrollTrigger?.kill())
})
onBeforeUnmount(() => kill())
</script>

<template>
  <section id="impact" class="grid-site bg-ink py-28 text-white lg:py-40">
    <div v-reveal class="col-[2/14] lg:col-[2/8]">
      <p class="flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted-dark uppercase"><span class="size-1.5 rounded-full bg-accent" />{{ stats.label }}</p>
      <h2 class="mt-5 text-h2 font-medium text-balance">{{ stats.title }}</h2>
    </div>
    <dl v-reveal.stagger class="col-[2/14] mt-16 grid gap-10 border-t border-line-dark pt-10 md:grid-cols-3 lg:mt-24">
      <div v-for="(s, i) in stats.items" :key="s.label" class="flex flex-col gap-4">
        <dd class="text-figure font-medium tabular-nums">
          {{ s.prefix }}<span ref="figures">{{ s.after ?? s.value.toLocaleString('en-US') }}</span><span class="text-accent">{{ s.suffix }}</span>
        </dd>
        <dt class="max-w-[22ch] text-muted-dark">{{ s.label }}</dt>
      </div>
    </dl>
  </section>
</template>
