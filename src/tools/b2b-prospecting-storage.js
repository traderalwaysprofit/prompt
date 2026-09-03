import { findDuplicate, normalizeLead } from './b2b-prospecting-core.js';

export const B2B_STORAGE_KEY = 'samson:b2b-prospecting:leads:v1';
export const B2B_LEGACY_STORAGE_KEY = 'b2b_maklon_db_v2';

export class B2BStorageError extends Error {}

const resolveStorage = (storage) => storage || globalThis.localStorage;

const parseArray = (raw) => {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new B2BStorageError('Format database lead tidak valid.');
  return value;
};

export const loadLeads = ({ storage } = {}) => {
  const target = resolveStorage(storage);
  if (!target) return { leads: [], migrated: false, storageAvailable: false };

  try {
    const currentRaw = target.getItem(B2B_STORAGE_KEY);
    if (currentRaw) {
      return {
        leads: parseArray(currentRaw).map((lead) => normalizeLead(lead)),
        migrated: false,
        storageAvailable: true
      };
    }

    const legacyRaw = target.getItem(B2B_LEGACY_STORAGE_KEY);
    if (!legacyRaw) return { leads: [], migrated: false, storageAvailable: true };

    const migrated = parseArray(legacyRaw).map((lead) => normalizeLead({
      ...lead,
      instagram: lead.instagram || lead.ig,
      phone: lead.phone || lead.wa || lead.whatsapp,
      sources: [],
      status: 'new'
    }, { preserveId: false }));

    target.setItem(B2B_STORAGE_KEY, JSON.stringify(migrated));
    return { leads: migrated, migrated: true, storageAvailable: true };
  } catch (error) {
    if (error instanceof B2BStorageError) throw error;
    throw new B2BStorageError('Database lokal tidak dapat dibaca. Periksa izin penyimpanan browser.');
  }
};

export const saveLeads = (leads, { storage } = {}) => {
  const target = resolveStorage(storage);
  if (!target) throw new B2BStorageError('Penyimpanan browser tidak tersedia.');
  try {
    const normalized = leads.map((lead) => normalizeLead(lead));
    target.setItem(B2B_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    throw new B2BStorageError(error?.name === 'QuotaExceededError'
      ? 'Kapasitas penyimpanan browser penuh. Ekspor data lalu hapus lead yang tidak diperlukan.'
      : 'Database lokal tidak dapat disimpan.');
  }
};

export const addLeads = (existingLeads, candidates, { allowPossible = true } = {}) => {
  const next = existingLeads.map((lead) => normalizeLead(lead));
  const added = [];
  const skipped = [];

  for (const source of candidates) {
    const lead = normalizeLead(source, { preserveId: false });
    const duplicate = findDuplicate(lead, next);
    if (duplicate.type === 'exact' || (!allowPossible && duplicate.type === 'possible')) {
      skipped.push({ lead, duplicate });
      continue;
    }
    next.unshift(lead);
    added.push(lead);
  }

  return { leads: next, added, skipped };
};

export const updateLead = (leads, id, patch) => leads.map((lead) => {
  if (lead.id !== id) return lead;
  return normalizeLead({
    ...lead,
    ...patch,
    id: lead.id,
    createdAt: lead.createdAt,
    updatedAt: new Date().toISOString()
  });
});

export const deleteLead = (leads, id) => leads.filter((lead) => lead.id !== id);

export const clearLeads = ({ storage } = {}) => {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(B2B_STORAGE_KEY);
  } catch {
    throw new B2BStorageError('Database lokal tidak dapat dikosongkan.');
  }
};
