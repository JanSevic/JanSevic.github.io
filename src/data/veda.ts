// Obsah stránky Věda kromě publikací (ty jsou v publikace.json).

export const veda = {
  uvod: '[místo pro text: čemu se věnuji ve výzkumu a výuce, 1–2 věty]',

  profily: [
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=p8iF3LwAAAAJ&hl=cs' },
    { label: 'ORCID', url: 'https://orcid.org/0009-0004-2313-7373' },
    { label: 'GitHub', url: 'https://github.com/JanSevic' },
    { label: 'Pracoviště (IID CIIRC ČVUT)', url: 'https://iid.ciirc.cvut.cz/' },
  ],

  oblasti: [
    { nazev: '[Oblast výzkumu 1]', popis: '[místo pro text: krátký popis srozumitelný i laikovi]' },
    { nazev: '[Oblast výzkumu 2]', popis: '[místo pro text: krátký popis srozumitelný i laikovi]' },
    { nazev: '[Oblast výzkumu 3]', popis: '[místo pro text: krátký popis srozumitelný i laikovi]' },
  ],

  predmety: [
    { kod: '[KÓD]', nazev: '[Název předmětu]', semestr: '[semestr]', role: '[přednášky / cvičení]', url: '' },
    { kod: '[KÓD]', nazev: '[Název předmětu]', semestr: '[semestr]', role: '[přednášky / cvičení]', url: '' },
  ],

  prace: [
    { student: '[Jméno studenta]', nazev: '[Název práce]', typ: '[bakalářská / diplomová]', rok: '[rok]', stav: '[probíhá]' },
  ],
};
