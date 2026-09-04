# Headless Visual Generator Pipeline V1

## Purpose

Generate deterministic 9:16 educational poster assets for Belajar Forex Malang without manual layout work.

Output contract:

- SVG: 1080 × 1920
- PNG: 1080 × 1920
- Visual direction: dark retro terminal / 8-bit pixel aesthetic
- High contrast accent blocks
- Attribution is always exactly `by belajarforexmalang`
- No logo is rendered
- No remote font, remote image, or network dependency is embedded in the SVG

## Generate locally

Default poster:

```bash
npm run visual:generate
```

From a reviewed JSON payload:

```bash
npm run visual:generate -- \
  --input examples/visuals/forex-rule-card.json \
  --name forex-risk-card \
  --outdir dist-visuals
```

Default output:

```text
dist-visuals/forex-risk-card.svg
dist-visuals/forex-risk-card.png
```

The generator accepts one to three content blocks. Each block contains a tag, a six-digit hexadecimal accent color, and body lines. Runtime validation uses Zod before any SVG is generated.

## GitHub artifact workflow

The visual renderer is now operational through a manual, non-publishing GitHub workflow:

```text
Actions → Visual Artifact Generator
```

Inputs:

- `input_path` — reviewed JSON payload committed to the repository;
- `output_name` — safe output base name.

The workflow:

1. checks out the repository;
2. installs locked dependencies;
3. runs the visual generator/render tests;
4. generates SVG + PNG;
5. verifies both output files exist;
6. uploads them as a GitHub Actions artifact retained for 14 days.

It does **not** publish, schedule, or upload the asset to Instagram/Meta/other social platforms.

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
- Output filename is allowlisted by the CLI.

## CI contract

Vitest covers:

- 1080 × 1920 layout contract;
- strict attribution;
- no logo / no remote font dependency;
- XML escaping;
- color attribute injection rejection;
- bounded text layout;
- actual `resvg` raster generation;
- PNG magic bytes and IHDR dimensions.

Because these tests are included in `npm run test:run`, they remain enforced by the protected CI/CD guard before merge.

## Recommended operational lifecycle

```text
Content brief
   ↓
Reviewed JSON payload
   ↓
Visual Artifact Generator
   ↓
SVG + PNG
   ↓
Human visual QA
   ↓
Approved asset
   ↓
Separate explicit publish/scheduling action
```

## Scope

V1 is a deterministic visual renderer, not an image-generation model. It is optimized for repeatable infographic cards whose layout and branding rules must remain stable across runs.

See `docs/OPERATIONS-RUNBOOK.md` for the operator workflow and approval boundary.
