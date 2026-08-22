# Workout Tracker

Weekschema + trainingslog als installeerbare PWA. React, alles in `localStorage`, geen backend.

## Draaien

`app.js` is de gebouwde bundel (React zit erin) — de map werkt dus meteen. Elke statische
server volstaat, maar het moet via `http://` of `https://`: vanaf `file://` weigert de
browser de service worker.

```bash
cd workout && python3 -m http.server 8795
```

Open daarna `http://localhost:8795`.

## Op je telefoon zetten

De PWA-installatie vereist **https** (of `localhost`). Zet de map dus op Netlify Drop,
GitHub Pages, Vercel — of laat 'm draaien achter een https-tunnel.

- **iPhone (Safari):** Deel-knop → *Zet op beginscherm*.
- **Android (Chrome):** menu → *App installeren*.

Daarna start hij fullscreen, zonder adresbalk, en werkt hij offline (alles is gecachet
door `sw.js`).

## Aanpassen

De React-broncode staat in `src/`. Na een wijziging opnieuw bouwen:

```bash
npm install && npm run build
```

Of `npm run watch` tijdens het sleutelen.

Bij het uitrollen van een wijziging: verhoog `CACHE` in `sw.js` (`workout-v1` → `v2`),
anders serveert de service worker op je telefoon de oude versie.

## Hoe het werkt

- **Opslag:** één key per week, `workout-week-2026-W31` (ISO-weeknummers). Vorige weken
  blijven staan; heen en weer bladeren met de pijlen.
- **Nieuwe week:** ontstaat vanzelf zodra de maandag van die week aanbreekt of je ernaartoe
  bladert. De oefeningen worden overgenomen uit je laatst ingevulde week, met je vorige
  reps/kg als grijze hint in de velden. Bestaat er nog geen enkele week, dan valt hij terug
  op het standaardschema in `src/data.js`.
- **Split:** het standaardschema staat bovenin `src/data.js` (`TEMPLATE`) — pas dat aan als
  je split structureel verandert. Losse oefeningen wijzig je gewoon in de app. Een nieuwe
  oefening begint met 3 lege sets.
- **Vorige keer:** onder elke oefening staat je laatste sessie van diezelfde oefening
  (op naam, hoofdletterongevoelig), met die waarden als grijze placeholder per set. Er
  wordt tien weken teruggekeken; sessies van dezelfde dag tellen niet mee. Een oefening
  telt pas als sessie zodra er iets is ingevuld, dus lege dagen vervuilen je referentie
  niet. Noem je een oefening in twee dagen hetzelfde, dan zien ze elkaars historie —
  handig voor Bench press op maandag én zaterdag.
- **Dagstatus:** de dag vinkt zichzelf af zodra elk onderdeel (oefeningen én hardloop-
  blokken) is afgevinkt, en gaat weer uit zodra je er eentje uitvinkt of een oefening
  toevoegt. Een rustdag heeft geen onderdelen en vink je dus zelf af.
- **Streak:** aaneengesloten dagen met een afgevinkte training, terugtellend vanaf vandaag.
  Rustdagen breken de streak niet (ze slaan over), en de dag van vandaag telt pas als
  gemist zodra hij voorbij is.

## Bestanden

| Bestand | |
|---|---|
| `index.html` | shell + service worker-registratie |
| `app.js` | gebouwde React-bundel (niet handmatig bewerken) |
| `src/app.jsx` | componenten en state |
| `src/data.js` | schema, weekberekening, opslag, historie, streak |
| `style.css` | dark UI, mobile-first |
| `manifest.json`, `sw.js`, `icons/` | PWA |
