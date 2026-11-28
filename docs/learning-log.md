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


## 2026-11-26: Scroll-told chapters with Lenis and ScrollTrigger

**Built.** The landing's first chapter: a tall section whose stage sticks to the screen while the
visitor scrolls through it. Dusk holds, the lamps come on with the scroll, then the promise rises
letter by letter. Waiting for the owner's verdict on the feel.

**Decided, and why.**

- **The pin is CSS, the progress is ScrollTrigger.** `position: sticky` inside a section 2.25
  screens tall pins the stage from the first paint, so nothing moves or shifts when the script
  arrives. ScrollTrigger only reads the progress. Its own `pin` would wrap the stage in a spacer
  after load, which is a layout shift, and it would reparent the canvas.
- **One smooth scroll, one loop.** Lenis is driven from GSAP's ticker once GSAP loads, and every
  Lenis scroll calls `ScrollTrigger.update`, so the page and the animation move in the same frame.
  `useSmoothScroll` hands its loop over (`driveWith`) rather than running a second one, and lag
  smoothing is off so the two clocks never drift apart.
- **Two clocks stay apart.** "The lamps come on" is chapter progress (`uLamp`); the night grade
  (`uNight`) is still the visitor's clock or the switch.
- **The lamps scrub; the title is a cue.** Tied directly to the scroll, the letters would crawl or
  jump with the visitor's hand. Instead, crossing a point plays them in their own time (about
  1.15 s from the first letter starting to the last at rest), on the settle curve read from the
  CSS token, and scrolling back sinks them 1.8 times faster (about 0.64 s), both inside the motion
  band of 0.6 to 1.2 s.
- **Composition before effect.** The lit window sat behind the title and under the heaviest scrim,
  so the chapter's one moving idea was hidden. On wide screens the copy is now a low band with the
  opening time beside the title, and the scrim stops lower; on phones the crop is shifted
  (`object-position: 35% 50%`, followed by the canvas) to keep the window on screen.

**What to remember.**

- GSAP reads a CSS `translateY(105%)` as a pixel `y`. Animating `yPercent` on top of it left the
  letters 146 px low and invisible; set `y: 0` in both ends of the tween.
- Give Lenis one clock. Before the handover it had rAF timestamps (since the page started); GSAP's
  ticker time counts from when GSAP loaded, seconds lower. The first step after the handover was
  negative, the damping overshot by tens of thousands of pixels, and a smooth scroll in flight
  jumped to the top, which is the usual case, since the visitor's first wheel loads GSAP. The
  ticker now passes `performance.now()`, and a new driver is lined up with the last time given.
- GSAP's ticker runs on `Date.now`. A test clock that freezes the date (Playwright's
  `setFixedTime`) freezes Lenis too; use `setSystemTime`, which lets time flow.
- A custom property set on a container restyles everything inside it. Writing `--lamp` on the stage
  every scroll frame restyled every letter; it now goes only on the two elements that read it, and
  only when its value changes.
- Reading layout in a scroll handler (`getBoundingClientRect`, `getComputedStyle`) forces an extra
  style pass per scroll frame. Mark it stale and read once in the frame.
- A component that suspends on its first mount loses its memo. A compile promise keyed by the
  component's material was new on every retry, and the scene never finished loading. Key it by the
  shader variant instead; three shares one program between identical shaders.

## 2026-11-26: Finding the LCP and TBT

**Measured.** Lighthouse, mobile preset, on `vite preview`. Before this chapter the landing scored
about 0.69 on this machine, with a total blocking time near 3 s.

**What the traces showed, and what fixed it.**

- **The steam loop's poster** (58 kB) downloaded with the hero photograph and took half its
  bandwidth. A `<video poster>` loads at once whatever `preload` says; the poster is now set only
  when the loop nears the screen.
- **GSAP** stays off the first screen: its chunk loads when the page is idle or at the first sign
  of a scroll, and the title waits below its baseline until then.
- **Web fonts swapping in** re-wrapped the large title (CLS 0.055). The three first-screen font
  files are now preloaded from the HTML, by a small Vite plugin that knows their hashed names.
- **The first frame of the rain** took about 370 ms at 4x CPU, almost all shader compilation.
  `compileAsync` with `KHR_parallel_shader_compile` brought it to about 50 ms.

**Where it stands.** With the GPU off, as on CI's runner, the landing scores 0.96 to 0.99 (LCP about
2.3 s, CLS 0, TBT under 150 ms). With this machine's GPU the canvas mounts during the audit and the
score is about 0.80: the first WebGL context in a page costs 300 to 380 ms of main-thread time here
(the GPU process starting up), and Lighthouse multiplies main-thread time by four.

**Question to revisit.** Whether the canvas should wait longer (for the first interaction, or a
longer idle) on phones, trading a later rain for a quieter first few seconds.

## 2026-11-27: The landing complete and the hero cup (Task 9)

**Owner decisions, made while it was built.**

- The hero is the craft, full screen: the crema and its steam film edge to edge, the promise rising
  over it, low and left on a scrim. The street at dusk, with its rain and lamps, moves to the third
  chapter. The order is craft, cup under the lamp, dusk on the street, window, last cup.
- Media is always full-bleed. The steam loop had been a rounded card with a caption under it; the
  owner disliked it, and no chapter shows a boxed photograph or film again.
- Start the 3D later. The first WebGL context and evaluating three.js cost 300 to 380 ms of main
  thread on a GPU desktop, inside Lighthouse's blocking-time window.

**Decisions and why.**

- **One gate for everything not on the first screen** (`src/scene/gate.ts`). The 3D, the hero's
  film and the later chapters' pictures wait for the visitor's first intent (a pointer moving, a
  touch, a key, a wheel, a scroll) or for five quiet seconds after load. Lighthouse never shows
  intent, and its trace ends before the quiet runs out, so the first screen is measured alone.
  Waiting for the `load` event was not enough: Lighthouse's simulation does not model that wait,
  so pictures asked for after `load` still shared the poster's bandwidth in its sums.
- **The canvas fades in only once its scene has drawn.** Before, the fade started when the canvas
  mounted, often before its first frame, so part of it was spent on an empty canvas. A scene now
  calls `useSceneReady()` from its first drawn frame; the host then sets `data-live="ready"`.
- **The cup's still is rendered from the cup** (`npm run cup-still`), by the live scene in the pose
  it starts in, with a transparent background. The host's `swap` hides the still once the live cup
  has fully faded in, so the two are never seen together, and the canvas frames the same square the
  still is contained in (`containFov`), so the swap lands exactly.
- **One stage, sticky over four chapters.** The cup's stage is `position: sticky` for the length
  of its chapters, with a negative margin that gives its height back; the chapters scroll under it.
  The street keeps its own sticky pin inside that, for the lamps.
- **Physics that settles like light.** Each value relaxes towards its push with the exact
  exponential over the step, so the cup never overshoots and 30 and 60 frames a second agree.
- **The coffee is one disc and one shader.** three's physical material, with the colour written in
  `onBeforeCompile`: crema, milk marbling, a tulip in stacked crescents with a pull-through, and
  cooling, all from `liquidLook(progress)`. It takes the scene's lights, reflections and clear coat
  like the cup does.
- **The foot gap is fixed in the scene.** The saucer has an open centre and its top face stops short
  of the foot; a glazed disc under its inner edge closes the ring. Its size and height come from the
  model's vertices, so a regenerated model would still be measured, not guessed.

**What to remember.**

- `git mv` stages the rename immediately: the next commit takes it along, whatever that commit is
  about. Commit or unstage a rename with the change it belongs to.
- React's development mode mounts effects twice. A cleanup that disposes a three material, followed
  by its reuse, recompiles the program, and three's background compile then asks the driver about
  the old one ("Program object expected" warnings in development only).
- The shadow on an invisible table ends where the canvas ends, as a straight line. Fading the shadow
  by the fragment's distance to the canvas edge removes the line without shrinking the shadow.
- Meshopt's decoder is WebAssembly. The Content Security Policy needs `'wasm-unsafe-eval'` in
  `script-src` when it arrives.

**Questions to revisit.**

- The hero's film now starts on the first intent; a phone visitor who only reads sees the poster
  until they touch or five quiet seconds pass.
- The window chapter's photograph has its own cup in it, so two cups show there.

## 2026-11-28: The menu and the cart (Task 10)

**Decisions and why.**

- **One canvas for the counter, one for the bar.** Nine canvases (one per drink) would be nine WebGL
  contexts, and browsers drop the oldest past about sixteen. The counter draws every drink's light
  model in one canvas; the bar has one sticky canvas over its sections, like the landing's cup
  stage, holding only the drink on screen and its neighbours.
- **The counter's scene works in CSS pixels.** The camera is placed so that the plane through the
  drinks shows the canvas exactly, so a drink stands over its place in the listbox whatever the row's
  scroll. The listbox is the real control (keys, taps, the accessible names); the scene follows it.
- **Scroll frames re-render nothing.** The bar's progress, the turns and the counter's row live in
  `src/menu/barProgress.ts`, outside React. The scenes read them in their frame loop and are woken
  through listeners; React renders the bar again only when another drink comes on screen, to change
  which models are loaded. A drink's pose is a pure function (`drinkPose`) that writes into one
  object, so the frame loop allocates nothing.
- **Draw on demand.** The menu's scenes move only with the scroll, a turn or the row, so their hosts
  run R3F on demand (`onDemand`) and the frame loop idles whenever nothing moves.
- **Load late, free later, and only where the visitor settles.** Each model loads when a scene
  first asks for it, and is disposed eight seconds after nothing draws it. The bar changes which
  models it holds only after 150 ms on one drink, so a flick down the bar loads where it lands,
  not every drink it passes; a load that lands after the visitor has moved on is freed too.
- **The menu keeps its own model cache.** Sharing drei's would let the menu free the landing's
  hero cup (the same file). Its own cache can free anything it holds without touching the landing.
- **No pour** (controller ruling, 2026-11-28). The owner rejected a drawn milk "stick" on the hero
  cup (2026-11-27), so a thin pour drawn into the drinks goes against an owner decision. The models
  are single meshes with the drink baked in; each drink rises, turns and warms under the lamp
  instead.
- **Live is per drink.** One flag for the whole bar hid every still as soon as any drink drew, so
  a drink still loading showed nothing. Each section now waits for its own drink's first frame.
- **Stills first.** The counter shows its drinks' stills from the first paint (the controller's
  look found it empty until the visitor moved); the bar's photographs below the first screen wait
  for the visitor's first intent, as the landing's do.
- **Light for food, not for a street.** The landing's orange key against a strong blue fill made
  white cups and milk a muddy blue-grey and Fog Line rust. The menu has its own light: a warm
  ambient, a soft near-neutral fill, a less saturated lamp and a warm window in the reflected room
  (the numbers and reasons are in `MENU_LIGHT`, `src/menu/sceneParts.tsx`). Both scenes look down
  at 27 degrees, so the coffee's surface shows.

**What to remember.**

- A sticky element with a negative bottom margin (to give its height back) can stick a whole screen
  past the end of its parent: the bar's last drink ran over the night snacks' heading. A sticky
  element inside an absolutely placed track that covers its section stops exactly at the end.
- React retries a component suspended on `use(promise)` inside `act` only if that `act` is awaited;
  a test that renders synchronously never sees the load land.
- Sharing a cached glTF scene between two canvases does not work: an object has one parent. Each
  scene clones the nodes, which shares the geometry, materials and textures.
- The hero cup's loader moves its shared scene to stand it on the table. Measuring a model's bounds
  in its own frame keeps the menu's copy right whichever page loaded it first.
- oxlint's React rules refuse mutating a value a hook returned, even inside `useFrame`. Mutate a
  `ref`'d group around it instead.

**Questions to revisit.**

- Night Ferry and Low Tide still read frosted; a transmission material on their glass needs a look
  on a GPU before it is worth its cost.
- The menu's frame times, with a drink on screen and while flicking along the counter, need a short
  look on a machine with a GPU.

## 2026-11-28: Brew-your-own (Task 11)

**Decisions and why.**

- **The same cup, not a copy.** `BrewCup` is the hero cup with a `source` for its coffee: the
  model, glaze, lamp, shadow, warm-up and hand-off from the still are the landing's own code. The
  landing never passes a source, so its cup takes the path it always did.
- **Photographed, not drawn** (owner, 2026-11-27). The drink picks one of the three coffee
  photographs: the crema without milk, the milk blooming through it for a spot of foam, the rosetta
  for poured milk. One photograph at a time, never two held half and half, which would show two
  pours ghosted over each other; the 0.6 s ease cross-fades them only while it runs.
- **Roast as a grade, not a new picture.** The roast and beans shift the photographs' browns
  through a tint after their grade, using the same `lqGrade` that leaves the milk white. The tint
  is the ratio of the drink's crema to the house espresso's, in linear light, raised to 0.6, so a
  light or dark roast moves the photograph without turning it into a flat beige or a dull brown.
  The house espresso's tint is exactly 1, and the shader skips the tint at (1, 1, 1): the landing's
  pixels cannot change.
- **The look is pure and tested; the uniforms are an adapter.** `brewLook` describes the drink in
  palette colours and amounts (what the server and the tests can reason about); `brewSurface` turns
  that into the cup's liquid look and tint. Neither knows about three.
- **Every pull carries a crema.** The methods are all pulled on the bar's machine (ristretto,
  espresso, lungo, long black), because a pour-over has no crema and there is no photograph of a
  bare coffee surface. Drawing one would go against the owner's decision.
- **One announcement per change.** The live line is one string in one text node, `aria-atomic`,
  and it leaves out the visitor's name, so typing a name says nothing and each choice is said once,
  with its new price. A test counts the mutations.
- **The same drink twice is one line.** A brewed line's id is built from its choice and name, so the
  cart's reducer adds the quantities, as it does for menu items; another drink is another line.

**What to remember.**

- `MutationObserver.takeRecords()` reads the pending records synchronously, so a test can count
  exactly what one change did to a live region without waiting for the observer's microtask.
- GLSL compares whole vectors with `==` and `!=` (a single bool), which makes a uniform-driven
  skip cheap and exact: `mix(gain, vec3(1.0), s)` with a gain of one is not guaranteed to be
  exactly one in every driver's arithmetic, but skipping it is.

**Questions to revisit.**

- The tint's strength (0.6) and the palette ends are chosen by numbers, not seen: the owner's PC
  cannot render. A look on a GPU at a light, medium and dark roast, with and without milk, should
  settle them.
- The cup's tilt, spin and splash controls could come to this page too (optional in the rulings).
