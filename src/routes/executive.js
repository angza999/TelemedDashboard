const express = require('express');
const {
  CATEGORY_KEYS,
  emptyDashboardModel,
  fiscalYearRange,
  parseFilters,
  fetchTelemedSummary
} = require('../services/telemedService');
const {
  emptyDepartmentTargetModel,
  fetchDepartmentTargetData
} = require('../services/executiveService');
const {
  writeDepartmentTargetExcel,
  writeTelemedPdf
} = require('../services/reportExportService');

const router = express.Router();

function effectiveFilters(query) {
  const fiscal = fiscalYearRange(query.fiscalYear);
  if (fiscal) {
    return {
      ...parseFilters({ ...query, ...fiscal }),
      fiscalYear: query.fiscalYear
    };
  }
  return parseFilters(query);
}

function targetFilters(query, filters = effectiveFilters(query)) {
  return {
    ...filters,
    depcode: query.depcode || 'all',
    status: ['passed', 'failed'].includes(query.status) ? query.status : 'all',
    sortBy: ['target_gap', 'percent_low', 'telemed_desc', 'opd_desc'].includes(query.sortBy)
      ? query.sortBy
      : 'target_gap'
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const data = await fetchTelemedSummary(filters);
    let target = emptyDepartmentTargetModel();
    let targetError = null;

    try {
      target = await fetchDepartmentTargetData(targetFilters(req.query, filters));
    } catch (err) {
      if (!isDatabaseSetupError(err)) throw err;
      targetError = databaseSetupMessage(err);
    }

    res.render('executive/dashboard', {
      title: 'Executive Dashboard',
      filters,
      targetFilters: targetFilters(req.query, filters),
      data,
      metrics: buildExecutiveMetrics(data),
      target,
      activeTab: req.query.tab === 'department-target' ? 'department-target' : 'overview',
      dbError: null,
      targetError
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      const filters = effectiveFilters(req.query);
      const data = emptyDashboardModel();
      return res.status(200).render('executive/dashboard', {
        title: 'Executive Dashboard',
        filters,
        targetFilters: targetFilters(req.query, filters),
        data,
        metrics: buildExecutiveMetrics(data),
        target: emptyDepartmentTargetModel(),
        activeTab: req.query.tab === 'department-target' ? 'department-target' : 'overview',
        dbError: databaseSetupMessage(err),
        targetError: null
      });
    }
    next(err);
  }
});

router.get('/department-target-data', async (req, res, next) => {
  try {
    const filters = targetFilters(req.query);
    const target = await fetchDepartmentTargetData(filters);
    res.json({
      summary: target.summary,
      rows: target.rows,
      departments: target.departments,
      hasB2b: target.hasB2b,
      lastUpdated: target.lastUpdated
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ error: databaseSetupMessage(err) });
    }
    next(err);
  }
});

router.get('/department-target.xlsx', async (req, res, next) => {
  try {
    const filters = targetFilters(req.query);
    const target = await fetchDepartmentTargetData(filters);
    await writeDepartmentTargetExcel(res, filters, target);
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).send(databaseSetupMessage(err));
    }
    next(err);
  }
});

router.get('/export.pdf', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const data = await fetchTelemedSummary({ ...filters, granularity: 'month' });
    writeTelemedPdf(res, filters, data, {
      title: 'รายงานผู้บริหาร Telemedicine',
      executive: true
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).send(databaseSetupMessage(err));
    }
    next(err);
  }
});

function buildExecutiveMetrics(data) {
  const dm = data.kpis['DM B2B'] + data.kpis['DM B2C'];
  const ht = data.kpis['HT B2B'] + data.kpis['HT B2C'];
  const b2b = data.channel.b2b;
  const b2c = data.channel.b2c;
  const channelTotal = b2b + b2c;
  const b2bPercent = channelTotal > 0 ? (b2b / channelTotal) * 100 : 0;
  const b2cPercent = channelTotal > 0 ? (b2c / channelTotal) * 100 : 0;
  const trend = data.trend.map((row) => ({
    period: row.period,
    total: CATEGORY_KEYS.reduce((sum, key) => sum + Number(row[key] || 0), 0),
    dm: Number(row['DM B2B'] || 0) + Number(row['DM B2C'] || 0),
    ht: Number(row['HT B2B'] || 0) + Number(row['HT B2C'] || 0)
  }));

  return {
    dm,
    ht,
    b2b,
    b2c,
    b2bPercent,
    b2cPercent,
    trend,
    summary: `ช่วงวันที่นี้มีบริการ Telemed รวม ${data.total.toLocaleString('th-TH')} ครั้ง กลุ่ม DM รวม ${dm.toLocaleString('th-TH')} ครั้ง กลุ่ม HT รวม ${ht.toLocaleString('th-TH')} ครั้ง และสัดส่วน B2B คิดเป็น ${b2bPercent.toFixed(1)}%`
  };
}

function isDatabaseSetupError(err) {
  return [
    'ER_BAD_DB_ERROR',
    'ER_ACCESS_DENIED_ERROR',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'ER_BAD_FIELD_ERROR',
    'ER_NO_SUCH_TABLE'
  ].includes(err.code);
}

function databaseSetupMessage(err) {
  if (err.code === 'ER_BAD_DB_ERROR') return 'ยังไม่พบฐานข้อมูลที่ตั้งค่าไว้';
  if (err.code === 'ER_ACCESS_DENIED_ERROR') return 'ชื่อผู้ใช้หรือรหัสผ่านฐานข้อมูลไม่ถูกต้อง';
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    return `SQL mapping ยังไม่ตรงกับฐาน HOSxP นี้: ${err.sqlMessage || err.message}`;
  }
  return 'ยังเชื่อมต่อฐานข้อมูลโรงพยาบาลไม่ได้';
}

module.exports = router;
