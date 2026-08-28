# Adding prompts safely

New prompts use the existing protected pull-request workflow. The automation never writes directly to `main`.

## GitHub form

1. Open **Actions → Validate → Run workflow**.
2. Fill in the prompt alias, category ID, description, template, and usage example.
3. Keep **Workflow ID** set to `none` when the prompt belongs only in Prompt Library.
4. To reuse it inside a guided workflow, select a Workflow ID and enter its step number.
5. Run the workflow and review the pull request created by `github-actions[bot]`.
6. Wait for `validate`, `browser-e2e`, CodeQL, and Cloudflare preview checks, then approve and squash-merge.

## What is automatic

- The next numeric prompt ID is assigned without editing IDs manually.
- `commands-extra.json` and `examples-extra.json` are updated together.
- An optional workflow step receives the new prompt reference.
- Prompt, category, and workflow totals on the homepage come from runtime data.
- CI validates the schema, unique IDs, category references, examples 1:1, and workflow references.
- CI reports new prompts that remain Prompt Library-only and suggests a likely workflow based on category.
- Production verification accepts growth above the 200-prompt baseline while blocking accidental deletion.

## Category IDs

Use an ID from `data/categories.json`, for example `coding`, `produk`, `marketing`, `komunikasi`, `produktivitas`, `kritis`, `ai`, or `sistem`.

## Review rule

Do not automatically insert a prompt into a workflow based only on keywords. Workflow placement changes the user journey, so the automation either uses the explicit Workflow ID + step supplied in the form or leaves the prompt in Prompt Library for reviewer confirmation.
