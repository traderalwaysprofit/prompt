import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [baseCommands, extraCommands, categories, baseExamples, extraExamples, cheatcodes] = await Promise.all([
  readJson('data/commands.json'),
  readJson('data/commands-extra.json'),
  readJson('data/categories.json'),
  readJson('data/examples.json'),
  readJson('data/examples-extra.json'),
  readJson('data/cheatcodes.json')
]);

const commands = [...baseCommands, ...extraCommands];
const examples = [...baseExamples, ...extraExamples];
const errors = [];
const warnings = [];
const categoryIds = new Set(categories.map((item) => item.id));
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

if (baseCommands.length !== 193) errors.push(`Expected 193 base commands, got ${baseCommands.length}`);
if (extraCommands.length < 7) errors.push(`Expected at least 7 extra commands, got ${extraCommands.length}`);
if (commands.length < 200) errors.push(`Expected at least 200 runtime commands, got ${commands.length}`);
if (categories.length < 20) errors.push(`Expected at least 20 categories, got ${categories.length}`);
if (examples.length !== commands.length) errors.push(`Expected one example per command (${commands.length}), got ${examples.length}`);
if (!Array.isArray(cheatcodes) || cheatcodes.length < 1) errors.push('Expected at least one cheatcode');

for (const command of commands) {
  if (!Number.isInteger(command.id) || command.id < 1) errors.push(`Invalid command id: ${command.id}`);
  for (const field of ['name', 'categoryId', 'description', 'template']) {
    if (typeof command[field] !== 'string' || command[field].trim() === '') {
      errors.push(`Missing required field: ${field} in command ${command.id}`);
    }
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

const cheatcodeIds = [];
for (const cheatcode of cheatcodes) {
  if (typeof cheatcode.id !== 'string' || !cheatcode.id.trim()) errors.push('Cheatcode id must be a non-empty string');
  else cheatcodeIds.push(cheatcode.id);
  for (const field of ['title', 'description', 'difficulty', 'estimatedTime', 'status']) {
    if (typeof cheatcode[field] !== 'string' || !cheatcode[field].trim()) {
      errors.push(`Missing cheatcode field ${field}: ${cheatcode.id}`);
    }
  }
  if (!Array.isArray(cheatcode.steps) || cheatcode.steps.length < 2) {
    errors.push(`Cheatcode must contain at least two steps: ${cheatcode.id}`);
    continue;
  }
  const stepNumbers = [];
  for (const step of cheatcode.steps) {
    stepNumbers.push(step.number);
    for (const field of ['title', 'description', 'output']) {
      if (typeof step[field] !== 'string' || !step[field].trim()) {
        errors.push(`Missing step field ${field}: ${cheatcode.id} step ${step.number}`);
      }
    }
    if (!Array.isArray(step.promptIds) || step.promptIds.length < 1) {
      errors.push(`Step has no prompt references: ${cheatcode.id} step ${step.number}`);
    } else {
      for (const promptId of step.promptIds) {
        if (!commandIdSet.has(promptId)) errors.push(`Invalid prompt reference ${promptId}: ${cheatcode.id} step ${step.number}`);
      }
    }
  }
  for (const number of duplicateValues(stepNumbers)) errors.push(`Duplicate step number ${number}: ${cheatcode.id}`);
}
for (const id of duplicateValues(cheatcodeIds)) errors.push(`Duplicate cheatcode id: ${id}`);

console.log(JSON.stringify({
  status: errors.length ? 'FAIL' : 'PASS',
  baseCommands: baseCommands.length,
  extraCommands: extraCommands.length,
  runtimeCommands: commands.length,
  categories: categories.length,
  examples: examples.length,
  cheatcodes: cheatcodes.length,
  warnings,
  errors
}, null, 2));

if (errors.length) process.exit(1);
