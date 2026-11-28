# Changelog

All notable changes to Umbrista are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The first public release is v1.0.0,
once the whole site is built.

## [Unreleased]

### Added

- Brew your own: a plain form to choose the beans (Harbour, Sidamo, Decaf), the roast (light,
  medium, dark), how it is pulled (ristretto, espresso, lungo, long black) and the milk (none, a
  spot of foam, whole or oat), and to name the drink if you like. Beside it, the hero cup fills
  with the drink, still in photographs of real coffee: the crema without milk, the milk blooming
  through it for a spot of foam, a rosetta for poured milk, its crema a pale golden hazel for a
  light roast and a deep brown for a dark one, the level set by the pull and the milk. The cup
  sits straight on the page, with no box around it. Each change eases in over 0.6 seconds, at once
  under reduced motion. A description of the cup and its total, on a line of its own, are said
  together to screen readers as they change; each option shows what it adds to the price. Every
  drink is priced between 2.80 and 4.80 crowns. "Add to order" puts it in the cart
  as a line of its own, the same drink twice counting as two. The 3D starts on the visitor's first
  intent, over the cup's still, and the page works fully without it.
- The menu. At the top, the counter: every drink standing in a row under the lamp, in 3D, slid
  along with a swipe, a trackpad or a mouse drag, and chosen with the arrow keys, Home and End;
  Enter or a tap goes to that drink. Then the bar, one drink per screen: each rises into view,
  turns with the scroll and settles under the lamp, with its name and price rising in kinetic type,
  its notes, "Add to order", and "Turn left" and "Turn right". Then the night snacks, each with its
  photograph. Prices are in
  crowns, with the key at the top. Only the drink on screen and its neighbours load their full
  models, and only once the visitor settles on a drink; the counter draws the light ones (Last Tram
  as a light cup). The drinks are seen from a little above, so the coffee's surface shows, in a warm
  light kept for the menu. Until the 3D has drawn, and for good under reduced
  motion or without WebGL, every drink is its photograph, and the whole menu reads and orders as
  plain text.
- The order-ahead cart: add from the menu, the same drink twice counts as two, quantities from 1 to
  20, kept for the visit in the tab's session storage (the Privacy page says so).
- The Lighthouse budget now holds `/menu` to the same limits as `/`.

- The landing's whole scroll journey, in the order the owner chose: the craft (the crema and its
  steam, full screen) as the first screen, with "We open when the light goes." rising letter by
  letter over it, the opening time and the ways to reserve a table or see the menu; then the cup
  under the lamp, dusk on the street (the lamps coming on), the window and the last cup, which
  ends with the menu, brewing your own, reserving a table and joining the list. Every chapter's
  photograph or film fills the screen edge to edge.
- The hero cup in 3D, lit live by a sodium lamp and a cool window, with the night or day grade. It
  appears in the cup's chapter and stays on screen through every chapter after it while its coffee
  changes with the scroll, shown in photographs of real coffee from above: an espresso, then the
  milk blooming up through the crema, a rosetta, and the last cup, aged as its chapter begins. It
  can be tilted, spun and made to ripple with buttons, the arrow keys or a sideways drag, and a
  vertical swipe over it still scrolls the page. Until the 3D is ready, and without WebGL, the cup
  is a still rendered from the same model in the same pose.
- `npm run models` compresses the 3D models (meshopt geometry, WebP textures; the cup is 0.82 MB),
  and `npm run cup-still` renders the cup's still from the model.
- The eight menu drinks as web 3D models, each in two versions: a full model for the bar (0.71 to
  1.39 MB) and a light one for the counter, where all eight show at once (0.30 to 0.39 MB, 512 px
  textures, simplified geometry). `npm run models` builds them one at a time on one image thread, and
  takes model names to build only some.
- In the street chapter the visitor scrolls through dusk while the street holds still and the café
  window and the lamps come on. The scroll is smooth, and the scene follows it in the same frame.
- A Lighthouse budget for the landing on a phone profile, a required check on `main` and
  `develop`: performance at least 90, the largest image painted within 2.5 seconds, layout shift
  below 0.05, median of five runs.

### Changed

- The first screen loads alone: the hero's poster is preloaded from the HTML, the fonts every page
  needs arrive with the first script, and the film follows once the page has loaded (never when the
  visitor saves data). No WebGL, no three.js, no scroll choreography and no picture below the first
  screen until the visitor moves the pointer, touches, presses a key or scrolls, or the loaded page
  has been quiet for five seconds. Each canvas fades in over its still only once its scene has
  drawn, and the cup's controls appear once the live cup is there. Shaders compile without
  freezing the first frame where the browser allows it.
- With reduced motion each chapter is a still: the cup shows that chapter's coffee and fades to the
  next chapter's, and the street is one screen with the lamps on.

- The street's photograph comes alive: rain runs down the glass in front of the Calvessa street and
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
