# Frontend Architecture V1 — Samson Prompt

## 1. Objective

Build a fast, static-first command explorer for SAMSON.WEB.ID that can scale from the current baseline dataset to 193 prompt commands without introducing a framework dependency.

## 2. Architecture

- **Runtime:** Browser-native ES Modules
- **Rendering:** DOM-driven single-page shell
- **Data:** JSON under `/data/`
- **Styling:** One CSS entry under `/src/styles.css`
- **Entry:** `/src/main.js`
- **Deployment:** Cloudflare-compatible static deployment
- **No backend dependency:** the frontend must remain usable when API services are unavailable.

## 3. UI Information Architecture

```text
SAMSON PROMPT
├── Header
│   ├── Brand
│   ├── Search
│   └── Theme / utility controls
├── Main
│   ├── Hero / command composer
│   ├── Category navigation
│   ├── Command result grid
│   └── Command detail / preview
└── Footer
    └── Version + data status
```

## 4. Core Interaction Model

1. Load command/category JSON.
2. Normalize data into a frontend view model.
3. Search by command name, description, category, and template.
4. Filter by category.
5. Select a command to preview its template.
6. Compose 1–3 commands in sequence.
7. Preserve the selected command in the URL hash when practical.
8. Render an explicit data/error state instead of failing silently.

## 5. Component Boundaries

The V1 implementation uses lightweight functions rather than a UI framework:

- `renderApp()` — page shell
- `renderHeader()` — brand/search controls
- `renderCategories()` — category filter
- `renderCommands()` — command cards
- `renderCommandDetail()` — selected command preview
- `createCommandViewModel()` — normalize raw JSON
- `filterCommands()` — search/filter logic
- `composeCommands()` — combine selected slash commands
- `setStatus()` — runtime/data status

These boundaries intentionally map cleanly to a future React/Vue/Svelte migration without requiring one now.

## 6. Performance Rules

- Static assets only for V1.
- No external UI library or icon package.
- Avoid large images and blocking fonts.
- Search/filter locally after a single data load.
- Use event delegation where practical.
- Keep JavaScript modular and small.
- Prefer semantic HTML and CSS over JS-generated styling.

## 7. Responsive Rules

- Mobile-first.
- Single-column layout below tablet width.
- Two-column command/detail layout at desktop width.
- Touch targets at least 44px where interactive.
- Search remains available on small screens.

## 8. Accessibility

- Semantic headings and landmarks.
- Keyboard-focusable controls.
- Visible focus state.
- `aria-label` for icon-only controls.
- Status messages use `aria-live`.
- Sufficient text contrast.

## 9. Data Contract

Each command should ultimately conform to:

```json
{
  "id": 1,
  "name": "/example",
  "categoryId": "visual",
  "description": "Short functional description.",
  "template": "Instruction template."
}
```

Category records should conform to:

```json
{
  "id": "visual",
  "name": "Visual"
}
```

## 10. V1 Scope

Included:

- command explorer shell
- search
- category filtering
- command selection
- command template preview
- 1–3 command composition
- responsive design
- explicit loading/error/data states

Deferred:

- authentication
- database
- AI API execution
- user accounts
- analytics
- drag-and-drop workflow builder
- server-side personalization

## 11. Release Gate

Frontend Architecture V1 is considered ready when:

- baseline page loads without console-blocking errors
- command data loads successfully
- search and category filtering work
- selecting a command updates the preview
- command composition is capped at three commands
- layout is usable on mobile and desktop
- existing GitHub Actions validation remains green
