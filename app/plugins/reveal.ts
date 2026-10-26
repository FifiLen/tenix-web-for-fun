// v-reveal: element wjeżdża od dołu i się pojawia, gdy wchodzi na ekran (raz).
// v-reveal.stagger: to samo dla dzieci elementu, jedno po drugim.
// Bez JS i przy prefers-reduced-motion treść jest po prostu widoczna.
import type { Directive } from 'vue'

type RevealEl = HTMLElement & { __reveal?: { kill: () => void } }

const reveal: Directive<RevealEl> = {
  getSSRProps: () => ({}),
  async mounted(el, binding) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    gsap.registerPlugin(ScrollTrigger)

    const targets = binding.modifiers.stagger ? [...el.children] : [el]
    const tween = gsap.from(targets, {
      y: 48,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.09,
      clearProps: 'transform,opacity,visibility', // po wjeździe nic nie zostaje w style (karuzele, hover)
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    })
    el.__reveal = { kill: () => tween.scrollTrigger?.kill() ?? tween.kill() }
  },
  unmounted(el) {
    el.__reveal?.kill()
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', reveal)
})
