const express = require('express');
const {
  CATEGORY_KEYS,
  emptyDashboardModel,
  fiscalYearRange,
  parseFilters,
  fetchTelemedSummary
} = require('../services/telemedService');
const {
  writeTelemedExcel,
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

router.get('/', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const data = await fetchTelemedSummary(filters);
    res.render('telemed/dashboard', {
      title: 'Telemed Dashboard',
      filters,
      data,
      categories: CATEGORY_KEYS,
      dbError: null
    });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      const filters = effectiveFilters(req.query);
      return res.status(200).render('telemed/dashboard', {
        title: 'Telemed Dashboard',
        filters,
        data: emptyDashboardModel(),
        categories: CATEGORY_KEYS,
        dbError: databaseSetupMessage(err)
      });
    }
    next(err);
  }
});

router.get('/api/summary', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const data = await fetchTelemedSummary(filters);
    res.json({ filters, data });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ error: databaseSetupMessage(err) });
    }
    next(err);
  }
});

router.get('/export.xlsx', async (req, res, next) => {
  try {
    const filters = effectiveFilters(req.query);
    const data = await fetchTelemedSummary(filters);
    await writeTelemedExcel(res, filters, data);
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
    const data = await fetchTelemedSummary(filters);
    writeTelemedPdf(res, filters, data);
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
  if (err.code === 'ER_BAD_DB_ERROR') {
    return 'ยังไม่พบฐานข้อมูลที่ตั้งค่าไว้ กรุณาตรวจสอบชื่อ Database ของ HOSxP/HOSxP XE';
  }
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return 'ชื่อผู้ใช้หรือรหัสผ่านฐานข้อมูลไม่ถูกต้อง กรุณาตรวจสอบในเมนูตั้งค่าฐานข้อมูล';
  }
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    return `SQL mapping ยังไม่ตรงกับฐาน HOSxP นี้: ${err.sqlMessage || err.message}`;
  }
  return 'ยังเชื่อมต่อฐานข้อมูลโรงพยาบาลไม่ได้ กรุณาตรวจสอบ Host, Port, User, Password และ Database';
}

module.exports = router;
