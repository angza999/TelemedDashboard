const { getPool } = require('../db');

const TARGET_RATE = 0.5;
const TARGET_DEPARTMENTS = [
  { depcode: '086', department: 'B2B Telemed', service_group: 'Telemed' },
  { depcode: '082', department: 'ER Telemed', service_group: 'Telemed' },
  { depcode: '066', department: 'NCD Telemed', service_group: 'Telemed' },
  { depcode: '085', department: 'NCDCSG Telemed', service_group: 'Telemed' },
  { depcode: '080', department: 'OPD Telemed', service_group: 'Telemed' },
  { depcode: '079', department: 'PHDTelemed', service_group: 'Telemed' },
  { depcode: '077', department: 'คลินิกความดัน-Telemed', service_group: 'Telemed' },
  { depcode: '084', department: 'จิตเวช Telemed', service_group: 'Telemed' },
  { depcode: '083', department: 'ทันตกรรม Telemed', service_group: 'Telemed' },
  { depcode: '081', department: 'ห้องจ่ายยา Telemed', service_group: 'Telemed' },
  { depcode: '037', department: 'กายภาพบำบัด', service_group: 'กายภาพ' },
  { depcode: '078', department: 'กายภาพบำบัด(รองเท้ารองช้ำ)', service_group: 'กายภาพ' },
  { depcode: '004', department: 'อุบัติเหตุ - ฉุกเฉิน', service_group: 'อุบัติเหตุฉุกเฉิน' },
  { depcode: '007', department: 'งานแพทย์แผนไทย', service_group: 'แผนไทย' }
];

function targetDepartmentSql() {
  return TARGET_DEPARTMENTS
    .map(() => 'SELECT ? AS depcode')
    .join('\n      UNION ALL\n      ');
}

function targetDepartmentParams() {
  return TARGET_DEPARTMENTS.map((department) => department.depcode);
}

function targetDepartmentByCode(depcode) {
  return TARGET_DEPARTMENTS.find((department) => department.depcode === depcode) || null;
}

function b2bCondition(aliasOvstist = 'oi', aliasScreen = 's') {
  return `
    (
      LOWER(COALESCE(${aliasOvstist}.name, '')) LIKE '%b2b%'
      OR LOWER(COALESCE(${aliasScreen}.cc, '')) LIKE '%b2b%'
    )
  `;
}

function normalizeDepartment(row) {
  const opdTotal = Number(row.opd_total || 0);
  const telemedTotal = Number(row.telemed_total || 0);
  const b2bTotal = Number(row.b2b_total || 0);
  const b2cTotal = Number(row.b2c_total || 0);
  const target50 = Math.ceil(opdTotal * TARGET_RATE);
  const telemedPercent = opdTotal > 0 ? Number(((telemedTotal / opdTotal) * 100).toFixed(2)) : 0;
  const diffFromTarget = telemedTotal - target50;

  return {
    depcode: row.depcode || 'ไม่ระบุ',
    department: row.department || 'ไม่ระบุห้อง',
    service_group: row.service_group || 'ไม่ระบุกลุ่ม',
    opd_total: opdTotal,
    telemed_total: telemedTotal,
    b2b_total: b2bTotal,
    b2c_total: b2cTotal,
    target_50: target50,
    telemed_percent: telemedPercent,
    diff_from_target: diffFromTarget,
    target_status: telemedTotal >= target50 ? 'ผ่านเป้าหมาย' : 'ยังไม่ถึงเป้าหมาย'
  };
}

function filterRows(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.depcode && filters.depcode !== 'all' && row.depcode !== filters.depcode) return false;
    if (filters.status === 'passed' && row.target_status !== 'ผ่านเป้าหมาย') return false;
    if (filters.status === 'failed' && row.target_status !== 'ยังไม่ถึงเป้าหมาย') return false;
    return true;
  });
}

function sortRows(rows, sortBy = 'target_gap') {
  const sorted = rows.slice();
  const sorters = {
    percent_low: (a, b) => a.telemed_percent - b.telemed_percent,
    telemed_desc: (a, b) => b.telemed_total - a.telemed_total,
    opd_desc: (a, b) => b.opd_total - a.opd_total,
    target_gap: (a, b) => {
      const statusA = a.target_status === 'ยังไม่ถึงเป้าหมาย' ? 0 : 1;
      const statusB = b.target_status === 'ยังไม่ถึงเป้าหมาย' ? 0 : 1;
      if (statusA !== statusB) return statusA - statusB;
      return a.diff_from_target - b.diff_from_target;
    }
  };
  return sorted.sort(sorters[sortBy] || sorters.target_gap);
}

function summarizeRows(rows) {
  const summary = rows.reduce((acc, row) => {
    acc.opd_total += row.opd_total;
    acc.telemed_total += row.telemed_total;
    acc.b2b_total += row.b2b_total;
    acc.b2c_total += row.b2c_total;
    acc.target_50_total += row.target_50;
    if (row.target_status === 'ผ่านเป้าหมาย') acc.passed_department_count += 1;
    if (row.target_status === 'ยังไม่ถึงเป้าหมาย') acc.failed_department_count += 1;
    return acc;
  }, {
    opd_total: 0,
    telemed_total: 0,
    b2b_total: 0,
    b2c_total: 0,
    target_50_total: 0,
    passed_department_count: 0,
    failed_department_count: 0
  });

  summary.telemed_percent = summary.opd_total > 0
    ? Number(((summary.telemed_total / summary.opd_total) * 100).toFixed(2))
    : 0;
  summary.diff_from_target = summary.telemed_total - summary.target_50_total;
  summary.worst_department = rows
    .filter((row) => row.diff_from_target < 0)
    .slice()
    .sort((a, b) => a.diff_from_target - b.diff_from_target)[0] || null;
  summary.top_failed_departments = rows
    .filter((row) => row.diff_from_target < 0)
    .slice()
    .sort((a, b) => a.diff_from_target - b.diff_from_target)
    .slice(0, 3);
  return summary;
}

function buildDepartmentTargetModel(rawRows, filters = {}) {
  const allRows = rawRows.map(normalizeDepartment);
  const departments = TARGET_DEPARTMENTS.map((department) => ({
    depcode: department.depcode,
    department: department.department,
    service_group: department.service_group
  }));
  const rows = sortRows(filterRows(allRows, filters), filters.sortBy);

  return {
    summary: summarizeRows(rows),
    rows,
    departments,
    allRows,
    lastUpdated: new Date().toISOString(),
    hasB2b: rows.some((row) => row.b2b_total > 0)
  };
}

function emptyDepartmentTargetModel() {
  return buildDepartmentTargetModel([], {});
}

async function fetchDepartmentTargetData(filters) {
  const pool = getPool();
  const b2b = b2bCondition('oi', 's');
  const depcodes = TARGET_DEPARTMENTS.map((department) => department.depcode);
  const depcodePlaceholders = depcodes.map(() => '?').join(', ');
  const [rawRows] = await pool.execute(`
    SELECT
      td.depcode,
      COALESCE(opd.opd_total, 0) AS opd_total,
      COALESCE(t.telemed_total, 0) AS telemed_total,
      COALESCE(t.b2b_total, 0) AS b2b_total,
      COALESCE(t.b2c_total, 0) AS b2c_total
    FROM (
      ${targetDepartmentSql()}
    ) td
    LEFT JOIN (
      SELECT
        v.main_dep AS depcode,
        COUNT(DISTINCT v.vn) AS opd_total
      FROM ovst v
      WHERE v.vstdate BETWEEN ? AND ?
        AND v.main_dep IN (${depcodePlaceholders})
      GROUP BY v.main_dep
    ) opd ON opd.depcode = td.depcode
    LEFT JOIN (
      SELECT
        o.main_dep AS depcode,
        COUNT(DISTINCT o.vn) AS telemed_total,
        COUNT(DISTINCT CASE
          WHEN ${b2b}
          THEN o.vn
        END) AS b2b_total,
        COUNT(DISTINCT CASE
          WHEN NOT ${b2b}
          THEN o.vn
        END) AS b2c_total
      FROM ovst o
      LEFT JOIN ovstist oi ON oi.ovstist = o.ovstist
      LEFT JOIN opdscreen s ON s.vn = o.vn
      WHERE o.vstdate BETWEEN ? AND ?
        AND oi.export_code = '5'
        AND o.main_dep IN (${depcodePlaceholders})
      GROUP BY o.main_dep
    ) t ON t.depcode = td.depcode
    WHERE COALESCE(opd.opd_total, 0) > 0
      OR COALESCE(t.telemed_total, 0) > 0
  `, [
    ...targetDepartmentParams(),
    filters.startDate,
    filters.endDate,
    ...depcodes,
    filters.startDate,
    filters.endDate,
    ...depcodes
  ]);

  const rows = rawRows.map((row) => {
    const targetDepartment = targetDepartmentByCode(row.depcode);
    return {
      ...row,
      department: targetDepartment ? targetDepartment.department : row.depcode,
      service_group: targetDepartment ? targetDepartment.service_group : 'ไม่ระบุกลุ่ม'
    };
  });

  return buildDepartmentTargetModel(rows, filters);
}

module.exports = {
  TARGET_RATE,
  TARGET_DEPARTMENTS,
  emptyDepartmentTargetModel,
  fetchDepartmentTargetData,
  buildDepartmentTargetModel
};
