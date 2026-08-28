import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const baseRef = process.argv[2];
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const commands = [...readJson('data/commands.json'), ...readJson('data/commands-extra.json')];
const cheatcodes = readJson('data/cheatcodes.json');
const referencedIds = new Set(cheatcodes.flatMap((workflow) => workflow.steps.flatMap((step) => step.promptIds)));
const unreferenced = commands.filter((command) => !referencedIds.has(command.id));

let newCommands = [];
if (baseRef) {
  try {
    const readAtRef = (path) => JSON.parse(execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' }));
    const baseline = [...readAtRef('data/commands.json'), ...readAtRef('data/commands-extra.json')];
    const baselineIds = new Set(baseline.map((item) => item.id));
    newCommands = commands.filter((item) => !baselineIds.has(item.id));
  } catch {
    console.log(`Baseline ${baseRef} unavailable; new-prompt comparison skipped.`);
  }
}

const suggestions = {
  coding: 'build-website or build-saas',
  produk: 'build-saas',
  marketing: 'marketing-campaign',
  kreatif: 'marketing-campaign',
  design: 'marketing-campaign',
  komunikasi: 'seo-content or marketing-campaign',
  produktivitas: 'research-project',
  kritis: 'research-project',
  data: 'research-project',
  ai: 'automate-task',
  sistem: 'automate-task'
};

const lines = [
  '## Prompt coverage',
  '',
  `- Runtime prompts: ${commands.length}`,
  `- Referenced by workflows: ${referencedIds.size}`,
  `- Prompt Library only: ${unreferenced.length}`,
  `- New prompts in this change: ${newCommands.length}`
];

for (const command of newCommands) {
  const referenced = referencedIds.has(command.id);
  lines.push(`- ${command.name} (#${command.id}): ${referenced ? 'workflow reference added' : `Prompt Library only; consider ${suggestions[command.categoryId] || 'manual workflow review'}`}`);
}

const report = `${lines.join('\n')}\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
