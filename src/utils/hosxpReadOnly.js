const ALLOWED_COMMANDS = new Set(['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN']);
const SIDE_EFFECT_PATTERN = /\b(?:INTO\s+(?:OUTFILE|DUMPFILE)|FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|GET_LOCK\s*\(|RELEASE_LOCK\s*\()/i;
const READ_ONLY_ERROR_CODE = 'HOSXP_READ_ONLY_VIOLATION';
const DEFAULT_SLOW_QUERY_MS = 1000;

const { currentRequestContext } = require('./requestContext');

function readOnlyError(message = 'HOSxP connection is read-only. Write operations are prohibited.') {
  const error = new Error(message);
  error.code = READ_ONLY_ERROR_CODE;
  error.status = 400;
  return error;
}

function scanSql(input) {
  const sql = String(input || '');
  let normalized = '';
  let codeOnly = '';
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let semicolonCount = 0;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (char === '\n' || char === '\r') {
        lineComment = false;
        normalized += char;
        codeOnly += char;
      } else {
        normalized += ' ';
        codeOnly += ' ';
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        normalized += '  ';
        codeOnly += '  ';
        index += 1;
      } else {
        normalized += char === '\n' || char === '\r' ? char : ' ';
        codeOnly += char === '\n' || char === '\r' ? char : ' ';
      }
      continue;
    }

    if (quote) {
      normalized += char;
      codeOnly += ' ';

      if (char === '\\' && next !== undefined) {
        normalized += next;
        codeOnly += ' ';
        index += 1;
        continue;
      }

      if (char === quote) {
        if (next === quote) {
          normalized += next;
          codeOnly += ' ';
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      normalized += '  ';
      codeOnly += '  ';
      index += 1;
      continue;
    }

    const mysqlDashComment = char === '-' && next === '-' && (sql[index + 2] === undefined || /\s/.test(sql[index + 2]));
    if (char === '#' || mysqlDashComment) {
      lineComment = true;
      normalized += mysqlDashComment ? '  ' : ' ';
      codeOnly += mysqlDashComment ? '  ' : ' ';
      if (mysqlDashComment) index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      normalized += char;
      codeOnly += ' ';
      continue;
    }

    if (char === ';') semicolonCount += 1;
    normalized += char;
    codeOnly += char;
  }

  return { normalized, codeOnly, semicolonCount };
}

function assertReadOnlySql(input) {
  const { normalized, codeOnly, semicolonCount } = scanSql(input);
  const sql = normalized.trim();
  const code = codeOnly.trim();
  if (!sql) throw readOnlyError('SQL is required.');

  if (semicolonCount > 1 || (semicolonCount === 1 && !/;\s*$/.test(sql))) {
    throw readOnlyError('HOSxP connection rejects multiple SQL statements.');
  }

  const command = (code.match(/^([A-Za-z]+)/) || [])[1];
  const normalizedCommand = String(command || '').toUpperCase();
  if (!ALLOWED_COMMANDS.has(normalizedCommand)) throw readOnlyError();

  if (normalizedCommand === 'EXPLAIN'
    && !/^EXPLAIN(?:\s+FORMAT\s*=\s*(?:JSON|TREE|TRADITIONAL))?\s+SELECT\b/i.test(code)) {
    throw readOnlyError('HOSxP connection allows EXPLAIN SELECT only.');
  }

  if (SIDE_EFFECT_PATTERN.test(code)) throw readOnlyError();

  return {
    command: normalizedCommand,
    sql
  };
}

function booleanSetting(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function safeQueryName(value) {
  const name = String(value || 'unnamed_read').trim().replace(/[^a-zA-Z0-9_.:-]/g, '_');
  return name.slice(0, 80) || 'unnamed_read';
}

function resultRowCount(result) {
  const rows = Array.isArray(result) ? result[0] : null;
  return Array.isArray(rows) ? rows.length : 0;
}

function elapsedMs(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

function logReadOnlyQuery(details, logger = console.info) {
  logger(JSON.stringify({
    event: details.event || 'hosxp_read',
    level: details.level || 'debug',
    command: details.command,
    queryName: safeQueryName(details.queryName),
    durationMs: Number(details.durationMs.toFixed(1)),
    rows: Number(details.rows || 0),
    ...(details.requestId ? { requestId: details.requestId } : {}),
    ...(details.route ? { route: details.route } : {}),
    ...(details.errorCode ? { errorCode: String(details.errorCode).slice(0, 80) } : {}),
    atUtc: new Date().toISOString()
  }));
}

function protectHOSxPPool(pool, options = {}) {
  const logger = options.logger || console.info;
  const loggingEnabled = options.log !== undefined
    ? Boolean(options.log)
    : (Boolean(options.logger) || booleanSetting(process.env.LOG_HOSXP_READS, process.env.NODE_ENV !== 'production'));
  const configuredSlowQueryMs = Number(options.slowQueryMs ?? process.env.HOSXP_SLOW_QUERY_MS);
  const slowQueryMs = Number.isFinite(configuredSlowQueryMs) && configuredSlowQueryMs >= 0
    ? configuredSlowQueryMs
    : DEFAULT_SLOW_QUERY_MS;

  const run = (method, defaultQueryName) => async (sql, values, queryName = defaultQueryName) => {
    const validation = assertReadOnlySql(sql);
    const startedAt = process.hrtime.bigint();
    const context = currentRequestContext();

    try {
      const result = await pool[method](sql, values);
      const durationMs = elapsedMs(startedAt);
      const isSlow = durationMs >= slowQueryMs;
      if (loggingEnabled || isSlow) {
        logReadOnlyQuery({
          command: validation.command,
          queryName,
          durationMs,
          rows: resultRowCount(result),
          requestId: context.requestId,
          route: context.route,
          level: isSlow ? 'slow' : 'debug'
        }, logger);
      }
      return result;
    } catch (error) {
      logReadOnlyQuery({
        event: 'hosxp_read_error',
        level: 'error',
        command: validation.command,
        queryName,
        durationMs: elapsedMs(startedAt),
        rows: 0,
        requestId: context.requestId,
        route: context.route,
        errorCode: error && error.code ? error.code : 'HOSXP_QUERY_ERROR'
      }, logger);
      throw error;
    }
  };

  return {
    execute: run('execute', 'unnamed_execute'),
    query: run('query', 'unnamed_query'),
    executeNamed: (queryName, sql, values) => run('execute', queryName)(sql, values, queryName),
    queryNamed: (queryName, sql, values) => run('query', queryName)(sql, values, queryName)
  };
}

module.exports = {
  ALLOWED_COMMANDS,
  DEFAULT_SLOW_QUERY_MS,
  READ_ONLY_ERROR_CODE,
  assertReadOnlySql,
  logReadOnlyQuery,
  protectHOSxPPool,
  safeQueryName,
  scanSql
};
