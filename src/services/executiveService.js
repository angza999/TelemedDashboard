const { DEPARTMENT_TARGETS } = require('../config/departmentTargets');
const { getPool } = require('../db');

const TARGET_RATE = 0.5;
const TARGET_DEPARTMENTS = DEPARTMENT_TARGETS
  .filter((department) => department.is_active !== false)
  .map((department) => ({
    depcode: department.display_depcode,
    department: department.display_name,
    service_group: department.service_group,
    display_depcode: department.display_depcode,
    display_name: department.display_name,
    opd_source_deps: department.opd_source_deps,
    telemed_count_deps: department.telemed_count_deps,
    telemed_mode: department.telemed_mode,
    note: department.note || ''
  }));

function activeDepartmentTargets() {
  return DEPARTMENT_TARGETS.filter((department) => department.is_active !== false);
}

function b2bCondition(aliasOvstist = 'oi', aliasScreen = 's') {
  return `
    (
      LOWER(COALESCE(${aliasOvstist}.name, '')) LIKE '%b2b%'
      OR LOWER(COALESCE(${aliasScreen}.cc, '')) LIKE '%b2b%'
    )
  `;
}

function uniqueDepcodes(depcodes) {
  return [...new Set(depcodes.filter(Boolean).map((depcode) => String(depcode)))];
}

function sourceNote(target) {
  const note = target.note || '';
  const sourceText = `OPD source: ${(target.opd_source_deps || []).join(', ')} | Telemed source: ${(target.telemed_count_deps || []).join(', ')} | Mode: ${target.telemed_mode}`;
  return note ? `${note} (${sourceText})` : sourceText;
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
    display_depcode: row.display_depcode,
    display_name: row.display_name,
    depcode: row.display_depcode,
    department: row.display_name,
    service_group: row.service_group,
    opd_source_deps: row.opd_source_deps || [],
    telemed_count_deps: row.telemed_count_deps || [],
    telemed_mode: row.telemed_mode || 'B2C_ONLY',
    opd_total: opdTotal,
    telemed_total: telemedTotal,
    b2b_total: b2bTotal,
    b2c_total: b2cTotal,
    target_50: target50,
    telemed_percent: telemedPercent,
    diff_from_target: diffFromTarget,
    target_status: telemedTotal >= target50 ? 'ผ่านเป้าหมาย' : 'ยังไม่ถึงเป้าหมาย',
    note: row.note || '',
    calculation_note: row.calculation_note || sourceNote(row),
    is_special_case: false
  };
}

function filterRows(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.depcode && filters.depcode !== 'all' && row.display_depcode !== filters.depcode) return false;
    if (filters.serviceGroup && filters.serviceGroup !== 'all' && row.service_group !== filters.serviceGroup) return false;
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
  const rows = sortRows(filterRows(allRows, filters), filters.sortBy);

  return {
    summary: summarizeRows(rows),
    rows,
    departments: TARGET_DEPARTMENTS,
    allRows,
    lastUpdated: new Date().toISOString(),
    hasB2b: rows.some((row) => row.b2b_total > 0)
  };
}

function emptyDepartmentTargetModel() {
  return buildDepartmentTargetModel([], {});
}

function telemedModeClause(target) {
  const telemedMode = target.telemed_mode || 'B2C_ONLY';
  const b2b = b2bCondition('oi', 's');
  if (telemedMode === 'B2B_ONLY') return `AND ${b2b}`;
  if (telemedMode === 'B2C_ONLY') return `AND NOT ${b2b}`;
  return '';
}

function modeTotals(telemedTotal, telemedMode) {
  if (telemedMode === 'B2B_ONLY') {
    return { b2b_total: telemedTotal, b2c_total: 0 };
  }
  if (telemedMode === 'B2C_ONLY') {
    return { b2b_total: 0, b2c_total: telemedTotal };
  }
  return { b2b_total: 0, b2c_total: 0 };
}

async function fetchTargetCounts(pool, filters, target) {
  const opdDeps = uniqueDepcodes(target.opd_source_deps || []);
  const telemedDeps = uniqueDepcodes(target.telemed_count_deps || []);
  const opdPlaceholders = opdDeps.map(() => '?').join(', ');
  const telemedPlaceholders = telemedDeps.map(() => '?').join(', ');
  const telemedMode = target.telemed_mode || 'B2C_ONLY';
  const modeClause = telemedModeClause(target);
  const [rows] = await pool.execute(`
    SELECT
      (
        SELECT COUNT(DISTINCT v.vn)
        FROM ovst v
        WHERE v.vstdate BETWEEN ? AND ?
          AND v.main_dep IN (${opdPlaceholders})
      ) AS opd_total,
      (
        SELECT COUNT(DISTINCT o.vn)
        FROM ovst o
        LEFT JOIN ovstist oi ON oi.ovstist = o.ovstist
        LEFT JOIN opdscreen s ON s.vn = o.vn
        WHERE o.vstdate BETWEEN ? AND ?
          AND o.main_dep IN (${telemedPlaceholders})
          AND oi.export_code = '5'
          ${modeClause}
      ) AS telemed_total
  `, [
    filters.startDate,
    filters.endDate,
    ...opdDeps,
    filters.startDate,
    filters.endDate,
    ...telemedDeps
  ]);

  const result = rows[0] || {};
  const telemedTotal = Number(result.telemed_total || 0);
  const channelTotals = modeTotals(telemedTotal, telemedMode);

  return {
    display_depcode: target.display_depcode,
    display_name: target.display_name,
    service_group: target.service_group,
    opd_source_deps: target.opd_source_deps || [],
    telemed_count_deps: target.telemed_count_deps || [],
    telemed_mode: telemedMode,
    opd_total: Number(result.opd_total || 0),
    telemed_total: telemedTotal,
    b2b_total: channelTotals.b2b_total,
    b2c_total: channelTotals.b2c_total,
    note: target.note || '',
    calculation_note: sourceNote(target)
  };
}

async function fetchDepartmentTargetData(filters) {
  const pool = getPool();
  const targets = activeDepartmentTargets();
  const rows = [];
  for (const target of targets) {
    rows.push(await fetchTargetCounts(pool, filters, target));
  }

  return buildDepartmentTargetModel(rows, filters);
}

module.exports = {
  TARGET_RATE,
  TARGET_DEPARTMENTS,
  emptyDepartmentTargetModel,
  fetchDepartmentTargetData,
  buildDepartmentTargetModel
};
