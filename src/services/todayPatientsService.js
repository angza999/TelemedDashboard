const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MAPPING_PATH = path.join(DATA_DIR, 'dashboard-service-mapping.json');
const CARD_KEYS = ['OPD', 'NCD', 'IPD', 'ER'];
const DEP_CARD_KEYS = ['OPD', 'NCD', 'ER'];

const CARD_META = {
  OPD: { label: 'ผู้ป่วยนอก OPD', sourceType: 'DEP' },
  NCD: { label: 'งาน NCD', sourceType: 'DEP' },
  IPD: { label: 'ผู้ป่วยใน IPD', sourceType: 'WARD' },
  ER: { label: 'อุบัติเหตุฉุกเฉิน ER', sourceType: 'DEP' }
};

const DEFAULT_DEP_MAPPINGS = [
  ['OPD', 'DEP', '002', 'OPD', 1],
  ['OPD', 'DEP', '003', 'OPD', 2],
  ['OPD', 'DEP', '000', 'OPD', 3],
  ['OPD', 'DEP', '001', 'OPD', 4],
  ['NCD', 'DEP', '015', 'NCD', 1],
  ['NCD', 'DEP', '014', 'NCD', 2],
  ['ER', 'DEP', '004', 'ER', 1],
  ['ER', 'DEP', '082', 'ER', 2],
  ['ER', 'DEP', '051', 'ER', 3]
];

function bangkokParts(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

function bangkokDateString(date = new Date()) {
  const parts = bangkokParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function bangkokIsoString(date = new Date()) {
  const parts = bangkokParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeCode(value) {
  return String(value || '').trim();
}

function mappingRow(cardKey, sourceType, sourceCode, displayName, sortOrder, id) {
  const timestamp = nowIso();
  return {
    id,
    card_key: cardKey,
    source_type: sourceType,
    source_code: normalizeCode(sourceCode),
    display_name: String(displayName || sourceCode || '').trim(),
    active: 1,
    sort_order: Number(sortOrder || 0),
    created_at: timestamp,
    updated_at: timestamp
  };
}

async function findDefaultIpdWard() {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT ward, name
      FROM ward
      WHERE name = ?
      LIMIT 1
    `, ['หอผู้ป่วยรวม']);
    const row = rows[0];
    if (!row) return null;
    return mappingRow('IPD', 'WARD', row.ward, row.name || 'หอผู้ป่วยรวม', 1, 0);
  } catch (err) {
    return null;
  }
}

async function defaultMappings() {
  const rows = DEFAULT_DEP_MAPPINGS.map((item, index) => mappingRow(...item, index + 1));
  const ward = await findDefaultIpdWard();
  if (ward) {
    ward.id = rows.length + 1;
    rows.push(ward);
  }
  return rows;
}

function writeStore(rows) {
  ensureDataDir();
  const payload = {
    version: 1,
    updated_at: nowIso(),
    mappings: rows.map((row, index) => ({
      ...row,
      id: index + 1,
      active: row.active === 0 ? 0 : 1,
      source_code: normalizeCode(row.source_code)
    }))
  };
  const tempPath = `${MAPPING_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, MAPPING_PATH);
  return payload.mappings;
}

async function ensureStore() {
  if (fs.existsSync(MAPPING_PATH)) return;
  writeStore(await defaultMappings());
}

async function readStore() {
  await ensureStore();
  const raw = fs.readFileSync(MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.mappings) ? parsed.mappings : [];
}

function groupMappings(rows) {
  return CARD_KEYS.reduce((acc, key) => {
    acc[key] = rows
      .filter((row) => row.card_key === key && row.active !== 0)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((row) => ({
        source_type: row.source_type,
        source_code: normalizeCode(row.source_code),
        display_name: row.display_name || row.source_code
      }));
    return acc;
  }, {});
}

async function getMappingGroups() {
  return groupMappings(await readStore());
}

function validateMappingPayload(payload) {
  const rows = [];
  const depUsage = new Map();

  CARD_KEYS.forEach((cardKey) => {
    const items = Array.isArray(payload[cardKey]) ? payload[cardKey] : [];
    const expectedType = CARD_META[cardKey].sourceType;
    const seenInCard = new Set();

    items.forEach((item, index) => {
      const sourceType = String(item.source_type || '').trim().toUpperCase();
      const sourceCode = normalizeCode(item.source_code);
      if (sourceType !== expectedType) {
        throw new Error(`${cardKey} ต้องใช้ source_type ${expectedType} เท่านั้น`);
      }
      if (!sourceCode) {
        throw new Error(`${cardKey} มีรหัสห้องหรือ ward ว่าง`);
      }
      if (seenInCard.has(sourceCode)) return;
      seenInCard.add(sourceCode);

      if (sourceType === 'DEP' && DEP_CARD_KEYS.includes(cardKey)) {
        const existing = depUsage.get(sourceCode);
        if (existing && existing !== cardKey) {
          throw new Error(`รหัสห้อง ${sourceCode} ถูกเลือกซ้ำในกลุ่ม ${existing} และ ${cardKey}`);
        }
        depUsage.set(sourceCode, cardKey);
      }

      rows.push(mappingRow(
        cardKey,
        sourceType,
        sourceCode,
        item.display_name || sourceCode,
        index + 1,
        rows.length + 1
      ));
    });
  });

  return rows;
}

async function saveMappingGroups(payload) {
  const rows = validateMappingPayload(payload || {});
  writeStore(rows);
  return groupMappings(rows);
}

async function resetDefaultMappings() {
  const rows = await defaultMappings();
  writeStore(rows);
  return groupMappings(rows);
}

async function fetchDepartments() {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT depcode, department, depcode_active
    FROM kskdepartment
    ORDER BY depcode
  `);
  return rows.map((row) => ({
    depcode: normalizeCode(row.depcode),
    department: row.department || '',
    depcode_active: row.depcode_active || ''
  }));
}

async function fetchWards() {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT ward, name
    FROM ward
    ORDER BY ward
  `);
  return rows.map((row) => ({
    ward: normalizeCode(row.ward),
    name: row.name || ''
  }));
}

function codesFor(group, sourceType) {
  return (group || [])
    .filter((row) => row.source_type === sourceType)
    .map((row) => normalizeCode(row.source_code))
    .filter(Boolean);
}

async function countOvstByMainDep(pool, depcodes) {
  if (!depcodes.length) return 0;
  const placeholders = depcodes.map(() => '?').join(', ');
  const [rows] = await pool.execute(`
    SELECT COUNT(DISTINCT o.vn) AS total
    FROM ovst o
    WHERE o.vstdate = CURDATE()
      AND o.main_dep IN (${placeholders})
  `, depcodes);
  return Number((rows[0] && rows[0].total) || 0);
}

async function countActiveIpd(pool, wards) {
  if (!wards.length) return 0;
  const placeholders = wards.map(() => '?').join(', ');
  const [rows] = await pool.execute(`
    SELECT COUNT(DISTINCT i.an) AS total
    FROM ipt i
    WHERE i.ward IN (${placeholders})
      AND (
        i.dchdate IS NULL
        OR i.dchdate = ''
        OR i.dchdate = '0000-00-00'
      )
  `, wards);
  return Number((rows[0] && rows[0].total) || 0);
}

async function fetchTodayPatientsSummary() {
  const mapping = await getMappingGroups();
  const pool = getPool();
  const [opdTotal, ncdTotal, erTotal, ipdTotal] = await Promise.all([
    countOvstByMainDep(pool, codesFor(mapping.OPD, 'DEP')),
    countOvstByMainDep(pool, codesFor(mapping.NCD, 'DEP')),
    countOvstByMainDep(pool, codesFor(mapping.ER, 'DEP')),
    countActiveIpd(pool, codesFor(mapping.IPD, 'WARD'))
  ]);

  return {
    opd_total: opdTotal,
    ncd_total: ncdTotal,
    ipd_total: ipdTotal,
    er_total: erTotal,
    data_date: bangkokDateString(),
    last_updated: bangkokIsoString()
  };
}

module.exports = {
  CARD_KEYS,
  CARD_META,
  getMappingGroups,
  saveMappingGroups,
  resetDefaultMappings,
  fetchDepartments,
  fetchWards,
  fetchTodayPatientsSummary
};
