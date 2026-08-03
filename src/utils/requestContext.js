const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const requestStorage = new AsyncLocalStorage();

function currentRequestContext() {
  return requestStorage.getStore() || {};
}

function runWithRequestContext(context, callback) {
  return requestStorage.run(context || {}, callback);
}

function requestContextMiddleware(req, res, next) {
  const requestId = crypto.randomUUID();
  const route = String(req.path || req.originalUrl || '').split('?')[0];

  res.setHeader('X-Request-ID', requestId);
  runWithRequestContext({ requestId, route }, next);
}

module.exports = {
  currentRequestContext,
  requestContextMiddleware,
  runWithRequestContext
};
