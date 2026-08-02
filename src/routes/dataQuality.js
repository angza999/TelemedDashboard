const express = require('express');
const { parseFilters } = require('../services/telemedService');
const { fetchDataQualityReport } = require('../services/dataQualityService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const report = await fetchDataQualityReport(filters);
    res.render('admin/data-quality', {
      title: 'ตรวจสอบคุณภาพข้อมูล',
      filters,
      report,
      error: null
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      const filters = parseFilters(req.query);
      return res.status(200).render('admin/data-quality', {
        title: 'ตรวจสอบคุณภาพข้อมูล',
        filters,
        report: { summary: { pass: 0, warning: 0, review: 0 }, checks: [], lastUpdated: null },
        error: 'ยังไม่สามารถตรวจสอบข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล HOSxP'
      });
    }
    return next(error);
  }
});

function isDatabaseSetupError(error) {
  return [
    'ER_BAD_DB_ERROR',
    'ER_ACCESS_DENIED_ERROR',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'ER_BAD_FIELD_ERROR',
    'ER_NO_SUCH_TABLE'
  ].includes(error && error.code);
}

module.exports = router;
