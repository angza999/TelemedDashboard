const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const configPath = path.join(dataDir, 'db-config.json');

let pool;
let poolKey;

function envConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hos',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10)
  };
}

function readSavedConfig() {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function getDbConfig() {
  return { ...envConfig(), ...(readSavedConfig() || {}) };
}

function publicDbConfig() {
  const config = getDbConfig();
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    connectionLimit: config.connectionLimit,
    hasPassword: Boolean(config.password)
  };
}

function normalizeConfig(input, current = getDbConfig()) {
  return {
    host: String(input.host || current.host || '127.0.0.1').trim(),
    port: Number(input.port || current.port || 3306),
    user: String(input.user || current.user || 'root').trim(),
    password: input.password === '' || input.password === undefined
      ? current.password || ''
      : String(input.password),
    database: String(input.database || current.database || 'hos').trim(),
    connectionLimit: Number(input.connectionLimit || current.connectionLimit || 10)
  };
}

function createPool(config) {
  return mysql.createPool({
    host: config.host,
    port: Number(config.port || 3306),
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: Number(config.connectionLimit || 10),
    dateStrings: true
  });
}

function getPool() {
  const config = getDbConfig();
  const nextKey = JSON.stringify(config);
  if (!pool || poolKey !== nextKey) {
    if (pool) pool.end().catch(() => {});
    pool = createPool(config);
    poolKey = nextKey;
  }
  return pool;
}

async function testConnection(input) {
  const config = normalizeConfig(input);
  const testPool = createPool(config);
  try {
    const [rows] = await testPool.execute('SELECT 1 AS ok');
    return rows[0] && rows[0].ok === 1;
  } finally {
    await testPool.end();
  }
}

async function saveDbConfig(input) {
  const config = normalizeConfig(input);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    poolKey = null;
  }
  return publicDbConfig();
}

module.exports = {
  getPool,
  getDbConfig,
  publicDbConfig,
  saveDbConfig,
  testConnection
};
