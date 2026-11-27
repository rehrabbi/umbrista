/*
 * The coffee's surface in the hero cup: a disc built in code, drawn just over the model's own crema,
 * so that it can ripple, change colour, take the milk and bloom into latte art. The pattern is all
 * procedural (value noise, stacked crescents for the art), written for Umbrista.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import type { LiquidLook } from './liquidLook'

/** Rings from the centre to the wall, and points around each ring. */
const RINGS = 48
const SEGMENTS = 128
/** How high the meniscus climbs the wall, and over how wide a band, as fractions of the radius. */
const MENISCUS_HEIGHT = 0.035
const MENISCUS_WIDTH = 0.06

/** The meniscus: the surface creeps up the wall in a thin band at the edge. */
function meniscus(r: number, radius: number): number {
  return MENISCUS_HEIGHT * radius * Math.exp(-(radius - r) / (MENISCUS_WIDTH * radius))
}

/**
 * The coffee's surface for a cup whose inside radius at the coffee is `radius`: a disc of rings,
 * flat in the middle and curving up at the wall. Lies in the xz plane at y = 0, facing up, with
 * uv = the disc mapped onto 0..1.
 */
export function liquidSurface(radius: number): BufferGeometry {
  const count = 1 + RINGS * SEGMENTS
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  positions.set([0, meniscus(0, radius), 0], 0)
  normals.set([0, 1, 0], 0)
  uvs.set([0.5, 0.5], 0)
  const normal = new Vector3()
  for (let ring = 1; ring <= RINGS; ring++) {
    // Rings crowd towards the wall, where the meniscus curves.
    const t = ring / RINGS
    const r = radius * (1 - (1 - t) * (1 - t) * 0.5 - (1 - t) * 0.5)
    const y = meniscus(r, radius)
    const slope = y / (MENISCUS_WIDTH * radius)
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * Math.PI * 2
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const index = 1 + (ring - 1) * SEGMENTS + segment
      positions.set([x, y, z], index * 3)
      normal.set(-Math.cos(angle) * slope, 1, -Math.sin(angle) * slope).normalize()
      normals.set([normal.x, normal.y, normal.z], index * 3)
      uvs.set([0.5 + x / (2 * radius), 0.5 + z / (2 * radius)], index * 2)
    }
  }
  const indices: number[] = []
  for (let segment = 0; segment < SEGMENTS; segment++) {
    const next = (segment + 1) % SEGMENTS
    indices.push(0, 1 + next, 1 + segment)
  }
  for (let ring = 1; ring < RINGS; ring++) {
    const inner = 1 + (ring - 1) * SEGMENTS
    const outer = inner + SEGMENTS
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const next = (segment + 1) % SEGMENTS
      indices.push(inner + segment, inner + next, outer + segment)
      indices.push(inner + next, outer + next, outer + segment)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

/** The uniforms the liquid's shader reads, kept on the material so a frame can write them. */
export interface LiquidUniforms {
  uTime: { value: number }
  uRadius: { value: number }
  uSlosh: { value: number }
  uSloshDir: { value: Vector2 }
  uCoffee: { value: Color }
  uCrema: { value: number }
  uMilk: { value: number }
  uSwirl: { value: number }
  uPour: { value: number }
  uArt: { value: number }
  uCool: { value: number }
  /** Turns the art in the cup, in radians, so its head points away from the drinker. */
  uArtAngle: { value: number }
}

const NOISE = /* glsl */ `
float lqHash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float lqNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lqHash(i), lqHash(i + vec2(1.0, 0.0)), u.x), mix(lqHash(i + vec2(0.0, 1.0)), lqHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float lqFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * lqNoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3;
    amp *= 0.5;
  }
  return sum;
}
`

/*
 * The surface's height, for ripples: rings spreading from the middle after a splash, and a slow
 * sway across the cup when it is tilted or spun. All of it scales with the slosh, so a still cup
 * has a flat surface.
 */
const HEIGHT = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform float uSlosh;
uniform vec2 uSloshDir;
float lqHeight(vec2 p) {
  float r = length(p);
  float rings = sin(r * 26.0 - uTime * 7.0) * exp(-r * 1.6) * 0.018;
  float sway = dot(p, uSloshDir) * cos(uTime * 4.2) * 0.03;
  return uSlosh * (rings + sway) * uRadius * smoothstep(1.0, 0.85, r);
}
`

const VERTEX_HEAD = /* glsl */ `
${HEIGHT}
varying vec2 vDisc;
`

const VERTEX_NORMAL = /* glsl */ `
vec2 lqP = position.xz / uRadius;
float lqE = 0.01;
float lqDx = (lqHeight(lqP + vec2(lqE, 0.0)) - lqHeight(lqP - vec2(lqE, 0.0))) / (2.0 * lqE * uRadius);
float lqDz = (lqHeight(lqP + vec2(0.0, lqE)) - lqHeight(lqP - vec2(0.0, lqE))) / (2.0 * lqE * uRadius);
vec3 objectNormal = normalize(normal + vec3(-lqDx, 0.0, -lqDz));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif
`

const VERTEX_POSITION = /* glsl */ `
vec3 transformed = vec3(position);
transformed.y += lqHeight(lqP);
vDisc = lqP;
`

const FRAGMENT_HEAD = /* glsl */ `
uniform float uTime;
uniform vec3 uCoffee;
uniform float uCrema;
uniform float uMilk;
uniform float uSwirl;
uniform float uPour;
uniform float uArt;
uniform float uCool;
uniform float uArtAngle;
varying vec2 vDisc;
${NOISE}

vec3 lqSrgb(vec3 c) { return pow(c, vec3(2.2)); }

/* Signed distance-like value for an ellipse: negative inside, 0 on the edge (in units of its size). */
float lqEllipse(vec2 p, vec2 centre, vec2 size) {
  return length((p - centre) / size) - 1.0;
}

/*
 * The latte art: a tulip. Milk pushed forward in four pours leaves four lobes stacked up the cup,
 * the largest at the bottom; each lobe's lower edge shows as a thin brown arc across the one below
 * it, where the crema was folded in. The last pass draws the jug through the middle, which pinches
 * every arc into a shallow V and leaves a fine white tail. In \`q\`, the art's own frame (-1..1 across
 * the cup, its head towards +y), it grows from the first round blob as it blooms; cooling blurs its
 * edges. Returns how much foam covers the point (0..1).
 */
float lqArt(vec2 q, float bloom, float cool) {
  if (bloom <= 0.001) return 0.0;
  // Milk never lands as a perfect curve.
  vec2 wobble = vec2(lqFbm(q * 2.7 + 11.0), lqFbm(q * 2.7 - 5.0)) - 0.5;
  q += wobble * 0.06;
  float grow = smoothstep(0.0, 0.8, bloom);
  float scale = mix(0.36, 1.22, grow);
  vec2 p = q / scale;
  float edge = mix(0.03, 0.1, cool) / scale;
  // The pull-through bends every arc down at the middle.
  float pinch = 0.09 * exp(-abs(p.x) * 7.0) * smoothstep(0.7, 1.0, bloom);
  float foam = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float shown = smoothstep(0.12 + fi * 0.18, 0.3 + fi * 0.18, bloom);
    vec2 centre = vec2(0.0, -0.36 + fi * 0.21);
    vec2 size = vec2(0.5 - fi * 0.095, 0.32 - fi * 0.045);
    float e = lqEllipse(p + vec2(0.0, pinch), centre, size);
    float lobe = (1.0 - smoothstep(-edge, edge, e)) * shown;
    // The brown arc along this lobe's lower edge, over the lobe below it.
    float arc = (1.0 - smoothstep(0.0, 0.05 + edge, abs(e))) * step(p.y + pinch, centre.y) * step(0.5, fi) * shown;
    foam = max(foam, lobe);
    foam = min(foam, 1.0 - arc * 0.85);
  }
  // The pull-through's tail: a fine white line out of the bottom lobe.
  float tail = (1.0 - smoothstep(0.008, 0.02 + edge, abs(p.x + 0.01 * sin(p.y * 9.0)))) * step(-0.78, p.y) * step(p.y, -0.5);
  foam = max(foam, tail * smoothstep(0.8, 1.0, bloom));
  return clamp(foam, 0.0, 1.0);
}

/* The colour of the coffee's surface at a point of the disc, in linear light. */
vec3 lqSurface(vec2 p) {
  float r = length(p);
  // Crema: hazel in the middle, darker towards the wall, mottled into soft tiger stripes, with dark
  // flecks and a ring of fine bubbles where it meets the cup.
  vec3 cremaLight = lqSrgb(vec3(0.70, 0.47, 0.25));
  vec3 cremaMid = lqSrgb(vec3(0.55, 0.33, 0.15));
  vec3 cremaDark = lqSrgb(vec3(0.30, 0.16, 0.06));
  float mottle = lqFbm(p * 3.2 + vec2(3.1, 1.7));
  float tiger = lqFbm(vec2(p.x * 2.4 + mottle * 1.6, p.y * 7.0 - mottle));
  vec3 crema = mix(cremaLight, cremaMid, smoothstep(0.25, 0.75, mottle + r * 0.35));
  crema = mix(crema, cremaDark, smoothstep(0.58, 0.86, tiger) * 0.4);
  float flecks = smoothstep(0.78, 0.92, lqNoise(p * 85.0)) * smoothstep(0.3, 0.8, lqFbm(p * 7.0 + 4.0));
  crema = mix(crema, cremaDark * 0.7, flecks * 0.5);
  float fine = lqNoise(p * 160.0);
  crema *= 0.94 + 0.12 * fine;
  float bubbles = smoothstep(0.7, 0.97, r) * smoothstep(0.72, 0.9, lqNoise(p * 60.0 + 2.0));
  crema = mix(crema, cremaLight * 1.1, bubbles * 0.45);
  crema = mix(crema, cremaDark, smoothstep(0.82, 1.0, r) * 0.5);

  vec3 body = uCoffee;
  vec3 colour = mix(body, crema, uCrema);

  // Milk: it turns the cup towards a latte brown...
  vec3 foamColour = lqSrgb(mix(vec3(0.95, 0.92, 0.86), vec3(0.86, 0.8, 0.71), uCool));
  vec3 canvas = mix(colour, body * 1.1 + crema * 0.2, uMilk * 0.75);
  // ...and while it goes in, it marbles through the crema in soft streaks that curl with the pour.
  float turn = r * 3.5 - uTime * 0.18;
  vec2 swirled = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p;
  float marble = lqFbm(swirled * 2.2 + 1.3);
  float streak = smoothstep(0.48, 0.7, marble + (uMilk - 0.5) * 0.3);
  vec3 marbled = mix(canvas, mix(canvas, foamColour, 0.55), streak * uMilk);
  colour = mix(canvas, marbled, uSwirl);

  // The art, in its own frame: the head points away from the drinker, the handle to one side.
  vec2 q = mat2(cos(uArtAngle), sin(uArtAngle), -sin(uArtAngle), cos(uArtAngle)) * p;
  // Where the stream lands (the art's base), the milk wells up white before it spreads.
  float landing = uPour * (1.0 - smoothstep(0.04, 0.26, length(q - vec2(0.0, -0.34))));
  float art = max(lqArt(q, uArt, uCool), landing * 0.9);
  // Foam is micro-bubbles: never flat white, thinner (browner) where it spreads out at its edges.
  float grain = lqFbm(q * 18.0 + 3.0);
  vec3 foam = foamColour * (0.93 + 0.1 * grain);
  vec3 halo = mix(canvas, lqSrgb(vec3(0.74, 0.56, 0.38)), 0.6);
  colour = mix(colour, halo, smoothstep(0.0, 0.25, art) * 0.5 * (1.0 - uCool * 0.5));
  colour = mix(colour, foam, smoothstep(0.15, 1.0, art));

  // Cooling greys and dulls the whole surface a little.
  float grey = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  colour = mix(colour, vec3(grey) * vec3(1.03, 0.98, 0.93), uCool * 0.2);
  return colour;
}
`

const FRAGMENT_COLOUR = /* glsl */ `
vec4 diffuseColor = vec4( lqSurface(vDisc), opacity );
`

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
// Fresh crema and foam are wet and glossy; a cooled cup has lost its sheen.
roughnessFactor = mix(roughnessFactor, 0.62, uCool);
`

/**
 * The liquid's material: three's physical material (so it takes the scene's lamps, environment and
 * clearcoat sheen like everything else) with the surface's colour and ripples written into it.
 */
export function createLiquidMaterial(radius: number): MeshPhysicalMaterial & { userData: { uniforms: LiquidUniforms } } {
  const uniforms: LiquidUniforms = {
    uTime: { value: 0 },
    uRadius: { value: radius },
    uSlosh: { value: 0 },
    uSloshDir: { value: new Vector2(1, 0) },
    uCoffee: { value: new Color() },
    uCrema: { value: 1 },
    uMilk: { value: 0 },
    uSwirl: { value: 0 },
    uPour: { value: 0 },
    uArt: { value: 0 },
    uCool: { value: 0 },
    uArtAngle: { value: 0 },
  }
  const material = new MeshPhysicalMaterial({
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    sheen: 0.4,
    sheenRoughness: 0.6,
  }) as MeshPhysicalMaterial & { userData: { uniforms: LiquidUniforms } }
  material.userData.uniforms = uniforms
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <beginnormal_vertex>', VERTEX_NORMAL)
      .replace('#include <begin_vertex>', VERTEX_POSITION)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', FRAGMENT_COLOUR)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
  }
  // One program for every liquid, whatever its radius.
  material.customProgramCacheKey = () => 'umbrista-liquid-2'
  return material
}

/** Write a look into the liquid's uniforms. The coffee colour arrives as sRGB and is stored linear. */
export function applyLook(uniforms: LiquidUniforms, look: LiquidLook): void {
  uniforms.uCoffee.value.setRGB(look.coffee[0], look.coffee[1], look.coffee[2], SRGBColorSpace)
  uniforms.uCrema.value = look.crema
  uniforms.uMilk.value = look.milk
  uniforms.uSwirl.value = look.swirl
  uniforms.uPour.value = look.pour
  uniforms.uArt.value = look.art
  uniforms.uCool.value = look.cool
}
