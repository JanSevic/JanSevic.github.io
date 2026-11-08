# ševic.eu

Osobní web Jana Ševice v [Astru](https://astro.build). Design se řídí design systémem „ševic.eu – design systém“ na claude.ai. Písmo je Barlow Condensed, paleta grafit a akcent tlumená ocelová modrá.

## Spuštění

```sh
npm install
npm run dev      # vývojový server na http://localhost:4321
npm run build    # hotový web do složky dist/
```

## Kde co je

| Co | Kde |
|---|---|
| Jméno, úvodní věta, krátké O mně, kontakty, přepínač barev STAN | `src/site.ts` |
| Témata (1 soubor = 1 téma) | `src/content/temata/*.md` |
| Příspěvky (1 soubor = 1 příspěvek) | `src/content/prispevky/*.md` |
| Publikace | `src/data/publikace.json` |
| Oblasti výzkumu, předměty, vedené práce, odkazy na profily | `src/data/veda.ts` |
| Fotky (krajina, portrét) | `src/assets/` |
| Favicon | `public/favicon.*`, `public/apple-touch-icon.png` |
| Barvy a písmo | `src/styles/global.css` |

Texty v `[hranatých závorkách]` jsou místa, která je potřeba doplnit.

### Nový příspěvek

Vytvoř `src/content/prispevky/nazev-prispevku.md`. Název souboru se stane adresou `/prispevky/nazev-prispevku/`.

```md
---
title: "Proč…"
date: 2026-11-20
tema: dane            # název souboru tématu bez .md
perex: "Jedna až dvě věty."
obrazek: ./obrazek.jpg   # volitelné
draft: false             # true = nezveřejní se
---

Text v Markdownu. Citace (> …) se zobrazí jako zvýrazněná myšlenka.
```

Ukázkové příspěvky `ukazka-*.md` smaž, až napíšeš první skutečný.

### Barvy STAN

V `src/site.ts` přepni `akcent: 'vlastni'` na `'stan'`. Odkazy pak zrůžoví a proužky zežloutnou. Odstíny jsou odhad, přesné hodnoty doplň z grafického manuálu STAN do `src/styles/global.css`.

## Nasazení

Workflow `.github/workflows/deploy.yml` sestaví web a nasadí ho na GitHub Pages při každém pushi do `main`. Na větvi `astro` se nespouští, takže stávající web zůstává beze změny.

Přechod z Hugo na Astro:

1. Zkontroluj web lokálně (`npm run dev`).
2. Na GitHubu přejmenuj větev `main` na `hugo` (záloha starého webu) a větev `astro` na `main` (Settings → Branches). Stane se z ní výchozí větev.
3. V záložce Actions spusť ručně workflow „Nasazení webu na GitHub Pages“. Dál se už spouští samo po každém pushi do `main`.
4. V Settings → Pages zůstává zdroj „GitHub Actions“ a vlastní doména ševic.eu.

Větve `astro` a `main` nemají společnou historii, proto se nesmí slučovat (merge), ale jen přejmenovat.
