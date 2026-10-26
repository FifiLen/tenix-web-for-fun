// CAŁA treść strony głównej. Teksty na podstawie tenix.eu (EN).
// Liczby oznaczone „PRZYKŁAD” są do makiety – przed publikacją podmienić na prawdziwe.

export const nav = {
  links: [
    { label: 'Platform', href: '#depot' },
    { label: 'Impact', href: '#impact' },
    { label: 'Products', href: '#products' },
  ],
  cta: { label: 'Book a demo', href: '#contact' },
}

export const hero = {
  eyebrow: 'Charge Operations Platform',
  title: ['Where every depot', 'runs on time'],
  text: 'Tenix gives operators complete control of charging operations, helping reduce energy costs, improve fleet reliability and keep depots running efficiently.',
  scroll: 'Scroll to enter the depot',
}

export const statement = {
  text: 'Simply monitoring chargers doesn’t reduce costs or improve fleet performance. Tenix takes operators from real-time visibility to smart charging and SoC optimisation, so electric fleets run as reliably as diesel.',
  link: { label: 'See the depot', href: '#depot' },
}

// ── Makieta depotu (HomeDepot + lib/depotScene.ts) ──
// Kolejność rozdziałów = kolejność faz na osi czasu w Depot.vue.
export const depot = {
  label: 'How Tenix runs a depot',
  chapters: [
    {
      step: 'The depot',
      layer: '',
      title: 'One platform for the whole depot',
      text: 'Grid connection, chargers, vehicles and schedules. Tenix connects every layer of an electric depot into a single, live operation.',
    },
    {
      step: 'Energy',
      layer: 'Layer 1.0',
      title: 'Energy, under control',
      text: 'Tenix knows the grid capacity, the electricity price and what storage and solar can add, before a single vehicle plugs in.',
    },
    {
      step: 'Chargers',
      layer: 'Layer 2.0',
      title: 'Every charger, every brand, one view',
      text: 'Monitor every charger in real time. When a session is interrupted, your team is alerted before a departure is at risk.',
    },
    {
      step: 'Fleet',
      layer: 'Layer 3.0',
      title: 'Vehicles arrive, Tenix takes over',
      text: 'As buses return from service, Tenix reads their state of charge and next departure, and plans the night.',
    },
    {
      step: 'Smart charging',
      layer: 'Optimisation',
      title: 'Charge when it’s cheap, never over the limit',
      text: 'Charging follows electricity prices, grid capacity and departure times. The earliest departures charge first, and peaks stay flat.',
    },
    {
      step: 'Departure',
      layer: 'Result',
      title: 'Every vehicle ready, every departure on time',
      text: 'Each bus leaves at its target SoC, with battery health protected and the night’s energy bought at the lowest cost.',
    },
  ],
  // etykiety przypięte do makiety (rozdział Energia) – PRZYKŁAD
  energy: [
    { key: 'grid', name: 'Grid connection', value: '4.0 MW' },
    { key: 'storage', name: 'Battery storage', value: '2.4 MWh' },
    { key: 'solar', name: 'Rooftop solar', value: '620 kWp' },
  ],
  alert: {
    charger: 'Charger 07',
    fault: 'Connection lost · team alerted',
    fixed: 'Back online · 2 min',
  },
  // autobusy według stanowisk od lewej: numer, linia, godzina odjazdu, SoC na wjeździe i docelowy (%) – PRZYKŁAD
  // Depot jest przelotowy: pierwszy wjeżdża i pierwszy wyjeżdża autobus ze stanowiska po prawej,
  // więc odjazdy rosną od prawej do lewej (tak też Tenix układa kolejkę ładowania).
  buses: [
    { id: '222', route: '13', departs: '06:15', soc: 44, target: 90 },
    { id: '201', route: '5', departs: '06:04', soc: 38, target: 90 },
    { id: '215', route: '20', departs: '05:54', soc: 25, target: 92 },
    { id: '226', route: '13', departs: '05:42', soc: 46, target: 90 },
    { id: '207', route: '5', departs: '05:30', soc: 41, target: 90 },
    { id: '230', route: '31', departs: '05:20', soc: 31, target: 92 },
    { id: '214', route: '32', departs: '05:12', soc: 22, target: 95 },
    { id: '219', route: '20', departs: '05:06', soc: 28, target: 92 },
    { id: '203', route: '32', departs: '04:56', soc: 19, target: 95 },
    { id: '211', route: '31', departs: '04:48', soc: 34, target: 92 },
  ],
  // wykres w „Smart charging”: obciążenie bez i z Tenix wobec limitu przyłącza – PRZYKŁAD
  chart: {
    title: 'Depot load tonight',
    limit: 'Grid limit',
    without: 'Unmanaged',
    with: 'With Tenix',
    hours: ['22', '00', '02', '04', '06'],
    savings: '−28%',
    savingsLabel: 'energy cost',
  },
  result: [
    { value: '100%', label: 'departures at target SoC' },
    { value: '−28%', label: 'energy cost per night' },
    { value: '−41%', label: 'peak demand' },
  ],
  link: { label: 'Discover Tenix Charge', href: '#products' },
}

export const stats = {
  label: 'Proven at scale',
  title: 'Trusted by operators across Europe since 2008',
  items: [
    { value: 1, prefix: '1 in ', suffix: '', after: '2', label: 'eBuses in Norway rely on Tenix' },
    { value: 4200, prefix: '', suffix: '+', label: 'vehicles use Tenix every day' }, // PRZYKŁAD
    { value: 120, prefix: '', suffix: '+', label: 'electric depots managed every month' }, // PRZYKŁAD
  ],
}

export const products = {
  label: 'One platform',
  title: 'A complete system for modern fleet management',
  items: [
    {
      name: 'Tenix Charge',
      text: 'Optimise charging schedules, protect battery health, and manage every depot with intelligent tools for EVs.',
      points: ['Cut energy costs with smart charging', 'Protect and prolong all EV batteries', 'Ensure readiness across all depots'],
    },
    {
      name: 'Tenix Fleet',
      text: 'Monitor your entire fleet with live location tracking, range forecasting, and optimisation recommendations.',
      points: ['Live fleet tracking & analytics', 'Driver behaviour analytics', 'Automatic reporting'],
    },
    {
      name: 'Tenix Maintenance',
      text: 'Get predictive maintenance alerts, service scheduling suggestions, and comprehensive fleet health monitoring.',
      points: ['Predictive maintenance alerts', 'Service scheduling & tracking', 'Fleet health monitoring'],
    },
  ],
}

export const quote = {
  text: 'There are a lot of companies promising to do what Tenix already does. And Tenix does it exceptionally well.',
  name: 'Roger Harkestad',
  role: 'Former CEO',
}

export const contact = {
  eyebrow: 'Ready to get started?',
  title: 'Join the operators running fleets the smart way',
  cta: { label: 'Book a demo', href: 'https://tenix.eu/' },
  secondary: { label: 'Contact us', href: 'https://tenix.eu/' },
}
