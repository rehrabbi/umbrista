# Changelog

All notable changes to Umbrista are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The first public release is v1.0.0,
once the whole site is built.

## [Unreleased]

### Added

- The landing's whole scroll journey, in the order the owner chose: the craft (the crema and its
  steam, full screen) as the first screen, with "We open when the light goes." rising letter by
  letter over it, the opening time and the ways to reserve a table or see the menu; then the cup
  under the lamp, dusk on the street (the lamps coming on), the window and the last cup, which
  ends with the menu, brewing your own, reserving a table and joining the list. Every chapter's
  photograph or film fills the screen edge to edge.
- The hero cup in 3D, lit live by a sodium lamp and a cool window, with the night or day grade. It
  appears in the cup's chapter and stays on screen through every chapter after it while its coffee
  changes with the scroll: an espresso, then milk pouring, latte art, and the last cup, cooled. It
  can be tilted, spun and made to ripple with buttons, the arrow keys or a sideways drag, and a
  vertical swipe over it still scrolls the page. Until the 3D is ready, and without WebGL, the cup
  is a still rendered from the same model in the same pose.
- `npm run models` compresses the 3D models (meshopt geometry, WebP textures; the cup is 0.82 MB),
  and `npm run cup-still` renders the cup's still from the model.

- The landing's first chapter. The street at dusk holds still while the visitor scrolls through it,
  the café window and the lamp's glow come on, then "We open when the light goes." rises letter by
  letter under the café's name. The opening time and the line beneath stay readable throughout. With
  reduced motion it is one still screen with the lamps on and the title whole, and the sections
  below fade in. The scroll is smooth and the animation follows it in the same frame.
- A Lighthouse budget in CI for the landing on a phone profile: performance at least 90, the largest
  image painted within 2.5 seconds, and layout shift below 0.05. CI's runner has no GPU, so it
  measures the landing without its 3D canvas; on a desktop with a GPU the score is about 80, held
  back by starting WebGL and loading three.js.

### Changed

- The 3D scenes start later: no WebGL and no three.js until the visitor moves the pointer, touches,
  presses a key or scrolls, or the loaded page has been quiet for five seconds. Each canvas fades in
  over its still only once its scene has drawn.
- With reduced motion each chapter is a still: the cup shows that chapter's coffee and fades to the
  next chapter's, and the street is one screen with the lamps on.

- The landing loads faster: the fonts every page needs arrive with the first script, the steam
  loop's poster waits until it is near the screen, the scroll choreography loads once the page is
  idle, and the rain's shader compiles without freezing the first frame where the browser allows it.

- The landing photograph comes alive: rain runs down the glass in front of the Calvessa street and
  bends the view through each drop, a sodium lamp glow follows the pointer and rests on the lit café
  window, the street recedes a little as the page scrolls, and the scene grades from overcast dusk
  by day to lamp-lit night. It loads after first paint, lines up exactly with the photograph under
  it, scales its work to the device, and is a still frame when reduced motion is on. Browsers that
  can only draw WebGL in software keep the photograph instead.
- Media and 3D foundation: responsive `Picture` stills (AVIF with WebP fallback), a `VideoLoop` that
  plays only while on screen and is just its poster under reduced motion, and a `SceneHost` that
  loads the 3D canvas after first paint and falls back to the photograph without WebGL or when the
  context is lost. Quality tiers set the canvas pixel ratio from the device. `npm run media` builds
  the committed web derivatives from local masters.
- The landing page now opens on a full-bleed photograph of the Calvessa street at dusk under the
  heading, with a steam loop below it.
- Repository foundation: design, plan, governance documents, licence and GitHub templates.
- The Umbrista brand: the logo (a cup with a long shadow), the favicon and app icons, the link
  preview image, the web manifest, the night and day colours, and the two self-hosted fonts.
- The site shell: a skip link, the navigation (a menu button on small screens), the footer with the
  design-project note, and a page for every route, each loaded on demand. Focus moves to the new page's
  heading after in-app navigation, and the page title follows the route.
- The interface kit: buttons, form fields with hints and errors, and toast messages, plus smooth
  scrolling that stays off when reduced motion is on.
- Two clocks. The page follows the visitor's own dusk, estimated from their time zone with no
  location prompt, and a "See it at night" button overrides it. The café's hours follow Calvessa:
  open from its computed sunset until 03:00 café time, shown as "Opens tonight at ..." or "Open now,
  until 03:00" on the landing and Visit pages.
