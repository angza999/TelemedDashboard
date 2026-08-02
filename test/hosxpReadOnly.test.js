const assert = require('node:assert/strict');
const test = require('node:test');

const {
  READ_ONLY_ERROR_CODE,
  assertReadOnlySql,
  protectHOSxPPool
} = require('../src/utils/hosxpReadOnly');

function assertRejected(sql) {
  assert.throws(
    () => assertReadOnlySql(sql),
    (error) => error && error.code === READ_ONLY_ERROR_CODE
  );
}

test('HOSxP guard allows reporting commands', () => {
  assert.equal(assertReadOnlySql('SELECT 1').command, 'SELECT');
  assert.equal(assertReadOnlySql('SHOW TABLES').command, 'SHOW');
  assert.equal(assertReadOnlySql('DESCRIBE ovst').command, 'DESCRIBE');
  assert.equal(assertReadOnlySql('EXPLAIN SELECT * FROM ovst').command, 'EXPLAIN');
  assert.equal(assertReadOnlySql('/* dashboard */ SELECT 1;').command, 'SELECT');
});

test('HOSxP guard rejects write and administrative commands', () => {
  [
    'INSERT INTO audit_log VALUES (1)',
    'UPDATE ovst SET hn = 1',
    'DELETE FROM ovst',
    'REPLACE INTO ovst VALUES (1)',
    'CREATE TABLE dashboard_cache (id INT)',
    'ALTER TABLE ovst ADD COLUMN x INT',
    'DROP TABLE ovst',
    'TRUNCATE TABLE ovst',
    'RENAME TABLE ovst TO ovst_old',
    'GRANT SELECT ON hos.* TO user',
    'REVOKE SELECT ON hos.* FROM user',
    'CALL write_patient_data()',
    "LOAD DATA INFILE 'x.csv' INTO TABLE ovst"
  ].forEach(assertRejected);
});

test('HOSxP guard rejects multiple statements and SELECT side effects', () => {
  assertRejected('SELECT 1; DELETE FROM ovst');
  assertRejected('SELECT 1;;');
  assertRejected("SELECT * FROM ovst INTO OUTFILE '/tmp/ovst.csv'");
  assertRejected('SELECT * FROM ovst FOR UPDATE');
  assertRejected('EXPLAIN DELETE FROM ovst');
});

test('HOSxP guard ignores semicolons and keywords inside literals or comments', () => {
  assert.equal(assertReadOnlySql("SELECT 'DELETE; UPDATE' AS note").command, 'SELECT');
  assert.equal(assertReadOnlySql('SELECT 1 /* ; DELETE FROM ovst */').command, 'SELECT');
  assert.equal(assertReadOnlySql('SELECT 1 -- DELETE FROM ovst\n').command, 'SELECT');
});

test('protected pool validates before dispatch and logs no SQL or parameters', async () => {
  const calls = [];
  const logs = [];
  const pool = {
    execute: async (sql, values) => {
      calls.push({ sql, values });
      return [[{ ok: 1 }], []];
    },
    query: async (sql, values) => {
      calls.push({ sql, values });
      return [[], []];
    }
  };
  const guarded = protectHOSxPPool(pool, { logger: (line) => logs.push(line) });

  await guarded.execute('SELECT ? AS ok', ['patient-secret']);
  assert.equal(calls.length, 1);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /"command":"SELECT"/);
  assert.doesNotMatch(logs[0], /patient-secret|SELECT \?/);

  await assert.rejects(
    guarded.query('DELETE FROM ovst'),
    (error) => error && error.code === READ_ONLY_ERROR_CODE
  );
  assert.equal(calls.length, 1);
});
