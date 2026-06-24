const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MAPPING_PATH = path.join(DATA_DIR, 'dashboard-service-mapping.json');
const NCD_SUBCLINIC_MAPPING_PATH = path.join(DATA_DIR, 'dashboard-ncd-subclinic-mapping.json');
const IPD_SUBCLINIC_MAPPING_PATH = path.join(DATA_DIR, 'dashboard-ipd-subclinic-mapping.json');
const CARD_KEYS = ['OPD', 'NCD', 'IPD', 'ER'];
const DEP_CARD_KEYS = ['OPD', 'NCD', 'ER'];
const NCD_SUBCLINIC_KEYS = ['HT', 'DM', 'COPD', 'CKD'];
const IPD_SUBCLINIC_KEYS = ['GENERAL_WARD', 'HOMEWARD'];

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

const NCD_SUBCLINIC_META = {
  HT: { name: 'คลินิกความดัน', sourceType: 'DEP', sortOrder: 1 },
  DM: { name: 'คลินิกเบาหวาน', sourceType: 'DEP', sortOrder: 2 },
  COPD: { name: 'คลินิก COPD', sourceType: 'DEP', sortOrder: 3 },
  CKD: { name: 'คลินิกโรคไต', sourceType: 'DEP', sortOrder: 4 }
};

const IPD_SUBCLINIC_META = {
  GENERAL_WARD: { name: 'หอผู้ป่วยรวม', sourceType: 'WARD', sortOrder: 1 },
  HOMEWARD: { name: 'Homeward', sourceType: 'WARD', sortOrder: 2 }
};

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

function ncdSubclinicRow(subclinicKey, sourceType, sourceCode, displayName, sortOrder, id) {
  const timestamp = nowIso();
  const meta = NCD_SUBCLINIC_META[subclinicKey];
  return {
    id,
    subclinic_key: subclinicKey,
    subclinic_name: meta ? meta.name : subclinicKey,
    source_type: sourceType,
    source_code: normalizeCode(sourceCode),
    display_name: String(displayName || sourceCode || '').trim(),
    active: 1,
    sort_order: Number(sortOrder || 0),
    created_at: timestamp,
    updated_at: timestamp
  };
}

function ipdSubclinicRow(subclinicKey, sourceType, sourceCode, displayName, sortOrder, id) {
  const timestamp = nowIso();
  const meta = IPD_SUBCLINIC_META[subclinicKey];
  return {
    id,
    subclinic_key: subclinicKey,
    subclinic_name: meta ? meta.name : subclinicKey,
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

function writeNcdSubclinicStore(rows) {
  ensureDataDir();
  const payload = {
    version: 1,
    updated_at: nowIso(),
    subclinics: NCD_SUBCLINIC_KEYS.map((key) => ({
      key,
      name: NCD_SUBCLINIC_META[key].name,
      source_type: NCD_SUBCLINIC_META[key].sourceType,
      sort_order: NCD_SUBCLINIC_META[key].sortOrder
    })),
    mappings: rows.map((row, index) => ({
      ...row,
      id: index + 1,
      active: row.active === 0 ? 0 : 1,
      source_type: 'DEP',
      source_code: normalizeCode(row.source_code)
    }))
  };
  const tempPath = `${NCD_SUBCLINIC_MAPPING_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, NCD_SUBCLINIC_MAPPING_PATH);
  return payload.mappings;
}

function writeIpdSubclinicStore(rows) {
  ensureDataDir();
  const payload = {
    version: 1,
    updated_at: nowIso(),
    subclinics: IPD_SUBCLINIC_KEYS.map((key) => ({
      key,
      name: IPD_SUBCLINIC_META[key].name,
      source_type: IPD_SUBCLINIC_META[key].sourceType,
      sort_order: IPD_SUBCLINIC_META[key].sortOrder
    })),
    mappings: rows.map((row, index) => ({
      ...row,
      id: index + 1,
      active: row.active === 0 ? 0 : 1,
      source_type: 'WARD',
      source_code: normalizeCode(row.source_code)
    }))
  };
  const tempPath = `${IPD_SUBCLINIC_MAPPING_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tempPath, IPD_SUBCLINIC_MAPPING_PATH);
  return payload.mappings;
}

async function ensureStore() {
  if (fs.existsSync(MAPPING_PATH)) return;
  writeStore(await defaultMappings());
}

function ensureNcdSubclinicStore() {
  if (fs.existsSync(NCD_SUBCLINIC_MAPPING_PATH)) return;
  writeNcdSubclinicStore([]);
}

async function defaultIpdSubclinicMappings() {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT ward, name
      FROM ward
      WHERE name = ?
         OR LOWER(COALESCE(name, '')) LIKE '%homeward%'
      ORDER BY ward
    `, [IPD_SUBCLINIC_META.GENERAL_WARD.name]);

    const mapped = [];
    const seen = new Set();
    rows.forEach((row) => {
      const ward = normalizeCode(row.ward);
      const name = String(row.name || '');
      if (!ward || seen.has(ward)) return;

      const key = name.trim() === IPD_SUBCLINIC_META.GENERAL_WARD.name
        ? 'GENERAL_WARD'
        : (name.toLowerCase().includes('homeward') ? 'HOMEWARD' : null);
      if (!key) return;

      seen.add(ward);
      mapped.push(ipdSubclinicRow(
        key,
        'WARD',
        ward,
        name || IPD_SUBCLINIC_META[key].name,
        mapped.filter((item) => item.subclinic_key === key).length + 1,
        mapped.length + 1
      ));
    });
    return mapped;
  } catch (err) {
    return [];
  }
}

async function ensureIpdSubclinicStore() {
  if (fs.existsSync(IPD_SUBCLINIC_MAPPING_PATH)) return;
  writeIpdSubclinicStore(await defaultIpdSubclinicMappings());
}

async function readStore() {
  await ensureStore();
  const raw = fs.readFileSync(MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.mappings) ? parsed.mappings : [];
}

function readNcdSubclinicStore() {
  ensureNcdSubclinicStore();
  const raw = fs.readFileSync(NCD_SUBCLINIC_MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.mappings) ? parsed.mappings : [];
}

async function readIpdSubclinicStore() {
  await ensureIpdSubclinicStore();
  const raw = fs.readFileSync(IPD_SUBCLINIC_MAPPING_PATH, 'utf8');
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

function groupNcdSubclinicMappings(rows) {
  return NCD_SUBCLINIC_KEYS.reduce((acc, key) => {
    acc[key] = rows
      .filter((row) => row.subclinic_key === key && row.active !== 0)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((row) => ({
        source_type: 'DEP',
        source_code: normalizeCode(row.source_code),
        display_name: row.display_name || row.source_code
      }));
    return acc;
  }, {});
}

function groupIpdSubclinicMappings(rows) {
  return IPD_SUBCLINIC_KEYS.reduce((acc, key) => {
    acc[key] = rows
      .filter((row) => row.subclinic_key === key && row.active !== 0)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((row) => ({
        source_type: 'WARD',
        source_code: normalizeCode(row.source_code),
        display_name: row.display_name || row.source_code
      }));
    return acc;
  }, {});
}

async function getMappingGroups() {
  return groupMappings(await readStore());
}

function getNcdSubclinicMappingGroups() {
  return groupNcdSubclinicMappings(readNcdSubclinicStore());
}

async function getIpdSubclinicMappingGroups() {
  return groupIpdSubclinicMappings(await readIpdSubclinicStore());
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

function validateNcdSubclinicMappingPayload(payload) {
  const rows = [];
  const depUsage = new Map();

  Object.keys(payload || {}).forEach((key) => {
    if (!NCD_SUBCLINIC_KEYS.includes(key)) {
      throw new Error(`ไม่รองรับคลินิกย่อย NCD key ${key}`);
    }
  });

  NCD_SUBCLINIC_KEYS.forEach((subclinicKey) => {
    const items = Array.isArray(payload[subclinicKey]) ? payload[subclinicKey] : [];
    const seenInSubclinic = new Set();

    items.forEach((item, index) => {
      const sourceType = String(item.source_type || '').trim().toUpperCase();
      const sourceCode = normalizeCode(item.source_code);

      if (sourceType !== 'DEP') {
        throw new Error(`${NCD_SUBCLINIC_META[subclinicKey].name} ต้องใช้ source_type DEP เท่านั้น`);
      }
      if (typeof item.source_code !== 'string') {
        throw new Error(`${NCD_SUBCLINIC_META[subclinicKey].name} source_code ต้องเป็น string`);
      }
      if (!sourceCode) {
        throw new Error(`${NCD_SUBCLINIC_META[subclinicKey].name} มีรหัสห้องว่าง`);
      }
      if (seenInSubclinic.has(sourceCode)) return;
      seenInSubclinic.add(sourceCode);

      const existing = depUsage.get(sourceCode);
      if (existing && existing !== subclinicKey) {
        throw new Error(`รหัสห้อง ${sourceCode} ถูกเลือกซ้ำใน ${NCD_SUBCLINIC_META[existing].name} และ ${NCD_SUBCLINIC_META[subclinicKey].name}`);
      }
      depUsage.set(sourceCode, subclinicKey);

      rows.push(ncdSubclinicRow(
        subclinicKey,
        'DEP',
        sourceCode,
        item.display_name || sourceCode,
        index + 1,
        rows.length + 1
      ));
    });
  });

  return rows;
}

function validateIpdSubclinicMappingPayload(payload) {
  const rows = [];
  const wardUsage = new Map();

  Object.keys(payload || {}).forEach((key) => {
    if (!IPD_SUBCLINIC_KEYS.includes(key)) {
      throw new Error(`ไม่รองรับคลินิกย่อย IPD key ${key}`);
    }
  });

  IPD_SUBCLINIC_KEYS.forEach((subclinicKey) => {
    const items = Array.isArray(payload[subclinicKey]) ? payload[subclinicKey] : [];
    const seenInSubclinic = new Set();

    items.forEach((item, index) => {
      const sourceType = String(item.source_type || '').trim().toUpperCase();
      const sourceCode = normalizeCode(item.source_code);

      if (sourceType !== 'WARD') {
        throw new Error(`${IPD_SUBCLINIC_META[subclinicKey].name} ต้องใช้ source_type WARD เท่านั้น`);
      }
      if (typeof item.source_code !== 'string') {
        throw new Error(`${IPD_SUBCLINIC_META[subclinicKey].name} source_code ต้องเป็น string`);
      }
      if (!sourceCode) {
        throw new Error(`${IPD_SUBCLINIC_META[subclinicKey].name} มีรหัส Ward ว่าง`);
      }
      if (seenInSubclinic.has(sourceCode)) return;
      seenInSubclinic.add(sourceCode);

      const existing = wardUsage.get(sourceCode);
      if (existing && existing !== subclinicKey) {
        throw new Error(`รหัส Ward ${sourceCode} ถูกเลือกซ้ำใน ${IPD_SUBCLINIC_META[existing].name} และ ${IPD_SUBCLINIC_META[subclinicKey].name}`);
      }
      wardUsage.set(sourceCode, subclinicKey);

      rows.push(ipdSubclinicRow(
        subclinicKey,
        'WARD',
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

function saveNcdSubclinicMappingGroups(payload) {
  const rows = validateNcdSubclinicMappingPayload(payload || {});
  writeNcdSubclinicStore(rows);
  return groupNcdSubclinicMappings(rows);
}

function saveIpdSubclinicMappingGroups(payload) {
  const rows = validateIpdSubclinicMappingPayload(payload || {});
  writeIpdSubclinicStore(rows);
  return groupIpdSubclinicMappings(rows);
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

function buildEmptyNcdSubclinic(key) {
  return {
    key,
    name: NCD_SUBCLINIC_META[key].name,
    total: 0,
    mapped_rooms: 0,
    rooms: []
  };
}

function buildEmptyIpdSubclinic(key) {
  return {
    key,
    name: IPD_SUBCLINIC_META[key].name,
    total: 0,
    mapped_wards: 0,
    wards: []
  };
}

async function fetchNcdSubclinicSummary() {
  const mapping = getNcdSubclinicMappingGroups();
  const mainMapping = await getMappingGroups();
  const pool = getPool();

  const subclinics = await Promise.all(NCD_SUBCLINIC_KEYS.map(async (key) => {
    const rows = mapping[key] || [];
    const depcodes = codesFor(rows, 'DEP');
    if (!depcodes.length) return buildEmptyNcdSubclinic(key);

    const total = await countOvstByMainDep(pool, depcodes);
    return {
      key,
      name: NCD_SUBCLINIC_META[key].name,
      total,
      mapped_rooms: depcodes.length,
      rooms: rows.map((row) => ({
        depcode: normalizeCode(row.source_code),
        department: row.display_name || row.source_code
      }))
    };
  }));

  const total = subclinics.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const mainNcdTotal = await countOvstByMainDep(pool, codesFor(mainMapping.NCD, 'DEP'));

  return {
    total,
    main_ncd_total: mainNcdTotal,
    totals_match_main: total === mainNcdTotal,
    subclinics,
    last_updated: bangkokIsoString()
  };
}

async function fetchIpdSubclinicSummary() {
  const mapping = await getIpdSubclinicMappingGroups();
  const mainMapping = await getMappingGroups();
  const pool = getPool();

  const subclinics = await Promise.all(IPD_SUBCLINIC_KEYS.map(async (key) => {
    const rows = mapping[key] || [];
    const wards = codesFor(rows, 'WARD');
    if (!wards.length) return buildEmptyIpdSubclinic(key);

    const total = await countActiveIpd(pool, wards);
    return {
      key,
      name: IPD_SUBCLINIC_META[key].name,
      total,
      mapped_wards: wards.length,
      wards: rows.map((row) => ({
        ward: normalizeCode(row.source_code),
        name: row.display_name || row.source_code
      }))
    };
  }));

  const total = subclinics.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const mainIpdTotal = await countActiveIpd(pool, codesFor(mainMapping.IPD, 'WARD'));

  return {
    total,
    main_ipd_total: mainIpdTotal,
    totals_match_main: total === mainIpdTotal,
    subclinics,
    last_updated: bangkokIsoString()
  };
}

module.exports = {
  CARD_KEYS,
  CARD_META,
  NCD_SUBCLINIC_KEYS,
  NCD_SUBCLINIC_META,
  IPD_SUBCLINIC_KEYS,
  IPD_SUBCLINIC_META,
  getMappingGroups,
  saveMappingGroups,
  resetDefaultMappings,
  getNcdSubclinicMappingGroups,
  saveNcdSubclinicMappingGroups,
  getIpdSubclinicMappingGroups,
  saveIpdSubclinicMappingGroups,
  fetchDepartments,
  fetchWards,
  fetchTodayPatientsSummary,
  fetchNcdSubclinicSummary,
  fetchIpdSubclinicSummary
};
