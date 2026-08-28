# Browser E2E

The suite validates the current SAMSON Prompt frontend in two modes:

- **push / pull request:** the freshly built `dist/` output is served locally;
- **workflow dispatch / successful Cloudflare deployment:** the live `https://samson.web.id` site is tested.

Coverage:

- page load without browser errors;
- built and served `favicon.svg`;
- complete runtime contract: 189 base + 8 extra = 197 commands, 19 categories, and 197 examples;
- current search input and smart result grid;
- category `select` filtering;
- command modal open/close;
- one canonical desktop/mobile onboarding flow;
- favorites behavior.

The browser suite complements the lightweight HTTP production contract check.
