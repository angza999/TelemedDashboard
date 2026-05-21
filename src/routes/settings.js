const express = require('express');
const {
  publicDbConfig,
  getDbConfig,
  saveDbConfig,
  testConnection
} = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('settings/database', {
    title: 'ตั้งค่าฐานข้อมูล',
    config: publicDbConfig(),
    status: null,
    error: null
  });
});

router.post('/test', async (req, res) => {
  try {
    const current = getDbConfig();
    const payload = {
      ...req.body,
      password: req.body.password === '' ? current.password : req.body.password
    };
    await testConnection(payload);
    req.session.pendingDbConfig = payload;
    res.render('settings/database', {
      title: 'ตั้งค่าฐานข้อมูล',
      config: {
        host: req.body.host,
        port: Number(req.body.port || 3306),
        user: req.body.user,
        database: req.body.database,
        connectionLimit: Number(req.body.connectionLimit || 10),
        hasPassword: Boolean(payload.password)
      },
      status: 'เชื่อมต่อฐานข้อมูลสำเร็จ',
      error: null
    });
  } catch (err) {
    req.session.pendingDbConfig = null;
    res.status(400).render('settings/database', {
      title: 'ตั้งค่าฐานข้อมูล',
      config: {
        host: req.body.host,
        port: Number(req.body.port || 3306),
        user: req.body.user,
        database: req.body.database,
        connectionLimit: Number(req.body.connectionLimit || 10),
        hasPassword: Boolean(req.body.password)
      },
      status: null,
      error: 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ Host, Port, User, Password และ Database'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = resolveSavePayload(req);
    await testConnection(payload);
    const config = await saveDbConfig(payload);
    req.session.pendingDbConfig = null;
    res.render('settings/database', {
      title: 'ตั้งค่าฐานข้อมูล',
      config,
      status: 'บันทึกการเชื่อมต่อฐานข้อมูลเรียบร้อย',
      error: null
    });
  } catch (err) {
    res.status(400).render('settings/database', {
      title: 'ตั้งค่าฐานข้อมูล',
      config: {
        host: req.body.host,
        port: Number(req.body.port || 3306),
        user: req.body.user,
        database: req.body.database,
        connectionLimit: Number(req.body.connectionLimit || 10),
        hasPassword: Boolean(req.body.password)
      },
      status: null,
      error: saveErrorMessage(err)
    });
  }
});

function resolveSavePayload(req) {
  if (req.body.password !== '') return req.body;

  const pending = req.session.pendingDbConfig;
  if (pending && sameConnectionWithoutPassword(req.body, pending)) {
    return pending;
  }

  const current = getDbConfig();
  return {
    ...req.body,
    password: current.password || ''
  };
}

function sameConnectionWithoutPassword(form, pending) {
  return String(form.host || '').trim() === String(pending.host || '').trim()
    && Number(form.port || 3306) === Number(pending.port || 3306)
    && String(form.database || '').trim() === String(pending.database || '').trim()
    && String(form.user || '').trim() === String(pending.user || '').trim()
    && Number(form.connectionLimit || 10) === Number(pending.connectionLimit || 10);
}

function saveErrorMessage(err) {
  if (err && err.code === 'ER_ACCESS_DENIED_ERROR') {
    return 'ยังไม่บันทึก เพราะชื่อผู้ใช้หรือรหัสผ่านฐานข้อมูลไม่ถูกต้อง ถ้าเพิ่งกดทดสอบสำเร็จแล้ว กรุณากดบันทึกโดยไม่แก้ไขค่าอื่น';
  }
  if (err && err.code === 'ER_BAD_DB_ERROR') {
    return 'ยังไม่บันทึก เพราะไม่พบชื่อ Database นี้ใน MySQL';
  }
  return 'ยังไม่บันทึก เพราะทดสอบการเชื่อมต่อไม่สำเร็จ';
}

module.exports = router;
