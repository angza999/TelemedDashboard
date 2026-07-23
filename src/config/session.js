const SESSION_COOKIE_NAME = 'telemed.sid';

function isTrue(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function sessionMaxAgeMs() {
  const configured = Number(process.env.SESSION_MAX_AGE_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : 1000 * 60 * 60 * 8;
}

function useSecureCookies() {
  return process.env.NODE_ENV === 'production' && isTrue(process.env.USE_HTTPS);
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: useSecureCookies(),
    maxAge: sessionMaxAgeMs()
  };
}

function sessionCookieClearOptions() {
  const { maxAge, ...options } = sessionCookieOptions();
  return options;
}

function getDefaultRouteByRole(role) {
  if (role === 'admin' || role === 'executive') return '/today-patients';
  return '/telemed';
}

function isAllowedPostLoginPath(role, value) {
  const path = String(value || '').trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return false;

  if (role === 'admin') return true;
  if (role === 'executive') return /^\/(telemed|executive|today-patients)(?:[/?]|$)/.test(path);
  return /^\/telemed(?:[/?]|$)/.test(path);
}

function getPostLoginRoute(role, requestedPath) {
  return isAllowedPostLoginPath(role, requestedPath)
    ? requestedPath
    : getDefaultRouteByRole(role);
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieClearOptions());
}

module.exports = {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  getDefaultRouteByRole,
  getPostLoginRoute,
  sessionCookieOptions,
  useSecureCookies
};
