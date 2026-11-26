# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-26.

## 1. Current stage

**Brand.** The repository foundation (Task 0) and the app scaffold with CI (Task 1) are on
`develop`, and both `main` and `develop` are protected. Next is the brand board (Task 2), an owner
checkpoint.

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

Not yet: any feature of the site.

## 4. Exact next step

**Task 2: the brand board**, on `task/2-brand-board` from `develop`. Explore three logo directions,
two palettes, two type pairings, three city names and a price format; lay them out on one board
(`docs/brand/board.html`) and open it for the owner. The owner's choices go into `docs/brand.md`
and the learning log. Any generated mood frame needs the owner's go first, asset by asset. Task 3
does not start until the owner approves the board.

ired checks from Task 1 exist.

## 5. Bring-up on a new machine

`npm ci`, then the scripts in the README. Nothing else to run yet. When the backend exists (plan
Tasks 4 onward) this section will explain the local database, environment variables and how staff
accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. The brand board (plan Task 2).
2. The landing prototype.
3. Each pull request.
4. The launch: the release from `develop` to `main` and the production deploy.

The design and the plan are the first two checkpoints; they are written and stay open to the
owner's review.
