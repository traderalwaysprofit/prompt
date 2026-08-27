import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] || 'HEAD^';

function readBaseline(path) {
  try {
    return JSON.parse(execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' }));
  } catch {
    console.log(`Baseline ${baseRef}:${path} is unavailable; regression comparison skipped.`);
    return null;
  }
}

const baselineCommands = readBaseline('data/commands.json');
const baselineCategories = readBaseline('data/categories.json');

if (!baselineCommands || !baselineCategories) process.exit(0);

const currentCommands = JSON.parse(readFileSync('data/commands.json', 'utf8'));
const currentCategories = JSON.parse(readFileSync('data/categories.json', 'utf8'));

const currentCommandsById = new Map(currentCommands.map((item) => [item.id, item]));
const currentCategoryIds = new Set(currentCategories.map((item) => item.id));
const removedCommands = baselineCommands.filter((item) => !currentCommandsById.has(item.id));
const removedCategories = baselineCategories.filter((item) => !currentCategoryIds.has(item.id));
const changedFields = [];

for (const oldItem of baselineCommands) {
  const newItem = currentCommandsById.get(oldItem.id);
  if (!newItem) continue;
  for (const field of ['name', 'categoryId', 'template']) {
    if (oldItem[field] !== newItem[field]) changedFields.push({ id: oldItem.id, field });
  }
}

console.log(`Baseline commands:   ${baselineCommands.length}`);
console.log(`Current commands:    ${currentCommands.length}`);
console.log(`Removed commands:    ${removedCommands.length}`);
console.log(`Changed key fields:  ${changedFields.length}`);
console.log(`Baseline categories: ${baselineCategories.length}`);
console.log(`Current categories:  ${currentCategories.length}`);
console.log(`Removed categories:  ${removedCategories.length}`);

if (removedCommands.length || removedCategories.length) {
  for (const item of removedCommands) console.error(`Removed command: ${item.id} (${item.name})`);
  for (const item of removedCategories) console.error(`Removed category: ${item.id} (${item.name})`);
  process.exit(1);
}

console.log('DATA REGRESSION VALIDATION: PASS');
