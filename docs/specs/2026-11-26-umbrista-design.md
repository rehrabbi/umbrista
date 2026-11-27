# Umbrista: design

Date: 2026-11-26
Status: approved by the owner; revised the same day for the photoreal direction (section 4)

## 1. Intent

Umbrista is an invented café brand and its website, built as a portfolio piece. The name joins
*umbra* (shadow) and *barista*: the barista of the shadows. Umbrista is a night coffee bar that opens
at dusk in a fictional city. It is for the people who come alive when the city goes quiet: rain on
glass, moonlight, steam glowing under warm lamps.

The site has to prove three things at once:

- **Craft.** It feels cinematic, alive and interactive, at the level of the reference work the owner
  shared (a scroll-driven 3D world with kinetic type; playful interactive landing pages; living shader
  backgrounds; buttery smooth scroll).
- **Engineering.** It is fast, accessible and secure, with a real backend, tests and a professional
  repository, in the same way SentinelOps is.
- **Originality.** It does not look generated, templated or like every other coffee site.

**The reference work** (two Instagram reels the owner shared, studied frame by frame on 2026-11-26):

- *kryntixstudio, "POV: You mastered interactive websites"*
  (https://www.instagram.com/reel/Dd_UfShp32b/): a cinematic, scroll-told 3D world (a gate under a
  blood-red moon, drifting petals, lamp-lit dusk), a camera that travels through layered depth as you
  scroll, huge kinetic display type ("KAGE"), short poetic editorial headlines, and numbered chapters
  (01–04). This sets the **mood and pacing**: dark, atmospheric, unhurried, type as image.
- *by.flowww, "Cool web devs don't gatekeep"* (https://www.instagram.com/reel/DdsrRJpywBe/): a tour of
  sites that set the **interaction bar**: Vela (a 3D jet flying through clouds on scroll), Lenis
  (smooth scroll), basement.studio (a playful, game-like interactive landing page), ShaderGradient
  (living 3D gradient backgrounds) and Unicorn Studio (WebGL effects).

Umbrista borrows the *level* of these, never their look: no gates, moons-as-logos or jets; its own
world is a night café.

## 2. Goals, non-goals, anti-goals

**Goals**

- A full café website: Landing, Menu, Brew-your-own, Story, Visit, Journal, and a 404 page.
- Five 3D moments, all of which the owner asked for, built on a **photoreal** base (section 4):
  1. A **living background**: photoreal stills and short silent video loops of Calvessa's night, with
     real-time WebGL layered over them (rain running down the glass, lamp glow that follows the
     cursor, gentle depth and parallax), reacting to the cursor and to scroll.
  2. A **scroll journey** on the landing page: chapters of the café's night, in this order (owner
     decision 2026-11-27): **the craft** as the hero (the crema and its steam film, full screen, the
     promise rising over it), **the cup under the lamp**, **dusk on the street** (the living
     background, the lamps coming on), **the window**, **the last cup**. Each is built from
     art-directed photoreal media that fills the screen edge to edge (never a framed box or card),
     moved by scroll, with big kinetic type. The hero cup first appears in the second chapter, then
     travels with the visitor and **transforms** as the chapters pass: an espresso, then milk pours
     and latte art blooms, then it cools to the last cup, while the page moves around it. Nothing 3D
     is needed for the first screen; the 3D starts on the visitor's first intent.
  3. A **hero object to play with**: the Umbrista cup as a photoreal 3D model, lit live, that can be
     tilted, spun and made to ripple with cursor, touch or keyboard.
  4. **Brew-your-own**: the visitor picks beans, roast, method and milk, and the same 3D cup fills and
     its coffee changes colour and crema to match. The result can be added to an order.
  5. A **3D menu**: every drink on the menu is its own photoreal 3D model. The Menu page is a scroll
     journey through the bar (each drink rises into view, turns, and pours or fills as the visitor
     scrolls, with its name and price in kinetic type, one drink per screen) with a **3D counter** at
     the top: every drink standing under the lamp, browsed by dragging or swiping, and tapped to jump
     to that drink. Each drink can be turned by drag, touch or keyboard and added to an order.
- Four visitor actions, all real: **reserve a table**, **order ahead for pickup** (cart and
  confirmation, no payment), **join the list** (opening news), or **just explore**.
- A full brand: name, logo (mark and wordmark), favicon set, social share image, palette, type,
  motion principles, voice, and the small details (loading state, cursor, 404, empty states,
  confirmation screens, email-free confirmations).
- A professional public repository run the way SentinelOps is run (section 7).

**Non-goals**

- Real payments, a real café, real delivery, or email sending.
- A content management system. Menu, journal posts and copy live in the repository.
- Multiple languages.

**Anti-goals** (the owner's words: would make them wince)

- **Slow or janky**: 3D that stutters, long loading screens, a page that drains a phone's battery.
- **Generic or template-like**: anything that looks AI-made or like every other coffee site (beans,
  brown and cursive script).
- **Hard to use**: the menu or hours hard to find, text hard to read, or anything keyboard and
  screen-reader users cannot reach.

Bold, showy effects are welcome; the owner did not mark "too gimmicky" as a concern. The rule is that
effects must stay fast, original and usable.

## 3. Constraints

- **Free.** Every tool and service is free. The database is a new project on Neon's free plan (the
  owner's personal account, as SentinelOps uses), kept separate from any work account.
- **Hosting:** Vercel (owner's choice).
- **Honesty:** the café is fictional but the forms save real data. Every page says plainly, in a
  small persistent note, that Umbrista is a design project and not a real café, and every
  confirmation says so again, so nobody thinks they booked a real table or ordered real coffee.
- **Privacy:** reservations, orders and sign-ups hold personal data (name, phone, email). There is a
  short, true privacy notice; data is kept only as long as stated there; nothing is sent to third
  parties beyond Neon and Vercel; no analytics or trackers. Requests to see or delete data go through
  an issue on the public repository, with a warning not to post personal details there and to ask
  for a private way to get in touch (as SentinelOps does); no personal email is published.
- **No AI attribution** anywhere: commits, pull requests, files, docs.
- **Original assets only.** No stock photography and no downloaded 3D models. Visuals are made for
  this project: photoreal images, video loops and the cup model generated from briefs written for
  Umbrista (on the owner's go, below), and the code-built effects layered over them. The designs (the
  cup, the café, the city) are Umbrista's own; nothing copies a real brand, place or product. Any
  third-party asset must be CC0 or similarly free, and recorded with its licence.
- **Generated assets (Higgsfield), on the owner's go only.** The owner allows Higgsfield for images,
  video, textures and 3D models the project needs. Nothing is generated without the owner's explicit
  go for that specific asset: first the builder says what it will be, what it is for, where it is used,
  the prompt or brief, the model, and the estimated credit cost. Every generated asset is recorded in
  `docs/brand.md` (what, where used, model, date). Generated assets must still meet the anti-goals:
  nothing that reads as generic AI imagery; they are art-directed to the brand board, and the site
  must stay fast with them (sized, compressed, lazy-loaded).

## 4. Decided by the owner

- Invent the brand from scratch.
- Business: a café / coffee bar.
- Mood: cinematic and moody.
- 3D: all four moments listed above.
- **Photoreal look** (decided after the look-development round on 2026-11-26): the site looks real,
  at the level of the reference reels, not drawn or code-built. Photoreal stills, short silent video
  loops and the cup's 3D model are generated with Higgsfield, each on the owner's go; real-time WebGL
  is layered over them so the site still feels alive and interactive. The owner approved this
  direction after seeing a working preview: the street at dusk with the 3D cup, the cup turning on
  scroll, the steam loop in "The craft", and the rain-window still. Approved assets are listed in
  `docs/brand.md`.
- **3D menu and drinks** (2026-11-26): the menu is 3D and interactive, both as a scroll-through bar
  and as a 3D counter overview; every drink is its own generated 3D model (each on the owner's go);
  on the landing page the hero cup transforms as the visitor scrolls (espresso, milk and latte art,
  the last cup).
- Concept: a night coffee bar that opens at dusk.
- Scope: the full café site.
- Visitor actions: reserve, order ahead, join the list, and just explore.
- Forms: a real, free backend.
- Setting: a fictional city and a fictional café.
- Name: **Umbrista** (checked on 2026-11-26: no café, brand or trademark of that name found).
- Repository: public, on the owner's GitHub (`rehrabbi`).
- Hosting: Vercel. Database: Neon Postgres, free plan, owner's personal account (not the work
  Supabase account).
- **Whose dusk:** the visitor's. The scene follows the visitor's own local time, from the device clock,
  with no location prompt. A visible "See it at night" switch lets a daytime visitor jump to the lit
  night (and back).
- **Data requests:** through a GitHub issue on the public repository, no published email.
- **Staff view:** for the owner's staff accounts **and for demo users** (portfolio reviewers), who
  must never see real visitors' data (section 5, "Staff demo").
- **Timing:** no deadline. Build the whole site, then launch once as v1.0.0.
- Who writes the code: the builder writes it and explains it; the owner reviews each pull request.
- Workflow: the same as SentinelOps (section 7).

## 5. Calls made by the builder (the owner can override any of these)

**Stack**

- Vite, React and TypeScript.
- 3D: Three.js through React Three Fiber and drei. The cup is the generated 3D model (glTF, PBR
  materials, compressed), lit live in the scene; custom GLSL shaders draw the rain on glass, the lamp
  glow, the parallax over the photoreal media, and the coffee's surface (colour, crema and ripples).
- Photoreal media: generated stills served as responsive AVIF and WebP; generated video loops served
  silent as VP9 WebM with an H.264 MP4 fallback and a poster still (generators deliver HEVC, which not
  every browser plays, so loops are always re-encoded).
- Scroll and choreography: GSAP with ScrollTrigger, and Lenis for smooth scrolling.
- Interface motion: Motion (`motion/react`), as in SentinelOps.
- Routing: React Router, with each page a lazily loaded route.
- Backend: Vercel serverless functions in TypeScript in front of Neon Postgres (connection string
  only in Vercel's environment). The browser never talks to the database; the functions validate
  every input (schema validation), apply per-visitor rate limits, and use parameterised SQL. Schema
  changes are versioned migrations in the repository.
- Staff view: a small password-protected page listing reservations, orders and sign-ups, with the
  ability to mark an order ready or a reservation seated. Sign-in is our own, built the way
  SentinelOps does it: passwords hashed (bcrypt or argon2), server-side sessions in an `HttpOnly`,
  `Secure`, `SameSite` cookie, sign-in rate limiting, and staff accounts created only by the owner
  from a command-line script (no open sign-up).
- **Staff demo.** The staff page offers "Try the staff view" for reviewers. It starts a demo session
  without any password, marked as demo on the server. The separation is enforced by the server and
  the database, not by the interface:
  - demo sessions read and change only a separate demo dataset (its own tables or schema) of
    invented reservations, orders and sign-ups, never the real ones;
  - the database role the demo path uses has no access to the real tables at all, so even a bug in
    a function cannot leak real data into a demo session;
  - the demo dataset resets itself to its seed on a schedule (nightly, and when it drifts), so
    reviewers can mark orders ready or reservations seated freely;
  - a banner on every demo screen says it is demo data;
  - tests prove the separation: a demo session asking for real records gets nothing, and a real
    staff session never sees demo records.
- Tests: Vitest and Testing Library for logic and components; Playwright for end-to-end flows
  (reserve, order ahead, join the list, brew-your-own to cart).
- Fonts self-hosted through `@fontsource` or equivalent, so the security policy can stay strict.

**Brand and experience**

- **Opens at dusk, literally.** Two clocks, kept clearly apart:
  - *The scene* follows the visitor's local time (owner's decision). Their dusk is estimated from the
    device's time zone and date, with no location prompt. Before it, the landing scene is late
    afternoon and says how long until the lamps come on; after it, the lamps are lit. The "See it at
    night" switch overrides this.
  - *The café's hours* belong to the fictional city: it gets real coordinates and a real time zone,
    it opens at that city's sunset (computed) and closes at 03:00 city time. Reservations and pickup
    times are validated against these hours on the server, and every time shown for booking is
    labelled as café time.
- The city name, the café's address and street names are invented in the brand phase and approved
  on the brand board (section 8).
- Prices are shown in a currency invented for the city, with a small key, or in a neutral format;
  decided on the brand board.
- Voice: quiet, warm, a little poetic, never cute. Short sentences. Night-owl humour is allowed in
  small places (404, empty states, the loading line).
- The palette avoids coffee-brown clichés: deep night blues and inks, one warm lamp colour as the
  signal, and crema tones used sparingly. Exact values come from the brand phase.

**Performance budgets** (answer to "slow or janky")

- Largest Contentful Paint under 2.5 s on a throttled mobile profile; Cumulative Layout Shift under
  0.05; Lighthouse performance at least 90 on Landing, Menu and Visit, on mobile.
- The first paint is real HTML and text, never a blank canvas or a long loading screen. 3D loads after
  first paint and fades in; until then a static still of the scene stands in.
- The 3D adapts: device pixel ratio is capped, heavy effects are dropped on weak devices (measured at
  runtime), rendering pauses when the tab is hidden or the canvas is off screen, and the frame loop
  idles when nothing moves.
- No WebGL, or a failed context: the site falls back to the static stills and still works fully.
- Media budgets: each video loop about 1 MB or less, loaded only near the viewport and paused off
  screen; the cup model about 2 MB or less after compression; each drink model about 1.5 MB or less,
  only the drink on screen and its neighbours loaded, and the counter drawn with light versions; images sized per viewport. The first
  frame's image is the largest-contentful-paint candidate and is preloaded.

**Accessibility** (answer to "hard to use")

- WCAG 2.2 AA. Menu, hours, address and prices are always plain text, never only inside 3D.
- Every 3D interaction has an equivalent control: the hero cup can be turned with buttons and arrow
  keys; Brew-your-own is a normal form whose choices drive the cup.
- Reduced motion: the scroll journey becomes a sequence of still chapters with gentle fades; no
  parallax, no camera travel, no auto-playing loops.
- Smooth scrolling never hijacks keyboard, screen-reader or anchor navigation.

**Security**

- Strict security headers on Vercel: a Content Security Policy with no inline scripts or styles that
  still allows WebGL, with `connect-src 'self'` because the API is the site's own functions; HSTS;
  frame-ancestors none; a tight Permissions-Policy.
- Secrets only in Vercel environment variables, never in the repository; gitleaks in CI.
- Rate limits and validation on every form function; generic error messages.

## 6. Pages and what each must do

- **Landing**: the scroll journey and living background; the hero cup; tonight's opening time; links
  to Menu, Brew-your-own, Reserve, and the list sign-up.
- **Menu**: the 3D counter, then the scroll-through bar, one drink per screen, each with its name,
  notes and price as text and an "Add to order" button; the night snacks as photoreal stills (the
  builder's call, the owner can override); add to an order-ahead cart. The whole menu stays readable
  and orderable as plain text without the 3D.
- **Brew-your-own**: the configurator with the 3D cup; the finished drink can be named and added to
  the cart.
- **Story**: why a café that opens at dusk; the people (fictional) and the craft.
- **Visit**: address in the fictional city, an illustrated map, tonight's hours, how to get there.
- **Journal**: three to five short posts written for launch.
- **Reserve**: date (tonight or a future night), time within opening hours, party size, name, phone or
  email; confirmation on screen.
- **Order ahead**: cart from Menu and Brew-your-own, pickup time tonight, name and phone; on-screen
  confirmation with an order code.
- **Join the list**: email only, double-checked format, confirmation on screen.
- **Privacy**: what is stored, where (Neon and Vercel), for how long, and how to ask for deletion
  (a GitHub issue, without personal details in it).
- **Staff**: sign-in, the three lists, and the "Try the staff view" demo entrance. Linked once, quietly,
  from the footer and the README, so reviewers can find it.
- **404**: a small, on-brand lost-in-the-dark moment with a way home.

## 7. Repository and workflow (same as SentinelOps)

- Public GitHub repository `rehrabbi/umbrista`, MIT licence.
- `main` is protected: changes only through pull requests, required checks, merge commits only, and
  branches up to date before merging.
- An integration branch `develop` carries the build; each task is its own branch and its own detailed
  pull request into `develop`, reviewed and merged on green, then archived as `merged/<branch>`.
  Branches are never deleted. Releases go from `develop` to `main` with a tag and release notes; the
  first public release is v1.0.0, once the whole site is built.
- Commits: conventional subjects (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `build:`, `chore:`), a blank
  line, short bullets, one concern per commit, the owner's configured git identity, no AI attribution.
- CI on every pull request: lint, type check, unit tests, build, Playwright end-to-end, a Lighthouse
  budget check, CodeQL, dependency audit and gitleaks. All are required on `main`.
- Documentation, kept current as the project moves:
  - `README.md` (purpose, live link, screenshots, stack, setup, architecture, current state);
  - `CHANGELOG.md` (Keep a Changelog, semantic versions);
  - `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`;
  - issue and pull request templates, code owners;
  - `docs/PROJECT-STATE.md` (the resume-here snapshot and the exact next step);
  - `docs/learning-log.md` (decisions, concepts, lessons);
  - `docs/adr/` (decision records, starting with the stack and the 3D approach);
  - `docs/brand.md` (the brand guide);
  - `docs/WAYS-OF-WORKING.md` (the working agreement for future sessions).
- Work proceeds by a written plan, task by task, each task implemented, reviewed, fixed and merged,
  as in the SentinelOps redesign.

## 8. Owner checkpoints

The owner looks at, and approves, these before work moves past them:

1. This design document.
2. The plan.
3. The **brand board**: name treatment, logo, palette, type, city name and the price format, the
   favicon and the voice, side by side, shown in the browser.
4. A **landing prototype**: the first chapter of the scroll journey and the living background
   running, to judge the feel before the rest is built.
5. Each pull request (the owner may review as closely as they like; merging on green is allowed).
6. The **launch**: the release from `develop` to `main` and the production deploy.

## 9. Left to the builder

- The exact chapters of the scroll journey, their copy and their camera moves.
- How each photoreal asset is briefed and art-directed (proposed to the owner before generating), and
  how the WebGL effects sit over the media, within the original-assets rule.
- Menu items, names, flavour notes and journal posts.
- The database schema, function layout and component structure.
- Exact animation timings and easings, within the motion principles set on the brand board.
- How the task list is split, as long as each task is reviewable on its own.
