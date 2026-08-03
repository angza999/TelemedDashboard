const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTargetCountBatch,
  fetchDepartmentTargetDataWithPool
} = require('../src/services/executiveService');

const filters = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  depcode: 'all',
  serviceGroup: 'all',
  status: 'all',
  sortBy: 'target_gap'
};

const targets = [
  {
    display_depcode: '100',
    display_name: 'ห้อง A',
    service_group: 'Telemed',
    opd_source_deps: ['001'],
    telemed_count_deps: ['001', '100'],
    telemed_mode: 'B2C_ONLY',
    target_percent: 50
  },
  {
    display_depcode: '200',
    display_name: 'ห้อง B',
    service_group: 'Telemed',
    opd_source_deps: ['002'],
    telemed_count_deps: ['200'],
    telemed_mode: 'B2B_ONLY',
    target_percent: 50
  }
];

test('department targets are sent as one parameterized read batch', async () => {
  const batch = buildTargetCountBatch(filters, targets);
  assert.equal((batch.sql.match(/UNION ALL/g) || []).length, 1);
  assert.equal((batch.sql.match(/SELECT COUNT\(DISTINCT v\.vn\)/g) || []).length, 2);
  assert.equal((batch.sql.match(/SELECT COUNT\(DISTINCT o\.vn\)/g) || []).length, 2);
  assert.doesNotMatch(batch.sql, /2026-07-01|2026-07-31/);
  assert.ok(batch.values.includes(filters.startDate));
  assert.ok(batch.values.includes(filters.endDate));

  const calls = [];
  const pool = {
    executeNamed: async (queryName, sql, values) => {
      calls.push({ queryName, sql, values });
      return [[
        { target_index: 0, opd_total: 100, telemed_total: 40 },
        { target_index: 1, opd_total: 20, telemed_total: 12 }
      ], []];
    }
  };

  const model = await fetchDepartmentTargetDataWithPool(pool, filters, targets);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].queryName, 'executive_department_targets');
  assert.equal(model.allRows.length, 2);
  assert.equal(model.allRows[0].opd_total, 100);
  assert.equal(model.allRows[0].b2c_total, 40);
  assert.equal(model.allRows[1].b2b_total, 12);
  assert.equal(model.summary.opd_total, 120);
  assert.equal(model.summary.telemed_total, 52);
  assert.equal(model.summary.target_50_total, 60);
});
