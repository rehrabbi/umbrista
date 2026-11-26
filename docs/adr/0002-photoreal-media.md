# ADR 0002: Photoreal media under live effects

Status: Accepted
Date: 2026-11-26

## Context

ADR 0001 planned the 3D moments as procedural geometry and shaders, with generated assets as an
option. After the brand board, the owner set the bar higher: the site must look real, at the level of
the reference reels, not drawn or code-built. A look-development round tested both routes: an
original cup modelled in Blender, and photoreal stills, a video loop and a 3D model generated from
briefs written for Umbrista. The owner then approved a working preview of the landing page built from
the generated media.

## Decision

- **Photoreal media is the base.** Generated stills (Calvessa at dusk, the rain window, the crema)
  and short silent video loops (the steam) carry the look. Each asset is proposed with its brief,
  model and cost, and generated only on the owner's go.
- **The cup is a generated 3D model** (glTF with PBR textures), lit live with React Three Fiber, so
  it can be turned, tilted and rippled, and reused for Brew-your-own. A code-built liquid surface
  sits over its crema so the coffee can change colour and move.
- **Live effects stay code.** Rain on glass that refracts the photo, a lamp glow that follows the
  pointer, depth parallax on scroll and the night grade are GLSL over the media. This is what keeps
  the site feeling alive rather than a slideshow.
- **Delivery is web-first.** Only derivatives are committed: AVIF and WebP stills, VP9 WebM and
  H.264 MP4 loops with posters, and the model compressed with meshopt and WebP textures, decoded
  locally. Masters stay in Higgsfield, found by their job IDs in `docs/brand.md`.

## Alternatives considered

- **Code-built 3D only** (a lathe cup and procedural shaders). Fully reproducible and tiny, but in
  testing it read as a clean render, not a photograph, which misses the owner's bar.
- **An original cup modelled in Blender** (free, through a hosted Blender scene). The design was
  ours and the model editable, but reaching photoreal would take many material and lighting passes;
  the generated model was there in one step and looked real from every side.
- **Video only** (a pre-rendered scroll film). The most cinematic, but heavy, hard to keep under the
  performance budget, and not interactive.

## Consequences

- Visual assets cost credits and need the owner's go one by one; the register in `docs/brand.md`
  is the source of truth.
- The repository cannot regenerate the masters; it can rebuild every web derivative from local
  copies with `npm run media`.
- Media weight becomes the main performance risk: loops load near the viewport and pause off screen,
  the first still is the preloaded LCP image, and the model is compressed before it ships.
- Reduced motion and missing WebGL still get the full story: posters instead of loops, stills
  instead of the canvas.
