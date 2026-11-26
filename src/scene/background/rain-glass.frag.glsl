// Written for Umbrista.
//
// Rain on the window in front of the Calvessa street. The photograph is the world outside; this
// shader is the glass. Between drops the glass is lightly misted (the photo blurred and hazed).
// Drops are small lenses: each one shows a sharp, flipped view of the street behind it, with a dark
// rim and a glint where the lamp catches it. Larger drops stick, then slip down in short runs along a
// wandering path, wiping the mist away behind them and leaving a line of beads. The still droplets
// they pass are swallowed into the wake.
//
// Compiled after glow.frag.glsl, which provides SODIUM, applyLamp and gradeScene.
// Defines set by the component: DROP_LAYERS (0 none, 2 one sliding size + droplets, 3 two sizes +
// droplets) and FOG_TAPS (1 or 4).

uniform sampler2D uBackdrop;
uniform vec2 uCoverScale;   // image UV = view UV * scale + offset (object-fit: cover)
uniform vec2 uCoverOffset;
uniform vec2 uParallax;     // x: zoom, y: downward drift of the photo behind the glass
uniform float uScroll;      // 0..1 as the hero scrolls out of view
uniform vec2 uViewPx;       // canvas size in CSS pixels
uniform vec2 uPointer;      // eased lamp position, view UV
uniform vec2 uFocus;        // the lit café window, view UV
uniform float uTime;        // seconds
uniform float uNight;       // 0 overcast dusk .. 1 lamp-lit night
uniform float uIntensity;   // 0 the plain photograph .. 1 the full effect
uniform float uQuality;     // 0 low, 1 mid, 2 high: high adds finer detail to the mist

varying vec2 vUv;

// One glass unit is this many CSS pixels, so drops are the same size on a phone and a monitor.
const float GLASS_PX = 720.0;

// The photograph at a view UV, with the cover crop and the parallax applied.
vec2 photoUv(vec2 view) {
  vec2 v = (view - 0.5) / uParallax.x + 0.5 + vec2(0.0, uParallax.y);
  return v * uCoverScale + uCoverOffset;
}

// A cheap, stable pseudo-random number per cell. Inputs are small integers plus a seed.
float hash21(vec2 p) {
  vec2 q = fract(p * vec2(0.1271, 0.3117) + vec2(0.37, 0.71));
  q += dot(q, q.yx + 5.19);
  return fract((q.x + 0.23) * q.y * 13.7);
}

// Smooth value noise, for the uneven mist.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 1 below `lo`, 0 above `hi`, smooth between. Needs lo < hi.
float fall(float hi, float lo, float x) {
  return 1.0 - smoothstep(lo, hi, x);
}

// A lens of radius `r` centred `d` away. Returns the coverage (antialiased by `aa`) and the
// normalised position inside it, which doubles as the surface slope.
vec3 lens(vec2 d, float r, float aa) {
  // Drops on a window are heavier at the bottom: squash the top half a little.
  d.y *= d.y > 0.0 ? 1.18 : 0.94;
  float len = length(d);
  float cover = 1.0 - smoothstep(r - max(aa, 1e-4), r, len);
  return vec3(cover, d / max(r, 1e-4));
}

struct Glass {
  vec2 bend;    // refraction offset, glass units
  float drop;   // how much of this pixel is water
  float size;   // radius of that drop, glass units
  float wiped;  // how much of the mist a passing drop has cleared
  vec2 slope;   // the water surface's slope, for the rim and the glint
};

// Accumulate one lens into the glass, keeping the strongest drop.
void addLens(inout Glass g, vec3 l, float r) {
  if (l.x <= g.drop) return;
  g.drop = l.x;
  g.size = r;
  g.slope = l.yz;
  // Through a drop the street is seen flipped and from much wider: sample well beyond the opposite
  // side, so each drop near the window holds its own tiny orange window.
  g.bend = -l.yz * r * 4.5;
}

// The path a sliding drop follows down its column, in cell widths: it wanders around snags.
float pathX(float y, float base, float seed) {
  return base + 0.09 * sin(y * 5.3 + seed * 6.28) + 0.05 * sin(y * 13.1 + seed * 17.0);
}

// Drops that stick and slip down the glass. `size` is the column width in glass units.
void slidingDrops(inout Glass g, vec2 p, float t, float size, float seed, float amount) {
  const float TALL = 4.0; // a cell is four columns tall
  vec2 cell = p / vec2(size, size * TALL);
  float column = floor(cell.x);
  cell.y += hash21(vec2(column, seed)) * 9.0; // columns do not line up
  vec2 id = floor(cell);
  vec2 f = vec2(fract(cell.x) - 0.5, fract(cell.y));

  float rA = hash21(id + seed);
  float rB = hash21(id + seed + 17.0);
  float rC = hash21(id + seed + 41.0);
  if (rC > amount) return; // fewer drops when the rain is lighter

  float aa = fwidth(cell.x) * 1.5;

  // One cycle carries the drop from the top of its cell to the bottom, in five stick-and-slip runs.
  // About one drop in eight is a runnel: heavier, it runs three times as fast with only two stops.
  bool runnel = rB > 0.88;
  float stops = runnel ? 2.0 : 5.0;
  float phase = fract(t * (0.035 + 0.035 * rB) * (runnel ? 3.0 : 1.0) + rA);
  float runs = phase * stops;
  float slip = fract(runs);
  float travelled = (floor(runs) + smoothstep(0.62, 1.0, slip)) / stops;
  // While it slips the drop pulls out into a taller teardrop.
  float moving = smoothstep(0.62, 0.72, slip) * fall(1.0, 0.92, slip);
  float y = mix(0.93, 0.07, travelled);

  // Cell widths throughout; y is scaled by TALL to keep the drop round.
  float base = (rB - 0.5) * 0.36;
  float r = (0.1 + 0.06 * rA) * smoothstep(0.0, 0.05, phase) * fall(1.0, 0.93, phase);
  if (r < 1e-3) return;
  vec2 d = vec2(f.x - pathX(y, base, rA), (f.y - y) * TALL);
  d.y /= 1.0 + 0.45 * moving * step(0.0, d.y);
  vec3 l = lens(d, r, aa);
  addLens(g, l, r * size);

  // Above the drop: the wiped wake, and the beads it left behind. Beads sit at fixed places on
  // the glass and appear once the drop has passed them.
  float above = (f.y - y) * TALL;
  if (above > 0.0) {
    float fade = fall(1.1, 0.0, above);
    float dx = abs(f.x - pathX(f.y, base, rA));
    g.wiped = max(g.wiped, fall(r * 0.85, r * 0.35, dx) * fade * 0.8);

    const float SPACING = 0.32; // cell widths between beads
    float yy = f.y * TALL;
    float k = floor(yy / SPACING);
    float rk = hash21(vec2(k, rA * 91.0 + seed));
    float by = (k + 0.3 + 0.4 * rk) * SPACING;
    float behind = by - y * TALL;
    float br = r * (0.2 + 0.22 * rk) * step(0.35, rk) * step(r * 1.3, behind) * fall(2.4, 0.4, behind);
    if (br > 1e-3) {
      vec2 bd = vec2(f.x - pathX(by / TALL, base, rA), yy - by);
      addLens(g, lens(bd, br, aa), br * size);
    }
  }
}

// The still droplets of condensation that bead the glass between runs. They swell slowly and
// vanish when they get heavy, as if they had run off.
void stillDroplets(inout Glass g, vec2 p, float t, float size, float amount) {
  vec2 cell = p / size;
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float rA = hash21(id + 3.1);
  float rB = hash21(id + 7.7);
  if (rB > amount) return;
  float life = fract(t * 0.02 + rA);
  // Mostly tiny beads, a few fuller ones.
  float grown = rB / max(amount, 0.01);
  // A droplet swells from most of its size and fades in, rather than growing from a dot, so even the
  // smallest is a few pixels across: big enough to read as a lens, not a speck.
  float swell = smoothstep(0.0, 0.4, life) * fall(1.0, 0.94, life);
  float r = (0.11 + 0.22 * grown * grown * grown) * (0.6 + 0.4 * swell);
  // The position draws on its own random numbers: tied to the size, the droplets lined up in rows.
  vec2 centre = (vec2(hash21(id + 13.9), hash21(id + 29.3)) - 0.5) * (0.98 - 2.0 * r);
  float aa = fwidth(cell.x) * 1.5;
  vec3 l = lens(f - centre, r, aa);
  l.x *= smoothstep(0.0, 0.2, swell);
  // A passing drop swallows the droplets in its wake.
  l.x *= 1.0 - g.wiped;
  addLens(g, l, r * size);
}

vec3 sampleLinear(vec2 uv, float bias) {
  return texture2D(uBackdrop, uv, bias).rgb;
}

void main() {
  vec2 view = vUv;
  vec2 uv = photoUv(view);

  // Intensity 0 is the photograph exactly as the still shows it.
  if (uIntensity <= 0.0) {
    gl_FragColor = vec4(sampleLinear(vUv * uCoverScale + uCoverOffset, 0.0), 1.0);
    #include <colorspace_fragment>
    return;
  }

  vec2 glassPerUv = uViewPx / GLASS_PX;     // view UV -> glass units
  vec2 p = view * glassPerUv;               // this pixel on the glass
  vec2 lamp = uPointer * glassPerUv;
  vec2 toLamp = p - lamp;
  float rain = mix(0.55, 1.0, uNight) * uIntensity;

  vec3 photo = sampleLinear(uv, 0.0);
  vec3 colour = photo;
  float mist = 0.0;

#if DROP_LAYERS > 0
  Glass g = Glass(vec2(0.0), 0.0, 0.0, 0.0, vec2(0.0));
  float t = uTime;
  slidingDrops(g, p, t, 0.16, 1.0, 0.8 * rain + 0.15);
#if DROP_LAYERS > 2
  slidingDrops(g, p + vec2(0.37, 0.0), t * 1.2, 0.085, 7.0, 0.75 * rain);
#endif
  // Two offset grids of droplets at different pitches, so no rows or columns show through.
  stillDroplets(g, p, t, 0.031, 0.3 + 0.25 * rain);
  stillDroplets(g, p + vec2(0.413, 0.271), t * 1.3, 0.022, 0.25 + 0.2 * rain);

  // The mist: uneven, drifting very slowly, and thickest away from the lit café window, so the
  // heart of the photograph stays clear.
  float clearing = smoothstep(0.06, 0.45, length((view - uFocus) * vec2(glassPerUv.x / glassPerUv.y, 1.0)));
  float grain = noise(p * 2.2 + vec2(0.0, t * 0.01));
  if (uQuality > 1.5) grain = mix(grain, noise(p * 7.3 - vec2(t * 0.004, 0.0)), 0.3);
  mist = (0.3 + 0.35 * grain) * (0.15 + 0.85 * clearing);
  mist *= (1.0 - g.wiped) * uIntensity;

  // Misted glass: the street softened (a coarser mip) and lightly veiled.
#if FOG_TAPS > 1
  vec2 spread = 3.0 / uViewPx * uCoverScale;
  vec3 soft = 0.25 * (sampleLinear(uv + spread * vec2(1.0, 0.4), 2.6) +
                      sampleLinear(uv - spread * vec2(1.0, 0.4), 2.6) +
                      sampleLinear(uv + spread * vec2(-0.4, 1.0), 2.6) +
                      sampleLinear(uv - spread * vec2(-0.4, 1.0), 2.6));
#else
  vec3 soft = sampleLinear(uv, 2.8);
#endif
  vec3 veil = mix(vec3(0.008, 0.011, 0.018), vec3(0.05, 0.06, 0.075), 1.0 - uNight);
  vec3 misted = mix(soft, soft * 0.9 + veil, 0.5);
  // The condensation itself catches the lamp: night is near black, so this has to be added light.
  float lampStrength = mix(0.45, 1.0, uNight) * (1.0 - 0.4 * uScroll);
  misted += SODIUM * lampFalloff(toLamp).y * 0.08 * lampStrength;
  colour = mix(photo, misted, mist);

  // Through the water: a sharp, flipped view of the street, a dark rim, and a glint of lamp.
  if (g.drop > 0.0) {
    vec2 bendUv = g.bend / glassPerUv * uCoverScale / uParallax.x;
    vec3 through = sampleLinear(uv + bendUv, 0.0);
    // Water bends the light away at its edge, so a drop is outlined dark, most of all along its thin
    // top. Light focused through the drop pools in a bright crescent just inside its lower edge.
    // A drop only a few pixels wide would be all rim, a ring rather than a lens, so small drops
    // keep their rim faint.
    float edge = length(g.slope);
    float rimmed = smoothstep(2.0, 6.0, g.size * GLASS_PX);
    through *= mix(1.0, 0.25, smoothstep(0.55, 1.0, edge) * (0.65 + 0.35 * g.slope.y) * rimmed);
    float crescent = smoothstep(0.45, 0.85, edge) * smoothstep(0.3, 0.9, -g.slope.y);
    through *= 1.0 + 0.3 * crescent;
    through += vec3(0.03, 0.035, 0.045) * crescent;
    // The lamp catches the side of the drop facing it; a pinpoint of sky sits near the top.
    vec2 toward = normalize(-toLamp + vec2(1e-4));
    vec2 lampFall = lampFalloff(toLamp);
    // A pale warm point, only on drops big enough to hold one.
    float glint = fall(0.2, 0.0, length(g.slope - toward * 0.72)) * smoothstep(0.004, 0.014, g.size);
    float strength = mix(0.35, 1.0, uNight);
    through += mix(SODIUM, vec3(1.0, 0.85, 0.6), 0.45) * glint * (0.9 * lampFall.x + 0.6 * lampFall.y) * strength;
    through += vec3(0.09, 0.10, 0.12) * fall(0.22, 0.0, length(g.slope - vec2(-0.3, 0.45)));
    // Water carries the lamp as the mist does, so drops in its light never read as holes.
    through += SODIUM * lampFall.y * 0.1 * lampStrength;
    colour = mix(colour, through, g.drop * uIntensity);
  }
#endif

  colour = gradeScene(colour, uNight);
  // The lamp dims a little as the hero scrolls away, so the moment recedes with it.
  colour = applyLamp(colour, toLamp, mist, mix(0.45, 1.0, uNight) * (1.0 - 0.4 * uScroll) * uIntensity);
  colour = mix(photo, colour, uIntensity);

  gl_FragColor = vec4(shoulder(colour), 1.0);
  #include <colorspace_fragment>
  // Half a level of noise breaks up banding in the dark, smooth gradients of the night sky. The
  // threshold steps through the plastic-number (R2) sequence per pixel, which never forms rows.
  vec2 px = floor(gl_FragCoord.xy);
  gl_FragColor.rgb += (fract(0.5 + px.x * 0.7548776662 + px.y * 0.5698402910) - 0.5) / 255.0;
}
