export const CRM_STORAGE_KEY = 'samsonMasumiCrmV1';
export const CRM_SCHEMA = 'samson.masumi-crm.backup';
export const CRM_SCHEMA_VERSION = 1;
export const MAX_CRM_LEADS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const PIPELINE_STAGES = Object.freeze([
  'New',
  'Contacted',
  'Qualified',
  'Needs Discovery',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
  'Nurture'
]);

export const PIPELINE_PROBABILITIES = Object.freeze({
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

export const PRIORITY_LABELS = Object.freeze(['Low', 'Develop', 'Warm', 'Hot']);

const OPEN_PIPELINES = new Set(PIPELINE_STAGES.filter((stage) => stage !== 'Won' && stage !== 'Lost'));
const QUALIFIED_PIPELINES = new Set(['Qualified', 'Needs Discovery', 'Proposal Sent', 'Negotiation', 'Won']);
const DECISION_MAKER_STATUSES = new Set(['Unknown', 'Influencer', 'Recommender', 'Decision Maker']);
const BRAND_STATUSES = new Set(['Idea', 'New Brand', 'Existing Brand', 'Rebrand']);
const COMPLIANCE_STATUSES = new Set(['Not Checked', 'Ready', 'Needs Review', 'Blocked']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SCORE_FIELDS = ['fit', 'readiness', 'urgency', 'value'];

const TEXT_LIMITS = Object.freeze({
  source: 120,
  company: 180,
  picName: 140,
  picRole: 120,
  contact: 80,
  city: 120,
  owner: 120,
  needs: 500,
  targetLaunch: 80,
  nextAction: 500,
  blocker: 500,
  lostReason: 500,
  notes: 3000
});

export class CrmValidationError extends Error {
  constructor(message, code = 'INVALID_DATA') {
    super(message);
    this.name = 'CrmValidationError';
    this.code = code;
  }
}

export const cleanCrmText = (value, maxLength = 500) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
};

const requireKnownOption = (value, allowed, label) => {
  if (!allowed.has(value)) throw new CrmValidationError(`${label} tidak dikenal.`);
  return value;
};

const normalizeDate = (value, label) => {
  const normalized = cleanCrmText(value, 10);
  if (!normalized) return '';
  if (!DATE_PATTERN.test(normalized)) throw new CrmValidationError(`${label} harus berformat YYYY-MM-DD.`);
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new CrmValidationError(`${label} tidak valid.`);
  }
  return normalized;
};

const normalizeMoney = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 999_999_999_999) {
    throw new CrmValidationError('Potensi nilai harus berupa angka positif yang wajar.');
  }
  return Math.round(normalized);
};

const normalizeQuantity = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 100_000_000) {
    throw new CrmValidationError('Estimasi quantity harus berupa bilangan bulat positif.');
  }
  return normalized;
};

const normalizeScore = (value, label) => {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 5) {
    throw new CrmValidationError(`Skor ${label} harus berada pada rentang 0–5.`);
  }
  return normalized;
};

const fallbackId = () => `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createLeadId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return fallbackId();
};

export const getPriority = (scores = {}) => {
  const total = SCORE_FIELDS.reduce((sum, field) => {
    const value = Number(scores[field]);
    return sum + (Number.isFinite(value) ? Math.min(5, Math.max(0, Math.trunc(value))) : 0);
  }, 0);

  if (total >= 16) return { total, label: 'Hot' };
  if (total >= 11) return { total, label: 'Warm' };
  if (total >= 6) return { total, label: 'Develop' };
  return { total, label: 'Low' };
};

export const isOpenLead = (lead) => OPEN_PIPELINES.has(lead.pipeline);

export const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isFollowUpOverdue = (lead, today = localDateString()) =>
  isOpenLead(lead) && Boolean(lead.nextAction) && Boolean(lead.nextActionDate) && lead.nextActionDate < today;

export const normalizeLead = (input = {}, options = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CrmValidationError('Data lead harus berupa object.');
  }

  const pipeline = cleanCrmText(input.pipeline || 'New', 40);
  requireKnownOption(pipeline, new Set(PIPELINE_STAGES), 'Pipeline');

  const decisionMakerStatus = cleanCrmText(input.decisionMakerStatus || 'Unknown', 40);
  const brandStatus = cleanCrmText(input.brandStatus || 'Idea', 40);
  const complianceStatus = cleanCrmText(input.complianceStatus || 'Not Checked', 40);
  requireKnownOption(decisionMakerStatus, DECISION_MAKER_STATUSES, 'Status decision maker');
  requireKnownOption(brandStatus, BRAND_STATUSES, 'Status brand');
  requireKnownOption(complianceStatus, COMPLIANCE_STATUSES, 'Status compliance');

  const id = cleanCrmText(input.id || options.idFactory?.() || createLeadId(), 120);
  if (!id) throw new CrmValidationError('ID lead tidak valid.');

  const company = cleanCrmText(input.company, TEXT_LIMITS.company);
  const picName = cleanCrmText(input.picName, TEXT_LIMITS.picName);
  if (!company) throw new CrmValidationError('Perusahaan atau brand wajib diisi.');
  if (!picName) throw new CrmValidationError('Nama PIC wajib diisi.');

  const lostReason = cleanCrmText(input.lostReason, TEXT_LIMITS.lostReason);
  if (pipeline === 'Lost' && !lostReason) {
    throw new CrmValidationError('Alasan Lost wajib diisi ketika pipeline menjadi Lost.', 'LOST_REASON_REQUIRED');
  }

  const now = cleanCrmText(options.now || new Date().toISOString(), 40);
  const createdAt = cleanCrmText(input.createdAt || now, 40);
  const updatedAt = cleanCrmText(options.preserveUpdatedAt ? (input.updatedAt || now) : now, 40);
  const scoresInput = input.scores && typeof input.scores === 'object' ? input.scores : {};

  return {
    id,
    leadDate: normalizeDate(input.leadDate, 'Tanggal lead'),
    source: cleanCrmText(input.source, TEXT_LIMITS.source),
    company,
    picName,
    picRole: cleanCrmText(input.picRole, TEXT_LIMITS.picRole),
    decisionMakerStatus,
    contact: cleanCrmText(input.contact, TEXT_LIMITS.contact),
    city: cleanCrmText(input.city, TEXT_LIMITS.city),
    owner: cleanCrmText(input.owner, TEXT_LIMITS.owner),
    brandStatus,
    needs: cleanCrmText(input.needs, TEXT_LIMITS.needs),
    estimatedQuantity: normalizeQuantity(input.estimatedQuantity),
    potentialValue: normalizeMoney(input.potentialValue),
    targetLaunch: cleanCrmText(input.targetLaunch, TEXT_LIMITS.targetLaunch),
    pipeline,
    lastContact: normalizeDate(input.lastContact, 'Kontak terakhir'),
    nextAction: cleanCrmText(input.nextAction, TEXT_LIMITS.nextAction),
    nextActionDate: normalizeDate(input.nextActionDate, 'Jadwal next action'),
    complianceStatus,
    blocker: cleanCrmText(input.blocker, TEXT_LIMITS.blocker),
    lostReason,
    notes: cleanCrmText(input.notes, TEXT_LIMITS.notes),
    scores: {
      fit: normalizeScore(scoresInput.fit ?? input.fit ?? 0, 'Fit'),
      readiness: normalizeScore(scoresInput.readiness ?? input.readiness ?? 0, 'Readiness'),
      urgency: normalizeScore(scoresInput.urgency ?? input.urgency ?? 0, 'Urgency'),
      value: normalizeScore(scoresInput.value ?? input.valueScore ?? 0, 'Value')
    },
    createdAt,
    updatedAt
  };
};

export const validateLeadCollection = (input, options = {}) => {
  if (!Array.isArray(input)) throw new CrmValidationError('Daftar lead harus berupa array.');
  if (input.length > (options.maxLeads || MAX_CRM_LEADS)) {
    throw new CrmValidationError(`Maksimum ${MAX_CRM_LEADS.toLocaleString('id-ID')} lead.`, 'LEAD_LIMIT');
  }

  const ids = new Set();
  const leads = input.map((lead, index) => {
    let normalized;
    try {
      normalized = normalizeLead(lead, { preserveUpdatedAt: true, now: options.now });
    } catch (error) {
      if (error instanceof CrmValidationError) {
        throw new CrmValidationError(`Lead ${index + 1}: ${error.message}`, error.code);
      }
      throw error;
    }
    if (ids.has(normalized.id)) {
      throw new CrmValidationError(`ID lead duplikat ditemukan: ${normalized.id}`, 'DUPLICATE_ID');
    }
    ids.add(normalized.id);
    return normalized;
  });

  return leads;
};

export const calculateCrmKpis = (leads, today = localDateString()) => {
  const activeLeads = leads.filter(isOpenLead);
  const qualifiedBase = leads.filter((lead) => lead.pipeline !== 'Lost');
  const qualified = qualifiedBase.filter((lead) => QUALIFIED_PIPELINES.has(lead.pipeline));
  const weightedForecast = activeLeads.reduce(
    (sum, lead) => sum + lead.potentialValue * (PIPELINE_PROBABILITIES[lead.pipeline] || 0),
    0
  );

  return {
    activeLeads: activeLeads.length,
    qualifiedRate: qualifiedBase.length ? (qualified.length / qualifiedBase.length) * 100 : 0,
    overdueFollowUps: activeLeads.filter((lead) => isFollowUpOverdue(lead, today)).length,
    weightedForecast: Math.round(weightedForecast)
  };
};

export const getActiveFollowUps = (leads, today = localDateString()) => leads
  .filter((lead) => isOpenLead(lead) && Boolean(lead.nextAction))
  .map((lead) => ({ ...lead, overdue: isFollowUpOverdue(lead, today) }))
  .sort((a, b) => {
    if (!a.nextActionDate && !b.nextActionDate) return a.company.localeCompare(b.company, 'id');
    if (!a.nextActionDate) return 1;
    if (!b.nextActionDate) return -1;
    return a.nextActionDate.localeCompare(b.nextActionDate) || a.company.localeCompare(b.company, 'id');
  });

export const createCrmBackup = (leads, now = new Date().toISOString()) => ({
  schema: CRM_SCHEMA,
  version: CRM_SCHEMA_VERSION,
  exportedAt: now,
  leads: validateLeadCollection(leads, { now })
});

export const parseCrmBackup = (jsonText) => {
  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new CrmValidationError('File JSON tidak dapat dibaca.', 'INVALID_JSON');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CrmValidationError('Schema backup tidak valid.');
  }
  if (payload.schema !== CRM_SCHEMA || payload.version !== CRM_SCHEMA_VERSION || !Array.isArray(payload.leads)) {
    throw new CrmValidationError('Schema atau versi backup tidak didukung.', 'INVALID_SCHEMA');
  }
  return validateLeadCollection(payload.leads);
};

const preventSpreadsheetFormula = (value) => {
  const normalized = cleanCrmText(value, 5000);
  return /^[\t\r\n ]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
};

const csvCell = (value) => `"${preventSpreadsheetFormula(value).replace(/"/g, '""')}"`;

export const CRM_CSV_HEADERS = Object.freeze([
  'ID', 'Tanggal Lead', 'Sumber Lead', 'Perusahaan / Brand', 'Nama PIC', 'Jabatan PIC',
  'Status Decision Maker', 'WhatsApp / Telepon', 'Kota', 'Owner', 'Status Brand',
  'Produk / Kebutuhan', 'Estimasi Quantity', 'Potensi Nilai', 'Target Launch', 'Pipeline',
  'Kontak Terakhir', 'Next Action', 'Jadwal Next Action', 'Status Compliance', 'Blocker',
  'Alasan Lost', 'Catatan', 'Fit', 'Readiness', 'Urgency', 'Value', 'Total Skor', 'Prioritas'
]);

export const buildCrmCsv = (leads) => {
  const lines = [CRM_CSV_HEADERS.map(csvCell).join(',')];
  for (const lead of leads) {
    const priority = getPriority(lead.scores);
    lines.push([
      lead.id, lead.leadDate, lead.source, lead.company, lead.picName, lead.picRole,
      lead.decisionMakerStatus, lead.contact, lead.city, lead.owner, lead.brandStatus,
      lead.needs, lead.estimatedQuantity, lead.potentialValue, lead.targetLaunch, lead.pipeline,
      lead.lastContact, lead.nextAction, lead.nextActionDate, lead.complianceStatus, lead.blocker,
      lead.lostReason, lead.notes, lead.scores.fit, lead.scores.readiness, lead.scores.urgency,
      lead.scores.value, priority.total, priority.label
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
};
