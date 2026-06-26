# AVANO Landing Page Prototype

Static first-viewport landing page prototype for AVANO.

The hero samples `uploads/avano-animation-svg.svg` into 11,000 canvas particles. The particles loop through drift, exact-logo resolve, hold, and dissolve states, with mouse movement disturbing the field.

## Logo Asset

Upload the exact AVANO SVG logo to:

```text
uploads/avano-animation-svg.svg
```

The animation does not fall back to a generated AVANO word. If this file is missing or cannot be sampled, the particles will remain in drift and the browser console will report the asset problem.

## Deploying

Deploy this repository directly to Vercel as a static site. Keep the project root at the repository root. No framework or build command is required for this first iteration.
