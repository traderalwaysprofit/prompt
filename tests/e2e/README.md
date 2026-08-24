# Production Browser E2E

The browser suite validates the live `https://samson.web.id` application with Chromium.

Coverage:
- production page load and JavaScript errors
- Command Data V2: 193 commands and 20 categories
- search interaction
- category filtering
- command detail modal
- list/grid switching

The suite is intentionally separate from the lightweight HTTP/data contract checks so failures identify whether the problem is data/API contract or real browser behavior.
