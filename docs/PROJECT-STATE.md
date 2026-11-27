# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-27.

## 1. Current stage

**Task 9b, the drink models**, built on `task/9b-drink-models` (pushed, no pull request yet; see
section 3), waiting for review. Tasks 0 to 9 are merged into `develop`; Task 9, the landing
complete and the hero cup, is pull request #12. Both `main` and `develop` are
protected. The owner approved a photoreal direction (ADR 0002), and on 2026-11-27 decided the
landing's order and hero (section 2).

## 2. Locked decisions

From design section 4 (decided by the owner):

- Invent the brand from scratch: a **night coffee bar that opens at dusk**, in a fictional city.
  Name: **Umbrista**.
- Mood: cinematic and moody. Scope: the full café site.
- Four 3D moments: living background, scroll journey, hero cup, brew-your-own, on a **photoreal**
  base: generated stills, loops and a 3D cup under live WebGL effects ([ADR 0002](adr/0002-photoreal-media.md)).
- A **3D menu** (owner, 2026-11-26): a 3D counter plus a scroll-through bar, every drink its own
  generated model (plan Task 9b, each on the owner's go); the landing cup transforms on scroll.
- Visitor actions: reserve a table, order ahead for pickup, join the list, just explore. Forms save
  to a real, free backend.
- Repository: public, `rehrabbi/umbrista`, MIT licence. Hosting: Vercel. Database: Neon Postgres,
  free plan, the owner's personal account.
- The scene follows the visitor's own local time (device clock, no location prompt), with a
  "See it at night" switch.
- Data requests go through a GitHub issue; no email is published.
- A staff view for the owner's staff accounts and for demo users, who never see real data.
- No deadline: build the whole site, then launch once as v1.0.0.
- **The landing** (owner decisions, 2026-11-27): the hero is the craft, full screen (the crema and
  its steam film edge to edge, the promise, the opening time and the actions low and left over a
  scrim; its poster is the page's one priority image and LCP); the chapters then run the cup under
  the lamp (the 3D cup, transforming), dusk on the street (the living background, the lamps coming
  on), the window, the last cup. Every chapter's photograph or film is full-bleed, never a boxed or
  rounded card. The 3D starts later: on the visitor's first intent, or after five quiet seconds once
  the page has loaded. The Lighthouse budget stays green.
- Workflow as in section 3 of [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md).

Stack (design section 5, [ADR 0001](adr/0001-stack-and-3d-approach.md)): Vite, React, TypeScript,
React Router; Three.js with React Three Fiber, drei and custom GLSL; GSAP ScrollTrigger, Lenis and
Motion; Vercel functions with Neon Postgres; Vitest, Testing Library and Playwright.

## 3. What is built

- The design: `docs/specs/2026-11-26-umbrista-design.md`.
- The plan: `docs/plans/2026-11-26-umbrista.md`.
- Governance: README, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE, this file,
  the learning log, ADR 0001, GitHub issue and pull request templates, CODEOWNERS.

- Task 1, merged into `develop` (pull request #1): the Vite, React 19 and TypeScript app (a single
  page with a `main` landmark), Vitest with jsdom and Testing Library (test helpers `setMatchMedia`
  and `setWebGL` in `src/test/setup.ts`), a Playwright smoke test, oxlint, and the GitHub Actions
  workflows `ci.yml` (Lint and types, Unit tests, Build, End-to-end) and `security.yml` (CodeQL,
  npm audit, gitleaks), with every action pinned by commit SHA.
- The GitHub repository `rehrabbi/umbrista`: public, merge commits only, secret scanning with push
  protection, private vulnerability reporting, Dependabot security updates, and the labels
  `type: fix`, `type: feat` and `type: data-request`.
- Branch protection on `main` and `develop`: pull requests required, the seven checks above
  required and up to date, conversations resolved, administrators included, no force pushes or
  deletions.

- Task 2, the brand board (`docs/brand/board.html`, options in `docs/brand/explorations/`), approved
  by the owner: Logo A "Long shadow", Palette 1 "Sodium", Type 1 "Signage", the city of Calvessa,
  prices in crowns. The values are in `docs/brand.md`.

- Task 3, merged into `develop`: the design tokens
  (`src/styles/tokens.css`, night on `:root`, day under `[data-time="day"]`), `base.css`, self-hosted
  fonts (`src/styles/fonts.ts`), `src/brand/geometry.ts` and the `Logo` component (mark, wordmark,
  lockup; the wordmark is outlined by `npm run wordmark`), every icon and the link preview image from
  `npm run icons`, the web manifest, the favicon and social metadata in `index.html`, and the final
  logo files in `docs/brand/`. Tests: `tokens.test.ts` (hex values and contrast), `Logo.test.tsx`,
  `brand-assets.test.ts`.

- Task 4, merged into `develop` (pull request #5): the interface kit in `src/ui/`
  (`Button`, `Field`, toasts through `toast(message, {kind})` in `toast-store.ts` with the `Toaster`
  live regions, `HonestyNote`, `SkipLink`, `Nav`, `Footer`, `PageHeading`), the router (React Router,
  declarative `Routes`) in `src/app/routes.tsx` with every page except the landing page loaded lazily,
  `useRouteFocus` (focus moves to the new page's `h1` after in-app navigation, never on first load;
  titles come from `src/app/titles.ts`), `useSmoothScroll` (Lenis, never constructed under reduced
  motion), a stub for every page in `src/pages/`, and the not-found page. `BrowserRouter` is in
  `main.tsx`; tests wrap `App` in a `MemoryRouter`. The end-to-end smoke test now visits every route.

- Task 5, merged into `develop` (pull request #6): the two clocks. `shared/hours.ts` is
  pure and has no imports (the server reuses it): `CAFE`, `sunset` (NOAA solar position, null only
  for polar day or night), `cafeNight`, `openingWindow` and `isOpen`, all in café time through `Intl`.
  `src/time/useNight.ts` is the scene's clock: the visitor's dusk estimated from the time zone (no
  location prompt); night runs from that dusk until 06:00 local. The "See it at night" override lives
  in memory in `src/time/night-store.ts`. `TimeOfDay`, mounted in `App`, sets `data-time` on `<html>`.
  `NightSwitch` is in the navigation; `OpeningTime` is on the landing and Visit pages.

- Look development (not code; ADR 0002): six generated assets approved and listed in
  `docs/brand.md`: the Calvessa street at dusk, the rain window, the crema macro, its 1080p steam loop,
  the studio cup still and the cup's 3D model. The design and the plan are amended for the photoreal
  direction. The masters stay in Higgsfield; the owner's local copies are in the git-ignored
  `.superpowers/lookdev/`, and Task 6 commits the web derivatives.

- Task 6, merged into `develop` (pull request #8): the media and 3D foundation.
  `npm run media` (`scripts/media.mjs`, ffmpeg only) builds `public/media/` (AVIF and WebP stills at
  640, 1280, 1920 and 2560 px; the steam loop as VP9 WebM and H.264 MP4 at 1920 and 1280 px; its
  poster) and writes `src/media/manifest.ts`; the masters live in the git-ignored `media-src/`.
  `Picture` and `VideoLoop` read the manifest. `src/scene/`: `SceneHost` (still first, lazy R3F
  canvas after first paint, falls back to the still without WebGL or on `webglcontextlost`),
  `quality.ts` (`tierFrom`, `quality`, `measureFrameTime`; dpr caps 2, 1.5 and 1 by tier) and
  `useSceneActive` (frame loop on demand while hidden, off screen or under reduced motion). The
  landing page is now a lazy route with the street hero (empty scene) and a decorative steam loop.
  The unit-test helper `src/test/intersection.ts` fakes IntersectionObserver.

- Task 7, merged into `develop` (pull request #10): the living background on the landing hero. `src/scene/background/`: `uniforms.ts` (pure and tested:
  pointer easing, night stepping over `--dur-scene`, tier to layer config, `coverUv` for the
  `object-fit: cover` crop, parallax, scroll progress, width picking), `rain-glass.frag.glsl` (drops,
  runnels and beads that refract the photo, light mist between them), `glow.frag.glsl` (the sodium
  lamp and the dusk-to-night grade), and `LivingBackground` (one full-screen quad; the texture is an
  ImageBitmap copy of the still's own `<img>`, so there is no second download, in sRGB with tone
  mapping off; textures are cached for the page and only disposed on unmount, so remounts never
  suspend again; a still frame under reduced motion). Tiers: low has no rain, mid one drop size and a one-tap mist, high two sizes and a
  four-tap mist. `SceneHost` now shares its tier through `useSceneQuality` (`scene-quality.ts`). The
  canvas carries `data-backdrop="ready"` and `data-tier` once drawn. `SceneHost` keeps the still and
  mounts no canvas on a software renderer (`failIfMajorPerformanceCaveat`, plus
  `isSoftwareRenderer` in `quality.ts` on the unmasked renderer name). Test-only window flags, set by
  Playwright through `e2e/software-gl.ts`: `umbristaTestAllowSoftwareGL`, `umbristaTestTier` and
  `umbristaTestIntensity`; CI's SwiftShader needs the first for every canvas test. End-to-end tests:
  `e2e/living-background.spec.ts`.

- Task 8, merged into `develop` (pull request #11): the scroll journey's machinery. `chapters.ts`
  (`CHAPTERS`, `chapterAt`, the lamps' rise), the journey progress store (`progress.ts`), the
  living background's `uLamp` (the lamps coming on, a chapter's progress, never a clock; `uNight`
  stays the visitor's clock), the CSS-sticky pin with ScrollTrigger reading progress, `KineticTitle`,
  one Lenis on GSAP's ticker on one clock (`src/scroll/`), preloaded first-screen fonts, and the
  Lighthouse budget in CI ("Lighthouse budget": performance at least 0.9, LCP at most 2.5 s, CLS at
  most 0.05, median of five runs, mobile preset, `/`; CI has no GPU, so it measures the page without
  its canvas).

- Task 9, merged into `develop` (pull request #12): the landing complete and the hero cup.
  - **The order** (owner decision 2026-11-27): `CHAPTERS` is craft, cup, dusk, window, last cup.
    Journey progress counts chapters; a chapter is halfway when its middle is at the middle of the
    screen. `orbitAt` is the cup's camera path; `lampsAt` the street's lamps.
  - **The hero** (`src/pages/Landing.tsx`): the steam loop's poster through `Picture` (priority),
    the film over it on the first intent (`VideoLoop` with `poster={false}`, faded in when it
    plays), the h1 "Umbrista" plus the promise rising letter by letter in CSS (`KineticTitle rise`,
    25 ms apart over `--dur-chapter`), the lede, `OpeningTime`, "Reserve a table" and "See the menu".
  - **The cup's stage** (`src/pages/landing/CupStage.tsx`): sticky across chapters 2 to 5, over them,
    the cup on the right on a wide screen and above the copy on a phone. A `SceneHost` with the cup's
    still (`swap`: the still steps aside once the live cup has faded in), `near` and `deferStill`,
    and the drag surface. `journeyScroll.ts` (lazy, with GSAP) has one ScrollTrigger per chapter
    and writes the journey progress and `--lamp`. Under reduced motion, or if it cannot load, each
    chapter is a still (an IntersectionObserver sets the chapter's midpoint).
  - **The cup** (`src/scene/cup/`): `useCupModel` (the compressed glTF through drei's `useGLTF`
    with three's bundled meshopt decoder; it measures the rim, the coffee's height, the wall, the
    seat and the handle), `HeroCup` (a sodium spot key with a shadow, a cool fill and rim, a room
    built in code for reflections, the night grade stepped from `useNight`; programs compile in the
    background and textures go up one a frame before the first draw), `liquidSurface` (the coffee's
    disc with a meniscus, and its physical material showing the three photographed surfaces
    (crema, milk bloom, rosetta; owner decision 2026-11-27), cross-faded, graded, aged live for the
    last cup, lit by the scene and rippled by a splash), `liquidLook` (the coffee for a progress), `physics` (tilt,
    spin, slosh), `CupControls` (buttons, arrow keys, the drag surface), `cupInput` (page to
    scene).
  - **The foot gap** is closed in the scene by a seat disc (see `docs/brand.md`).
  - **Start the 3D later** (`src/scene/gate.ts`): no WebGL context, no GSAP, no hero film and no
    picture below the first screen until the first intent or five quiet seconds after load; each canvas fades in over its still once its scene has drawn
    (`useSceneReady`).
  - **The hero's poster is preloaded** from the HTML on `/` only, by a small head script that
    `vite.config.ts` adds at build (srcset and sizes are the picture's own, from `src/media/srcset.ts`).
  - **Scripts:** `npm run models` (list-driven, `scripts/models.mjs`), `npm run cup-still`
    (`scripts/cup-still/`), and `npm run media` keeps a still's transparency.

- Task 9b, on `task/9b-drink-models`: the eight menu drinks as web 3D models (Drink 1, Last Tram,
  reuses the cup). `npm run models` builds each twice from its master in `media-src/drinks/`:
  `public/models/drinks/<id>.glb` for the bar (at most 1.5 MB; textures at 2048 px for Fog Line,
  1024 for the rest) and `<id>-lite.glb` for the counter (at most 400 KB; 512 px textures and
  meshopt-simplified geometry). Sizes, triangle counts and sha256 are in `docs/brand.md`. The
  script builds one model at a time on one image thread and takes model names
  (`npm run models -- fog-line lantern`). Night Ferry and Low Tide read frosted: no baked glass.

Not yet: the menu, and any real page content beyond the landing.

## 4. Exact next step

**Review Task 9b**: open the pull request for `task/9b-drink-models` into `develop`, let CI run,
merge on green, archive the branch as `merged/task-9b-drink-models`. Then **Task 10, the menu**
(the 3D bar and counter, and the cart; plan Task 10): `useDrinkModel(id, 'full' | 'lite')` loads
`public/models/drinks/<id>.glb` or `<id>-lite.glb`; Night Ferry and Low Tide may need a glass
material. "Lighthouse budget" is a required check on `main` and
`develop` (the owner, 2026-11-27). Still open for the Content Security Policy when `vercel.json`
arrives: `'wasm-unsafe-eval'` in `script-src` for the meshopt decoder, and the sha256 of the one
inline script in `index.html` (the hero poster's preload on `/`, added at build by
`vite.config.ts`). Also the 16 px favicon in a real browser tab.

## 5. Bring-up on a new machine

`npm ci`, then the scripts in the README. Nothing else to run yet, except that `npm run media` needs
the masters in `media-src/` and `ffmpeg`; the committed derivatives are enough to run the site. When the backend exists (plan
Tasks 4 onward) this section will explain the local database, environment variables and how staff
accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. Each pull request.
2. The launch: the release from `develop` to `main` and the production deploy.

The design, the plan, the brand board and the drink models (the list, then each drink on its own go) were the first four checkpoints; they are approved and
stay open to the owner's review.
