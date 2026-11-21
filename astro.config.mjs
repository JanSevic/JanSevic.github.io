// @ts-check
import { defineConfig } from 'astro/config';

// Hlavní doména jansevic.cz; ševic.eu a sevicovi.cz na ni přesměrovávají
export default defineConfig({
  site: 'https://jansevic.cz',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
