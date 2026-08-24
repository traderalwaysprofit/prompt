import { readFile } from 'node:fs/promises';

const commands = JSON.parse(await readFile('data/commands.json', 'utf8'));
const categories = JSON.parse(await readFile('data/categories.json', 'utf8'));

const errors = [];
const warnings = [];

const ids = commands.map((item) => item.id);
const names = commands.map((item) => item.name);
const categoryIds = categories.map((item) => item.id);

const duplicate = (values) => values.filter((value, index) => values.indexOf(value) !== index);

for (const command of commands) {
  for (const field of ['id', 'name', 'categoryId', 'template']) {
    if (command[field] === undefined || command[field] === '') {
      errors.push(`Missing required field: ${field} in ${command.name ?? command.id}`);
    }
  }
  if (!categoryIds.includes(command.categoryId)) {
    errors.push(`Invalid category reference: ${command.name}`);
  }
}

for (const id of duplicate(ids)) errors.push(`Duplicate command id: ${id}`);
for (const name of duplicate(names)) warnings.push(`Duplicate command alias: ${name}`);
for (const id of duplicate(categoryIds)) errors.push(`Duplicate category id: ${id}`);

console.log(JSON.stringify({
  status: errors.length ? 'FAIL' : 'PASS',
  commands: commands.length,
  categories: categories.length,
  warnings,
  errors
}, null, 2));

if (errors.length) process.exit(1);
