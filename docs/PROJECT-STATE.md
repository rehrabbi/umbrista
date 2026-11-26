# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-26.

## 1. Current stage

**Design system.** The repository foundation (Task 0), the app scaffold with CI (Task 1) and the
approved brand (Task 2) are on `develop`, and both `main` and `develop` are protected. The brand
system (Task 3) is merged, and the site shell (Task 4) is in progress on `task/4-kit-shell-routes`.

## 2. Locked decisions

From design section 4 (decided by the owner):

- Invent the brand from scratch: a **night coffee bar that opens at dusk**, in a fictional city.
  Name: **Umbrista**.
- Mood: cinematic and moody. Scope: the full café site.
- Four 3D moments: living background, scroll journey, hero cup, brew-your-own.
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

- Task 4, in progress on `task/4-kit-shell-routes` (not yet merged): the interface kit in `src/ui/`
  (`Button`, `Field`, toasts through `toast(message, {kind})` in `toast-store.ts` with the `Toaster`
  live regions, `HonestyNote`, `SkipLink`, `Nav`, `Footer`, `PageHeading`), the router (React Router,
  declarative `Routes`) in `src/app/routes.tsx` with every page except the landing page loaded lazily,
  `useRouteFocus` (focus moves to the new page's `h1` after in-app navigation, never on first load;
  titles come from `src/app/titles.ts`), `useSmoothScroll` (Lenis, never constructed under reduced
  motion), a stub for every page in `src/pages/`, and the not-found page. `BrowserRouter` is in
  `main.tsx`; tests wrap `App` in a `MemoryRouter`. The end-to-end smoke test now visits every route.

Not yet: any real page content.

## 4. Exact next step

**Finish Task 4**: open the pull request from `task/4-kit-shell-routes` into `develop`, merge it on
green and rename the branch to `merged/task-4-kit-shell-routes`. Check the 16 px favicon in a real
browser tab. Then the next task of the plan. Setting `data-time` on `<html>` from the visitor's clock
is for a later task; until then the site is always night.

## 5. Bring-up on a new machine

`npm ci`, then the scripts in the README. Nothing else to run yet. When the backend exists (plan
Tasks 4 onward) this section will explain the local database, environment variables and how staff
accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. The landing prototype (plan Task 8).
2. Each pull request.
3. The launch: the release from `develop` to `main` and the production deploy.

The design, the plan and the brand board were the first three checkpoints; they are approved and
stay open to the owner's review.
