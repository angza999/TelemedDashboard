function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
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
