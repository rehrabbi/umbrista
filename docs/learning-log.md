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

## 2026-11-26: The brand board

**Decided.** From one board of options, the owner chose Logo A (a cup throwing a long shadow),
Palette 1 (navy ink with sodium-lamp orange), Type 1 (Big Shoulders Display with Atkinson
Hyperlegible Next) and the city of Calvessa. The invented currency, the voice rules and the motion
principles were approved with the board. The full values are in `docs/brand.md`.

**Why a board instead of one proposal.** Choosing between real options side by side, at real sizes
and in combination, is faster and more honest than reacting to a single design. The board's mock
first frame let each combination be seen in place; it is a flat sketch for that purpose, not the
landing page, which is built in 3D from Task 6 on.

**What to remember.**

- A mark has to be judged at 16 real pixels, not scaled down in the head. The board rasterised each
  favicon to a 16 x 16 canvas and enlarged it, pixelated, to show what a browser tab really shows.
  The chosen mark is the quietest of the three at that size, so its favicon gets a second look in a
  real tab before launch.
- Contrast ratios are computed with the WCAG relative-luminance formula, never estimated by eye.
- An invented currency, written as a word, keeps the prices from reading as a real offer.
- The city is invented but sits on real coordinates in a real time zone, so its sunset, and the
  café's opening time, can be computed for any day.

## 2026-11-26: Two clocks

**Decided.** The scene and the café keep separate clocks. The scene follows the visitor's own dusk,
guessed from the time zone (longitude from the offset, latitude fixed at 30 degrees), and is night
until 06:00 local. The café's hours belong to Calvessa: sunset from the NOAA solar equations, close at
03:00 in `Europe/Lisbon`. `shared/hours.ts` has no imports so the server can reuse it.

**What to remember.**

- Sunset is checked against published tables (timeanddate.com) within three minutes, for three places,
  plus a polar case that must return `null`. A formula that looks right is not evidence.
- "Tonight" does not change at midnight. At 01:30 café time the night that began yesterday is still
  the one in use, so `cafeNight` moves to the new date at 03:00.
- Lisbon changes its clocks at 01:00 UTC, so 03:00 local is never skipped or repeated, but it is
  02:00 UTC on one night and 03:00 UTC on another. Never add hours to a UTC date; ask `Intl` for the
  zone's offset at that instant, and test both change nights.
- The visitor's offset can be anything from -12 h to +14 h, with half and quarter hours. The estimate
  must always return a valid time and never throw.
- A visitor's choice that must not outlive the page lives in a small in-memory store read with
  `useSyncExternalStore`, so every component sees the same value and nothing touches storage.

