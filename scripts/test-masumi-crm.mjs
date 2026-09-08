import assert from 'node:assert/strict';
import {
  buildCrmCsv,
  calculateCrmKpis,
  createCrmBackup,
  CRM_CSV_HEADERS,
  CRM_SCHEMA,
  CRM_SCHEMA_VERSION,
  CRM_STORAGE_KEY,
  CrmValidationError,
  getActiveFollowUps,
  getPriority,
  isFollowUpOverdue,
  MAX_CRM_LEADS,
  MAX_IMPORT_BYTES,
  normalizeLead,
  parseCrmBackup,
  PIPELINE_PROBABILITIES,
  PIPELINE_STAGES,
  validateLeadCollection
} from '../src/tools/masumi-crm-core.js';
import { getToolByRoute, TOOLS } from '../src/tools-registry.js';

assert.equal(CRM_STORAGE_KEY, 'samsonMasumiCrmV1');
assert.equal(MAX_CRM_LEADS, 2000);
assert.equal(MAX_IMPORT_BYTES, 5 * 1024 * 1024);
assert.deepEqual([...PIPELINE_STAGES], [
  'New', 'Contacted', 'Qualified', 'Needs Discovery', 'Proposal Sent',
  'Negotiation', 'Won', 'Lost', 'Nurture'
]);
assert.deepEqual(PIPELINE_PROBABILITIES, {
  New: 0.05,
  Contacted: 0.15,
  Qualified: 0.30,
  'Needs Discovery': 0.45,
  'Proposal Sent': 0.65,
  Negotiation: 0.80,
  Nurture: 0.10,
  Won: 0,
  Lost: 0
});

assert.equal(TOOLS.length, 3);
assert.equal(TOOLS[2].id, 'masumi-sales-crm');
assert.equal(getToolByRoute('#tools/masumi-sales-crm'), TOOLS[2]);
assert.equal(TOOLS[2].cloudUrl, 'https://crm.samson.web.id/');
const crmModule = await TOOLS[2].load();
assert.equal(typeof crmModule.mountTool, 'function');

assert.deepEqual(getPriority({ fit: 0, readiness: 0, urgency: 0, value: 0 }), { total: 0, label: 'Low' });
assert.deepEqual(getPriority({ fit: 2, readiness: 2, urgency: 1, value: 1 }), { total: 6, label: 'Develop' });
assert.deepEqual(getPriority({ fit: 3, readiness: 3, urgency: 3, value: 2 }), { total: 11, label: 'Warm' });
assert.deepEqual(getPriority({ fit: 4, readiness: 4, urgency: 4, value: 4 }), { total: 16, label: 'Hot' });
assert.deepEqual(getPriority({ fit: 5, readiness: 5, urgency: 5, value: 5 }), { total: 20, label: 'Hot' });

const baseLead = normalizeLead({
  company: '  Masumi Beauty  ',
  picName: 'Sari\u0000',
  leadDate: '2026-09-08',
  source: 'Website',
  pipeline: 'Qualified',
  potentialValue: '100000000',
  estimatedQuantity: '2000',
  nextAction: 'Kirim brief formula',
  nextActionDate: '2026-09-09',
  scores: { fit: 5, readiness: 4, urgency: 3, value: 5 }
}, { idFactory: () => 'lead-1', now: '2026-09-08T08:00:00.000Z' });

assert.equal(baseLead.id, 'lead-1');
assert.equal(baseLead.company, 'Masumi Beauty');
assert.equal(baseLead.picName, 'Sari');
assert.equal(baseLead.potentialValue, 100000000);
assert.equal(baseLead.estimatedQuantity, 2000);
assert.deepEqual(baseLead.scores, { fit: 5, readiness: 4, urgency: 3, value: 5 });
assert.equal(baseLead.decisionMakerStatus, 'Unknown');
assert.equal(baseLead.brandStatus, 'Idea');
assert.equal(baseLead.complianceStatus, 'Not Checked');

assert.throws(() => normalizeLead({ company: '', picName: 'Sari' }), /Perusahaan atau brand wajib/);
assert.throws(() => normalizeLead({ company: 'Brand', picName: '' }), /Nama PIC wajib/);
assert.throws(() => normalizeLead({ company: 'Brand', picName: 'Sari', pipeline: 'Closed' }), /Pipeline tidak dikenal/);
assert.throws(
  () => normalizeLead({ company: 'Brand', picName: 'Sari', pipeline: 'Lost' }),
  (error) => error instanceof CrmValidationError && error.code === 'LOST_REASON_REQUIRED'
);
assert.throws(() => normalizeLead({ company: 'Brand', picName: 'Sari', leadDate: '2026-02-30' }), /tidak valid/);
assert.throws(() => normalizeLead({ company: 'Brand', picName: 'Sari', fit: 6 }), /rentang 0–5/);

const contacted = normalizeLead({
  ...baseLead,
  id: 'lead-2',
  company: 'Brand B',
  pipeline: 'Contacted',
  potentialValue: 50000000,
  nextAction: 'Telepon PIC',
  nextActionDate: '2026-09-07'
}, { preserveUpdatedAt: true });
const negotiation = normalizeLead({
  ...baseLead,
  id: 'lead-3',
  company: 'Brand C',
  pipeline: 'Negotiation',
  potentialValue: 200000000,
  nextAction: 'Review harga',
  nextActionDate: '2026-09-10'
}, { preserveUpdatedAt: true });
const won = normalizeLead({
  ...baseLead,
  id: 'lead-4',
  company: 'Brand Won',
  pipeline: 'Won',
  potentialValue: 300000000,
  nextAction: 'Tidak boleh tampil',
  nextActionDate: '2026-09-01'
}, { preserveUpdatedAt: true });
const lost = normalizeLead({
  ...baseLead,
  id: 'lead-5',
  company: 'Brand Lost',
  pipeline: 'Lost',
  lostReason: 'Budget tidak sesuai',
  potentialValue: 400000000,
  nextAction: 'Tidak boleh tampil',
  nextActionDate: '2026-09-01'
}, { preserveUpdatedAt: true });

const leads = [baseLead, contacted, negotiation, won, lost];
const kpis = calculateCrmKpis(leads, '2026-09-08');
assert.equal(kpis.activeLeads, 3);
assert.equal(kpis.qualifiedRate, 75);
assert.equal(kpis.overdueFollowUps, 1);
assert.equal(kpis.weightedForecast, 197500000);
assert.equal(isFollowUpOverdue(contacted, '2026-09-08'), true);
assert.equal(isFollowUpOverdue(baseLead, '2026-09-08'), false);
assert.deepEqual(getActiveFollowUps(leads, '2026-09-08').map((lead) => lead.id), ['lead-2', 'lead-1', 'lead-3']);

assert.throws(
  () => validateLeadCollection([baseLead, { ...baseLead }]),
  (error) => error instanceof CrmValidationError && error.code === 'DUPLICATE_ID'
);

const backup = createCrmBackup(leads, '2026-09-08T10:00:00.000Z');
assert.equal(backup.schema, CRM_SCHEMA);
assert.equal(backup.version, CRM_SCHEMA_VERSION);
assert.equal(backup.leads.length, 5);
assert.deepEqual(parseCrmBackup(JSON.stringify(backup)).map((lead) => lead.id), leads.map((lead) => lead.id));
assert.throws(() => parseCrmBackup('{broken'), /tidak dapat dibaca/);
assert.throws(() => parseCrmBackup(JSON.stringify({ version: 1, leads: [] })), /Schema atau versi/);
assert.throws(() => parseCrmBackup(JSON.stringify({ ...backup, leads: [{ ...baseLead, pipeline: 'Unknown' }] })), /Pipeline tidak dikenal/);

const injectionLead = normalizeLead({
  company: '=HYPERLINK("https://invalid.example")',
  picName: '+CMD',
  source: '  @SUM(A1:A2)',
  needs: '-1+1'
}, { idFactory: () => 'lead-injection' });
const csv = buildCrmCsv([injectionLead]);
assert.equal(csv.charCodeAt(0), 0xfeff);
assert.match(csv, new RegExp(`^\\uFEFF${CRM_CSV_HEADERS.map((header) => `"${header}"`).join(',')}\\r\\n`));
assert.match(csv, /"'=HYPERLINK\(""https:\/\/invalid\.example""\)"/);
assert.match(csv, /"'\+CMD"/);
assert.match(csv, /"'@SUM\(A1:A2\)"/);
assert.match(csv, /"'-1\+1"/);

console.log('MASUMI CRM CORE TESTS: PASS');
