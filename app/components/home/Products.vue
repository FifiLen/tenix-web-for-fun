<script setup lang="ts">
import { products } from '~/data/home'
</script>

<template>
  <section id="products" class="grid-site bg-paper py-28 lg:py-40">
    <div v-reveal class="col-[2/14] lg:col-[2/9]">
      <p class="flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted uppercase"><span class="size-1.5 rounded-full bg-accent" />{{ products.label }}</p>
      <h2 class="mt-5 text-h2 font-medium text-balance">{{ products.title }}</h2>
    </div>
    <ul v-reveal.stagger class="col-[2/14] mt-16 grid gap-4 md:grid-cols-3 lg:mt-24 lg:gap-5">
      <li
        v-for="(p, i) in products.items"
        :key="p.name"
        class="group flex flex-col rounded-3xl p-7 transition-colors duration-500 lg:p-9"
        :class="i === 0 ? 'bg-ink text-white' : 'bg-white hover:bg-ink hover:text-white'"
      >
        <span class="font-mono text-xs text-accent">0{{ i + 1 }}</span>
        <h3 class="mt-10 text-3xl font-medium tracking-[-0.035em] lg:mt-16">{{ p.name }}</h3>
        <p class="mt-4 text-pretty opacity-70">{{ p.text }}</p>
        <ul class="mt-8 flex flex-col gap-3 border-t border-current/15 pt-6 text-sm">
          <li v-for="pt in p.points" :key="pt" class="flex items-center gap-3"><span class="size-1.5 rounded-full bg-accent" />{{ pt }}</li>
        </ul>
      </li>
    </ul>
  </section>
</template>
