const ALLOWED_COMMANDS = new Set(['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN']);
const SIDE_EFFECT_PATTERN = /\b(?:INTO\s+(?:OUTFILE|DUMPFILE)|FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|GET_LOCK\s*\(|RELEASE_LOCK\s*\()/i;
const READ_ONLY_ERROR_CODE = 'HOSXP_READ_ONLY_VIOLATION';

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

function logReadOnlyQuery(command, logger = console.info, enabled = true) {
  if (!enabled) return;
  logger(JSON.stringify({
    event: 'hosxp_read',
    command,
    at: new Date().toISOString()
  }));
}

function protectHOSxPPool(pool, options = {}) {
  const logger = options.logger || console.info;
  const loggingEnabled = options.log !== undefined
    ? Boolean(options.log)
    : (Boolean(options.logger) || String(process.env.LOG_HOSXP_READS || 'true').trim().toLowerCase() !== 'false');
  const run = (method) => async (sql, values) => {
    const validation = assertReadOnlySql(sql);
    logReadOnlyQuery(validation.command, logger, loggingEnabled);
    return pool[method](sql, values);
  };

  return {
    execute: run('execute'),
    query: run('query')
  };
}

module.exports = {
  ALLOWED_COMMANDS,
  READ_ONLY_ERROR_CODE,
  assertReadOnlySql,
  protectHOSxPPool,
  scanSql
};
