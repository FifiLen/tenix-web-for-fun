<script setup lang="ts">
import { nav } from '~/data/home'

// Nagłówek jak na hut8: dwie pływające „pigułki” – logo z lewej, nawigacja i CTA z prawej. Działają na ciemnym i jasnym tle.
const open = ref(false)
</script>

<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-4 lg:p-6">
    <a href="#top" class="pointer-events-auto flex h-12 items-center rounded-full bg-white/90 px-5 text-ink shadow-[0_6px_24px_rgb(20_17_42/0.12)] backdrop-blur-md" aria-label="Tenix – home">
      <UiLogo class="h-6 w-auto" />
    </a>

    <nav class="pointer-events-auto flex h-12 items-center gap-1 rounded-full bg-white/90 p-1.5 pl-2 text-sm text-ink shadow-[0_6px_24px_rgb(20_17_42/0.12)] backdrop-blur-md" aria-label="Main">
      <a v-for="l in nav.links" :key="l.href" :href="l.href" class="rounded-full px-3.5 py-2 transition-colors hover:bg-ink/6 max-md:hidden">{{ l.label }}</a>
      <a :href="nav.cta.href" class="rounded-full bg-accent px-4 py-2 font-medium transition-colors hover:bg-ink hover:text-white">{{ nav.cta.label }}</a>
      <button type="button" class="grid size-9 place-items-center rounded-full hover:bg-ink/6 md:hidden" :aria-expanded="open" aria-label="Menu" @click="open = !open">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path :d="open ? 'M6 6l12 12M18 6L6 18' : 'M4 9h16M4 15h10'" /></svg>
      </button>
    </nav>

    <div v-if="open" class="pointer-events-auto absolute top-20 right-4 flex flex-col rounded-2xl bg-white p-2 text-ink shadow-[0_12px_40px_rgb(20_17_42/0.18)] md:hidden">
      <a v-for="l in nav.links" :key="l.href" :href="l.href" class="rounded-xl px-4 py-3 hover:bg-ink/6" @click="open = false">{{ l.label }}</a>
    </div>
  </header>
</template>
