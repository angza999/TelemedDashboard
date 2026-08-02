const { getPool } = require('../db');
const { b2cTargetPercent } = require('../config/executiveDashboard');
const {
  formatThaiDate,
  formatThaiDateList,
  formatThaiDateRange,
  formatThaiPeriod,
  formatThaiShortDate,
  parseIsoDate
} = require('../utils/thaiDate');

const CATEGORY_KEYS = ['DM B2B', 'DM B2C', 'HT B2B', 'HT B2C'];

const EXECUTIVE_VISIT_QUERY = `
  SELECT
    v.vn,
    MAX(COALESCE(v.hn, '')) AS hn,
    DATE_FORMAT(MAX(v.vstdate), '%Y-%m-%d') AS vstdate,
    MAX(COALESCE(v.main_dep, '')) AS depcode,
    COALESCE(NULLIF(TRIM(MAX(k.department)), ''), 'ไม่ระบุห้องบริการ') AS department,
    COUNT(DISTINCT NULLIF(TRIM(COALESCE(v.main_dep, '')), '')) AS source_room_count,
    COUNT(*) AS source_row_count,
    MAX(CASE
      WHEN LOWER(COALESCE(d.icd10, '')) LIKE 'e11%' THEN 1
      ELSE 0
    END) AS is_dm,
    MAX(CASE
      WHEN LOWER(COALESCE(d.icd10, '')) LIKE 'i10%' THEN 1
      ELSE 0
    END) AS is_ht,
    MAX(CASE
      WHEN LOWER(COALESCE(o.name, '')) LIKE '%b2b%'
        OR LOWER(COALESCE(s.cc, '')) LIKE '%b2b%'
      THEN 1
      ELSE 0
    END) AS has_b2b_marker,
    MAX(CASE
      WHEN LOWER(COALESCE(o.name, '')) LIKE '%b2c%'
        OR LOWER(COALESCE(s.cc, '')) LIKE '%b2c%'
      THEN 1
      ELSE 0
    END) AS has_b2c_marker
  FROM ovst v
  LEFT JOIN ovstist o ON o.ovstist = v.ovstist
  LEFT JOIN opdscreen s ON s.vn = v.vn
  LEFT JOIN ovstdiag d ON d.vn = v.vn
  LEFT JOIN kskdepartment k ON k.depcode = v.main_dep
  WHERE v.vstdate BETWEEN ? AND ?
    AND o.export_code = '5'
  GROUP BY v.vn
  ORDER BY MAX(v.vstdate) ASC, v.vn ASC
`;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function weekStart(period) {
  const date = parseIsoDate(period);
  if (!date) return String(period || '');
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return isoDate(date);
}

function periodLabel(period, granularity) {
  if (granularity !== 'week') return formatThaiPeriod(period);
  const start = parseIsoDate(period);
  if (!start) return String(period || '');
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return formatThaiDateRange(isoDate(start), isoDate(end));
}

function inclusiveDays(filters) {
  const start = parseIsoDate(filters && filters.startDate);
  const end = parseIsoDate(filters && filters.endDate);
  if (!start || !end || end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function previousPeriodFilters(filters) {
  const start = parseIsoDate(filters && filters.startDate);
  const end = parseIsoDate(filters && filters.endDate);
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

function toFlag(value) {
  return Number(value || 0) > 0;
}

function cleanText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function classifyChannel(hasB2bMarker, hasB2cMarker) {
  if (hasB2bMarker && hasB2cMarker) return 'conflict';
  if (hasB2bMarker) return 'b2b';
  if (hasB2cMarker) return 'b2c';
  return 'unclassified';
}

function normalizeVisitRows(rawRows) {
  const visits = new Map();

  for (const row of rawRows || []) {
    const vn = cleanText(row.vn);
    if (!vn) continue;

    const incoming = {
      vn,
      hn: cleanText(row.hn),
      vstdate: cleanText(row.vstdate),
      depcode: cleanText(row.depcode),
      department: cleanText(row.department, 'ไม่ระบุห้องบริการ'),
      isDm: toFlag(row.is_dm),
      isHt: toFlag(row.is_ht),
      hasB2bMarker: toFlag(row.has_b2b_marker),
      hasB2cMarker: toFlag(row.has_b2c_marker),
      sourceRoomCount: Number(row.source_room_count || (cleanText(row.depcode) ? 1 : 0)),
      sourceRowCount: Number(row.source_row_count || 1),
      roomConflict: false
    };

    const current = visits.get(vn);
    if (!current) {
      visits.set(vn, incoming);
      continue;
    }

    const currentRoomKey = `${current.depcode}|${current.department}`;
    const incomingRoomKey = `${incoming.depcode}|${incoming.department}`;
    current.roomConflict = current.roomConflict || currentRoomKey !== incomingRoomKey;
    current.isDm = current.isDm || incoming.isDm;
    current.isHt = current.isHt || incoming.isHt;
    current.hasB2bMarker = current.hasB2bMarker || incoming.hasB2bMarker;
    current.hasB2cMarker = current.hasB2cMarker || incoming.hasB2cMarker;
    current.sourceRoomCount = Math.max(current.sourceRoomCount, incoming.sourceRoomCount);
    current.sourceRowCount += incoming.sourceRowCount;
    if (!current.hn && incoming.hn) current.hn = incoming.hn;
    if (!current.vstdate && incoming.vstdate) current.vstdate = incoming.vstdate;
    if (!current.depcode && incoming.depcode) current.depcode = incoming.depcode;
    if (current.department === 'ไม่ระบุห้องบริการ' && incoming.department !== 'ไม่ระบุห้องบริการ') {
      current.department = incoming.department;
    }
  }

  return Array.from(visits.values()).map((visit) => ({
    ...visit,
    channelType: classifyChannel(visit.hasB2bMarker, visit.hasB2cMarker)
  }));
}

function emptyPeriod(period) {
  return {
    period,
    total: 0,
    dm: 0,
    ht: 0,
    dmOnly: 0,
    htOnly: 0,
    dmAndHt: 0,
    b2b: 0,
    b2c: 0,
    unclassified: 0,
    conflict: 0,
    'DM B2B': 0,
    'DM B2C': 0,
    'HT B2B': 0,
    'HT B2C': 0
  };
}

function addVisitToPeriod(period, visit) {
  period.total += 1;
  if (visit.isDm) period.dm += 1;
  if (visit.isHt) period.ht += 1;
  if (visit.isDm && visit.isHt) period.dmAndHt += 1;
  else if (visit.isDm) period.dmOnly += 1;
  else if (visit.isHt) period.htOnly += 1;

  period[visit.channelType] += 1;
  if (visit.isDm && visit.channelType === 'b2b') period['DM B2B'] += 1;
  if (visit.isDm && visit.channelType === 'b2c') period['DM B2C'] += 1;
  if (visit.isHt && visit.channelType === 'b2b') period['HT B2B'] += 1;
  if (visit.isHt && visit.channelType === 'b2c') period['HT B2C'] += 1;
}

function percentOf(value, total) {
  return total > 0 ? (value / total) * 100 : 0;
}

function buildExtremes(dailyRows) {
  if (!dailyRows.length) {
    const empty = { value: 0, dates: [], count: 0 };
    return { highest: { ...empty }, lowest: { ...empty } };
  }

  const values = dailyRows.map((row) => Number(row.total || 0));
  const highestValue = Math.max(...values);
  const lowestValue = Math.min(...values);
  const highestDates = dailyRows.filter((row) => Number(row.total || 0) === highestValue).map((row) => row.period);
  const lowestDates = dailyRows.filter((row) => Number(row.total || 0) === lowestValue).map((row) => row.period);

  return {
    highest: { value: highestValue, dates: highestDates, count: highestDates.length },
    lowest: { value: lowestValue, dates: lowestDates, count: lowestDates.length }
  };
}

function completeDailyTimeline(dailyMap, filters) {
  const start = parseIsoDate(filters && filters.startDate);
  const end = parseIsoDate(filters && filters.endDate);
  if (!start || !end || end < start) return [];

  const timeline = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += dayMs) {
    const period = isoDate(new Date(timestamp));
    const serviceRow = dailyMap.get(period);
    if (serviceRow) {
      timeline.push({ ...serviceRow, isServiceDay: true });
      continue;
    }

    const noServiceRow = emptyPeriod(period);
    for (const key of ['total', 'dm', 'ht', 'dmOnly', 'htOnly', 'dmAndHt', 'b2b', 'b2c', 'unclassified', 'conflict', ...CATEGORY_KEYS]) {
      noServiceRow[key] = null;
    }
    timeline.push({ ...noServiceRow, isServiceDay: false });
  }
  return timeline;
}

function extremeMetric(extreme) {
  if (!extreme || !extreme.count) return null;
  return {
    total: extreme.value,
    date: extreme.dates[0],
    dates: extreme.dates,
    count: extreme.count,
    dateSummary: formatThaiDateList(extreme.dates),
    dateTitle: extreme.dates.map(formatThaiDate).join('\n')
  };
}

function aggregateExecutiveOverview(rawRows, filters = {}) {
  const visits = normalizeVisitRows(rawRows);
  const dailyMap = new Map();
  const trendMap = new Map();
  const roomMap = new Map();
  const granularity = ['day', 'week', 'month'].includes(filters.granularity)
    ? filters.granularity
    : 'day';

  const disease = {
    dmOnly: 0,
    htOnly: 0,
    dmAndHt: 0,
    dmTotal: 0,
    htTotal: 0,
    dmOrHtDistinct: 0
  };
  const channel = {
    b2b: 0,
    b2c: 0,
    unclassified: 0,
    conflict: 0
  };
  let roomUnclassifiedTotal = 0;

  for (const visit of visits) {
    if (visit.isDm) disease.dmTotal += 1;
    if (visit.isHt) disease.htTotal += 1;
    if (visit.isDm && visit.isHt) disease.dmAndHt += 1;
    else if (visit.isDm) disease.dmOnly += 1;
    else if (visit.isHt) disease.htOnly += 1;
    if (visit.isDm || visit.isHt) disease.dmOrHtDistinct += 1;
    channel[visit.channelType] += 1;

    const date = visit.vstdate;
    if (date) {
      if (!dailyMap.has(date)) dailyMap.set(date, emptyPeriod(date));
      addVisitToPeriod(dailyMap.get(date), visit);

      const period = granularity === 'month'
        ? date.slice(0, 7)
        : (granularity === 'week' ? weekStart(date) : date);
      if (!trendMap.has(period)) trendMap.set(period, emptyPeriod(period));
      addVisitToPeriod(trendMap.get(period), visit);
    }

    if (!visit.depcode) {
      roomUnclassifiedTotal += 1;
      continue;
    }

    const roomKey = `${visit.depcode}|${visit.department}`;
    if (!roomMap.has(roomKey)) {
      roomMap.set(roomKey, {
        depcode: visit.depcode || '',
        department: visit.department,
        telemed_total: 0
      });
    }
    roomMap.get(roomKey).telemed_total += 1;
  }

  const total = visits.length;
  const otherDiseaseVisits = visits.filter((visit) => !visit.isDm && !visit.isHt).length;
  const uniquePatients = new Set(visits.map((visit) => visit.hn).filter(Boolean)).size;
  const activeServiceDays = dailyMap.size;
  const calendarDays = inclusiveDays(filters);
  const averagePerServiceDay = activeServiceDays > 0 ? total / activeServiceDays : 0;
  const classifiedChannelVisits = channel.b2b + channel.b2c;
  const channelPartitionTotal = classifiedChannelVisits + channel.unclassified + channel.conflict;
  const channelCoverageRate = percentOf(classifiedChannelVisits, total);
  const channelDataComplete = total > 0
    && channel.unclassified === 0
    && channel.conflict === 0
    && classifiedChannelVisits === total;
  const rooms = Array.from(roomMap.values())
    .sort((a, b) => b.telemed_total - a.telemed_total || a.department.localeCompare(b.department, 'th'));
  const roomClassifiedTotal = rooms.reduce((sum, room) => sum + room.telemed_total, 0);
  const topRooms = rooms.slice(0, 5);
  const topFiveTelemedTotal = topRooms.reduce((sum, room) => sum + room.telemed_total, 0);
  const otherTelemedTotal = Math.max(roomClassifiedTotal - topFiveTelemedTotal, 0);
  const dailyRows = Array.from(dailyMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  const trend = (granularity === 'day'
    ? completeDailyTimeline(dailyMap, filters)
    : Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period)))
    .map((row) => ({ ...row, periodLabel: periodLabel(row.period, granularity) }));
  const extremes = buildExtremes(dailyRows);
  const roomConflictVisits = visits.filter((visit) => visit.roomConflict).length;
  const multipleRoomSourceVisits = visits.filter((visit) => visit.roomConflict || visit.sourceRoomCount > 1).length;
  const joinExpandedVisits = visits.filter((visit) => visit.sourceRowCount > 1).length;
  const duplicateRowsBeforeDeduplicate = Math.max((rawRows || []).filter((row) => cleanText(row.vn)).length - visits.length, 0);
  const pharmacyTelemedRoomVisits = visits.filter((visit) => visit.depcode === '081' || visit.department === 'ห้องจ่ายยา Telemed').length;
  const channelTotalsMatch = channelPartitionTotal === total;
  const roomTotalsMatch = roomClassifiedTotal + roomUnclassifiedTotal === total;
  const topRoomTotalsMatch = topFiveTelemedTotal + otherTelemedTotal === roomClassifiedTotal;
  const diseaseTotalsValid = disease.dmTotal <= total && disease.htTotal <= total;
  const diseaseUnionMatches = disease.dmOnly + disease.htOnly + disease.dmAndHt + otherDiseaseVisits === total;
  const averageMatches = activeServiceDays > 0
    ? Math.abs(averagePerServiceDay - (total / activeServiceDays)) < 1e-9
    : averagePerServiceDay === 0;

  const kpis = {
    'DM B2B': visits.filter((visit) => visit.isDm && visit.channelType === 'b2b').length,
    'DM B2C': visits.filter((visit) => visit.isDm && visit.channelType === 'b2c').length,
    'HT B2B': visits.filter((visit) => visit.isHt && visit.channelType === 'b2b').length,
    'HT B2C': visits.filter((visit) => visit.isHt && visit.channelType === 'b2c').length
  };

  return {
    total,
    disease,
    channel: {
      ...channel,
      classifiedTotal: classifiedChannelVisits,
      coverageRate: channelCoverageRate,
      dataComplete: channelDataComplete
    },
    totals: {
      dm: disease.dmTotal,
      ht: disease.htTotal,
      b2b: channel.b2b,
      b2c: channel.b2c,
      channelTotal: classifiedChannelVisits
    },
    percentages: {
      dm: percentOf(disease.dmTotal, total),
      ht: percentOf(disease.htTotal, total),
      b2b: percentOf(channel.b2b, classifiedChannelVisits),
      b2c: percentOf(channel.b2c, classifiedChannelVisits)
    },
    kpis,
    averagePerServiceDay,
    otherDiseaseVisits,
    extremes,
    highestDay: extremeMetric(extremes.highest),
    lowestServiceDay: extremeMetric(extremes.lowest),
    trend,
    dailySummary: dailyRows.slice().reverse().map((row) => ({
      ...row,
      date: row.period,
      vstdate: row.period,
      dm_b2b: row['DM B2B'],
      dm_b2c: row['DM B2C'],
      ht_b2b: row['HT B2B'],
      ht_b2c: row['HT B2C']
    })),
    rooms,
    topRooms,
    topFiveTelemedTotal,
    otherTelemedTotal,
    roomClassifiedTotal,
    roomUnclassifiedTotal,
    dataQuality: {
      totalTelemed: total,
      totalVisits: total,
      uniquePatients,
      dmTotal: disease.dmTotal,
      htTotal: disease.htTotal,
      dmOnly: disease.dmOnly,
      htOnly: disease.htOnly,
      dmHtOverlap: disease.dmAndHt,
      otherDiseaseVisits,
      dmVisits: disease.dmTotal,
      htVisits: disease.htTotal,
      b2bTotal: channel.b2b,
      b2cTotal: channel.b2c,
      b2bVisits: channel.b2b,
      b2cVisits: channel.b2c,
      unclassifiedChannelTotal: channel.unclassified,
      conflictChannelTotal: channel.conflict,
      unclassifiedChannelVisits: channel.unclassified,
      conflictChannelVisits: channel.conflict,
      channelCoverageRate,
      channelTotalsMatch,
      channelDataComplete,
      roomTotalsMatch,
      topRoomTotalsMatch,
      diseaseTotalsValid,
      diseaseUnionMatches,
      averageMatches,
      roomConflictVisits,
      multipleRoomSourceVisits,
      selectedMainRoomVisits: roomClassifiedTotal,
      joinExpandedVisits,
      duplicateRowsBeforeDeduplicate,
      pharmacyTelemedRoomVisits,
      roomClassifiedTotal,
      roomUnclassifiedTotal,
      roomClassificationBasis: 'ovst.main_dep',
      averageBasis: 'active_service_days',
      activeServiceDays,
      calendarDays,
      highestValue: extremes.highest.value,
      highestDates: extremes.highest.dates,
      lowestValue: extremes.lowest.value,
      lowestDates: extremes.lowest.dates
    }
  };
}

function emptyExecutiveOverviewModel(filters = {}) {
  return aggregateExecutiveOverview([], filters);
}

async function fetchExecutiveOverview(filters) {
  const pool = getPool();
  const [rows] = await pool.execute(EXECUTIVE_VISIT_QUERY, [filters.startDate, filters.endDate]);
  const model = aggregateExecutiveOverview(rows, filters);
  logExecutiveDiagnostics(model, filters);
  return model;
}

function percentChange(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function buildTargetPerformance(targetModel = {}) {
  const sourceRows = Array.isArray(targetModel.allRows) && targetModel.allRows.length > 0
    ? targetModel.allRows
    : (targetModel.rows || []);
  const validRows = sourceRows.filter((row) => row.data_state === 'valid' && !row.is_data_anomaly && !row.is_no_data);
  const reviewRows = sourceRows.filter((row) => row.is_data_anomaly);
  const noDataRows = sourceRows.filter((row) => row.is_no_data);
  const totals = validRows.reduce((summary, row) => {
    summary.opd += Number(row.opd_total || 0);
    summary.telemed += Number(row.telemed_total || 0);
    summary.target += Number(row.target_50 || 0);
    summary.shortage += Math.max(Number(row.target_50 || 0) - Number(row.telemed_total || 0), 0);
    summary.excess += Math.max(Number(row.telemed_total || 0) - Number(row.target_50 || 0), 0);
    return summary;
  }, { opd: 0, telemed: 0, target: 0, shortage: 0, excess: 0 });
  const targetPercents = [...new Set(validRows.map((row) => Number(row.target_percent)).filter(Number.isFinite))];
  const followUp = validRows
    .filter((row) => Number(row.diff_from_target || 0) < 0)
    .slice()
    .sort((a, b) => Number(a.diff_from_target || 0) - Number(b.diff_from_target || 0))
    .slice(0, 5);
  const rate = totals.opd > 0 ? percentOf(totals.telemed, totals.opd) : null;
  const netGap = totals.telemed - totals.target;
  const gap = totals.shortage > 0 ? -totals.shortage : totals.excess;

  return {
    available: validRows.length > 0 && totals.opd > 0,
    validRowCount: validRows.length,
    reviewCount: reviewRows.length,
    noDataCount: noDataRows.length,
    opdTotal: totals.opd,
    telemedTotal: totals.telemed,
    targetTotal: totals.target,
    rate,
    gap,
    netGap,
    shortage: totals.shortage,
    excess: totals.excess,
    targetPercent: targetPercents.length === 1 ? targetPercents[0] : null,
    usesMixedTargets: targetPercents.length > 1,
    followUp
  };
}

function buildDataQualitySummary(data, targetPerformance) {
  const issues = [
    {
      active: !data.dataQuality.channelTotalsMatch,
      label: 'ผลรวมการจำแนกช่องทางบริการไม่ตรงกับยอด Telemedicine',
      impact: 'ควรตรวจสอบก่อนใช้ตัวชี้วัดช่องทางบริการ'
    },
    {
      active: !data.dataQuality.roomTotalsMatch || !data.dataQuality.topRoomTotalsMatch,
      label: 'การจัดกลุ่มห้องบริการยังตรวจสอบยอดรวมไม่ได้',
      impact: 'อาจกระทบการวิเคราะห์ห้องบริการ'
    },
    {
      active: !data.dataQuality.diseaseTotalsValid || !data.dataQuality.diseaseUnionMatches,
      label: 'การจัดกลุ่มโรคยังตรวจสอบยอดรวมไม่ได้',
      impact: 'อาจกระทบข้อมูลประกอบ DM/HT'
    },
    {
      active: !data.dataQuality.averageMatches,
      label: 'ค่าเฉลี่ยวันให้บริการยังตรวจสอบไม่ได้',
      impact: 'อาจกระทบค่าเฉลี่ยรายวัน'
    },
    {
      active: Number(data.channel.unclassified || 0) > 0 || Number(data.channel.conflict || 0) > 0,
      label: 'พบรายการที่ยังจำแนก B2B/B2C ไม่ครบ',
      impact: 'ไม่กระทบยอด Telemedicine รวม'
    },
    {
      active: Number(data.roomUnclassifiedTotal || 0) > 0 || Number(data.dataQuality.multipleRoomSourceVisits || 0) > 0,
      label: 'พบรายการที่ยังต้องตรวจสอบห้องบริการ',
      impact: 'อาจกระทบการจัดขอบเขตห้องที่ประเมิน'
    },
    {
      active: Number(targetPerformance.reviewCount || 0) > 0,
      label: 'พบห้องที่ต้องตรวจสอบก่อนประเมินเป้าหมาย',
      impact: 'กระทบการประเมินเป้าหมายรายห้อง'
    },
    {
      active: targetPerformance.available && Number(targetPerformance.telemedTotal || 0) > Number(data.total || 0),
      label: 'ยอด Telemedicine ห้องที่ประเมินสูงกว่ายอดทั้งโรงพยาบาล',
      impact: 'กระทบการเปรียบเทียบขอบเขตข้อมูล'
    }
  ].filter((issue) => issue.active);
  const issueCount = issues.length;
  return {
    issueCount,
    status: issueCount > 0 ? 'review' : 'ok',
    label: issueCount > 0 ? `ข้อมูลควรตรวจสอบ ${issueCount.toLocaleString('th-TH')} รายการ` : 'ข้อมูลครบถ้วน',
    categories: issues.map((issue) => issue.label),
    impacts: [...new Set(issues.map((issue) => issue.impact))]
  };
}

function buildExecutiveSummary(data, targetPerformance, filters) {
  if (Number(data.total || 0) === 0) return 'ไม่พบครั้งรับบริการ Telemedicine ในช่วงวันที่เลือก';

  const lines = [];

  if (targetPerformance.available) {
    const targetProgress = targetPerformance.targetTotal > 0
      ? (targetPerformance.telemedTotal / targetPerformance.targetTotal) * 100
      : 0;
    lines.push(`ห้องที่ประเมินทำได้ ${targetProgress.toFixed(1)}% ของเป้าหมาย และ${targetPerformance.shortage > 0 ? `ยังขาด ${targetPerformance.shortage.toLocaleString('th-TH')} ครั้ง` : 'ถึงเป้าหมายแล้ว'}`);
    if (targetPerformance.followUp.length > 0) {
      lines.push(`ควรเร่งติดตาม ${targetPerformance.followUp.slice(0, 2).map((row) => row.department).join(', ')}`);
    }
  } else {
    lines.push('ยังไม่มีห้องที่มีฐาน OPD พร้อมสำหรับประเมินเป้าหมายรายห้อง');
  }

  return `${formatThaiDateRange(filters.startDate, filters.endDate)}: ${lines.slice(0, 2).join(' · ')}`;
}

function buildExecutiveMetrics(data, previousData, filters, targetModel = {}) {
  const total = Number(data.total || 0);
  const previousTotal = Number(previousData && previousData.total || 0);
  const previousChangeAmount = total - previousTotal;
  const previousChangePercent = percentChange(total, previousTotal);
  const topFiveCoverageRate = percentOf(data.topFiveTelemedTotal, data.roomClassifiedTotal);
  const channelKnownTotal = Number(data.channel.classifiedTotal || 0);
  const b2bPercent = percentOf(data.channel.b2b, channelKnownTotal);
  const b2cPercent = percentOf(data.channel.b2c, channelKnownTotal);
  const previousFilters = previousPeriodFilters(filters);
  const targetPerformance = buildTargetPerformance(targetModel);
  const qualitySummary = buildDataQualitySummary(data, targetPerformance);
  const insights = [];

  if (total === 0) {
    insights.push('ไม่พบครั้งรับบริการ Telemed ในช่วงวันที่เลือก');
  } else {
    insights.push(`มีบริการ Telemed ${total.toLocaleString('th-TH')} ครั้ง ใน ${data.dataQuality.activeServiceDays.toLocaleString('th-TH')} วันให้บริการ เฉลี่ย ${data.averagePerServiceDay.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ครั้งต่อวันให้บริการ`);
    insights.push(`พบ DM ${data.disease.dmTotal.toLocaleString('th-TH')} ครั้ง, HT ${data.disease.htTotal.toLocaleString('th-TH')} ครั้ง, พบทั้ง DM/HT ในครั้งเดียวกัน ${data.disease.dmAndHt.toLocaleString('th-TH')} ครั้ง และมีกลุ่มอื่น ${data.otherDiseaseVisits.toLocaleString('th-TH')} ครั้ง`);
    if (previousChangePercent === null) {
      insights.push(`ช่วงก่อนหน้ามี ${previousTotal.toLocaleString('th-TH')} ครั้ง จึงยังคำนวณอัตราเปลี่ยนแปลงไม่ได้`);
    } else {
      insights.push(`เทียบช่วงก่อนหน้า ${previousChangeAmount >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(previousChangeAmount).toLocaleString('th-TH')} ครั้ง หรือ ${Math.abs(previousChangePercent).toFixed(1)}%`);
    }
    if (data.channel.dataComplete) {
      insights.push(`ข้อมูลช่องทางครบ: B2B ${data.channel.b2b.toLocaleString('th-TH')} ครั้ง และ B2C ${data.channel.b2c.toLocaleString('th-TH')} ครั้ง`);
    } else {
      insights.push(`ข้อมูลช่องทาง B2B/B2C ยังไม่สมบูรณ์: ไม่ระบุ ${data.channel.unclassified.toLocaleString('th-TH')} ครั้ง, ขัดแย้ง ${data.channel.conflict.toLocaleString('th-TH')} ครั้ง`);
    }
    insights.push(`Top 5 ห้องบริการหลักครอบคลุม ${topFiveCoverageRate.toFixed(1)}% ของครั้งรับบริการที่จัดกลุ่มห้องได้${data.roomUnclassifiedTotal > 0 ? ` และยังไม่สามารถจัดกลุ่มห้องได้ ${data.roomUnclassifiedTotal.toLocaleString('th-TH')} ครั้ง` : ''}`);
  }

  return {
    total,
    dm: data.disease.dmTotal,
    ht: data.disease.htTotal,
    dmOnly: data.disease.dmOnly,
    htOnly: data.disease.htOnly,
    dmAndHt: data.disease.dmAndHt,
    dmOrHtDistinct: data.disease.dmOrHtDistinct,
    otherDiseaseVisits: data.otherDiseaseVisits,
    dmPercent: percentOf(data.disease.dmTotal, total),
    htPercent: percentOf(data.disease.htTotal, total),
    b2b: data.channel.b2b,
    b2c: data.channel.b2c,
    unclassifiedChannel: data.channel.unclassified,
    conflictChannel: data.channel.conflict,
    b2bPercent,
    b2cPercent,
    channelDataComplete: data.channel.dataComplete,
    channelCoverageRate: data.channel.coverageRate,
    periodDays: data.dataQuality.calendarDays,
    activeServiceDays: data.dataQuality.activeServiceDays,
    averagePerDay: data.averagePerServiceDay,
    averagePerTrendPeriod: data.averagePerServiceDay,
    outsideEvaluationTotal: targetPerformance.available
      ? Math.max(total - targetPerformance.telemedTotal, 0)
      : null,
    outsideEvaluationNeedsReview: targetPerformance.available && total < targetPerformance.telemedTotal,
    averageBasis: data.dataQuality.averageBasis,
    highestDay: data.highestDay,
    lowestDay: data.lowestServiceDay,
    extremes: data.extremes,
    lowestDayMayBeIncomplete: false,
    previousTotal,
    previousChangeAmount,
    previousChangePercent,
    previousFilters,
    periodLabel: formatThaiDateRange(filters.startDate, filters.endDate),
    previousPeriodLabel: formatThaiDateRange(previousFilters.startDate, previousFilters.endDate),
    startDateLabel: formatThaiShortDate(filters.startDate),
    endDateLabel: formatThaiShortDate(filters.endDate),
    b2cTargetPercent,
    b2cTargetMet: data.channel.dataComplete && b2cPercent >= b2cTargetPercent,
    b2cTargetGap: data.channel.dataComplete ? b2cPercent - b2cTargetPercent : null,
    topRooms: data.topRooms,
    topFiveTelemedTotal: data.topFiveTelemedTotal,
    otherTelemedTotal: data.otherTelemedTotal,
    roomClassifiedTotal: data.roomClassifiedTotal,
    roomUnclassifiedTotal: data.roomUnclassifiedTotal,
    topFiveCoverageRate,
    trend: data.trend,
    insights: insights.slice(0, 5),
    executiveSummary: buildExecutiveSummary(data, targetPerformance, filters),
    targetPerformance,
    qualitySummary,
    dataQuality: data.dataQuality
  };
}

function diagnosticSummary(model, filters = {}) {
  return {
    event: 'executive_overview_diagnostics',
    range: { startDate: filters.startDate, endDate: filters.endDate },
    totalVisits: model.dataQuality.totalVisits,
    uniquePatients: model.dataQuality.uniquePatients,
    dmVisits: model.dataQuality.dmVisits,
    htVisits: model.dataQuality.htVisits,
    dmHtOverlap: model.dataQuality.dmHtOverlap,
    otherDiseaseVisits: model.dataQuality.otherDiseaseVisits,
    b2bVisits: model.dataQuality.b2bVisits,
    b2cVisits: model.dataQuality.b2cVisits,
    unclassifiedChannelVisits: model.dataQuality.unclassifiedChannelVisits,
    conflictChannelVisits: model.dataQuality.conflictChannelVisits,
    channelTotalsMatch: model.dataQuality.channelTotalsMatch,
    roomTotalsMatch: model.dataQuality.roomTotalsMatch,
    topRoomTotalsMatch: model.dataQuality.topRoomTotalsMatch,
    diseaseTotalsValid: model.dataQuality.diseaseTotalsValid,
    diseaseUnionMatches: model.dataQuality.diseaseUnionMatches,
    roomClassificationBasis: model.dataQuality.roomClassificationBasis,
    roomClassifiedTotal: model.dataQuality.roomClassifiedTotal,
    roomUnclassifiedTotal: model.dataQuality.roomUnclassifiedTotal,
    multipleRoomSourceVisits: model.dataQuality.multipleRoomSourceVisits,
    selectedMainRoomVisits: model.dataQuality.selectedMainRoomVisits,
    pharmacyTelemedRoomVisits: model.dataQuality.pharmacyTelemedRoomVisits,
    joinExpandedVisits: model.dataQuality.joinExpandedVisits,
    duplicateRowsBeforeDeduplicate: model.dataQuality.duplicateRowsBeforeDeduplicate,
    highestValue: model.dataQuality.highestValue,
    highestDateCount: model.dataQuality.highestDates.length,
    lowestValue: model.dataQuality.lowestValue,
    lowestDateCount: model.dataQuality.lowestDates.length,
    activeServiceDays: model.dataQuality.activeServiceDays,
    calendarDays: model.dataQuality.calendarDays
  };
}

function logExecutiveDiagnostics(model, filters) {
  if (process.env.DEBUG_EXECUTIVE_DATA !== 'true') return;
  console.info(JSON.stringify(diagnosticSummary(model, filters)));
}

module.exports = {
  CATEGORY_KEYS,
  EXECUTIVE_VISIT_QUERY,
  aggregateExecutiveOverview,
  buildDataQualitySummary,
  buildExecutiveMetrics,
  buildExecutiveSummary,
  buildTargetPerformance,
  classifyChannel,
  diagnosticSummary,
  emptyExecutiveOverviewModel,
  fetchExecutiveOverview,
  normalizeVisitRows,
  previousPeriodFilters
};
