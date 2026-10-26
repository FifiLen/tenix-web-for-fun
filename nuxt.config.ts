import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#14112a' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // Samohostowane przy buildzie. Rodziny podane wprost (global), bo moduł nie widzi tokenów z @theme Tailwinda 4.
  fonts: {
    families: [
      { name: 'Geist', provider: 'google', global: true },
      { name: 'Geist Mono', provider: 'google', global: true, weights: [400, 500] },
    ],
    defaults: {
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
    },
  },

  experimental: {
    payloadExtraction: false,
    appManifest: false,
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
})
