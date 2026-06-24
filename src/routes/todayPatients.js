const express = require('express');
const {
  getMappingGroups,
  saveMappingGroups,
  resetDefaultMappings,
  fetchDepartments,
  fetchWards,
  fetchTodayPatientsSummary,
  getNcdSubclinicMappingGroups,
  saveNcdSubclinicMappingGroups,
  fetchNcdSubclinicSummary,
  getIpdSubclinicMappingGroups,
  saveIpdSubclinicMappingGroups,
  fetchIpdSubclinicSummary
} = require('../services/todayPatientsService');

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get('/today-patients', (req, res) => {
  res.render('today-patients/dashboard', {
    title: 'ภาพรวมผู้รับบริการวันนี้'
  });
});

publicRouter.get('/api/today-patients/summary', async (req, res, next) => {
  try {
    const data = await fetchTodayPatientsSummary();
    res.json({ success: true, data });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลจากฐานข้อมูล HOSxP ได้'
      });
    }
    next(err);
  }
});

publicRouter.get('/api/today-patients/ncd-subclinics', async (req, res, next) => {
  try {
    const data = await fetchNcdSubclinicSummary();
    res.json({ success: true, data });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลคลินิกย่อย NCD ได้'
      });
    }
    next(err);
  }
});

publicRouter.get('/api/today-patients/ipd-subclinics', async (req, res, next) => {
  try {
    const data = await fetchIpdSubclinicSummary();
    res.json({ success: true, data });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลคลินิกย่อย IPD ได้'
      });
    }
    next(err);
  }
});

adminRouter.get('/admin/today-patients-mapping', (req, res) => {
  res.render('admin/today-patients-mapping', {
    title: 'ตั้งค่าผู้รับบริการวันนี้'
  });
});

adminRouter.get('/admin/ncd-subclinics', (req, res) => {
  res.render('admin/ncd-subclinics', {
    title: 'ตั้งค่าคลินิกย่อย NCD'
  });
});

adminRouter.get('/admin/ipd-subclinics', (req, res) => {
  res.render('admin/ipd-subclinics', {
    title: 'ตั้งค่าคลินิกย่อย IPD'
  });
});

adminRouter.get('/api/admin/today-patients/departments', async (req, res, next) => {
  try {
    res.json({ success: true, data: await fetchDepartments() });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ success: false, message: databaseSetupMessage(err) });
    }
    next(err);
  }
});

adminRouter.get('/api/admin/today-patients/wards', async (req, res, next) => {
  try {
    res.json({ success: true, data: await fetchWards() });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ success: false, message: databaseSetupMessage(err) });
    }
    next(err);
  }
});

adminRouter.get('/api/admin/today-patients/mapping', async (req, res, next) => {
  try {
    res.json({ success: true, data: await getMappingGroups() });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/admin/ncd-subclinics/departments', async (req, res, next) => {
  try {
    res.json({ success: true, data: await fetchDepartments() });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ success: false, message: databaseSetupMessage(err) });
    }
    next(err);
  }
});

adminRouter.get('/api/admin/ncd-subclinics/mapping', async (req, res, next) => {
  try {
    res.json({ success: true, data: getNcdSubclinicMappingGroups() });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/admin/ncd-subclinics/mapping', async (req, res) => {
  try {
    const data = saveNcdSubclinicMappingGroups(req.body || {});
    res.json({ success: true, data, message: 'บันทึกการตั้งค่าคลินิกย่อย NCD สำเร็จ' });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'บันทึกการตั้งค่าคลินิกย่อย NCD ไม่สำเร็จ'
    });
  }
});

adminRouter.get('/api/admin/ipd-subclinics/wards', async (req, res, next) => {
  try {
    res.json({ success: true, data: await fetchWards() });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ success: false, message: databaseSetupMessage(err) });
    }
    next(err);
  }
});

adminRouter.get('/api/admin/ipd-subclinics/mapping', async (req, res, next) => {
  try {
    res.json({ success: true, data: await getIpdSubclinicMappingGroups() });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/admin/ipd-subclinics/mapping', async (req, res) => {
  try {
    const data = saveIpdSubclinicMappingGroups(req.body || {});
    res.json({ success: true, data, message: 'บันทึกการตั้งค่าคลินิกย่อย IPD สำเร็จ' });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'บันทึกการตั้งค่าคลินิกย่อย IPD ไม่สำเร็จ'
    });
  }
});

adminRouter.post('/api/admin/today-patients/mapping', async (req, res, next) => {
  try {
    const data = await saveMappingGroups(req.body || {});
    res.json({ success: true, data, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'บันทึกการตั้งค่าไม่สำเร็จ'
    });
  }
});

adminRouter.post('/api/admin/today-patients/mapping/reset', async (req, res, next) => {
  try {
    const data = await resetDefaultMappings();
    res.json({ success: true, data, message: 'รีเซ็ตค่าเริ่มต้นสำเร็จ' });
  } catch (err) {
    if (isDatabaseSetupError(err)) {
      return res.status(503).json({ success: false, message: databaseSetupMessage(err) });
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
  if (err.code === 'ER_BAD_DB_ERROR') return 'ยังไม่พบฐานข้อมูล HOSxP ที่ตั้งค่าไว้';
  if (err.code === 'ER_ACCESS_DENIED_ERROR') return 'ชื่อผู้ใช้หรือรหัสผ่านฐานข้อมูล HOSxP ไม่ถูกต้อง';
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    return `โครงสร้างตาราง HOSxP ไม่ตรงกับที่ระบบต้องใช้: ${err.sqlMessage || err.message}`;
  }
  return 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้';
}

module.exports = {
  publicRouter,
  adminRouter
};
