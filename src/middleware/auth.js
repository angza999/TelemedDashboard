const { findUserById } = require('../config/users');
const { clearSessionCookie } = require('../config/session');

const logAuthEvents = String(process.env.LOG_AUTH_EVENTS || '').trim().toLowerCase() === 'true';

function logSessionMissing(req, reason) {
  if (!logAuthEvents) return;
  console.info('[auth] session_missing', { path: req.originalUrl, reason });
}

function redirectToLogin(req, res, reason) {
  logSessionMissing(req, reason);
  const redirect = () => {
    clearSessionCookie(res);
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  };

  if (!req.session) return redirect();
  return req.session.destroy(() => redirect());
}

function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return redirectToLogin(req, res, 'missing');
  }

  const storedUser = findUserById(req.session.user.id);
  if (!storedUser || storedUser.isActive === false) {
    return redirectToLogin(req, res, storedUser ? 'inactive' : 'not_found');
  }

  if (storedUser.role !== req.session.user.role || storedUser.username !== req.session.user.username || storedUser.name !== req.session.user.name) {
    req.session.user = {
      id: storedUser.id,
      username: storedUser.username,
      name: storedUser.name,
      role: storedUser.role
    };
  }

  return next();
}

function ensureRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const role = req.session.user ? req.session.user.role : null;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).render('errors/403', { title: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    return next();
  };
}

module.exports = { ensureAuth, ensureRole };
