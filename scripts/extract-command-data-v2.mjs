import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = 'data/source/command-data-v1.html';
const source = fs.readFileSync(sourcePath, 'utf8');

function extractArray(name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!match) throw new Error(`Unable to locate ${name} in ${sourcePath}`);
  return vm.runInNewContext(`(${match[1]})`);
}

const sourceCategories = extractArray('categories');
const sourceCommands = extractArray('commandsData');

const categories = sourceCategories
  .filter((c) => c.id !== 'all')
  .map((c) => ({ id: c.id, name: c.label }));

const categoryIds = new Set(categories.map((c) => c.id));
const commands = sourceCommands.map((c) => {
  if (!categoryIds.has(c.category)) {
    throw new Error(`Unknown category ${c.category} for ${c.cmd}`);
  }

  return {
    id: Number(c.id),
    name: c.cmd,
    categoryId: c.category,
    description: c.desc,
    template: `Create a structured ${c.desc.toLowerCase()}.`
  };
});

if (commands.length !== 189) {
  throw new Error(`Expected 189 commands, extracted ${commands.length}`);
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/categories.json', JSON.stringify(categories, null, 2) + '\n');
fs.writeFileSync('data/commands.json', JSON.stringify(commands, null, 2) + '\n');

console.log(`Extracted ${commands.length} commands and ${categories.length} categories.`);
