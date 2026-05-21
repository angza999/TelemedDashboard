const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByUsername } = require('../config/users');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/telemed');
  return res.render('auth/login', {
    title: 'เข้าสู่ระบบ',
    error: null,
    next: req.query.next || '/telemed'
  });
});

router.post('/login', async (req, res) => {
  const { username, password, next } = req.body;
  const user = findUserByUsername(username);
  const isValid = user ? await bcrypt.compare(String(password || ''), user.passwordHash) : false;

  if (!isValid) {
    return res.status(401).render('auth/login', {
      title: 'เข้าสู่ระบบ',
      error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      next: next || '/telemed'
    });
  }

  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
    res.redirect(next && next.startsWith('/') ? next : '/telemed');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('telemed.sid');
    res.redirect('/login');
  });
});

module.exports = router;
