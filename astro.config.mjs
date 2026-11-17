// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { copyFile, readdir } from 'node:fs/promises';

export default defineConfig({
  site: 'https://berlintune.com',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap(),
    {
      name: 'sitemap-xml',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const files = await readdir(dir);
          const chunks = files.filter((file) => /^sitemap-\d+\.xml$/.test(file));
          await copyFile(
            new URL(chunks.length === 1 ? chunks[0] : 'sitemap-index.xml', dir),
            new URL('sitemap.xml', dir),
          );
        },
      },
    },
  ],
});
