// @ts-check
import { defineConfig } from 'astro/config';

// ševic.eu = xn--evic-f6a.eu (punycode)
export default defineConfig({
  site: 'https://xn--evic-f6a.eu',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
