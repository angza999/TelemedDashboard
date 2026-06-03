const express = require('express');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const router = express.Router();
const dataDir = path.join(__dirname, '..', '..', 'data');
const logPath = path.join(dataDir, 'query-tool.log.jsonl');

const forbiddenPattern = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|RENAME|GRANT|REVOKE|LOAD|CALL|EXECUTE|SET|USE|LOCK|UNLOCK|ANALYZE|OPTIMIZE|REPAIR|INTO|OUTFILE|DUMPFILE)\b/i;
const commentPattern = /(--|\/\*|\*\/|#)/;
const sensitiveColumnPattern = /(^|_)(cid|idcard|id_card|cardno|card_no|hn|an|vn|patient|ptname|pname|fname|lname|person|birth|birthday|dob|addr|address|phone|mobile|tel|email)(_|$)/i;

router.get('/', (req, res) => {
  res.render('admin/query-tool', {
    title: 'Query Tool',
    sql: defaultSql(),
    columns: [],
    rows: [],
    rowCount: null,
    error: null,
    status: null,
    privacyWarning: null,
    sensitiveColumns: []
  });
});

router.get('/clear', (req, res) => {
  req.session.queryToolResult = null;
  res.redirect('/admin/query-tool');
});

router.post('/run', async (req, res) => {
  const sql = String(req.body.sql || '').trim();

  try {
    const safeSql = prepareSelect(sql);
    const pool = getPool();
    const [rows, fields] = await pool.query(safeSql);
    const columns = fields.map((field) => field.name);
    const sensitiveColumns = detectSensitiveColumns(columns);
    const privacyWarning = privacyWarningText(sensitiveColumns);
    const safeRows = rows.slice(0, 1000).map((row) => plainRow(row, columns));

    req.session.queryToolResult = {
      sql,
      columns,
      rows: safeRows,
      rowCount: safeRows.length,
      executedAt: new Date().toISOString(),
      sensitiveColumns,
      privacyWarning
    };

    await writeQueryLog(req, sql, safeRows.length, 'success');

    res.render('admin/query-tool', {
      title: 'Query Tool',
      sql,
      columns,
      rows: safeRows,
      rowCount: safeRows.length,
      error: null,
      privacyWarning,
      sensitiveColumns,
      status: safeRows.length === 1000
        ? 'แสดงผลลัพธ์สูงสุด 1000 rows'
        : `คืนค่า ${safeRows.length} rows`
    });
  } catch (err) {
    await writeQueryLog(req, sql, 0, 'error', err.publicMessage || err.code || 'QUERY_ERROR').catch(() => {});
    res.status(400).render('admin/query-tool', {
      title: 'Query Tool',
      sql,
      columns: [],
      rows: [],
      rowCount: null,
      error: err.publicMessage || friendlyQueryError(err),
      status: null,
      privacyWarning: null,
      sensitiveColumns: []
    });
  }
});

router.get('/export.xlsx', async (req, res) => {
  const result = req.session.queryToolResult;
  if (!result || !Array.isArray(result.rows)) {
    return res.status(400).send('ยังไม่มีผลลัพธ์สำหรับ Export');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Telemed Dashboard Query Tool';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Query Result');
  sheet.columns = result.columns.map((column) => ({
    header: column,
    key: column,
    width: Math.min(Math.max(String(column).length + 4, 14), 36)
  }));
  sheet.addRows(result.rows);
  sheet.getRow(1).font = { bold: true };

  const meta = workbook.addWorksheet('Metadata');
  meta.columns = [
    { header: 'Field', key: 'field', width: 18 },
    { header: 'Value', key: 'value', width: 80 }
  ];
  meta.addRows([
    { field: 'Executed at', value: result.executedAt },
    { field: 'Rows', value: result.rowCount },
    { field: 'Privacy warning', value: result.privacyWarning || 'No sensitive columns detected by column-name scan' },
    { field: 'Sensitive columns', value: Array.isArray(result.sensitiveColumns) ? result.sensitiveColumns.join(', ') : '' },
    { field: 'SQL', value: result.sql }
  ]);
  meta.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="query-tool-result-${Date.now()}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

function defaultSql() {
  return "SELECT *\nFROM ovstist\nWHERE export_code = '5'";
}

function prepareSelect(sql) {
  if (!sql) throwValidation('กรุณาระบุ SQL');
  if (!/^SELECT\b/i.test(sql)) throwValidation('อนุญาตเฉพาะคำสั่ง SELECT เท่านั้น');
  if (sql.includes(';')) throwValidation('ไม่อนุญาตให้ใช้ semicolon หรือหลาย statement');
  if (commentPattern.test(sql)) throwValidation('ไม่อนุญาตให้ใช้ SQL comment ใน Query Tool');
  if (forbiddenPattern.test(sql)) throwValidation('พบคำสั่งที่ไม่อนุญาต Query Tool นี้ใช้สำหรับอ่านข้อมูลเท่านั้น');

  return `SELECT * FROM (${sql}) AS query_tool_result LIMIT 1000`;
}

function detectSensitiveColumns(columns) {
  return columns.filter((column) => sensitiveColumnPattern.test(String(column || '').toLowerCase()));
}

function privacyWarningText(columns) {
  if (!columns.length) return null;
  return `ตรวจพบ column ที่อาจเป็นข้อมูลอ่อนไหว: ${columns.join(', ')} กรุณาตรวจสอบความจำเป็นก่อน Export และอย่าเผยแพร่ข้อมูลรายบุคคล`;
}

function throwValidation(message) {
  const err = new Error(message);
  err.publicMessage = message;
  throw err;
}

function friendlyQueryError(err) {
  if (err.code === 'ER_PARSE_ERROR') return 'SQL syntax ไม่ถูกต้อง กรุณาตรวจสอบคำสั่ง SELECT';
  if (err.code === 'ER_NO_SUCH_TABLE') return 'ไม่พบตารางที่ระบุ กรุณาตรวจสอบชื่อตาราง';
  if (err.code === 'ER_BAD_FIELD_ERROR') return 'ไม่พบ field/column ที่ระบุ กรุณาตรวจสอบชื่อ column';
  if (err.code === 'ER_ACCESS_DENIED_ERROR') return 'ไม่มีสิทธิ์เชื่อมต่อฐานข้อมูล กรุณาตรวจสอบการตั้งค่า';
  return 'รัน SQL ไม่สำเร็จ กรุณาตรวจสอบ syntax และสิทธิ์ฐานข้อมูล';
}

function plainRow(row, columns) {
  return columns.reduce((record, column) => {
    const value = row[column];
    record[column] = value instanceof Date ? value.toISOString() : value;
    return record;
  }, {});
}

async function writeQueryLog(req, sql, rowCount, status, error = null) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const entry = {
    username: req.session.user ? req.session.user.username : 'unknown',
    role: req.session.user ? req.session.user.role : 'unknown',
    datetime: new Date().toISOString(),
    sql,
    rowCount,
    status,
    error
  };
  await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

module.exports = router;
