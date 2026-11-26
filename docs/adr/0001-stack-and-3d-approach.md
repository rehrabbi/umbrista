# ADR 0001: Stack and 3D approach

Status: Accepted; the 3D asset approach is superseded by
[ADR 0002](0002-photoreal-media.md)
Date: 2026-11-26

## Context

Umbrista needs cinematic real-time 3D, scroll-driven choreography, real forms with a backend, and a
staff view, all on free services (Vercel hosting, Neon Postgres), with a strict security policy and
performance and accessibility budgets. The design is
`docs/specs/2026-11-26-umbrista-design.md`; section 5 holds the calls this record
explains.

## Decision

- **App:** Vite, React and TypeScript, with React Router and lazily loaded routes.
- **3D:** Three.js through React Three Fiber and drei, with custom GLSL shaders for steam, rain,
  liquid and glow. One shared canvas hosts the four 3D moments.
- **Scroll and motion:** GSAP with ScrollTrigger and Lenis for the scroll journey; Motion
  (`motion/react`) for interface motion.
- **Backend:** Vercel serverless functions in TypeScript in front of Neon Postgres. The browser never
  talks to the database; functions validate every input, apply per-visitor rate limits and use
  parameterised SQL. Schema changes are versioned migrations in the repository.
- **Staff view:** our own sign-in (hashed passwords, server-side sessions in an `HttpOnly`, `Secure`,
  `SameSite` cookie, sign-in rate limiting, accounts created only from a command-line script), plus a
  demo path served by a separate database role that cannot read real data.
- **Tests:** Vitest and Testing Library for logic and components; Playwright for end-to-end flows.
- **Fonts:** self-hosted through `@fontsource`, so the Content Security Policy can stay strict.
- **3D assets:** original only. Procedural geometry and shaders where possible; generated assets only
  with the owner's go per asset.

## Alternatives considered

- **Next.js instead of Vite.** More built in, but the site is a single-page experience around one
  shared canvas, and a server-rendering framework adds concepts and hosting behaviour without
  helping the 3D. Vite keeps the build small and the CSP simple.
- **Raw Three.js without React Three Fiber.** Maximum control, but scene state and interface state
  would be wired by hand. React Three Fiber lets the 3D follow the same component and state model as
  the rest of the site.
- **A hosted 3D or animation tool (Spline, Rive).** Quick to start, but it loads code and assets from
  another origin, which the CSP forbids, and it hides the shader and performance work the project
  exists to show.
- **Pre-made 3D models or stock footage.** Faster, but breaks the original-assets rule and tends to
  look templated.
- **A hosted backend service (Supabase, Firebase) called from the browser.** Less code, but moves
  trust to the client and weakens the separation between demo and real data. Serverless functions
  with a database role per path keep that separation enforced by the server.
- **A third-party sign-in provider.** Less to maintain, but the project is meant to show sign-in done
  carefully, as SentinelOps does.

## Consequences

- Every approved dependency is a deliberate choice; adding another needs the owner's approval.
- A strict CSP (`connect-src 'self'`, no inline script or style, no third-party origins) constrains
  the libraries: nothing may fetch from a CDN at runtime.
- Heavy 3D must degrade: capped pixel ratio, effects dropped on weak devices, rendering paused when
  hidden or off screen, and static stills when WebGL is missing or lost.
- The backend and its tests are ours to maintain, in exchange for a clear trust boundary and a
  demonstrable demo/real separation.
- The free plans set limits (Neon storage and compute, Vercel function time); the design keeps data
  small and retention short.
