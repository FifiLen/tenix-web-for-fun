<script setup lang="ts">
import { contact, quote } from '~/data/home'
</script>

<template>
  <section id="contact" class="grid-site bg-paper pb-6">
    <figure v-reveal class="col-[2/14] mb-24 lg:col-[3/12] lg:mb-36">
      <blockquote class="text-lead font-medium text-balance">“{{ quote.text }}”</blockquote>
      <figcaption class="mt-6 text-muted">{{ quote.name }} · {{ quote.role }}</figcaption>
    </figure>
    <div class="relative col-[2/14] overflow-hidden rounded-3xl bg-accent px-6 py-16 text-ink lg:px-14 lg:py-24">
      <p class="font-mono text-xs tracking-[0.14em] uppercase">{{ contact.eyebrow }}</p>
      <h2 v-reveal class="mt-5 max-w-4xl text-h2 font-medium text-balance">{{ contact.title }}</h2>
      <div class="mt-10 flex flex-wrap gap-3">
        <a :href="contact.cta.href" class="rounded-full bg-ink px-6 py-3.5 font-medium text-white transition-colors hover:bg-white hover:text-ink">{{ contact.cta.label }}</a>
        <a :href="contact.secondary.href" class="rounded-full border border-ink/25 px-6 py-3.5 font-medium transition-colors hover:border-ink">{{ contact.secondary.label }}</a>
      </div>
      <UiLogo class="pointer-events-none absolute -right-6 -bottom-10 h-40 w-auto text-ink/8 lg:h-64" aria-hidden="true" />
    </div>
  </section>
</template>
