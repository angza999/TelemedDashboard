const express = require('express');
const {
  emptyDashboardModel,
  fiscalYearRange,
  parseFilters,
  fetchTelemedSummary
} = require('../services/telemedService');
const {
  emptyDepartmentTargetModel,
  fetchDepartmentTargetData,
  previousPeriodFilters,
  buildExecutiveMetrics
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
  const allowedServiceGroups = ['Telemed', 'กายภาพ', 'อุบัติเหตุฉุกเฉิน', 'แผนไทย'];

  return {
    ...filters,
    depcode: query.depcode || 'all',
    serviceGroup: allowedServiceGroups.includes(query.serviceGroup) ? query.serviceGroup : 'all',
    status: ['passed', 'failed'].includes(query.status) ? query.status : 'all',
    sortBy: ['target_gap', 'percent_low', 'telemed_desc', 'opd_desc'].includes(query.sortBy)
      ? query.sortBy
      : 'target_gap'
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const previousFilters = previousPeriodFilters(filters);
    const [data, previousData, dailyData] = await Promise.all([
      fetchTelemedSummary(filters),
      fetchTelemedSummary(previousFilters),
      filters.granularity === 'month'
        ? fetchTelemedSummary({ ...filters, granularity: 'day' })
        : Promise.resolve(null)
    ]);
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
      metrics: buildExecutiveMetrics(data, previousData, filters, target, dailyData || data),
      target,
      activeTab: req.query.tab === 'department-target' ? 'department-target' : 'overview',
      dbError: null,
      targetError
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      const filters = effectiveFilters(req.query);
      const data = emptyDashboardModel();
      const target = emptyDepartmentTargetModel();
      return res.status(200).render('executive/dashboard', {
        title: 'Executive Dashboard',
        filters,
        targetFilters: targetFilters(req.query, filters),
        data,
        metrics: buildExecutiveMetrics(data, emptyDashboardModel(), filters, target, data),
        target,
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
