const { DEPARTMENT_TARGETS } = require('../config/departmentTargets');
const executiveDashboardConfig = require('../config/executiveDashboard');
const { getPool } = require('../db');

const TARGET_RATE = 0.5;
const EXECUTIVE_ANOMALY_PERCENT = 100;
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

function dataState(opdTotal, telemedTotal, telemedPercent) {
  if (opdTotal <= 0 && telemedTotal <= 0) return 'no_data';
  if (opdTotal <= 0 && telemedTotal > 0) return 'review';
  if (telemedTotal > opdTotal || telemedPercent > EXECUTIVE_ANOMALY_PERCENT) return 'anomaly';
  return 'valid';
}

function dataQualityReason(state) {
  if (state === 'review') return 'ไม่มีฐาน OPD';
  if (state === 'anomaly') return 'Telemed มากกว่า OPD';
  return '';
}

function isValidPerformanceRow(row) {
  return row.data_state === 'valid' && !row.is_data_anomaly && !row.is_no_data;
}

function displayStatus(row) {
  if (row.is_no_data) return 'ไม่มีข้อมูล';
  if (row.is_data_anomaly) return 'ตรวจสอบข้อมูล';
  if (row.telemed_total >= row.target_50) return 'ผ่าน';
  if (row.telemed_percent >= 45) return 'ใกล้ถึงเป้า';
  return 'ไม่ผ่าน';
}

function riskLevel(row) {
  if (row.is_no_data) return { label: 'ไม่มีข้อมูล', className: 'no-data' };
  if (row.is_data_anomaly) return { label: 'ตรวจสอบข้อมูล', className: 'data-check' };
  if (row.display_status === 'ผ่าน') return { label: 'ผ่านเป้า', className: 'passed' };
  if (row.display_status === 'ใกล้ถึงเป้า') return { label: 'ใกล้ถึงเป้า', className: 'near' };

  const shortage = Math.abs(Math.min(Number(row.diff_from_target || 0), 0));
  if (shortage > 500) return { label: 'เร่งด่วนมาก', className: 'critical' };
  if (shortage >= 200) return { label: 'เร่งด่วน', className: 'urgent' };
  return { label: 'ควรติดตาม', className: 'watch' };
}

function recommendationFor(row) {
  if (row.is_no_data) {
    return 'ไม่พบ OPD และ Telemed ในช่วงวันที่เลือก จึงยังไม่สามารถประเมินเป้าหมายได้';
  }
  if (row.is_data_anomaly) {
    if (row.opd_total <= 0 && row.telemed_total > 0) {
      return 'มี Telemed แต่ไม่มีฐาน OPD จึงยังไม่สามารถประเมินเป้าหมาย 50% ได้';
    }
    return 'ควรตรวจสอบฐาน OPD หรือ Mapping ห้องบริการ';
  }

  const shortage = Math.abs(Math.min(Number(row.diff_from_target || 0), 0));
  if (shortage === 0) return 'ผลการดำเนินงานถึงเป้าหมายแล้ว ควรรักษาแนวทางการให้บริการปัจจุบัน';
  if (shortage > 500) return 'ยังห่างเป้าหมายมาก ควรติดตามการให้บริการ Telemed เป็นลำดับแรก';
  return `ควรเพิ่มอีก ${shortage.toLocaleString('th-TH')} รายเพื่อถึงเป้าหมาย 50%`;
}

function normalizeDepartment(row) {
  const opdTotal = Number(row.opd_total || 0);
  const telemedTotal = Number(row.telemed_total || 0);
  const b2bTotal = Number(row.b2b_total || 0);
  const b2cTotal = Number(row.b2c_total || 0);
  const target50 = Math.ceil(opdTotal * TARGET_RATE);
  const telemedPercent = opdTotal > 0 ? Number(((telemedTotal / opdTotal) * 100).toFixed(2)) : 0;
  const diffFromTarget = telemedTotal - target50;
  const rowDataState = dataState(opdTotal, telemedTotal, telemedPercent);
  const dataQualityNote = dataQualityReason(rowDataState);

  const normalized = {
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
    is_special_case: false,
    data_state: rowDataState,
    is_no_data: rowDataState === 'no_data',
    is_data_anomaly: rowDataState === 'review' || rowDataState === 'anomaly',
    data_quality_reason: dataQualityNote,
    no_data_reason: rowDataState === 'no_data' ? 'ไม่พบ OPD และ Telemed ในช่วงวันที่เลือก' : ''
  };

  normalized.display_status = displayStatus(normalized);
  normalized.risk = riskLevel(normalized);
  normalized.recommendation = recommendationFor(normalized);
  return normalized;
}

function filterRows(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.depcode && filters.depcode !== 'all' && row.display_depcode !== filters.depcode) return false;
    if (filters.serviceGroup && filters.serviceGroup !== 'all' && row.service_group !== filters.serviceGroup) return false;
    if (filters.status === 'passed' && row.display_status !== 'ผ่าน') return false;
    if (filters.status === 'failed' && row.display_status !== 'ไม่ผ่าน') return false;
    if (filters.status === 'near' && row.display_status !== 'ใกล้ถึงเป้า') return false;
    if (filters.status === 'data_check' && row.display_status !== 'ตรวจสอบข้อมูล') return false;
    if (filters.status === 'no_data' && row.display_status !== 'ไม่มีข้อมูล') return false;
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
      const order = { 'ไม่ผ่าน': 0, 'ใกล้ถึงเป้า': 1, 'ผ่าน': 2, 'ตรวจสอบข้อมูล': 3, 'ไม่มีข้อมูล': 4 };
      const statusA = order[a.display_status] ?? 4;
      const statusB = order[b.display_status] ?? 4;
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
    if (row.display_status === 'ผ่าน') acc.passed_department_count += 1;
    if (row.display_status === 'ไม่ผ่าน') acc.failed_department_count += 1;
    if (row.display_status === 'ใกล้ถึงเป้า') acc.near_department_count += 1;
    if (row.display_status === 'ตรวจสอบข้อมูล') acc.data_check_count += 1;
    if (row.display_status === 'ไม่มีข้อมูล') acc.no_data_count += 1;
    return acc;
  }, {
    opd_total: 0,
    telemed_total: 0,
    b2b_total: 0,
    b2c_total: 0,
    target_50_total: 0,
    passed_department_count: 0,
    failed_department_count: 0,
    near_department_count: 0,
    data_check_count: 0,
    no_data_count: 0
  });

  summary.telemed_percent = summary.opd_total > 0
    ? Number(((summary.telemed_total / summary.opd_total) * 100).toFixed(2))
    : 0;
  summary.diff_from_target = summary.telemed_total - summary.target_50_total;
  summary.worst_department = rows
    .filter((row) => isValidPerformanceRow(row) && row.diff_from_target < 0)
    .slice()
    .sort((a, b) => a.diff_from_target - b.diff_from_target)[0] || null;
  summary.top_failed_departments = rows
    .filter((row) => isValidPerformanceRow(row) && row.diff_from_target < 0)
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
    dataQualityRows: rows.filter((row) => row.is_data_anomaly),
    noDataRows: rows.filter((row) => row.is_no_data),
    lastUpdated: new Date().toISOString(),
    hasB2b: rows.some((row) => row.b2b_total > 0)
  };
}

function emptyDepartmentTargetModel() {
  return buildDepartmentTargetModel([], {});
}

function parseIsoDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function previousPeriodFilters(filters) {
  const start = parseIsoDate(filters.startDate);
  const end = parseIsoDate(filters.endDate);
  if (!start || !end || end < start) return { ...filters };

  const dayMs = 24 * 60 * 60 * 1000;
  const periodDays = Math.floor((end - start) / dayMs) + 1;
  const previousEnd = new Date(start.getTime() - dayMs);
  const previousStart = new Date(previousEnd.getTime() - ((periodDays - 1) * dayMs));

  return {
    ...filters,
    startDate: isoDate(previousStart),
    endDate: isoDate(previousEnd)
  };
}

function percentOf(value, total) {
  return total > 0 ? (value / total) * 100 : 0;
}

function percentChange(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function inclusiveDays(filters) {
  const start = parseIsoDate(filters.startDate);
  const end = parseIsoDate(filters.endDate);
  if (!start || !end || end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function dailyExtremes(dailyData) {
  const rows = (dailyData && dailyData.dailySummary ? dailyData.dailySummary : [])
    .map((row) => ({
      date: row.vstdate || row.date || row.period,
      total: Number(row.total || 0)
    }))
    .filter((row) => row.date);

  if (!rows.length) return { highest: null, lowest: null };

  return {
    highest: rows.reduce((best, row) => (row.total > best.total ? row : best), rows[0]),
    lowest: rows.reduce((best, row) => (row.total < best.total ? row : best), rows[0])
  };
}

function departmentOverview(target) {
  const rows = (target && (target.allRows || target.rows)) || [];
  const filteredRows = (target && target.rows) || rows;
  const validRows = rows.filter(isValidPerformanceRow);
  const validFilteredRows = filteredRows.filter(isValidPerformanceRow);
  const topDepartments = validRows
    .filter((row) => Number(row.telemed_total || 0) > 0)
    .slice()
    .sort((a, b) => Number(b.telemed_total || 0) - Number(a.telemed_total || 0))
    .slice(0, 5);
  const passedCount = validRows.filter((row) => row.display_status === 'ผ่าน').length;
  const failedCount = validRows.filter((row) => row.display_status === 'ไม่ผ่าน').length;
  const bestDepartment = validRows
    .slice()
    .sort((a, b) => {
      const percentDiff = Number(b.telemed_percent || 0) - Number(a.telemed_percent || 0);
      return percentDiff || Number(b.telemed_total || 0) - Number(a.telemed_total || 0);
    })[0] || null;
  const attentionDepartment = validRows
    .filter((row) => Number(row.diff_from_target || 0) < 0)
    .slice()
    .sort((a, b) => Number(a.diff_from_target || 0) - Number(b.diff_from_target || 0))[0] || null;
  const filteredPassedCount = validFilteredRows.filter((row) => row.display_status === 'ผ่าน').length;
  const filteredBestDepartment = validFilteredRows
    .slice()
    .sort((a, b) => {
      const percentDiff = Number(b.telemed_percent || 0) - Number(a.telemed_percent || 0);
      return percentDiff || Number(b.telemed_total || 0) - Number(a.telemed_total || 0);
    })[0] || null;

  return {
    roomCount: rows.length,
    passedCount,
    failedCount,
    successPercent: validRows.length > 0 ? (passedCount / validRows.length) * 100 : 0,
    bestDepartment,
    attentionDepartment,
    topDepartments,
    filtered: {
      roomCount: filteredRows.length,
      passedCount: filteredPassedCount,
      failedCount: validFilteredRows.filter((row) => row.display_status === 'ไม่ผ่าน').length,
      successPercent: validFilteredRows.length > 0 ? (filteredPassedCount / validFilteredRows.length) * 100 : 0,
      bestDepartment: filteredBestDepartment
    }
  };
}

function buildExecutiveMetrics(data, previousData, filters, target, dailyData = data) {
  const dm = Number(data.totals && data.totals.dm || 0);
  const ht = Number(data.totals && data.totals.ht || 0);
  const b2b = Number(data.channel && data.channel.b2b || 0);
  const b2c = Number(data.channel && data.channel.b2c || 0);
  const total = Number(data.total || 0);
  const previousTotal = Number(previousData && previousData.total || 0);
  const channelTotal = b2b + b2c;
  const diseaseTotal = dm + ht;
  const days = inclusiveDays(filters);
  const extremes = dailyExtremes(dailyData);
  const departments = departmentOverview(target);
  const trend = (data.trend || []).map((row) => ({
    period: row.period,
    total: Number(row.total || 0),
    dm: Number(row['DM B2B'] || 0) + Number(row['DM B2C'] || 0),
    ht: Number(row['HT B2B'] || 0) + Number(row['HT B2C'] || 0),
    b2b: Number(row['DM B2B'] || 0) + Number(row['HT B2B'] || 0),
    b2c: Number(row['DM B2C'] || 0) + Number(row['HT B2C'] || 0)
  }));
  const b2bPercent = percentOf(b2b, channelTotal);
  const b2cPercent = percentOf(b2c, channelTotal);
  const dmPercent = percentOf(dm, diseaseTotal);
  const htPercent = percentOf(ht, diseaseTotal);
  const changePercent = percentChange(total, previousTotal);
  const averagePerDay = days > 0 ? total / days : 0;
  const averagePerTrendPeriod = trend.length > 0 ? total / trend.length : 0;
  const targetPercent = executiveDashboardConfig.b2cTargetPercent;
  const topFiveTelemedTotal = departments.topDepartments.reduce(
    (sum, row) => sum + Number(row.telemed_total || 0),
    0
  );
  const otherTelemedTotal = Math.max(total - topFiveTelemedTotal, 0);
  const topDisease = dm >= ht ? { name: 'เบาหวาน', value: dm, percent: dmPercent } : { name: 'ความดัน', value: ht, percent: htPercent };
  const lowestDayMayBeIncomplete = Boolean(
    extremes.lowest
    && extremes.lowest.date === filters.endDate
  );
  const insights = [];

  if (total === 0) {
    insights.push('ไม่พบข้อมูลบริการ Telemed ในช่วงวันที่ที่เลือก');
  } else {
    insights.push(`มีบริการ Telemed รวม ${total.toLocaleString('th-TH')} ครั้ง เฉลี่ย ${averagePerDay.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ครั้งต่อวัน`);
    insights.push(`${topDisease.name} เป็นกลุ่มโรคที่มีจำนวนสูงกว่า คิดเป็น ${topDisease.percent.toFixed(1)}% ของยอด DM และ HT`);
    if (extremes.highest) {
      insights.push(`วันที่มีบริการสูงสุดคือ ${extremes.highest.date} จำนวน ${extremes.highest.total.toLocaleString('th-TH')} ครั้ง`);
    }
    if (changePercent === null) {
      insights.push(`ช่วงก่อนหน้ามี ${previousTotal.toLocaleString('th-TH')} ครั้ง จึงยังคำนวณอัตราการเปลี่ยนแปลงไม่ได้`);
    } else {
      insights.push(`เทียบช่วงก่อนหน้า ${total >= previousTotal ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(changePercent).toFixed(1)}%`);
    }
    insights.push(b2b === 0
      ? 'ยังไม่พบรายการ B2B ในช่วงวันที่เลือก'
      : `สัดส่วน B2B อยู่ที่ ${b2bPercent.toFixed(1)}% และ B2C อยู่ที่ ${b2cPercent.toFixed(1)}%`);
  }

  return {
    total,
    dm,
    ht,
    b2b,
    b2c,
    b2bPercent,
    b2cPercent,
    dmPercent,
    htPercent,
    periodDays: days,
    averagePerDay,
    averagePerTrendPeriod,
    highestDay: extremes.highest,
    lowestDay: extremes.lowest,
    lowestDayMayBeIncomplete,
    previousTotal,
    previousChangePercent: changePercent,
    previousFilters: previousPeriodFilters(filters),
    b2cTargetPercent: targetPercent,
    b2cTargetMet: b2cPercent >= targetPercent,
    b2cTargetGap: b2cPercent - targetPercent,
    topFiveTelemedTotal,
    otherTelemedTotal,
    trend,
    insights: insights.slice(0, 5),
    departments
  };
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
  buildDepartmentTargetModel,
  previousPeriodFilters,
  buildExecutiveMetrics
};
