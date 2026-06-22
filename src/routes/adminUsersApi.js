const express = require('express');
const { deleteUser } = require('../config/users');

const router = express.Router();

function errorStatus(message) {
  if (message === 'ไม่พบผู้ใช้งาน') return 404;
  if (
    message === 'ไม่สามารถลบผู้ดูแลระบบหลักได้'
    || message === 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้'
    || message === 'ไม่สามารถลบ admin คนสุดท้ายของระบบได้'
  ) {
    return 400;
  }
  return 500;
}

router.delete('/:id', (req, res) => {
  try {
    deleteUser(req.params.id, req.session.user);
    return res.json({
      success: true,
      message: 'ลบผู้ใช้งานสำเร็จ'
    });
  } catch (err) {
    return res.status(errorStatus(err.message)).json({
      success: false,
      message: err.message || 'ไม่สามารถลบผู้ใช้งานนี้ได้'
    });
  }
});

module.exports = router;
