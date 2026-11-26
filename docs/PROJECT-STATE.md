# Project state

The resume-here snapshot. Read [`WAYS-OF-WORKING.md`](WAYS-OF-WORKING.md) first.

Last updated: 2026-11-26.

## 1. Current stage

**Setup.** The design and plan are written; the repository foundation (Task 0) is committed
locally. There is no app code yet.

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

Not yet: the GitHub repository, the `develop` branch, any app code.

## 4. Exact next step

1. The owner (or the builder, on the owner's go) creates the public repository `rehrabbi/umbrista`
   from this local history, sets its description and topics, enables secret scanning and push
   protection, sets merge commits only, and creates `develop` (the rest of Task 0).
2. **Task 1: the app scaffold and CI**, on `task/1-scaffold` from `develop`, as one pull request
   into `develop`.
3. Then **branch protection** on `main`, once the required checks from Task 1 exist.

## 5. Bring-up on a new machine

Nothing to run yet. When the backend exists (plan Tasks 4 onward) this section will explain the
local database, environment variables and how staff accounts are created from the command line.

## 6. Owner checkpoints still ahead

1. The brand board (plan Task 2).
2. The landing prototype.
3. Each pull request.
4. The launch: the release from `develop` to `main` and the production deploy.

The design and the plan are the first two checkpoints; they are written, and the owner's approval
of them is recorded in the learning log when given.
