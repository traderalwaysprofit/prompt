# Headless Visual Generator Pipeline V1

## Purpose

Generate deterministic 9:16 educational poster assets for Belajar Forex Malang without manual layout work.

Output contract:

- SVG: 1080 x 1920
- PNG: 1080 x 1920
- Visual direction: dark retro terminal / 8-bit pixel aesthetic
- High contrast accent blocks
- Attribution is always exactly `by belajarforexmalang`
- No logo is rendered
- No remote font, remote image, or network dependency is embedded in the SVG

## Generate the default poster

```bash
npm run visual:generate
```

Default output:

```text
dist-visuals/forex-rule-card.svg
dist-visuals/forex-rule-card.png
```

## Generate from a JSON payload

```bash
npm run visual:generate -- \
  --input examples/visuals/forex-rule-card.json \
  --name forex-risk-card \
  --outdir dist-visuals
```

The generator accepts one to three content blocks. Each block contains a tag, a six-digit hexadecimal accent color, and body lines. Runtime validation uses Zod before any SVG is generated.

The CLI runs as TypeScript through `tsx`; repository type-checking includes Node.js type definitions for filesystem/path/process APIs used by the renderer.

## Payload contract

```json
{
  "systemStatus": "OPTIMIZED",
  "topicTitle": "RULE EKSEKUSI TRADING & INFRA",
  "items": [
    {
      "tag": "RISK MANAGEMENT",
      "tagColor": "#FF0055",
      "lines": ["Max risk per trade: 1%", "RR minimum 1:2"]
    }
  ],
  "footerAction": "DEPLOY DISCIPLINE_"
}
```

## Safety and rendering rules

- All dynamic text is XML-escaped.
- `tagColor` must match `#RRGGBB`; attribute injection is rejected.
- Maximum three visual blocks.
- Long body content is wrapped and clipped to the block budget so layout does not require manual resizing.
- No Google Fonts `@import` is used. The renderer uses the local monospace font available in the headless runtime.
- The SVG contains no `<image>` element and therefore cannot fetch remote imagery during rasterization.
- `@resvg/resvg-js` performs the SVG-to-PNG rasterization headlessly.

## CI contract

Vitest covers:

- 1080 x 1920 layout contract
- strict attribution
- no logo / no remote font dependency
- XML escaping
- color attribute injection rejection
- bounded text layout
- actual `resvg` raster generation
- PNG magic bytes and IHDR dimensions

Because these tests are included by the repository-wide `npm run test:run`, they are automatically enforced by the existing CI/CD guard before merge.

## Scope

V1 is a deterministic visual renderer, not an image-generation model. It is optimized for repeatable infographic cards whose layout and branding rules must remain stable across runs.
