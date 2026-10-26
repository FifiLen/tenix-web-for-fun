# Tenix – strona z makietą depotu (Nuxt 4, SSG)

Statyczna strona Tenix: Nuxt 4 + Tailwind CSS 4 + GSAP (ScrollTrigger) + three.js + Lenis, pełny prerender, zero backendu.
Sercem strony jest makieta depotu autobusów elektrycznych przewijana scrollem (inspiracja: makieta warstw na hut8.com).

## Start

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # statyczny build → .output/public
npx serve .output/public
```

## Struktura

```
app/
  assets/css/main.css      tokeny (kolory Tenix, skala typografii), siatka 12 kolumn, „szkło” nad sceną
  data/home.ts             CAŁA treść strony (EN) + dane makiety: autobusy, SoC, etykiety, wykres
  components/
    AppHeader.vue          pływające „pigułki”: logo, nawigacja, CTA
    home/Hero.vue          ciemny hero z wiązką kabli (SVG) i kartą „live” depotu
    home/Statement.vue     duży tekst zapalany słowo po słowie
    home/Depot.vue         sekcja z makietą: oś czasu GSAP, rozdziały, etykiety, HUD
    home/Stats.vue, Products.vue, Contact.vue
    ui/Logo.vue            logo Tenix (SVG, litery w currentColor)
  lib/depotScene.ts        scena three.js: działka, hala z PV, podstacja, magazyn, ładowarki, autobusy, kamera
  lib/energyLines.ts       linie energii z impulsami (shader), każda linia sterowana osobno
  plugins/lenis.client.ts  płynny scroll zsynchronizowany z ScrollTrigger
  plugins/reveal.ts        v-reveal: wjazd elementów przy wejściu na ekran
```

## Makieta depotu (HomeDepot)

Sekcja ma 900svh, widok jest przyklejony, a postęp scrolla przewija oś czasu GSAP (`PHASES`, `CHAPTER_STARTS` w `Depot.vue`).
Oś steruje stanem sceny (`DepotState` w `depotScene.ts`), a scena liczy z niego klatkę – nic nie dzieje się „samo”, poza impulsami na liniach.

| Rozdział | Co się dzieje w scenie |
|---|---|
| 01 The depot | wyrasta podstawa, drogi, hala, drzewa |
| 02 Energy (Layer 1.0) | słupy WN i linie z sieci, podstacja, magazyn energii, PV na dachu; etykiety z mocą |
| 03 Chargers (Layer 2.0) | 10 ładowarek, wiązka kabli z podstacji; ładowarka 07 traci połączenie → alert → wraca |
| 04 Fleet (Layer 3.0) | autobusy zjeżdżają z drogi, podłączają się, nad dachem pojawia się pasek SoC |
| 05 Smart charging | ładowanie kaskadowo (najpierw najwcześniejsze odjazdy), magazyn pokrywa szczyt; HUD z wykresem obciążenia |
| 06 Departure | autobusy z SoC docelowym wyjeżdżają w kolejności odjazdów; karta z wynikiem nocy |

- Kamera jedzie torem ujęć `SHOTS` (t 0–12) – tam zmieniasz kadry.
- Autobusy, godziny odjazdów i SoC: `depot.buses` w `data/home.ts` (indeks = stanowisko od lewej).
- Klik w krok na skali przewija do danego rozdziału.
- Scena renderuje tylko, gdy sekcja jest na ekranie i coś się zmienia; three.js ładuje się leniwie.
- Przy `prefers-reduced-motion` rozdziały stoją jeden pod drugim, a scena pokazuje statyczny stan.

## Do zrobienia

- [ ] prawdziwe liczby: wartości oznaczone „PRZYKŁAD” w `data/home.ts` (pojazdy, depoty, moc, oszczędności)
- [ ] docelowe linki „Book a demo” / „Contact us”
- [ ] OG image, wersje językowe (NO / PL?)
