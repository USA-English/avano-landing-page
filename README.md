# AVANO Landing Page Prototype

Static first-viewport landing page prototype for AVANO.

The hero samples `uploads/avano-animation-svg.svg` into 11,000 canvas particles.
Particles loop through drift, exact-logo resolve, hold, and dissolve states,
with mouse movement disturbing the field.

## Logo Asset

Upload the exact AVANO SVG logo to:

```text
uploads/avano-animation-svg.svg
```

The animation no longer falls back to a generated AVANO word. If this file is
missing or cannot be sampled, the particles remain in drift and the browser
console reports the asset problem.

## Typography

Project fonts live in:

```text
fonts/
```

Typography usage:

- Titles: Cormorant SC
- Subtitles and secondary titles: Cinzel
- Regular text: Inria Serif

Available font weights:

- Cormorant SC: 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 700 Bold
- Cinzel: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold, 900 Black
- Inria Serif: 300 Light, 400 Regular, 700 Bold
- Inria Serif italic: 300 Light Italic, 400 Italic, 700 Bold Italic

## Deploying

This folder can be deployed directly to Vercel as a static site. Use this folder
as the project root and leave the build command/output directory empty.
