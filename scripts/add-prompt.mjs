import { appendFile, readFile, writeFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const writeCompactArray = async (path, value) => writeFile(path, `[\n  ${value.map((item) => JSON.stringify(item)).join(',\n  ')}\n]\n`);
const required = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const [baseCommands, extraCommands, categories, extraExamples, cheatcodes] = await Promise.all([
  readJson('data/commands.json'),
  readJson('data/commands-extra.json'),
  readJson('data/categories.json'),
  readJson('data/examples-extra.json'),
  readJson('data/cheatcodes.json')
]);

const rawName = required('PROMPT_NAME');
const name = (rawName.startsWith('/') ? rawName : `/${rawName}`).toLowerCase();
const categoryId = required('PROMPT_CATEGORY_ID');
const description = required('PROMPT_DESCRIPTION');
const template = required('PROMPT_TEMPLATE');
const example = required('PROMPT_EXAMPLE');
const workflowId = (process.env.PROMPT_WORKFLOW_ID || 'none').trim();
const workflowStep = (process.env.PROMPT_WORKFLOW_STEP || '').trim();
const commands = [...baseCommands, ...extraCommands];

if (!/^\/[a-z0-9][a-z0-9-]*$/.test(name)) {
  throw new Error('PROMPT_NAME must contain only lowercase letters, numbers, and hyphens');
}
if (commands.some((item) => item.name.toLowerCase() === name)) {
  throw new Error(`Prompt alias already exists: ${name}`);
}
if (!categories.some((item) => item.id === categoryId)) {
  throw new Error(`Unknown category: ${categoryId}`);
}

const id = Math.max(...commands.map((item) => Number(item.id))) + 1;
extraCommands.push({ id, name, categoryId, description, template });
extraExamples.push({ id, example });

let workflowReference = 'Prompt Library only';
if (workflowId !== 'none') {
  const workflow = cheatcodes.find((item) => item.id === workflowId);
  if (!workflow) throw new Error(`Unknown workflow: ${workflowId}`);
  const stepNumber = Number(workflowStep);
  if (!Number.isInteger(stepNumber) || stepNumber < 1) {
    throw new Error('PROMPT_WORKFLOW_STEP must be a positive step number when a workflow is selected');
  }
  const step = workflow.steps.find((item) => item.number === stepNumber);
  if (!step) throw new Error(`Workflow ${workflowId} has no step ${workflowStep}`);
  step.promptIds.push(id);
  workflowReference = `${workflowId} / step ${stepNumber}`;
}

await Promise.all([
  writeCompactArray('data/commands-extra.json', extraCommands),
  writeCompactArray('data/examples-extra.json', extraExamples),
  writeJson('data/cheatcodes.json', cheatcodes)
]);

const output = process.env.GITHUB_OUTPUT;
if (output) {
  await appendFile(output, `prompt_id=${id}\nprompt_name=${name}\nworkflow_reference=${workflowReference}\n`);
}

console.log(`Added ${name} as prompt ${id}`);
console.log(`Category: ${categoryId}`);
console.log(`Workflow reference: ${workflowReference}`);
