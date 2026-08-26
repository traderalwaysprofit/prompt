# Browser E2E

The suite validates the current SAMSON Prompt frontend in two modes:

- **push / pull request:** the freshly built `dist/` output is served locally;
- **workflow dispatch / successful Cloudflare deployment:** the live `https://samson.web.id` site is tested.

Coverage:

- page load without browser errors;
- built and served `favicon.svg`;
- complete runtime contract: 193 base + 7 extra = 200 commands, 20 categories, and 200 examples;
- current search input and smart result grid;
- category `select` filtering;
- command modal open/close;
- one canonical desktop/mobile onboarding flow;
- favorites behavior.

The browser suite complements the lightweight HTTP production contract check.
