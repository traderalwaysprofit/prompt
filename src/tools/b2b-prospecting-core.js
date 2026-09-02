export const LEAD_SCHEMA_VERSION = 1;
export const LEAD_STATUSES = Object.freeze([
  'new',
  'verified',
  'qualified',
  'contacted',
  'responded',
  'meeting',
  'proposal',
  'won',
  'lost'
]);

export const PROSPECT_HEADERS = Object.freeze([
  'Brand',
  'Perusahaan',
  'Kategori',
  'Wilayah',
  'Alamat',
  'Website',
  'Instagram',
  'WhatsApp',
  'Status',
  'Catatan'
]);

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_TEXT = 500;

export const cleanText = (value, maxLength = MAX_TEXT) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  return String(value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

export const normalizePhone = (value) => {
  let digits = cleanText(value, 64).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('620')) digits = `62${digits.slice(3)}`;
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  if (!/^628\d{7,11}$/.test(digits)) return '';
  return `+${digits}`;
};

export const normalizeInstagram = (value) => {
  const text = cleanText(value, 160);
  if (!text || text === '-') return '';
  let username = text;
  try {
    const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const url = new URL(candidate);
    if (/^(www\.)?instagram\.com$/i.test(url.hostname)) {
      username = url.pathname.split('/').filter(Boolean)[0] || '';
    }
  } catch {
    username = text;
  }
  username = username.replace(/^@+/, '').split(/[/?#]/)[0].trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : '';
};

export const normalizeWebsite = (value) => {
  const text = cleanText(value, 300);
  if (!text || text === '-') return '';
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (!SAFE_URL_PROTOCOLS.has(url.protocol) || !url.hostname) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
};

export const normalizeSourceUrl = (value) => normalizeWebsite(value);

const normalizeConfidence = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number));
};

export const normalizeSource = (source = {}) => {
  const url = normalizeSourceUrl(source.url);
  if (!url) return null;
  return {
    type: cleanText(source.type || 'web', 48).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'web',
    label: cleanText(source.label || 'Web source', 120),
    url,
    verifiedAt: cleanText(source.verifiedAt, 40) || null,
    confidence: normalizeConfidence(source.confidence)
  };
};

export const createLeadId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(36).slice(2, 10);
  return `lead-${Date.now().toString(36)}-${random}`;
};

export const normalizeStatus = (value) => {
  const status = cleanText(value, 32).toLowerCase();
  return LEAD_STATUSES.includes(status) ? status : 'new';
};

export const normalizeLead = (input = {}, { preserveId = true } = {}) => {
  const sources = Array.isArray(input.sources || input.source)
    ? (input.sources || input.source).map(normalizeSource).filter(Boolean).slice(0, 12)
    : [];
  const now = new Date().toISOString();
  const lead = {
    schemaVersion: LEAD_SCHEMA_VERSION,
    id: preserveId && cleanText(input.id, 80) ? cleanText(input.id, 80) : createLeadId(),
    brand: cleanText(input.brand || input.name, 160),
    company: cleanText(input.company, 180),
    category: cleanText(input.category, 100),
    region: cleanText(input.region, 100),
    address: cleanText(input.address, 300),
    website: normalizeWebsite(input.website),
    instagram: normalizeInstagram(input.instagram || input.ig),
    phone: normalizePhone(input.phone || input.whatsapp || input.wa),
    status: normalizeStatus(input.status),
    score: 0,
    sources,
    confidence: normalizeConfidence(input.confidence),
    notes: cleanText(input.notes, 1000),
    createdAt: cleanText(input.createdAt, 40) || now,
    updatedAt: cleanText(input.updatedAt, 40) || now,
    lastVerifiedAt: cleanText(input.lastVerifiedAt, 40) || null
  };
  const score = calculateLeadScore(lead);
  lead.score = score.score;
  return lead;
};

const normalizedComparable = (value) => cleanText(value, 240)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(pt|cv|ud|tbk|ltd|inc|co)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const websiteHost = (value) => {
  const website = normalizeWebsite(value);
  if (!website) return '';
  try {
    return new URL(website).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

export const createLeadFingerprint = (lead = {}) => ({
  phone: normalizePhone(lead.phone),
  website: websiteHost(lead.website),
  instagram: normalizeInstagram(lead.instagram || lead.ig).toLowerCase(),
  brand: normalizedComparable(lead.brand),
  company: normalizedComparable(lead.company),
  region: normalizedComparable(lead.region)
});

export const findDuplicate = (candidate, existingLeads = []) => {
  const target = createLeadFingerprint(candidate);
  let possible = null;

  for (const existing of existingLeads) {
    const current = createLeadFingerprint(existing);
    if (target.phone && current.phone && target.phone === current.phone) {
      return { type: 'exact', reason: 'Nomor WhatsApp sama', lead: existing };
    }
    if (target.website && current.website && target.website === current.website) {
      return { type: 'exact', reason: 'Domain website sama', lead: existing };
    }
    if (target.instagram && current.instagram && target.instagram === current.instagram) {
      return { type: 'exact', reason: 'Instagram sama', lead: existing };
    }

    const sameRegion = target.region && current.region && target.region === current.region;
    const sameBrand = target.brand && current.brand && target.brand === current.brand;
    const sameCompany = target.company && current.company && target.company === current.company;
    if (!possible && sameRegion && (sameBrand || sameCompany)) {
      possible = { type: 'possible', reason: sameBrand ? 'Nama brand dan wilayah sama' : 'Nama perusahaan dan wilayah sama', lead: existing };
    }
  }

  return possible || { type: 'none', reason: '', lead: null };
};

export const mergeLead = (existing, incoming) => {
  const base = normalizeLead(existing);
  const next = normalizeLead(incoming, { preserveId: false });
  const pick = (primary, fallback) => primary || fallback;
  const sourceMap = new Map();
  for (const source of [...base.sources, ...next.sources]) sourceMap.set(source.url, source);
  const merged = {
    ...base,
    brand: pick(next.brand, base.brand),
    company: pick(next.company, base.company),
    category: pick(next.category, base.category),
    region: pick(next.region, base.region),
    address: pick(next.address, base.address),
    website: pick(next.website, base.website),
    instagram: pick(next.instagram, base.instagram),
    phone: pick(next.phone, base.phone),
    sources: [...sourceMap.values()].slice(0, 12),
    confidence: Math.max(base.confidence || 0, next.confidence || 0) || null,
    notes: [base.notes, next.notes].filter(Boolean).join('\n').slice(0, 1000),
    updatedAt: new Date().toISOString(),
    lastVerifiedAt: next.lastVerifiedAt || base.lastVerifiedAt
  };
  merged.score = calculateLeadScore(merged).score;
  return merged;
};

export const calculateLeadScore = (lead = {}) => {
  const reasons = [];
  let score = 0;
  const add = (points, label) => {
    score += points;
    reasons.push({ points, label });
  };

  if (Array.isArray(lead.sources) && lead.sources.length) add(20, 'Sumber terverifikasi');
  if (normalizeWebsite(lead.website)) add(15, 'Website tersedia');
  if (normalizePhone(lead.phone)) add(15, 'WhatsApp tersedia');
  if (normalizeInstagram(lead.instagram || lead.ig)) add(10, 'Instagram tersedia');
  if (cleanText(lead.company)) add(5, 'Perusahaan diketahui');
  if (cleanText(lead.region)) add(10, 'Wilayah diketahui');
  if (cleanText(lead.category)) add(15, 'Kategori target diketahui');
  if (Array.isArray(lead.sources) && lead.sources.length >= 2) add(10, 'Lebih dari satu sumber');

  score = Math.min(100, score);
  return {
    score,
    band: score >= 80 ? 'hot' : score >= 60 ? 'warm' : 'low',
    reasons
  };
};

const headerAliases = Object.freeze({
  brand: ['brand', 'merk', 'nama brand', 'nama merk', 'prospek', 'nama prospek'],
  company: ['perusahaan', 'company', 'nama perusahaan', 'pt cv', 'pt/cv'],
  category: ['kategori', 'category', 'jenis bisnis', 'business category'],
  region: ['wilayah', 'region', 'kota', 'city', 'kabupaten'],
  address: ['alamat', 'address', 'lokasi'],
  website: ['website', 'web', 'site', 'url'],
  instagram: ['instagram', 'ig', 'akun instagram'],
  phone: ['whatsapp', 'wa', 'phone', 'telepon', 'telp', 'nomor'],
  status: ['status', 'lead status'],
  notes: ['catatan', 'notes', 'note']
});

const normalizeHeader = (value) => cleanText(value, 120).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export const detectProspectColumns = (headerRow = []) => {
  const mapping = {};
  headerRow.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    for (const [field, aliases] of Object.entries(headerAliases)) {
      if (aliases.includes(normalized) && mapping[field] === undefined) mapping[field] = index;
    }
  });
  return mapping;
};

export const mapProspectRows = (rawRows = []) => {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return { mapping: {}, rows: [], validRows: [], issueRows: [] };
  const mapping = detectProspectColumns(Array.isArray(rawRows[0]) ? rawRows[0] : []);
  if (mapping.brand === undefined && mapping.company === undefined) {
    return { mapping, rows: [], validRows: [], issueRows: [], error: 'Header Brand/Merk atau Perusahaan tidak ditemukan.' };
  }

  const rows = [];
  for (let index = 1; index < rawRows.length; index += 1) {
    const source = Array.isArray(rawRows[index]) ? rawRows[index] : [];
    if (!source.some((value) => cleanText(value))) continue;
    const get = (field) => mapping[field] === undefined ? '' : source[mapping[field]];
    const lead = normalizeLead({
      brand: get('brand'),
      company: get('company'),
      category: get('category'),
      region: get('region'),
      address: get('address'),
      website: get('website'),
      instagram: get('instagram'),
      phone: get('phone'),
      status: get('status'),
      notes: get('notes'),
      sources: []
    }, { preserveId: false });

    const issues = [];
    if (!lead.brand && !lead.company) issues.push('Brand/perusahaan kosong');
    if (get('phone') && !lead.phone) issues.push('WhatsApp tidak valid');
    if (get('website') && !lead.website) issues.push('Website tidak valid');
    if (get('instagram') && !lead.instagram) issues.push('Instagram tidak valid');

    rows.push({
      rowNumber: index + 1,
      lead,
      status: issues.length ? 'warning' : 'ready',
      reason: issues.join(' · ') || 'Siap'
    });
  }

  return {
    mapping,
    rows,
    validRows: rows.filter((row) => row.status === 'ready'),
    issueRows: rows.filter((row) => row.status !== 'ready')
  };
};

const csvCell = (value) => `"${cleanText(value, 2000).replace(/"/g, '""')}"`;

export const buildProspectsCsv = (leads = []) => {
  const lines = [PROSPECT_HEADERS.map(csvCell).join(',')];
  for (const sourceLead of leads) {
    const lead = normalizeLead(sourceLead);
    lines.push([
      lead.brand,
      lead.company,
      lead.category,
      lead.region,
      lead.address,
      lead.website,
      lead.instagram ? `@${lead.instagram}` : '',
      lead.phone,
      lead.status,
      lead.notes
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
};

export const buildTemplateCsv = () => `${PROSPECT_HEADERS.map(csvCell).join(',')}\r\n`;

export const leadLocationQuery = (lead = {}) => {
  const address = cleanText(lead.address, 300);
  if (address) return address;
  return [cleanText(lead.brand, 160), cleanText(lead.region, 100)].filter(Boolean).join(' ');
};

export const buildMapsRoute = (leads = []) => {
  const queries = leads.slice(0, 4).map(leadLocationQuery).filter(Boolean);
  if (!queries.length) return '';
  if (queries.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queries[0])}`;
  }
  const origin = encodeURIComponent(queries[0]);
  const destination = encodeURIComponent(queries[queries.length - 1]);
  const middle = queries.slice(1, -1).map(encodeURIComponent).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${middle ? `&waypoints=${middle}` : ''}`;
};

export const buildWhatsAppBrief = (leads = [], { salesLabel = 'Tim Sales', date = new Date() } = {}) => {
  const selected = leads.slice(0, 4);
  if (!selected.length) return '';
  const dateLabel = date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    '*🎯 BRIEF KUNJUNGAN SALES B2B*',
    `Hari/Tanggal: ${dateLabel}`,
    `Tim Sales: ${cleanText(salesLabel, 100) || 'Tim Sales'}`,
    '',
    '*Daftar Kunjungan Hari Ini:*'
  ];
  selected.forEach((lead, index) => {
    lines.push(`${index + 1}. *Prospek:* ${cleanText(lead.brand || lead.company, 160) || 'Prospek'}`);
    lines.push(`   *Area:* ${cleanText(lead.region, 100) || '-'}`);
    if (lead.phone) lines.push(`   *WA:* ${normalizePhone(lead.phone) || '-'}`);
    lines.push('   *Target:* Validasi kebutuhan dan tawarkan solusi kerja sama B2B.', '');
  });
  const maps = buildMapsRoute(selected);
  if (maps) lines.push('*📍 Link Rute Navigasi:*', maps, '');
  lines.push('_Update status lead setelah kunjungan agar pipeline tetap akurat._');
  return lines.join('\n');
};
