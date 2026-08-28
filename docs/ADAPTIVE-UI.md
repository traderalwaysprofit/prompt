# SAMSON Adaptive UI + Anti-Slop Engine

## Goal

Allow SAMSON to change visual personality without changing core product behavior. The theme layer may change presentation, but search, workflow execution, prompt data, pagination, favorites, modal behavior, accessibility semantics, and runtime data remain product contracts.

## Mutation levels

- **L1 — Skin:** color, typography, radius, elevation.
- **L2 — Components:** card, button, navigation, control treatment.
- **L3 — Composition:** hero, grid, section composition.
- **L4 — Experimental:** major redesign; must be isolated and regression-tested.

## Theme architecture

- `src/ui-tokens.css` — shared design tokens.
- `src/themes.css` — visual personality overrides.
- `src/theme-engine.js` — supported-theme state and localStorage persistence.
- `src/app-shell.js` — desktop/mobile appearance controls.
- `src/anti-slop-audit.js` — runtime quality gate.

Initial themes:

1. `default` — Samson Default
2. `developer` — dark technical interface
3. `swiss` — editorial, typographic, high-contrast interface

## Anti-slop rules

Avoid decorative gradients without purpose, unnecessary glassmorphism, card-everything layouts, uniform oversized radius, excessive pills, generic hero patterns, random icon styles, weak hierarchy, inconsistent spacing, fake statistics, and template-like visual repetition.

The runtime audit scores design-token adoption, centralized theme state, appearance controls, runtime-truth statistics, accessible search labeling, and unique DOM IDs. Passing threshold: **85/100**.

## Runtime truth

Catalog counts must come from loaded data. UI enhancement code must not overwrite prompt/category totals with hard-coded values.

## Adding a theme

1. Add the theme metadata to `THEMES` in `src/theme-engine.js`.
2. Add token overrides in `src/themes.css`.
3. Keep functional layout behavior unchanged unless the change is explicitly L2/L3.
4. Run data validation, build, security-header validation, and browser E2E.
5. Confirm Anti-Slop score remains at least 85.

## Prompt skill

`/antislopui` (command id `202`, category `design`) is the reusable prompt skill for auditing/redesigning interfaces under this contract.
