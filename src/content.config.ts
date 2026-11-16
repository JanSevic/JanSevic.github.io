import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

// Témata: jeden Markdown soubor na téma.
// Tělo souboru = „Jak to vidím“. Pod ním volitelně seznam návrhů; bez návrhů je stránka jen textová.
const temata = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/temata' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    /** 1–2 věty do karty na úvodní stránce a do přehledu. */
    popis: z.string(),
    /** Úvodní věty pod nadpisem stránky tématu (volitelné). */
    uvod: z.string().optional(),
    klicoveCislo: z
      .object({ hodnota: z.string(), popis: z.string(), zdroj: z.string().optional() })
      .optional(),
    /** odkaz = volitelné id příspěvku s podrobným rozborem návrhu. */
    navrhy: z
      .array(z.object({ nazev: z.string(), text: z.string(), odkaz: z.string().optional() }))
      .default([]),
  }),
});

// Příspěvky: samostatné stránky k tématům (podrobný rozbor návrhu nebo otázky,
// která se do shrnutí tématu nevejde). Nejsou to blogové zápisky, nemají datum.
const prispevky = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prispevky' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Pořadí v rámci tématu (menší číslo = výš). */
      poradi: z.number().default(100),
      tema: reference('temata'),
      perex: z.string(),
      obrazek: image().optional(),
      obrazekPopis: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

// Publikace: převzaté ze stávajícího webu (data/publications/me.yaml).
const publikace = defineCollection({
  loader: file('src/data/publikace.json'),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number(),
    volume: z.string().optional(),
    number: z.string().optional(),
    pages: z.string().optional(),
    doi: z.string().optional(),
    pdf: z.string().optional(),
    type: z.enum(['casopis', 'konference', 'ostatni']),
    vybrana: z.boolean().default(true),
  }),
});

export const collections = { temata, prispevky, publikace };
