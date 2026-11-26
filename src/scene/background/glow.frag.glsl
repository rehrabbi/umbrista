// Written for Umbrista.
//
// The lamp and the grade. A soft sodium light that follows the visitor's pointer, and the grade
// that turns the dusk photograph into overcast dusk (night 0) or lamp-lit night (night 1).
// Functions only: rain-glass.frag.glsl declares the uniforms and calls these. Colours are linear.

// The brand's sodium, #F4A13A, in linear light. The only saturated hue the scene adds.
const vec3 SODIUM = vec3(0.905, 0.356, 0.042);
// Ink, #0D1524, in linear light: where the night grade sinks the shadows.
const vec3 INK = vec3(0.0040, 0.0075, 0.0176);

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// How much of the lamp reaches a point `d` away from it (glass units, about 720 CSS px each).
// x: a tight pool that lights what is behind the glass. y: a wide halo the misted glass scatters.
vec2 lampFalloff(vec2 d) {
  float r2 = dot(d, d);
  float pool = exp(-r2 * 22.0);
  float halo = exp(-r2 * 6.0);
  return vec2(pool, halo);
}

// Light the photograph with the lamp. The pool multiplies the photo, so it warms surfaces without
// lifting the black; the halo is added, and grows where the glass is misted. `strength` is 0..1.
vec3 applyLamp(vec3 photo, vec2 d, float mist, float strength) {
  vec2 f = lampFalloff(d) * strength;
  // Surfaces already bright (the window itself) have no headroom left, so the pool spares them.
  vec3 lit = photo + photo * SODIUM * f.x * 2.4 * (1.0 - smoothstep(0.08, 0.5, luma(photo)));
  lit += SODIUM * (f.x * 0.06 + f.y * (0.025 + 0.03 * mist));
  return lit;
}

// Roll highlights off by their brightest channel, so an over-lit window stays orange instead of
// clipping to yellow or white. Below the knee nothing changes.
vec3 shoulder(vec3 c) {
  const float KNEE = 0.8;
  float m = max(max(c.r, c.g), c.b);
  if (m <= KNEE) return c;
  float rolled = KNEE + (1.0 - KNEE) * (1.0 - exp((KNEE - m) / (1.0 - KNEE)));
  return c * (rolled / m);
}

// How warm a colour is: high on the lit window and its reflections, zero on the blue dusk.
float warmth(vec3 c) {
  return smoothstep(0.004, 0.05, c.r - c.b) * smoothstep(0.004, 0.03, luma(c));
}

// The two grades, blended by `night`. Both start from the same dusk photograph.
vec3 gradeScene(vec3 c, float night) {
  float y = luma(c);
  float warm = warmth(c);

  // Overcast dusk: the lamps are not lit yet. A little cooler, a little lighter, the warm light
  // drained towards grey.
  vec3 day = mix(c, vec3(y), 0.18 + 0.25 * warm);
  day = day * vec3(0.94, 1.0, 1.08) * 1.12 + vec3(0.004, 0.006, 0.009);

  // Lamp-lit night: the shadows sink towards ink and the sodium pools come up.
  vec3 deep = c * mix(vec3(0.88, 0.92, 1.0), vec3(1.0), warm);
  deep = mix(INK, deep, smoothstep(0.0, 0.02, y) * 0.4 + 0.6);
  // Dim warm light (reflections, spill on the cobbles) gains most; the bright window has no headroom.
  deep += c * SODIUM * warm * 0.9 * (1.0 - smoothstep(0.05, 0.4, y));

  return mix(day, deep, night);
}
