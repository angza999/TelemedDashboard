function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return next();
}

function ensureRole(roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403', { title: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    return next();
  };
}

module.exports = { ensureAuth, ensureRole };
