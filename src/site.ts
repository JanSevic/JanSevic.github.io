// Nastavení webu na jednom místě. Texty v [hranatých závorkách] jsou místa, která je potřeba doplnit.

export const site = {
  name: 'Jan Ševic',
  /** Popis pro vyhledávače a náhledy na sociálních sítích. */
  description: 'Jan Ševic – témata, která řeším, příspěvky a věda.',

  /**
   * Akcentová barva odkazů a drobností.
   * 'vlastni' = tlumená ocelová modrá (výchozí, bez stranické příchuti),
   * 'stan'    = růžová a žlutá hnutí STAN (např. během kampaně).
   */
  akcent: 'vlastni' as 'vlastni' | 'stan',

  /** Úvodní obrazovka: věta pod jménem. */
  intro: '[místo pro text: jedna až dvě věty o tom, kdo jsem a o co mi jde]',

  /** Krátké O mně na úvodní stránce. */
  aboutShort: '[místo pro text: krátký příběh, 3–5 vět]',
  hobbies: '[místo pro text: co mě baví, jedna až dvě věty]',

  /** Jedna věta do medailonku pod příspěvkem. */
  authorLine: '[místo pro text: jedna věta o mně]',

  contact: {
    x: { label: 'X · @Jan_Sevic', url: 'https://x.com/Jan_Sevic' },
    linkedin: { label: 'LinkedIn', url: 'https://www.linkedin.com/in/jan-%C5%A1evic/' },
    // Převzato ze stávajícího webu. Pro politický web zvaž osobní adresu místo pracovní.
    email: 'sevicjan@cvut.cz',
  },
};

export const nav = [
  { label: 'Témata', href: '/temata/' },
  { label: 'Příspěvky', href: '/prispevky/' },
  { label: 'Věda', href: '/veda/' },
  { label: 'O mně', href: '/o-mne/' },
];

export const formatDate = (d: Date) =>
  d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

export const readingTime = (body = '') =>
  Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
