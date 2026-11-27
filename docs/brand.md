# Umbrista brand

The brand as the owner approved it on the brand board (`docs/brand/board.html`) on 2026-11-26. The
board and the notes in `docs/brand/explorations/` keep the options that were not chosen, and why.
These values are the source for the design tokens in `src/styles/tokens.css`; a test compares the
two and computes the contrast of every pair.

## Logo: A, "Long shadow"

A small cup, seen from the side, throws a shadow far longer than itself, as only low light does: at
dusk, or under a lamp set near the table. The shadow is the *umbra* in the name, and the low light
is the hour the bar opens. The crema on top is the one warm spot, catching the lamp.

- Drawings: `docs/brand/board/logo-a-on-dark.svg`, `logo-a-on-light.svg`, and the simplified
  16 px versions `logo-a-16-on-dark.svg`, `logo-a-16-on-light.svg` (no handle; a solid bowl with a
  crema cap over a thick shadow bar).
- Wordmark: UMBRISTA in capitals, set in the display face below (Big Shoulders Display 800,
  tracked 0.05em) and converted to outlines, so it looks the same with or without the font. The
  outlines are generated into `src/brand/wordmark-path.ts` by `npm run wordmark`.
- Final files, in the approved palette on their own background: `docs/brand/logo-a-mark-on-dark.svg`,
  `logo-a-mark-on-light.svg`, `logo-a-lockup-on-dark.svg`, `logo-a-lockup-on-light.svg`, and the 16 px
  drawing as `logo-a-16-on-dark.svg` and `logo-a-16-on-light.svg`. On light, the crema cap takes the
  day signal colour (`#965000`), not the board's `#C46A0C`, so every colour is in the palette.
- One drawing in code: `src/brand/geometry.ts` holds the full and 16 px drawings and the colours,
  `Logo` (mark, wordmark, lockup) draws from it and follows the day and night tokens, and
  `npm run icons` writes the files below from it.
- Icons, from the same data: `public/favicon.svg` (the 16 px drawing, light or dark by the browser's
  scheme), `favicon.ico` (16 and 32 px with the 16 px drawing, 48 px with the full one),
  `favicon-32.png`, `apple-touch-icon.png` (180, opaque), `icon-192.png`, `icon-512.png`,
  `og-image.png` (1200x630) and `site.webmanifest`.
- The 16 px favicon still needs its check in a real browser tab: it is the quietest of the three
  directions at that size. At 16 px the crema cap falls between pixel rows, so its top edge is soft.
- The scene reuses the motif: cups in the 3D scene cast the same long, low shadow.

## Palette: 1, "Sodium"

Navy ink and the orange of a sodium street lamp. One warm signal colour against the night; crema
only for small details. The day set is an overcast late afternoon, lamps not yet lit.

| Role | Night | Day |
|---|---|---|
| Background | Ink `#0D1524` | Overcast `#DCE3EC` |
| Surface | Dusk `#15203A` | Paper `#EEF2F6` |
| Text | Glass `#E4E8EF` | Ink `#0D1524` |
| Quiet text | Rain `#97A3B8` | Slate `#46536A` |
| Signal (actions, "open now") | Sodium `#F4A13A` | Unlit sodium `#965000` |
| Label on signal | `#0D1524` | `#EEF2F6` |
| Crema (details only) | `#D3B48C` | `#7E6040` |
| Shadow (logo, scene) | `#5B6F93` | `#7D8AA2` |

Computed contrast (WCAG relative luminance):

| Pair | Night | Day |
|---|---|---|
| Text on background | 14.86 | 14.13 |
| Quiet text on background | 7.17 | 6.00 |
| Text on surface | 13.15 | 16.23 |
| Quiet text on surface | 6.35 | 6.90 |
| Signal on background | 8.70 | 4.72 |
| Signal on surface | 7.70 | 5.42 |
| Label on signal | 8.70 | 5.42 |
| Crema on background | 9.29 | 4.47 (large text and details only) |

Rule: crema is never body text. The day signal is a dark amber that can drift towards brown on a
warm background, so it is used on the cool day greys only.

## Type: 1, "Signage"

- Display: **Big Shoulders Display**, variable 100 to 900, `@fontsource/big-shoulders-display`
  (OFL-1.1). Condensed, from a city's signage; set in capitals for headlines and kinetic type.
- Text: **Atkinson Hyperlegible Next**, variable 200 to 800, with italic,
  `@fontsource/atkinson-hyperlegible-next` (OFL-1.1). Built so that easily
  confused letters never are.
- Both are self-hosted through Fontsource; no font is loaded from another origin. Only the latin
  files in use are imported (`src/styles/fonts.ts`): display 800; text 400, 400 italic and 700.

## City: 1, "Calvessa"

A hill port on the Atlantic where the fog rolls in every evening and the trams run all night.
Invented; no real place by that name was found (checked 2026-11-26).

- Café address: Rua das Lanternas 14 (Lantern Street), Calvessa.
- Coordinates for the sunset calculation: 38.81° N, 9.47° W.
- Time zone: `Europe/Lisbon`.
- Hours: open at Calvessa's sunset (17:19 in December, 21:06 in June), close at 03:00 café time.

## Prices

An invented currency, the **crown**, written as a word and never as a symbol, so no price can be
mistaken for a real offer and screen readers say it plainly.

- Menu: the number only, two decimals, tabular figures: `4.60`.
- Totals and confirmations: number and word: `19.10 crowns`.
- At the top of the menu: "Prices in crowns, the money of Calvessa. Nothing here is for sale."
- Prices step in tenths; no `.99` endings.

## Voice

Quiet, warm, a little poetic, never cute. Short sentences. Night-owl humour only in small places:
the 404, empty states, the loading line.

- Say what happens: "Reserve a table" leads to "Your table is held".
- Times are always 24-hour and always labelled café time.
- No exclamation marks and no coffee puns.
- Errors say what went wrong and how to fix it, in plain words.

Approved samples: hero "We open when the light goes." with "A coffee bar in Calvessa, lit from dusk
until three."; 404 "Nothing down here but the dark." with the link "Back to the bar"; confirmation
"Your table is held." followed by the design-project note.

## Motion

- **Like light, not like rubber.** Things fade up and settle the way a lamp warms. No bounces, no
  springs. Scene changes take 0.6 to 1.2 seconds; interface responses 160 to 240 milliseconds.
- **One moment at a time.** A chapter has one moving idea. Everything else holds still.
- **Still is complete.** With reduced motion on, the site becomes still chapters with gentle fades,
  and nobody loses information.

## Generated assets

Every generated asset is listed here, and each one was made only after the owner's go. The full-size
masters stay in Higgsfield and are found again by their job IDs; only web derivatives are committed.

| Asset | Used for | Model | Job | Date |
|---|---|---|---|---|
| Calvessa street at dusk: a fogged hill street with tram rails, one café window lit | Landing chapter 1, Visit | Nano Banana 2, 4K still | `f952dd58` | 2026-11-26 |
| The cup in the rain-streaked window, under one sodium pendant | The window chapter | Nano Banana 2, 4K still | `4ab908a6` | 2026-11-26 |
| Crema macro with backlit steam | Poster for "The craft" | Nano Banana 2, 4K still | `ddba398f` | 2026-11-26 |
| Steam loop: six silent seconds, locked camera, first frame equals last | "The craft" | Seedance 2.5, 1080p (draft `560af24b` first) | `bf93d379` | 2026-11-26 |
| Studio cup and saucer on navy | Reference for the cup model | Nano Banana 2, 4K still | `b22ab85d` | 2026-11-26 |
| The cup and saucer as a 3D model, PBR textures, about 30,000 triangles | Hero cup, Brew-your-own | Meshy image to 3D, from a 1024 px copy of the studio still | `404fdaa5` | 2026-11-26 |
| Coffee surface 1, from above: the espresso's crema | The cup's coffee surface (the cup chapter) | Nano Banana 2, 4K still | `aee4a370` | 2026-11-27 |
| Coffee surface 2, from above: the milk blooming up through the crema | The cup's coffee surface (dusk on the street) | Nano Banana 2, 4K still | `5db64658` | 2026-11-27 |
| Coffee surface 3, from above: a wide rosetta with a foam "lamp cord" and a round dot | The cup's coffee surface (the window, and aged for the last cup) | Nano Banana 2, 4K still | `8389ae19` | 2026-11-27 |
| Coffee surface 4, from above: the last cup | Not used: the owner chose to age surface 3 live instead | Nano Banana 2, 4K still | `6fc56cef` | 2026-11-27 |

Notes:

- The cup's design (a flared low body, thin rim, rounded loop handle, plain white glaze) is
  Umbrista's own, written into the brief; nothing copies a real product.
- The model's back and underside are inferred from one view. Where the foot meets the saucer, the
  saucer's top face stops short of the foot and the page showed through a thin ring (the saucer has
  an open centre). Fixed in the scene, not the asset (plan Task 9): a glazed disc sits just under
  the saucer's inner edge, its middle hidden inside the foot and shaded darker towards it like the
  crevice where a cup sits. The disc's place and size are measured from the model's own vertices
  (`useCupModel`), so nothing was regenerated.
- Web copy of the cup: `public/models/cup.glb`, **0.82 MB** (budget 2 MB), from the 7.6 MB master by
  `npm run models`: meshopt geometry (positions 14 bits, normals 10, texture coordinates 14) and
  WebP textures at 2048 px (quality 86, normal map 94). Same triangles as the master (about 30,000;
  no simplification). Decoded by three's bundled meshopt decoder; nothing is fetched elsewhere.
- The cup's still (`cup-still`, transparent AVIF and WebP at 640 and 1280 px) is not a generated
  asset: `npm run cup-still` renders it from the model with the live scene itself, in the cup's rest
  pose, with its espresso, at night, so the still and the live cup match where the one replaces the
  other.
- The steam loop arrives as HEVC, which not every browser plays; it is always re-encoded to VP9 WebM
  and H.264 MP4.
- The coffee surfaces (owner decision 2026-11-27) replace the code-drawn crema, milk and latte art.
  Their masters are in the git-ignored `media-src/surfaces/`; `npm run media` makes square WebP
  textures at 1024 px (used on the high tier: 306, 255 and 167 KB) and 512 px (other tiers: 78, 64
  and 48 KB), loaded only with the cup's scene. The rosetta took four tries: `e6ea6e4a`,
  `512456b1` and `38d8d10f` were rejected before `8389ae19`. The shader grades all three
  photographs' browns to one hazel crema (owner review 2026-11-27: the photographs' own crema read
  rust-orange under the sodium lamp), leaving the milk and the art white. For the last cup the owner chose
  live ageing over surface 4: as the last chapter begins, the rosetta's edges soften, its sheen
  flattens and its colour mutes, in the shader.
- Planned: one 3D model per menu drink (plan Task 9b), each listed here once the owner approves and it
  is made.
