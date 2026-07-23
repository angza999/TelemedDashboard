const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserByUsername } = require('../config/users');
const {
  clearSessionCookie,
  getDefaultRouteByRole,
  getPostLoginRoute
} = require('../config/session');

const router = express.Router();

const logAuthEvents = String(process.env.LOG_AUTH_EVENTS || '').trim().toLowerCase() === 'true';

function logAuthEvent(event, details = {}) {
  if (!logAuthEvents) return;
  console.info(`[auth] ${event}`, details);
}

function renderLoginError(res, status, error, next) {
  return res.status(status).render('auth/login', {
    title: 'เข้าสู่ระบบ',
    error,
    next: next || ''
  });
}

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(getDefaultRouteByRole(req.session.user.role));
  }
  return res.render('auth/login', {
    title: 'เข้าสู่ระบบ',
    error: null,
    next: req.query.next || ''
  });
});

router.post('/login', async (req, res) => {
  const { username, password, next } = req.body;
  const requestedPath = String(next || '');

  if (req.session.user) {
    return res.redirect(getDefaultRouteByRole(req.session.user.role));
  }

  const user = findUserByUsername(username);

  if (!user) {
    logAuthEvent('login_failed', { username: String(username || '').trim(), reason: 'invalid_credentials' });
    return renderLoginError(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', requestedPath);
  }

  if (user.isActive === false) {
    logAuthEvent('login_failed', { username: user.username, reason: 'inactive_account' });
    return renderLoginError(res, 403, 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ', requestedPath);
  }

  const isValid = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!isValid) {
    logAuthEvent('login_failed', { username: user.username, reason: 'invalid_credentials' });
    return renderLoginError(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', requestedPath);
  }

  req.session.regenerate((err) => {
    if (err) {
      console.error('[auth] session_regenerate_failed');
      return renderLoginError(res, 500, 'ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ', requestedPath);
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[auth] session_save_failed');
        return renderLoginError(res, 500, 'ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ', requestedPath);
      }

      logAuthEvent('login_success', { username: user.username, role: user.role });
      return res.redirect(getPostLoginRoute(user.role, requestedPath));
    });
  });
});

router.post('/logout', (req, res) => {
  const username = req.session && req.session.user ? req.session.user.username : null;
  if (!req.session) {
    clearSessionCookie(res);
    return res.redirect('/login');
  }

  req.session.destroy((err) => {
    clearSessionCookie(res);
    if (err) console.error('[auth] session_destroy_failed');
    logAuthEvent('logout_success', { username });
    return res.redirect('/login');
  });
});

module.exports = router;
