# Umbrista

An invented night café and its website, built as a portfolio piece.

The name joins *umbra* (shadow) and *barista*: the barista of the shadows. Umbrista is a night
coffee bar that opens at dusk in a fictional city, for the people who come alive when the city
goes quiet: rain on glass, moonlight, steam glowing under warm lamps.

The site sets out to show three things at once:

- **Craft.** A cinematic, interactive site with real-time 3D: a living background, a scroll
  journey through the café's night, a hero cup to play with, and a brew-your-own configurator.
- **Engineering.** Fast, accessible and secure, with a real backend, tests and a professionally
  run repository.
- **Originality.** Nothing that looks generated, templated or like every other coffee site.

## Status

**In development.** The design, the plan, the repository foundation, the app scaffold with CI, the
brand and the site shell (navigation, footer, a page for every route) are done. The two clocks (the
visitor's dusk with a "See it at night" switch, and the café's hours in café time) are built and in
review. The media and 3D foundation is in progress: responsive photographs, silent video loops and a
WebGL host that falls back to the photograph. Pages are mostly stubs: there is no live site yet. Next
is the 3D landing prototype.

## Running it

You need Node 24 (see [`.nvmrc`](.nvmrc)).

```bash
npm ci                            # install exactly what package-lock.json says
npm run dev                       # development server with hot reload
npm run build                     # type check, then build to dist/
npm run preview                   # serve the built site locally
npm test                          # unit tests (Vitest)
npm run lint                      # oxlint
npm run media                     # rebuild public/media/ and src/media/manifest.ts from the local masters (needs ffmpeg)
npm run typecheck                 # tsc -b
npx playwright install chromium   # once, then:
npm run e2e                       # end-to-end smoke test (Playwright)
```

## Media

The photoreal stills and the steam loop are generated from Umbrista's own briefs. Only web derivatives
are committed, in `public/media/` (AVIF and WebP stills at four widths, a WebM and MP4 loop with a
poster) and described by the generated `src/media/manifest.ts`. The full-size masters are not in the
repository: keep local copies in `media-src/` (git-ignored) and run `npm run media` to rebuild the
derivatives. It needs `ffmpeg` on your PATH, skips files that already exist, and rebuilds everything
with `npm run media -- --force`. The output is deterministic, so a rebuild leaves `git status` clean.

## Planned stack

- Vite, React and TypeScript, with React Router.
- Three.js through React Three Fiber and drei, with custom GLSL shaders.
- GSAP ScrollTrigger and Lenis for scroll choreography; Motion for interface motion.
- Vercel serverless functions in TypeScript in front of Neon Postgres.
- Vitest, Testing Library and Playwright for tests; GitHub Actions for CI.

The reasoning is recorded in [ADR 0001](docs/adr/0001-stack-and-3d-approach.md).

## A design project, not a real café

Umbrista is fictional: there is no café, no coffee and no delivery. The forms (reserve a table,
order ahead, join the list) save real data so the backend is real, but nobody will serve you, and
the site says so on every page and in every confirmation. There are no payments, no analytics and
no trackers.

## Project documents

- [Design](docs/specs/2026-11-26-umbrista-design.md): what is being built and why.
- [Plan](docs/plans/2026-11-26-umbrista.md): the tasks, in order.
- [Ways of working](docs/WAYS-OF-WORKING.md): the working agreement and branch model.
- [Project state](docs/PROJECT-STATE.md): where things stand and the exact next step.
- [Contributing](CONTRIBUTING.md), [Security](SECURITY.md), [Code of conduct](CODE_OF_CONDUCT.md)
  and the [Changelog](CHANGELOG.md).

## Licence

[MIT](LICENSE), copyright 2026 Jireh Rabbi R. Bernardo.
