# Umbrista learning log

A running record of decisions, why they were made, and what was learned. Newest entries at the
bottom. Each entry: what was decided, why, and what to remember.

---

## 2026-11-26: Choosing the concept

**Decided.** An invented night coffee bar that opens at dusk, named Umbrista (*umbra*, shadow, plus
*barista*), with a full café website as a portfolio piece.

**Why.** The owner wanted a site that proves three things at once: craft (cinematic, interactive,
real-time 3D at the level of two reference reels studied that day), engineering (fast, accessible,
secure, with a real backend and tests, run like SentinelOps), and originality (nothing that looks
generated or like every other coffee site). A café is a familiar business, so the work can go into
the experience rather than explaining the product. Setting it at night gives a distinctive mood and
a palette that avoids coffee-brown clichés: deep blues and inks, one warm lamp colour, crema used
sparingly.

**Choices made along the way.**

- The brand is invented from scratch, in a fictional city, so no real business or trademark is
  involved. The name was checked for existing cafés and trademarks on 2026-11-26.
- All four 3D moments were chosen: a living background, a scroll journey, a hero cup to play with,
  and a brew-your-own configurator.
- The forms save real data, so the site says in a persistent note, and in every confirmation, that
  Umbrista is a design project and not a real café.
- The scene follows the visitor's local clock instead of a fixed time, with a switch to see it at
  night, while the café's own hours belong to the fictional city.
- Staff view with a safe demo: reviewers can try it without a password, but a separate database role
  keeps them away from real data.

**Remember.** The reference work sets the level, never the look: no gates, moons-as-logos or jets.

## 2026-11-26: A repository without attribution traces

**Decided.** No commit, pull request, file, comment or document in this repository mentions the
tools used to help write it, and commits carry no attribution trailers. The working agreement is
written tool-neutral, in terms of two roles: the builder, who writes and explains the code, and the
owner, who reviews pull requests and approves checkpoints.

**Why.** The owner wants the project to stand on what it is and on what they can explain. Keeping
attribution out of the history from the first commit is far easier than rewriting it later, and
rewriting history is something the working agreement forbids without the owner's say.

**Practice.** Tool-specific instruction files stay out of the repository (they are git-ignored), and
the checks before a commit include a search of the docs and the commit messages for such mentions.

## 2026-11-26: The scaffold and the seven checks

**Decided.** The app starts as a plain Vite, React 19 and TypeScript project on Node 24, installing
only what the first task uses; the 3D, scroll and form libraries arrive with the tasks that need
them. CI runs four jobs (lint and types, unit tests, build, Playwright end-to-end) and a security
workflow runs three (CodeQL, `npm audit`, gitleaks). All seven become required checks on `main` and
`develop`.

**Why.** A small first dependency tree is quick to audit, and every later addition shows up as its
own reviewed change. Required checks only work once they exist and have passed at least once, so
protection comes after this task merges rather than before.

**What to remember.**

- Every GitHub Action is pinned to a full commit SHA with its version in a comment. A tag can be
  moved; a commit cannot. Annotated tags have to be dereferenced to find the commit they point at.
- gitleaks runs as a release binary checked against the release's checksum file, not as an Action.
- Every job has a time limit, so a hung run fails in minutes instead of GitHub's six-hour default.
- A test that proves "state resets between tests" needs two tests: one that changes the state and a
  later one that checks the defaults. A single test can't catch a missing reset.
