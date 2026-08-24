# Full Body Tracker

Trainingslog voor het full body A/B/C-schema met twee hardloopdagen. React, geen backend,
alles staat in `localStorage` op je telefoon. Installeerbaar als app (PWA) en werkt offline.

## Direct draaien

```bash
python3 -m http.server 8796
```

Open daarna `http://localhost:8796`. `app.js` is de gebouwde bundel, dus dit werkt zonder
installatie.

## Het schema

| Dag | Training | Rust tussen sets |
|-----|----------|------------------|
| A (ma) | Full Body A — bench, pull ups, shoulder press, leg press, hammer curl, tricep pushdown, abs | 2:30 compounds, 1:00–1:30 rest |
| B (di) | Hardlopen 10 km | — |
| C (wo) | Full Body B — incline bench, rows, lateral raises, lunges/leg extension, incline curl, pull over/skullcrusher, abs | idem |
| D (do) | Rust | — |
| E (vr) | Full Body C — peck deck, face pull, shoulder press/lateral raises, hamstring curl + calves, hammer curl, tricep pushdown | idem |
| F (za) | Hardlopen 8 km | — |
| G (zo) | Rust | — |

Oefeningen met een opwarmset tonen die als **W**, de werksets zijn genummerd en gaan tot falen.
Namen, sets en rusttijden pas je in de app zelf aan; een nieuwe week neemt jouw versie over.

## Hoe het werkt

- **Sets afvinken** start automatisch de rusttimer van die oefening. De balk onderin telt af,
  je kunt er 30 seconden bij doen of hem wegtikken. Volledig stil: geen geluid en geen trilling
  — als de tijd om is kleurt de balk groen en pulseert hij zachtjes.
- **Rusttijd aanpassen** doe je door op de tijd naast de oefening te tikken; die loopt langs
  45s, 1:00, 1:15, 1:30, 2:00, 2:30 en 3:00 en wordt per oefening bewaard.
- **Sessieduur** loopt zodra je een trainingsdag opent en stopt als je terug gaat. Het balkje
  bovenin vult zich richting 60 minuten en kleurt rood als je eroverheen gaat. Ook hier geen
  alarm, puur informatie.
- **Vorige keer** staat onder elke oefeningsnaam: de zwaarste werkset van de vorige sessie,
  inclusief datum. De vorige waarden staan ook als grijze hint in de invoervelden.
- **Geschiedenis** toont per oefening het verloop van de zwaarste werkset, met het verschil
  tussen de eerste en laatste sessie. Hardloopdagen komen in de lijst zodra je een tijd invult
  of ze afvinkt.
- **Weken** blader je met de pijlen bovenin. Elke maandag begint automatisch een nieuwe lege
  week; oude weken blijven bewaard.

## Op je telefoon zetten

De app installeren vereist `https`. Zet de map op een statische host (Netlify Drop, GitHub
Pages, Vercel) en daarna:

- **iPhone:** open de link in Safari → Deel → *Zet op beginscherm*.
- **Android:** open in Chrome → menu → *App installeren*.

Vanaf `file://` werkt de service worker niet, dus dubbelklikken op `index.html` geeft je wel
de app maar niet de installatie of offline-modus.

## Zelf aanpassen

```bash
npm install
npm run build     # of: npm run watch
```

Bronbestanden:

- `src/data.js` — het schema, weekberekening, opslag en geschiedenis
- `src/app.jsx` — alle schermen
- `style.css` — vormgeving
- `tools/make-icons.js` — genereert de app-iconen (`node tools/make-icons.js`)

**Belangrijk bij wijzigingen:** verhoog `CACHE` in `sw.js` (`fullbody-v1` → `v2`). De service
worker serveert anders de oude versie vanuit de cache.

## Opslag

Alles staat onder de sleutel `fullbody-week-JJJJ-Www` in `localStorage` van de browser waarin
je de app opent. Er gaat niets naar een server. Wis je de browsergegevens van die site, dan is
je log weg; de gegevens verhuizen ook niet mee als je de app op een andere host zet.
