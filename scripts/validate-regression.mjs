import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] || 'HEAD^';
const readCurrent = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readBaseline = (path) => {
  try {
    return JSON.parse(execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' }));
  } catch {
    console.log(`Baseline ${baseRef}:${path} is unavailable; regression comparison skipped.`);
    return null;
  }
};

const paths = ['data/commands.json', 'data/commands-extra.json', 'data/examples.json', 'data/examples-extra.json', 'data/categories.json'];
const baseline = Object.fromEntries(paths.map((path) => [path, readBaseline(path)]));
if (paths.some((path) => !baseline[path])) process.exit(0);

const baselineCommands = [...baseline['data/commands.json'], ...baseline['data/commands-extra.json']];
const currentCommands = [...readCurrent('data/commands.json'), ...readCurrent('data/commands-extra.json')];
const baselineExamples = [...baseline['data/examples.json'], ...baseline['data/examples-extra.json']];
const currentExamples = [...readCurrent('data/examples.json'), ...readCurrent('data/examples-extra.json')];
const baselineCategories = baseline['data/categories.json'];
const currentCategories = readCurrent('data/categories.json');
const currentCommandsById = new Map(currentCommands.map((item) => [item.id, item]));
const currentExampleIds = new Set(currentExamples.map((item) => item.id));
const currentCategoryIds = new Set(currentCategories.map((item) => item.id));
const removedCommands = baselineCommands.filter((item) => !currentCommandsById.has(item.id));
const removedExamples = baselineExamples.filter((item) => !currentExampleIds.has(item.id));
const removedCategories = baselineCategories.filter((item) => !currentCategoryIds.has(item.id));
const baselineCommandIds = new Set(baselineCommands.map((item) => item.id));
const addedCommands = currentCommands.filter((item) => !baselineCommandIds.has(item.id));
const changedFields = [];
const retiredCommands = new Map([
  [47, '/poster'],
  [48, '/cover'],
  [50, '/thumbnail'],
  [52, '/socialvisual']
]);
const retiredCategories = new Map([['kreatif', 'Desain Kreatif & Pemasaran']]);

for (const oldItem of baselineCommands) {
  const newItem = currentCommandsById.get(oldItem.id);
  if (!newItem) continue;
  for (const field of ['name', 'categoryId', 'template']) {
    if (oldItem[field] !== newItem[field]) changedFields.push({ id: oldItem.id, field });
  }
}

const unexpectedRemovedCommands = removedCommands.filter((item) => retiredCommands.get(item.id) !== item.name);
const unexpectedRemovedExamples = removedExamples.filter((item) => !retiredCommands.has(item.id));
const unexpectedRemovedCategories = removedCategories.filter((item) => retiredCategories.get(item.id) !== item.name);

console.log(`Baseline commands:   ${baselineCommands.length}`);
console.log(`Current commands:    ${currentCommands.length}`);
console.log(`Added commands:      ${addedCommands.length}`);
console.log(`Removed commands:    ${removedCommands.length}`);
console.log(`Removed examples:    ${removedExamples.length}`);
console.log(`Changed key fields:  ${changedFields.length}`);
console.log(`Baseline categories: ${baselineCategories.length}`);
console.log(`Current categories:  ${currentCategories.length}`);
console.log(`Removed categories:  ${removedCategories.length}`);
for (const item of addedCommands) console.log(`Added command: ${item.id} (${item.name})`);
for (const item of removedCommands.filter((item) => retiredCommands.get(item.id) === item.name)) {
  console.log(`Retired command: ${item.id} (${item.name})`);
}
for (const item of removedCategories.filter((item) => retiredCategories.get(item.id) === item.name)) {
  console.log(`Retired category: ${item.id} (${item.name})`);
}

if (unexpectedRemovedCommands.length || unexpectedRemovedExamples.length || unexpectedRemovedCategories.length) {
  for (const item of unexpectedRemovedCommands) console.error(`Removed command: ${item.id} (${item.name})`);
  for (const item of unexpectedRemovedExamples) console.error(`Removed example: ${item.id}`);
  for (const item of unexpectedRemovedCategories) console.error(`Removed category: ${item.id} (${item.name})`);
  process.exit(1);
}

console.log('DATA REGRESSION VALIDATION: PASS');
