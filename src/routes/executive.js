const express = require('express');
const {
  fiscalYearRange,
  parseFilters
} = require('../services/telemedService');
const {
  buildDepartmentTargetModel,
  departmentTargetServiceGroups,
  emptyDepartmentTargetModel,
  fetchDepartmentTargetData
} = require('../services/executiveService');
const {
  buildExecutiveMetrics,
  emptyExecutiveOverviewModel,
  fetchExecutiveOverview,
  previousPeriodFilters
} = require('../services/executiveOverviewService');
const {
  writeDepartmentTargetExcel,
  writeTelemedPdf
} = require('../services/reportExportService');

const router = express.Router();

function effectiveFilters(query) {
  const fiscal = fiscalYearRange(query.fiscalYear);
  const requestedGranularity = ['day', 'week', 'month'].includes(query.granularity)
    ? query.granularity
    : 'day';
  if (fiscal) {
    return {
      ...parseFilters({ ...query, ...fiscal }),
      granularity: requestedGranularity,
      fiscalYear: query.fiscalYear
    };
  }
  return {
    ...parseFilters(query),
    granularity: requestedGranularity
  };
}

function targetFilters(query, filters = effectiveFilters(query)) {
  const allowedServiceGroups = departmentTargetServiceGroups();

  return {
    ...filters,
    depcode: query.depcode || 'all',
    serviceGroup: allowedServiceGroups.includes(query.serviceGroup) ? query.serviceGroup : 'all',
    status: ['passed', 'near', 'failed', 'data_check', 'no_data'].includes(query.status) ? query.status : 'all',
    sortBy: ['target_gap', 'percent_low', 'telemed_desc', 'opd_desc', 'name_asc'].includes(query.sortBy)
      ? query.sortBy
      : 'target_gap'
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const previousFilters = previousPeriodFilters(filters);
    const targetRequest = fetchDepartmentTargetData(targetFilters(req.query, filters))
      .then((target) => ({ target, targetError: null }))
      .catch((err) => {
        if (!isDatabaseSetupError(err)) throw err;
        return {
          target: emptyDepartmentTargetModel(),
          targetError: databaseSetupMessage(err)
        };
      });
    const [data, previousData, targetResult] = await Promise.all([
      fetchExecutiveOverview(filters, { queryName: 'executive_overview_current' }),
      fetchExecutiveOverview(previousFilters, { queryName: 'executive_overview_previous' }),
      targetRequest
    ]);
    const { target, targetError } = targetResult;

    const overviewTarget = buildDepartmentTargetModel(target.allRows || [], { sortBy: 'target_gap' });
    res.render('executive/dashboard', {
      title: 'Executive Dashboard',
      filters,
      targetFilters: targetFilters(req.query, filters),
      data,
      metrics: buildExecutiveMetrics(data, previousData, filters, overviewTarget),
      target,
      overviewTarget,
      activeTab: req.query.tab === 'department-target' ? 'department-target' : 'overview',
      dbError: null,
      targetError
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      const filters = effectiveFilters(req.query);
      const data = emptyExecutiveOverviewModel(filters);
      const target = emptyDepartmentTargetModel();
      const overviewTarget = emptyDepartmentTargetModel();
      return res.status(200).render('executive/dashboard', {
        title: 'Executive Dashboard',
        filters,
        targetFilters: targetFilters(req.query, filters),
        data,
        metrics: buildExecutiveMetrics(data, emptyExecutiveOverviewModel(previousPeriodFilters(filters)), filters, overviewTarget),
        target,
        overviewTarget,
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
    const reportFilters = { ...filters };
    const previousFilters = previousPeriodFilters(reportFilters);
    const [data, previousData, target] = await Promise.all([
      fetchExecutiveOverview(reportFilters, { queryName: 'executive_overview_current' }),
      fetchExecutiveOverview(previousFilters, { queryName: 'executive_overview_previous' }),
      fetchDepartmentTargetData(targetFilters(req.query, reportFilters))
    ]);
    const overviewTarget = buildDepartmentTargetModel(target.allRows || [], { sortBy: 'target_gap' });
    writeTelemedPdf(res, filters, data, {
      title: 'รายงานผู้บริหาร Telemedicine',
      executive: true,
      metrics: buildExecutiveMetrics(data, previousData, reportFilters, overviewTarget)
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
