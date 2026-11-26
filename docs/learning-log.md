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

## 2026-11-26: Going photoreal

**Decided.** The site's visuals are photoreal, at the level of the reference reels: generated
stills, a generated steam loop and a generated 3D cup, with live WebGL effects layered over them. The
owner chose this after seeing the first code-drawn mock-up of the landing page and saying it should
look real. ADR 0002 records the decision; `docs/brand.md` lists every generated asset.

**How it was decided.** A short look-development round, each asset on the owner's go: four
photoreal stills, an original cup modelled in Blender, a draft and then a 1080p steam loop, and a 3D
model of the cup made from one of the stills. A throwaway preview put them together as a landing
page, and the owner approved that direction.

**What to remember.**

- Judge visuals in place, not in isolation. The preview answered in minutes what a list of options
  could not.
- A clip loops cleanly when the same still is both its first and last frame; check the seam by
  comparing the first and last frames numerically.
- Generators may deliver HEVC video, which not every browser plays. Re-encode to VP9 WebM and H.264
  MP4, and keep a poster for reduced motion.
- Image-to-3D failed instantly on a 4096 px, 22 MB source and succeeded on a 1024 px copy. Failed jobs
  were not charged.
- Hosted Blender renders have a time limit: apply changes and render in separate steps, and keep
  preview renders small.
- A model's back and underside are guesses when it comes from one photo; check it from every angle
  before using it.

## 2026-11-26: Rain on glass, over a photograph

**Decided.** The landing's living background is one full-screen shader over the street photograph,
written for Umbrista: the photo is the world outside, the shader is the window. Rain refracts the
photo, a sodium lamp follows the pointer, the street recedes on scroll, and a grade moves between
overcast dusk and lamp-lit night. The pure parts (easing, the night step, the tiers, the crop) live
in `uniforms.ts` and were tested first; the first green run caught pointer easing landing a rounding
error past its target, now clamped.

**What makes rain on glass read as real.**

- Drops are lenses, not decorations. Each one shows a sharp, flipped view of the street, sampled from
  the opposite side of the drop, so it carries the photo's own colours.
- The edge sells it: a dark rim, heaviest along the thin top, and a faint bright crescent inside the
  bottom where focused light lands. A uniform ring makes soap bubbles instead.
- Big drops stick, then slip in short runs along a wandering path, stretching while they move. They
  wipe the mist in a narrow wake and leave beads at fixed places on the glass; the small droplets they
  pass are swallowed.
- Sizes are mostly tiny with a few full ones. Evenly sized droplets read as a polka-dot pattern.
- Restraint matters more than detail. Heavy mist, a big bloom around the window, and orange glints on
  every droplet each looked like a filter. What stayed: light mist that is thinnest over the lit
  window, glints only on drops big enough to hold one, warm light that spares surfaces already
  bright, and a hue-preserving roll-off so the window stays orange instead of clipping to white.
- Judge the look under the page's scrim, not only on the bare canvas. An overexposed window that
  glowed on its own turned muddy and blue-grey under the navy scrim.

**The cover-crop match.** The still uses `object-fit: cover`, centred. `coverUv(viewAspect,
imageAspect)` reproduces that crop as a UV scale and offset; the texture is the very file the still
loaded (its `currentSrc`, so it comes from the cache); its colour space is sRGB, tone mapping is off,
and the shader encodes its output back to sRGB. With the effect at intensity 0 the canvas and the
still differ by about 1 level in 255 on average, at 1440 px and on a 390 px phone screen. The
end-to-end test compares the two with each image normalised, so the grade cancels out but a shifted
or rescaled photo does not.

**Performance tiers.** Low draws the photo, the lamp and the grade, with no rain. Mid adds one size of
sliding drop and the droplets, with a one-tap mist. High adds a second, smaller drop size and a
four-tap mist. On a desktop GPU every tier holds 60 fps, also with the CPU throttled four times.
Headless Chromium's software renderer (SwiftShader) is a different world: any full-screen drawing
costs it 45 to 140 ms a frame, even a single texture lookup, while an empty canvas runs at 60 fps.
Frame rates from CI's software WebGL say nothing about real devices.

**What to remember.**

- A clean build and passing unit tests say nothing about how a shader looks. Screenshot it in place,
  crop and zoom, and compare frames over a few seconds.
- A page whose canvas redraws only on demand can be captured with a stale frame right after a style
  change. Playwright's `screenshot({ style })` applies the style for that one shot and waits for it.

## 2026-11-26: Rain on glass, second pass

**What changed after review.** The first pass was too timid for the owner's bar, a development-only
bug hid the canvas on resize, and software renderers were too slow to show.

**What to remember.**

- At night almost every pixel is near black, so a multiplied effect vanishes. Anything meant to be
  seen at night is added light: the lamp's halo, the light the condensation catches, the sky
  pinpoints and crescents on the drops. Spare the pixels that are already bright, or the lit window
  clips and turns muddy under the scrim.
- Water reads against mist. Heavier, blurrier mist made the drops, their wakes and their refraction
  visible; keeping it clear over the café window kept the photograph's heart sharp. A wider
  refraction puts a tiny orange window inside every drop near it.
- Random positions must not share random numbers with sizes: the droplets lined up in rows until
  the position had its own hashes, and two offset grids at different pitches removed the last trace
  of a lattice.
- Cache by source and never delete in an effect cleanup. React's development double mount runs the
  cleanup, so deleting the cached promise there made every later render suspend again and hid the
  canvas. Drop a cache entry only when it fails.
- An `<img>` element is not a safe texture source: its `width` follows the layout, not the file,
  and the upload overflowed the texture (a black canvas). An ImageBitmap copy, flipped for WebGL,
  has the file's own size and still needs no second download.
- Ask for `failIfMajorPerformanceCaveat` and check the renderer name too. CI's browser has only
  SwiftShader, so the tests opt back in through a test-only window flag.

## 2026-11-26: A menu you can hold

**Decided.** The menu becomes a 3D experience: a counter of drinks under the lamp to browse by
dragging, then a scroll-through bar where each drink rises into view, turns, and pours as the visitor
scrolls. Every drink is its own generated 3D model, made one by one on the owner's go. On the landing
page the hero cup now transforms as the visitor scrolls, from espresso to latte art to the last cup.

**Why.** The reference reels move the product with the scroll; a café's product is its drinks, so
the menu is where that motion belongs. Separate models give each drink its own vessel and character.

**What to remember.**

- Many models on one page only stay fast if just the drink on screen and its neighbours are loaded,
  with light versions for the overview.
- Generate the drinks as a family: the same studio set, light and angle for every still, so the models
  sit together on the counter.
- The menu must still work as plain text, for screen readers, reduced motion and devices without WebGL.

