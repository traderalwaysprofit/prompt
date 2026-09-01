import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  buildGoogleContactsCsv,
  ContactToolError,
  formatIndonesianPhone,
  looksLikeContactHeader,
  mapContactRows
} from '../src/contact-tools-core.js';

assert.deepEqual(formatIndonesianPhone('0812-3456-7890'), { valid: true, value: '+6281234567890', reason: '' });
assert.deepEqual(formatIndonesianPhone('+62 812 3456 7891'), { valid: true, value: '+6281234567891', reason: '' });
assert.deepEqual(formatIndonesianPhone('62081234567892'), { valid: true, value: '+6281234567892', reason: '' });
assert.equal(formatIndonesianPhone('12345').valid, false);
assert.equal(looksLikeContactHeader(['Nama Kontak', 'Brand / Perusahaan', 'WhatsApp']), true);
assert.equal(looksLikeContactHeader(['Sari', 'Masumi', '081234567890']), false);
assert.equal(looksLikeContactHeader(['Contact Person', 'Company X', '081234567890']), false);

const mapped = mapContactRows([
  ['Nama Kontak', 'Brand / Perusahaan', 'WhatsApp'],
  ['Sari', 'Masumi', '081234567890'],
  ['Budi', 'Klinik', '+62 812-3456-7891'],
  ['Duplikat', 'Masumi', '081234567890'],
  ['Nomor Salah', 'Test', '12345'],
  ['', '', '81234567892']
]);

assert.equal(mapped.headerSkipped, true);
assert.equal(mapped.rows.length, 5);
assert.equal(mapped.exportableRows.length, 3);
assert.equal(mapped.rows[0].previewName, 'Sari - Masumi');
assert.equal(mapped.rows[2].status, 'duplicate');
assert.equal(mapped.rows[3].status, 'invalid');
assert.equal(mapped.rows[4].status, 'warning');

assert.throws(
  () => mapContactRows([['A', 'B', '081234567890'], ['C', 'D', '081234567891']], { maxContacts: 1 }),
  ContactToolError
);

const csv = buildGoogleContactsCsv(mapped.exportableRows);
assert.equal(csv.charCodeAt(0), 0xfeff);
assert.match(csv, /^\uFEFF"First Name","Organization Name","Phone 1 - Label","Phone 1 - Value"\r\n/);
assert.match(csv, /"Sari - Masumi","Masumi","Mobile","\+6281234567890"/);
assert.equal((csv.match(/\+6281234567890/g) || []).length, 1);
assert.doesNotMatch(csv, /\+12345/);

const sheetJsSource = await readFile(new URL('../node_modules/xlsx/dist/xlsx.full.min.js', import.meta.url), 'utf8');
const browserSandbox = {
  ArrayBuffer,
  console,
  Date,
  JSON,
  Math,
  setTimeout,
  clearTimeout,
  Uint8Array
};
browserSandbox.window = browserSandbox;
vm.createContext(browserSandbox);
vm.runInContext(sheetJsSource, browserSandbox, { timeout: 5000 });
assert.equal(browserSandbox.XLSX.version, '0.20.3');

const workbook = browserSandbox.XLSX.read(new TextEncoder().encode('Nama,Brand,WhatsApp\nSari,Masumi,081234567890'), { type: 'array' });
const parsedRows = browserSandbox.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: true, defval: '' });
assert.equal(parsedRows.length, 2);
assert.equal(parsedRows[1][0], 'Sari');

console.log('CONTACT TOOLS TESTS: PASS');
