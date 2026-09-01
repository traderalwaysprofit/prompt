export const MAX_CONTACTS = 3000;

export class ContactToolError extends Error {}

export const cleanContactText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
};

export const formatIndonesianPhone = (value) => {
  let digits = cleanContactText(value).replace(/\D/g, '');
  if (!digits) return { valid: false, value: '', reason: 'Nomor kosong' };

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('620')) digits = `62${digits.slice(3)}`;
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;

  if (!/^628\d{7,11}$/.test(digits)) {
    return { valid: false, value: digits ? `+${digits}` : '', reason: 'Format WhatsApp tidak valid' };
  }

  return { valid: true, value: `+${digits}`, reason: '' };
};

export const looksLikeContactHeader = (row = []) => {
  const values = row.slice(0, 3).map((value) => cleanContactText(value).toLowerCase());
  const nameMatch = /(nama|name|kontak|contact)/.test(values[0] || '');
  const brandMatch = /(brand|perusahaan|company|organisasi|organization)/.test(values[1] || '');
  const phoneMatch = /(wa|whatsapp|telepon|telp|phone|mobile|nomor)/.test(values[2] || '');
  return phoneMatch && (nameMatch || brandMatch);
};

export const mapContactRows = (rawRows, { maxContacts = MAX_CONTACTS } = {}) => {
  const headerSkipped = looksLikeContactHeader(rawRows[0]);
  const startIndex = headerSkipped ? 1 : 0;
  const seenPhones = new Set();
  const rows = [];

  for (let index = startIndex; index < rawRows.length; index += 1) {
    const source = Array.isArray(rawRows[index]) ? rawRows[index] : [];
    const name = cleanContactText(source[0]);
    const brand = cleanContactText(source[1]);
    const rawPhone = cleanContactText(source[2]);
    if (!name && !brand && !rawPhone) continue;

    if (rows.length >= maxContacts) {
      throw new ContactToolError(`File berisi lebih dari ${maxContacts.toLocaleString('id-ID')} kontak. Pecah file sumber, lalu proses tiap bagian secara terpisah.`);
    }

    const phone = formatIndonesianPhone(rawPhone);
    let previewName = name && brand ? `${name} - ${brand}` : name || brand;
    let status = 'ready';
    let reason = 'Siap';
    let exportable = phone.valid;

    if (!phone.valid) {
      status = 'invalid';
      reason = phone.reason;
      exportable = false;
    } else if (seenPhones.has(phone.value)) {
      status = 'duplicate';
      reason = 'Nomor duplikat';
      exportable = false;
    } else {
      seenPhones.add(phone.value);
      if (!previewName) {
        previewName = phone.value;
        status = 'warning';
        reason = 'Nama kosong';
      }
    }

    rows.push({
      rowNumber: index + 1,
      previewName,
      brand,
      phone: phone.value,
      status,
      reason,
      exportable
    });
  }

  return {
    headerSkipped,
    rows,
    exportableRows: rows.filter((row) => row.exportable)
  };
};

const csvCell = (value) => `"${cleanContactText(value).replace(/"/g, '""')}"`;

export const buildGoogleContactsCsv = (rows) => {
  const headers = ['First Name', 'Organization Name', 'Phone 1 - Label', 'Phone 1 - Value'];
  const lines = [headers.map(csvCell).join(',')];

  for (const contact of rows) {
    lines.push([
      contact.previewName,
      contact.brand,
      'Mobile',
      contact.phone
    ].map(csvCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
};
