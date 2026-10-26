<script setup lang="ts">
import { statement } from '~/data/home'

// Duży tekst jak na hut8: słowa zapalają się w rytm scrolla (scrub), przy reduced motion stoją w pełnym kolorze
const words = statement.text.split(' ')
const root = ref<HTMLElement | null>(null)
const wordEls: HTMLElement[] = []
let kill = () => {}

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
  gsap.registerPlugin(ScrollTrigger)
  const tween = gsap.fromTo(
    wordEls,
    { opacity: 0.14 },
    { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: root.value, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 } },
  )
  kill = () => tween.scrollTrigger?.kill()
})
onBeforeUnmount(() => kill())
</script>

<template>
  <section id="statement" ref="root" class="grid-site bg-ink py-28 text-white lg:py-44">
    <p class="col-[2/14] text-lead font-medium lg:col-[2/12]">
      <template v-for="(w, i) in words" :key="i"><span :ref="(el) => (wordEls[i] = el as HTMLElement)">{{ w }}</span>{{ ' ' }}</template>
    </p>
    <a v-reveal :href="statement.link.href" class="col-[2/14] mt-14 flex max-w-xs items-center justify-between border-b border-white/25 pb-3 font-medium transition-colors hover:border-accent lg:col-[2/6]">
      {{ statement.link.label }}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffb548" stroke-width="1.75" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
    </a>
  </section>
</template>
