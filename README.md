# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm start`               | Serve the Node production build (uses `HOST` and `PORT`) |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Agent discovery and deployment

The site requires the Node production server (`npm run build`, then `npm start`), not
just the static files in `dist/client`. The homepage negotiates Markdown and exposes
Link headers; `/mcp` is a public, read-only MCP endpoint. Configure Hostinger to run
the start command and forward traffic to the Node process.

The sitemap is generated during the build. Update `public/llms.txt` and
`src/site-info.ts` when the site's key pages or studio information change. The
content-use preference is recorded in `public/robots.txt` and on `/legal/`; keep
them consistent if the policy changes.

After building, run `node --test tests/agent-readiness.test.mjs` to check the
production server and agent-facing endpoints locally.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
