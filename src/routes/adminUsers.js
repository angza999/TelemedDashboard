const express = require('express');
const { listUsers } = require('../config/users');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('admin/users', {
    title: 'จัดการผู้ใช้งาน',
    users: listUsers()
  });
});

module.exports = router;
