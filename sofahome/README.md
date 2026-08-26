# Sofahome — Shopify-thema

Custom Shopify-thema (Online Store 2.0), vanaf nul gebouwd. Geen build-stap, geen frameworks:
platte Liquid, één CSS-bestand en één JS-bestand.

## Structuur

```
layout/       theme.liquid (alle pagina's) en password.liquid (winkel-in-aanbouw)
templates/    JSON-templates per paginatype + klantpagina's in customers/
sections/     Bewerkbare secties — dit is wat je in de theme-editor versleept
snippets/     Herbruikbare stukjes: productkaart, prijs, iconen, paginering
assets/       theme.css en theme.js
config/       settings_schema.json (instellingen) en settings_data.json (waardes)
locales/      nl.default.json — alle teksten van het thema
```

## Werken aan het thema

Twee vaste thema's, en dat verschil is de hele afspraak:

| Thema | Id | Rol |
|---|---|---|
| Sova Home — werkversie | `205985907019` | **live** — de winkel |
| Werkversie — Claude | `206577107275` | ongepubliceerd — hier komt werk uit de code binnen |

De rollen blijven zo. Wessel publiceert niet meer zelf; goedgekeurd werk gaat
met `npm run push:live` naar de winkel.

Bekijken: https://qstzjv-nd.myshopify.com/admin/themes/206577107275/editor

### Vaste volgorde

`pull` overschrijft lokale bestanden met wat er op Shopify staat. Draai hem dus
**vóór** je begint, nooit vlak voor een push.

1. **Beginnen** — heeft Wessel in de editor gewerkt, haal dat eerst op:

   ```bash
   cd ~/Pictures/ai/sofahome && npm run pull
   ```

2. **Werken**, en controleren op fouten:

   ```bash
   cd ~/Pictures/ai/sofahome && npm run check
   ```

3. **Laten zien** — naar de werkversie:

   ```bash
   cd ~/Pictures/ai/sofahome && npm run push
   ```

4. **Pas na akkoord van Wessel** naar de winkel:

   ```bash
   cd ~/Pictures/ai/sofahome && npm run push:live
   ```

Ging het mis en heeft een pull je werk overschreven? Zolang het gecommit was:
`git checkout -- sofahome/` zet alles terug.

### Geen `theme dev`

Die blijft draaien en uploadt continu naar het thema waar hij op gericht staat.
Dat heeft een keer editor-werk overschreven en zette ongevraagd werk live toen
dat thema gepubliceerd werd. Gebruik `npm run push`: één keer, op een moment
dat je zelf kiest.

## Wie past wat aan

Om te voorkomen dat we elkaars werk overschrijven:

- **Theme-editor (jij):** teksten, kleuren, lettertypes, foto's, volgorde van secties,
  menu's, producten. Sneller voor jou en het staat direct goed.
- **Code (hier):** nieuwe secties, layout, styling, alles wat de editor niet kan.

Editor-wijzigingen leven in `config/settings_data.json` en `templates/*.json` op Shopify.
Daarom altijd `npm run pull` vóór een push waarin die bestanden veranderen.

## Na het uploaden in de Shopify-admin

1. **Winkel → Thema's → Sofahome → Voorbeeld bekijken** om te controleren.
2. **Aanpassen** opent de theme-editor. Alle teksten, kleuren, lettertypes en secties
   zijn daar instelbaar; je hoeft de code niet aan te raken.
3. Koppel bij de sectie *Uitgelichte collectie* en *Collecties* je eigen collecties.
4. Menu's: **Winkel → Navigatie**. De header gebruikt `main-menu`, de footer `footer`.
5. Pas tevreden? Dan pas op **Publiceren** klikken.

## Wat er nog niet in zit

- **Gift card-template** (`templates/gift_card.liquid`) — alleen nodig als je cadeaubonnen verkoopt.
- **Filters op de collectiepagina** (kleur, prijs, materiaal). Sorteren zit er wel in.
- **Cart drawer** — de winkelwagen is nu een eigen pagina, geen zijpaneel.
- **Klantpagina's** werken met de klassieke accounts. Gebruikt je winkel de nieuwe
  customer accounts, dan regelt Shopify die pagina's zelf en worden ze niet gebruikt.
