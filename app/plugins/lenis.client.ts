// Płynne przewijanie (Lenis) napędzane tickerem GSAP, żeby ScrollTrigger w HomeDepot liczył postęp z tej samej klatki.
// Lenis sam honoruje prefers-reduced-motion (wtedy scroll jest natywny 1:1).
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger)

  const lenis = new Lenis({ autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  // ScrollTrigger liczy pozycje raz (load, resize okna). Gdy zmienia się sama wysokość strony –
  // dociągnięte fonty – triggery niżej zostają w starym miejscu (np. stopka nigdy się nie odsłania). Odświeżamy je.
  let height = 0
  let refresh: ReturnType<typeof setTimeout> | undefined
  new ResizeObserver(([entry]) => {
    const h = Math.round(entry?.contentRect.height ?? 0)
    if (!height || h === height) return void (height = h)
    height = h
    clearTimeout(refresh)
    refresh = setTimeout(() => ScrollTrigger.refresh(), 150)
  }).observe(document.body)

  // Linki #kotwica: bez natywnego skoku i bez popstate (vue-router przewijałby drugi raz po swojemu).
  // Przewijamy w następnej klatce, żeby zamknięte menu mobilne zdążyło zniknąć z układu.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
    const hash = link?.getAttribute('href')
    const target = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (!target) return
    e.preventDefault()
    history.pushState(history.state, '', hash)
    requestAnimationFrame(() => lenis.scrollTo(target))
  })

  return { provide: { lenis } }
})
