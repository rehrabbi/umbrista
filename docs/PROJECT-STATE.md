# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-26.

## 1. Current stage

**Landing prototype, an owner checkpoint.** Task 8 is built on `task/8-landing-prototype`
(committed locally, not pushed, no pull request yet; see section 3) and waits for the owner to judge
the feel. Tasks 0 to 7 are merged into `develop`: the repository foundation, the app scaffold with
CI, the approved brand, the brand system, the site shell, the two clocks (pull request #6), the media
and 3D foundation (pull request #8) and the living background (pull request #10). Both `main` and `develop` are protected. The owner approved a photoreal direction after a
look-development round (ADR 0002); the design and plan are amended for it.

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

- Task 8, on `task/8-landing-prototype` (local commits only): the landing's first scroll chapter.
  - `src/scene/journey/chapters.ts`: `Chapter` and `CHAPTERS` (dusk, cup, craft, window, last cup,
    with titles and lines in the voice). Only chapter 1 is rendered; the cup's and the last cup's
    stills are placeholders, and every `camera` is a placeholder until Task 9. Journey progress counts
    chapters (`chapterAt`); `OPENING` holds chapter 1's beats and `lampAt` the lamps' rise.
  - `src/scene/journey/progress.ts`: the journey progress, a small store outside React, so a scroll
    frame re-renders only the scene inside the canvas. `Journey({ progress })` draws the living
    background with the lamp for that progress.
  - `LivingBackground` takes `lamp` (0..1, default 1) for the new `uLamp` uniform: the café window's
    light (red first, then orange, as sodium strikes) and the glow's strength. It is a chapter's
    progress, never a clock; `uNight` is untouched. At 1 the scene is exactly as before. The cover
    crop now follows the still's `object-position` (the landing uses `35% 50%`, so the café window
    stays on a phone screen). The shader compiles in the background (three's `compileAsync`, only
    where `KHR_parallel_shader_compile` exists), keyed by shader variant per canvas.
  - The landing (`src/pages/Landing.tsx`): chapter 1 is a tall section whose stage is CSS-sticky
    (the pin); one ScrollTrigger reads its progress (`src/pages/landing/openingScroll.ts`, loaded
    on idle or on the first scroll intent, never on the critical path). The lamps follow the scroll
    exactly; the title is a cue: past `OPENING.titleAt` its letters rise one by one on
    `--ease-settle` over `--dur-chapter`, and sink back faster above it. `--lamp` is set on the scene
    host and the scroll cue only, and dims the still underneath while there is no canvas.
    `KineticTitle` (`src/pages/landing/`) keeps the phrase as visually hidden text and the letters
    `aria-hidden`. The h1 is "Umbrista" plus the promise. Under reduced motion there is no pin, no
    ScrollTrigger and no GSAP: the title is whole, the lamps are on, and later chapters fade in.
  - `src/scroll/useSmoothScroll.ts` has a frame driver (`driveWith`) and scroll listeners
    (`onSmoothScroll`); `src/scroll/scrollTrigger.ts` hands Lenis to GSAP's ticker and updates
    ScrollTrigger on every Lenis scroll. One Lenis, one loop.
  - `VideoLoop` asks for its poster only near the screen. `vite.config.ts` preloads the three
    first-screen font files (the swap had shifted the large title).
  - `lighthouserc.json` and the CI job "Lighthouse budget" (`npx lhci autorun` against
    `vite preview`, mobile preset, `/`): performance at least 0.9, LCP at most 2.5 s, CLS at most
    0.05, median of three runs. The new job is not yet a required check on `develop`.
  - End-to-end: `e2e/landing-chapter.spec.ts`.

Not yet: the rest of the journey, the hero cup, and any real page content beyond the landing.

## 4. Exact next step

**Show the owner Task 8** in the browser pane (desktop and phone size, day and night, and once with
reduced motion), record the verdict on the feel in the learning log, and change what they ask for.
Only after their approval: push `task/8-landing-prototype`, open the pull request into `develop`,
merge on green, archive the branch as `merged/task-8-landing-prototype`, and add "Lighthouse budget"
to `develop`'s required checks (a repository setting, the owner's call). Do not start Task 9 before
the approval. Still open from earlier tasks: check the 16 px favicon in a real browser tab.

## 5. Bring-up on a new machine

`npm ci`, then the scripts in the README. Nothing else to run yet, except that `npm run media` needs
the masters in `media-src/` and `ffmpeg`; the committed derivatives are enough to run the site. When the backend exists (plan
Tasks 4 onward) this section will explain the local database, environment variables and how staff
accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. The landing prototype (plan Task 8): built, waiting for the owner's verdict.
2. Each pull request.
3. The launch: the release from `develop` to `main` and the production deploy.

The design, the plan and the brand board were the first three checkpoints; they are approved and
stay open to the owner's review.
