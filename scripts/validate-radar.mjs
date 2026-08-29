import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [items, baseCommands, extraCommands, coreWorkflows, tradingWorkflows, wordpressWorkflows] = await Promise.all([
  readJson('data/radar-items.json'),
  readJson('data/commands.json'),
  readJson('data/commands-extra.json'),
  readJson('data/cheatcodes.json'),
  readJson('data/workflows-trading.json'),
  readJson('data/workflows-wordpress.json')
]);

const errors = [];
const commandById = new Map([...baseCommands, ...extraCommands].map((item) => [Number(item.id), item]));
const workflowIds = new Set([...coreWorkflows, ...tradingWorkflows, ...wordpressWorkflows].map((item) => item.id));
const requiredScores = ['relevance', 'impact', 'actionability', 'confidence', 'novelty', 'radar'];
const allowedSourceTypes = new Set(['primary', 'secondary']);
const allowedImpact = new Set(['low', 'medium', 'high']);
const seenIds = new Set();
const seenClusters = new Set();

if (!Array.isArray(items) || items.length < 8) errors.push(`Expected at least 8 radar items, got ${items?.length ?? 0}`);

for (const item of items) {
  const label = item?.id || '<missing-id>';
  if (typeof item?.id !== 'string' || !item.id.trim()) errors.push('Radar item id is required');
  else if (seenIds.has(item.id)) errors.push(`Duplicate radar id: ${item.id}`);
  else seenIds.add(item.id);

  if (typeof item?.clusterId !== 'string' || !item.clusterId.trim()) errors.push(`Missing clusterId: ${label}`);
  else if (seenClusters.has(item.clusterId)) errors.push(`Duplicate story cluster: ${item.clusterId}`);
  else seenClusters.add(item.clusterId);

  if (typeof item?.title !== 'string' || !item.title.trim()) errors.push(`Missing title: ${label}`);
  if (!Array.isArray(item?.topics) || item.topics.length < 1 || item.topics.some((topic) => typeof topic !== 'string' || !topic.trim())) errors.push(`Invalid topics: ${label}`);
  if (typeof item?.whatChanged !== 'string' || !item.whatChanged.trim()) errors.push(`Missing whatChanged: ${label}`);
  if (typeof item?.whyItMatters !== 'string' || !item.whyItMatters.trim()) errors.push(`Missing whyItMatters: ${label}`);

  const source = item?.source;
  if (!source || typeof source !== 'object') {
    errors.push(`Missing source: ${label}`);
  } else {
    if (typeof source.publisher !== 'string' || !source.publisher.trim()) errors.push(`Missing source publisher: ${label}`);
    if (!allowedSourceTypes.has(source.type)) errors.push(`Invalid source type: ${label}`);
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') errors.push(`Source URL must use https: ${label}`);
    } catch {
      errors.push(`Invalid source URL: ${label}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt || '') || Number.isNaN(Date.parse(`${source.publishedAt}T00:00:00Z`))) errors.push(`Invalid publishedAt: ${label}`);
  }

  const scores = item?.scores;
  if (!scores || typeof scores !== 'object') {
    errors.push(`Missing scores: ${label}`);
  } else {
    for (const key of requiredScores) {
      if (!Number.isFinite(scores[key]) || scores[key] < 0 || scores[key] > 100) errors.push(`Invalid score ${key}: ${label}`);
    }
    const expected = Math.round(scores.relevance * 0.30 + scores.impact * 0.25 + scores.actionability * 0.20 + scores.confidence * 0.15 + scores.novelty * 0.10);
    if (Number.isFinite(scores.radar) && Math.abs(expected - scores.radar) > 1) errors.push(`Radar score mismatch: ${label}; expected ${expected}, got ${scores.radar}`);
  }

  const samson = item?.samson;
  if (!samson || typeof samson !== 'object') {
    errors.push(`Missing SAMSON impact: ${label}`);
  } else {
    if (!allowedImpact.has(samson.impact)) errors.push(`Invalid SAMSON impact: ${label}`);
    if (!Array.isArray(samson.relatedPrompts)) errors.push(`relatedPrompts must be an array: ${label}`);
    else {
      for (const prompt of samson.relatedPrompts) {
        const command = commandById.get(Number(prompt?.id));
        if (!command) errors.push(`Unknown related prompt ${prompt?.id}: ${label}`);
        else if (prompt.name !== command.name) errors.push(`Related prompt name mismatch ${prompt?.id}: ${label}`);
      }
    }
    if (!Array.isArray(samson.relatedWorkflows)) errors.push(`relatedWorkflows must be an array: ${label}`);
    else {
      for (const workflow of samson.relatedWorkflows) {
        if (!workflowIds.has(workflow?.id)) errors.push(`Unknown related workflow ${workflow?.id}: ${label}`);
      }
    }
  }
}

console.log(JSON.stringify({
  status: errors.length ? 'FAIL' : 'PASS',
  radarItems: items.length,
  primarySources: items.filter((item) => item.source?.type === 'primary').length,
  priorityItems: items.filter((item) => item.scores?.radar >= 80).length,
  topics: [...new Set(items.flatMap((item) => item.topics || []))].sort(),
  errors
}, null, 2));

if (errors.length) process.exit(1);
