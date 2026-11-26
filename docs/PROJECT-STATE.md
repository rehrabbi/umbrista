# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-26.

## 1. Current stage

**Media and 3D.** Task 6 is in progress (see section 3). Tasks 0 to 5 are merged into `develop`: the repository foundation, the app
scaffold with CI, the approved brand, the brand system, the site shell and the two clocks (pull
request #6). Both `main` and `develop` are protected. The owner approved a photoreal direction after a
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

- Task 6, in progress on `task/6-media-3d-foundation` (not merged): the media and 3D foundation.
  `npm run media` (`scripts/media.mjs`, ffmpeg only) builds `public/media/` (AVIF and WebP stills at
  640, 1280, 1920 and 2560 px; the steam loop as VP9 WebM and H.264 MP4 at 1920 and 1280 px; its
  poster) and writes `src/media/manifest.ts`; the masters live in the git-ignored `media-src/`.
  `Picture` and `VideoLoop` read the manifest. `src/scene/`: `SceneHost` (still first, lazy R3F
  canvas after first paint, falls back to the still without WebGL or on `webglcontextlost`),
  `quality.ts` (`tierFrom`, `quality`, `measureFrameTime`; dpr caps 2, 1.5 and 1 by tier) and
  `useSceneActive` (frame loop on demand while hidden, off screen or under reduced motion). The
  landing page is now a lazy route with the street hero (empty scene) and a decorative steam loop.
  The unit-test helper `src/test/intersection.ts` fakes IntersectionObserver.

Not yet: any real page content.

## 4. Exact next step

**Finish Task 6** (pull request into `develop`, merge on green, archive the branch as
`merged/task-6-media-3d-foundation`), then Task 7. Still open from earlier tasks: check the 16 px
favicon in a real browser tab.

## 5. Bring-up on a new machine

`npm ci`, then the scripts in the README. Nothing else to run yet, except that `npm run media` needs
the masters in `media-src/` and `ffmpeg`; the committed derivatives are enough to run the site. When the backend exists (plan
Tasks 4 onward) this section will explain the local database, environment variables and how staff
accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. The landing prototype (plan Task 8).
2. Each pull request.
3. The launch: the release from `develop` to `main` and the production deploy.

The design, the plan and the brand board were the first three checkpoints; they are approved and
stay open to the owner's review.
