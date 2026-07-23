const express = require('express');
const bcrypt = require('bcryptjs');
const { findUserById, findUserByUsername } = require('../config/users');
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

function currentActiveSessionUser(req) {
  const sessionUser = req.session && req.session.user;
  if (!sessionUser) return null;

  const storedUser = findUserById(sessionUser.id);
  if (!storedUser || storedUser.isActive === false) return null;

  if (
    storedUser.username !== sessionUser.username
    || storedUser.name !== sessionUser.name
    || storedUser.role !== sessionUser.role
  ) {
    req.session.user = {
      id: storedUser.id,
      username: storedUser.username,
      name: storedUser.name,
      role: storedUser.role
    };
  }

  return storedUser;
}

function destroySession(req, res) {
  return new Promise((resolve) => {
    if (!req.session) {
      clearSessionCookie(res);
      return resolve();
    }

    req.session.destroy(() => {
      clearSessionCookie(res);
      resolve();
    });
  });
}

async function discardInvalidSession(req, res) {
  if (!req.session || !req.session.user || currentActiveSessionUser(req)) return false;
  logAuthEvent('session_discarded', { reason: 'inactive_or_missing_user' });
  await destroySession(req, res);
  return true;
}

router.get('/login', async (req, res, next) => {
  try {
    const hadInvalidSession = await discardInvalidSession(req, res);
    const user = currentActiveSessionUser(req);
    logAuthEvent('get_login', { sessionExists: Boolean(user), staleSessionCleared: hadInvalidSession });

    if (user) return res.redirect(getDefaultRouteByRole(user.role));

    return res.render('auth/login', {
      title: 'เข้าสู่ระบบ',
      error: null,
      next: req.query.next || ''
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password, next: requestedNext } = req.body;
    const requestedPath = String(requestedNext || '');
    const normalizedUsername = String(username || '').trim();

    await discardInvalidSession(req, res);
    const existingUser = currentActiveSessionUser(req);
    if (existingUser) {
      logAuthEvent('post_login_already_authenticated', { username: existingUser.username, role: existingUser.role });
      return res.redirect(getDefaultRouteByRole(existingUser.role));
    }

    logAuthEvent('post_login', { username: normalizedUsername });
    const user = findUserByUsername(normalizedUsername);
    logAuthEvent('user_lookup', { username: normalizedUsername, found: Boolean(user) });

    if (!user) {
      logAuthEvent('login_failed', { username: normalizedUsername, reason: 'invalid_credentials' });
      return renderLoginError(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', requestedPath);
    }

    const isActive = user.isActive !== false;
    logAuthEvent('user_active', { username: user.username, active: isActive });
    if (!isActive) {
      logAuthEvent('login_failed', { username: user.username, reason: 'inactive_account' });
      return renderLoginError(res, 403, 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ', requestedPath);
    }

    const isValid = await bcrypt.compare(String(password || ''), user.passwordHash);
    logAuthEvent('password_verify', { username: user.username, matched: isValid });
    if (!isValid) {
      logAuthEvent('login_failed', { username: user.username, reason: 'invalid_credentials' });
      return renderLoginError(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', requestedPath);
    }

    return req.session.regenerate((err) => {
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
      return req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[auth] session_save_failed');
          return renderLoginError(res, 500, 'ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลระบบ', requestedPath);
        }

        logAuthEvent('login_success', { username: user.username, role: user.role });
        return res.redirect(getPostLoginRoute(user.role, requestedPath));
      });
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const username = req.session && req.session.user ? req.session.user.username : null;
    await destroySession(req, res);
    logAuthEvent('logout_success', { username });
    return res.redirect('/login');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
