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

None yet. Every generated asset is listed here (what it is, where it is used, the model, the date),
and each one needs the owner's go before it is made.
