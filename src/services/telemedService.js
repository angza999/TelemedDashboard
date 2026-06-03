const { getPool } = require('../db');

const CATEGORY_KEYS = ['DM B2B', 'DM B2C', 'HT B2B', 'HT B2C'];
const QUERY_INFO = {
  name: process.env.TELEMED_QUERY_NAME || 'Default Province Query',
  dataSource: 'HOSxP Database'
};

function normalizeDate(value, fallback) {
  if (!value) return fallback;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}$/);
  return match ? value : fallback;
}

function bangkokDateString(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDefaultRange() {
  const now = new Date();
  const end = bangkokDateString(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: bangkokDateString(startDate),
    endDate: end
  };
}

function parseFilters(query) {
  const defaults = getDefaultRange();
  return {
    startDate: normalizeDate(query.startDate, defaults.startDate),
    endDate: normalizeDate(query.endDate, defaults.endDate),
    granularity: query.granularity === 'month' ? 'month' : 'day'
  };
}

function fiscalYearRange(fiscalYear) {
  const year = Number(fiscalYear);
  if (!Number.isInteger(year) || year < 2400 || year > 2700) return null;
  const christianYear = year - 543;
  return {
    startDate: `${christianYear - 1}-10-01`,
    endDate: `${christianYear}-09-30`
  };
}

function baseWhere() {
  return `
    o.export_code = '5'
    AND v.vstdate BETWEEN ? AND ?
  `;
}

function b2bCondition() {
  return `
    (
      LOWER(COALESCE(o.name, '')) LIKE '%b2b%'
      OR LOWER(COALESCE(s.cc, '')) LIKE '%b2b%'
    )
  `;
}

function baseFrom() {
  return `
    FROM ovst v
    LEFT JOIN ovstist o ON o.ovstist = v.ovstist
    LEFT JOIN opdscreen s ON s.vn = v.vn
    LEFT JOIN ovstdiag d ON d.vn = v.vn
  `;
}

async function fetchTelemedSummary(filters) {
  const pool = getPool();
  const params = [filters.startDate, filters.endDate];
  const b2b = b2bCondition();

  const [dailyRows] = await pool.execute(`
    SELECT
      DATE_FORMAT(v.vstdate, '%Y-%m-%d') AS vstdate,
      COUNT(DISTINCT CASE
        WHEN ${b2b}
          AND LOWER(COALESCE(d.icd10, '')) LIKE 'e11%'
        THEN v.vn
      END) AS dm_b2b,
      COUNT(DISTINCT CASE
        WHEN NOT ${b2b}
          AND LOWER(COALESCE(d.icd10, '')) LIKE 'e11%'
        THEN v.vn
      END) AS dm_b2c,
      COUNT(DISTINCT CASE
        WHEN ${b2b}
          AND LOWER(COALESCE(d.icd10, '')) LIKE 'i10%'
        THEN v.vn
      END) AS ht_b2b,
      COUNT(DISTINCT CASE
        WHEN NOT ${b2b}
          AND LOWER(COALESCE(d.icd10, '')) LIKE 'i10%'
        THEN v.vn
      END) AS ht_b2c,
      COUNT(DISTINCT v.vn) AS total
    ${baseFrom()}
    WHERE ${baseWhere()}
    GROUP BY v.vstdate
    ORDER BY v.vstdate ASC
  `, params);

  return buildDashboardModel(dailyRows, filters.granularity);
}

function buildDashboardModel(dailyRows, granularity = 'day') {
  const kpis = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]));
  const trendMap = new Map();

  const normalizedRows = dailyRows.map((row) => {
    const values = {
      'DM B2B': Number(row.dm_b2b || 0),
      'DM B2C': Number(row.dm_b2c || 0),
      'HT B2B': Number(row.ht_b2b || 0),
      'HT B2C': Number(row.ht_b2c || 0)
    };
    const total = Number(row.total || 0);
    const vstdate = row.vstdate;
    const period = granularity === 'month' ? String(vstdate).slice(0, 7) : vstdate;

    for (const key of CATEGORY_KEYS) {
      kpis[key] += values[key];
    }

    if (!trendMap.has(period)) {
      trendMap.set(period, {
        ...Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0])),
        total: 0
      });
    }
    const trendValues = trendMap.get(period);
    for (const key of CATEGORY_KEYS) {
      trendValues[key] += values[key];
    }
    trendValues.total += total;

    return {
      vstdate,
      date: vstdate,
      dm_b2b: values['DM B2B'],
      dm_b2c: values['DM B2C'],
      ht_b2b: values['HT B2B'],
      ht_b2c: values['HT B2C'],
      dm_total: values['DM B2B'] + values['DM B2C'],
      ht_total: values['HT B2B'] + values['HT B2C'],
      b2b_total: values['DM B2B'] + values['HT B2B'],
      b2c_total: values['DM B2C'] + values['HT B2C'],
      ...values,
      total
    };
  });

  const periodSummary = granularity === 'month'
    ? Array.from(trendMap.entries()).map(([period, values]) => ({
      period,
      month: period,
      date: period,
      dm_b2b: values['DM B2B'],
      dm_b2c: values['DM B2C'],
      ht_b2b: values['HT B2B'],
      ht_b2c: values['HT B2C'],
      dm_total: values['DM B2B'] + values['DM B2C'],
      ht_total: values['HT B2B'] + values['HT B2C'],
      b2b_total: values['DM B2B'] + values['HT B2B'],
      b2c_total: values['DM B2C'] + values['HT B2C'],
      ...Object.fromEntries(CATEGORY_KEYS.map((key) => [key, values[key]])),
      total: values.total
    }))
    : normalizedRows;
  const dailySummary = periodSummary.slice().reverse();
  const total = normalizedRows.reduce((sum, row) => sum + row.total, 0);
  const b2b = kpis['DM B2B'] + kpis['HT B2B'];
  const b2c = kpis['DM B2C'] + kpis['HT B2C'];
  const dmTotal = kpis['DM B2B'] + kpis['DM B2C'];
  const htTotal = kpis['HT B2B'] + kpis['HT B2C'];
  const channelTotal = b2b + b2c;
  const b2bPercent = channelTotal > 0 ? (b2b / channelTotal) * 100 : 0;
  const b2cPercent = channelTotal > 0 ? (b2c / channelTotal) * 100 : 0;

  return {
    kpis,
    total,
    other: 0,
    totals: {
      dm: dmTotal,
      ht: htTotal,
      b2b,
      b2c,
      channelTotal
    },
    percentages: {
      b2b: b2bPercent,
      b2c: b2cPercent
    },
    queryInfo: {
      ...QUERY_INFO,
      loadedAt: new Date().toISOString()
    },
    channel: { b2b, b2c },
    trend: Array.from(trendMap.entries()).map(([period, values]) => ({ period, ...values })),
    dailySummary
  };
}

function emptyDashboardModel() {
  return buildDashboardModel([]);
}

module.exports = {
  CATEGORY_KEYS,
  emptyDashboardModel,
  fiscalYearRange,
  parseFilters,
  fetchTelemedSummary
};
