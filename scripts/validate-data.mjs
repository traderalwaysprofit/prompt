import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [baseCommands, extraCommands, categories, baseExamples, extraExamples, cheatcodes, tradingWorkflows, wordpressWorkflows] = await Promise.all([
  readJson('data/commands.json'),
  readJson('data/commands-extra.json'),
  readJson('data/categories.json'),
  readJson('data/examples.json'),
  readJson('data/examples-extra.json'),
  readJson('data/cheatcodes.json'),
  readJson('data/workflows-trading.json'),
  readJson('data/workflows-wordpress.json')
]);

const commands = [...baseCommands, ...extraCommands];
const examples = [...baseExamples, ...extraExamples];
const workflows = [...cheatcodes, ...tradingWorkflows, ...wordpressWorkflows];
const errors = [];
const warnings = [];
const categoryIds = new Set(categories.map((item) => item.id));
const retiredCommandIds = new Set([47, 48, 50, 52]);
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

if (baseCommands.length !== 189) errors.push(`Expected 189 base commands, got ${baseCommands.length}`);
if (extraCommands.length < 10) errors.push(`Expected at least 10 extra commands, got ${extraCommands.length}`);
if (commands.length < 200) errors.push(`Expected at least 200 runtime commands, got ${commands.length}`);
if (categories.length < 19) errors.push(`Expected at least 19 categories, got ${categories.length}`);
if (examples.length !== commands.length) errors.push(`Expected one example per command (${commands.length}), got ${examples.length}`);
if (!Array.isArray(cheatcodes) || cheatcodes.length !== 6) errors.push(`Expected 6 core workflows, got ${cheatcodes?.length}`);
if (!Array.isArray(tradingWorkflows) || tradingWorkflows.length !== 3) errors.push(`Expected 3 trading workflows, got ${tradingWorkflows?.length}`);
if (!Array.isArray(wordpressWorkflows) || wordpressWorkflows.length !== 3) errors.push(`Expected 3 WordPress workflows, got ${wordpressWorkflows?.length}`);
if (workflows.length !== 12) errors.push(`Expected 12 total workflows, got ${workflows.length}`);

for (const command of commands) {
  if (!Number.isInteger(command.id) || command.id < 1) errors.push(`Invalid command id: ${command.id}`);
  if (retiredCommandIds.has(command.id)) errors.push(`Retired command id reused: ${command.id}`);
  for (const field of ['name', 'categoryId', 'description', 'template']) {
    if (typeof command[field] !== 'string' || command[field].trim() === '') errors.push(`Missing required field: ${field} in command ${command.id}`);
  }
  if (!categoryIds.has(command.categoryId)) errors.push(`Invalid category reference: ${command.name}`);
}

for (const category of categories) {
  if (typeof category.id !== 'string' || !category.id.trim()) errors.push('Category id must be a non-empty string');
  if (typeof category.name !== 'string' || !category.name.trim()) errors.push(`Category name missing: ${category.id}`);
}

const commandIds = commands.map((item) => item.id);
const commandNames = commands.map((item) => item.name);
const exampleIds = examples.map((item) => item.id);
for (const id of duplicateValues(commandIds)) errors.push(`Duplicate command id: ${id}`);
for (const name of duplicateValues(commandNames)) warnings.push(`Duplicate command alias: ${name}`);
for (const id of duplicateValues(exampleIds)) errors.push(`Duplicate example id: ${id}`);
for (const example of examples) {
  if (!Number.isInteger(example.id) || example.id < 1) errors.push(`Invalid example id: ${example.id}`);
  if (typeof example.example !== 'string' || !example.example.trim()) errors.push(`Missing example text for command id: ${example.id}`);
}

const commandIdSet = new Set(commandIds);
const exampleIdSet = new Set(exampleIds);
for (const id of commandIdSet) if (!exampleIdSet.has(id)) errors.push(`Missing example for command id: ${id}`);
for (const id of exampleIdSet) if (!commandIdSet.has(id)) errors.push(`Orphan example id: ${id}`);

const workflowIds = [];
for (const workflow of workflows) {
  if (typeof workflow.id !== 'string' || !workflow.id.trim()) errors.push('Workflow id must be a non-empty string');
  else workflowIds.push(workflow.id);
  for (const field of ['title', 'description', 'difficulty', 'estimatedTime', 'status']) {
    if (typeof workflow[field] !== 'string' || !workflow[field].trim()) errors.push(`Missing workflow field ${field}: ${workflow.id}`);
  }
  if (!Array.isArray(workflow.steps) || workflow.steps.length < 2) {
    errors.push(`Workflow must contain at least two steps: ${workflow.id}`);
    continue;
  }
  if (tradingWorkflows.includes(workflow)) {
    if (workflow.group !== 'Trading') errors.push(`Trading workflow must use Trading group: ${workflow.id}`);
    if (workflow.badge !== 'EDUCATIONAL ANALYSIS') errors.push(`Trading workflow badge must be EDUCATIONAL ANALYSIS: ${workflow.id}`);
    if (workflow.steps.length !== 8) errors.push(`Trading workflow must contain 8 steps: ${workflow.id}`);
  }
  if (wordpressWorkflows.includes(workflow)) {
    if (workflow.group !== 'WordPress') errors.push(`WordPress workflow must use WordPress group: ${workflow.id}`);
    if (typeof workflow.badge !== 'string' || !workflow.badge.trim()) errors.push(`WordPress workflow badge is required: ${workflow.id}`);
    if (workflow.steps.length !== 8) errors.push(`WordPress workflow must contain 8 steps: ${workflow.id}`);
  }
  const stepNumbers = [];
  for (const step of workflow.steps) {
    stepNumbers.push(step.number);
    for (const field of ['title', 'description', 'output']) {
      if (typeof step[field] !== 'string' || !step[field].trim()) errors.push(`Missing step field ${field}: ${workflow.id} step ${step.number}`);
    }
    if (!Array.isArray(step.promptIds) || step.promptIds.length < 1) {
      errors.push(`Step has no prompt references: ${workflow.id} step ${step.number}`);
    } else {
      for (const promptId of step.promptIds) if (!commandIdSet.has(promptId)) errors.push(`Invalid prompt reference ${promptId}: ${workflow.id} step ${step.number}`);
    }
  }
  for (const number of duplicateValues(stepNumbers)) errors.push(`Duplicate step number ${number}: ${workflow.id}`);
}
for (const id of duplicateValues(workflowIds)) errors.push(`Duplicate workflow id: ${id}`);

for (const [id, name] of [[203, '/wordpress'], [204, '/woocommerce'], [205, '/wpaudit']]) {
  const command = commands.find((item) => item.id === id);
  if (!command || command.name !== name) errors.push(`Required WordPress command missing or changed: ${id} ${name}`);
}

console.log(JSON.stringify({
  status: errors.length ? 'FAIL' : 'PASS',
  baseCommands: baseCommands.length,
  extraCommands: extraCommands.length,
  runtimeCommands: commands.length,
  categories: categories.length,
  examples: examples.length,
  coreWorkflows: cheatcodes.length,
  tradingWorkflows: tradingWorkflows.length,
  wordpressWorkflows: wordpressWorkflows.length,
  workflows: workflows.length,
  warnings,
  errors
}, null, 2));

if (errors.length) process.exit(1);
