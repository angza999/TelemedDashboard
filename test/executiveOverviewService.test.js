const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXECUTIVE_VISIT_QUERY,
  aggregateExecutiveOverview,
  buildExecutiveMetrics,
  previousPeriodFilters
} = require('../src/services/executiveOverviewService');
const {
  formatThaiDate,
  formatThaiDateList,
  formatThaiDateRange,
  formatThaiMonth,
  formatThaiShortDate
} = require('../src/utils/thaiDate');

const FILTERS = {
  startDate: '2026-01-01',
  endDate: '2026-01-03',
  granularity: 'day'
};

function visit(vn, overrides = {}) {
  return {
    vn,
    hn: `HN${vn}`,
    vstdate: '2026-01-01',
    depcode: '001',
    department: 'ห้องตรวจทั่วไป',
    source_room_count: 1,
    source_row_count: 1,
    is_dm: 0,
    is_ht: 0,
    has_b2b_marker: 0,
    has_b2c_marker: 0,
    ...overrides
  };
}

test('1. DM-only visit is counted once in total and DM-only', () => {
  const model = aggregateExecutiveOverview([visit('1', { is_dm: 1 })], FILTERS);
  assert.equal(model.total, 1);
  assert.equal(model.disease.dmTotal, 1);
  assert.equal(model.disease.dmOnly, 1);
  assert.equal(model.disease.htTotal, 0);
});

test('2. HT-only visit is counted once in total and HT-only', () => {
  const model = aggregateExecutiveOverview([visit('1', { is_ht: 1 })], FILTERS);
  assert.equal(model.total, 1);
  assert.equal(model.disease.htTotal, 1);
  assert.equal(model.disease.htOnly, 1);
  assert.equal(model.disease.dmTotal, 0);
});

test('3. DM and HT overlap remains one Telemed visit', () => {
  const model = aggregateExecutiveOverview([visit('1', { is_dm: 1, is_ht: 1 })], FILTERS);
  assert.equal(model.total, 1);
  assert.equal(model.disease.dmTotal, 1);
  assert.equal(model.disease.htTotal, 1);
  assert.equal(model.disease.dmAndHt, 1);
  assert.equal(model.disease.dmOrHtDistinct, 1);
});

test('4. Non-DM/HT visit is retained and reconciled as other disease', () => {
  const model = aggregateExecutiveOverview([visit('1', { has_b2c_marker: 1 })], FILTERS);
  assert.equal(model.total, 1);
  assert.equal(model.otherDiseaseVisits, 1);
  assert.equal(model.dataQuality.diseaseUnionMatches, true);
});

test('5. Complete channel data can truthfully contain zero B2B', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { has_b2c_marker: 1 }),
    visit('2', { has_b2c_marker: 1 })
  ], FILTERS);
  const metrics = buildExecutiveMetrics(model, aggregateExecutiveOverview([], FILTERS), FILTERS);
  assert.equal(model.channel.b2b, 0);
  assert.equal(model.channel.b2c, model.total);
  assert.equal(model.channel.dataComplete, true);
  assert.equal(metrics.b2cPercent, 100);
});

test('6. B2B marker classifies independently from disease', () => {
  const model = aggregateExecutiveOverview([visit('1', { has_b2b_marker: 1 })], FILTERS);
  assert.equal(model.channel.b2b, 1);
  assert.equal(model.channel.b2c, 0);
  assert.equal(model.disease.dmOrHtDistinct, 0);
});

test('7. Missing channel marker is unclassified, not implicit B2C', () => {
  const model = aggregateExecutiveOverview([visit('1')], FILTERS);
  assert.equal(model.channel.unclassified, 1);
  assert.equal(model.channel.b2c, 0);
  assert.equal(model.channel.dataComplete, false);
});

test('8. Conflicting B2B and B2C markers are isolated', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { has_b2b_marker: 1, has_b2c_marker: 1 })
  ], FILTERS);
  assert.equal(model.channel.conflict, 1);
  assert.equal(model.channel.b2b, 0);
  assert.equal(model.channel.b2c, 0);
});

test('9. A single highest service day is retained', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-02' }),
    visit('3', { vstdate: '2026-01-02' })
  ], FILTERS);
  assert.deepEqual(model.dataQuality.highestDates, ['2026-01-02']);
  assert.equal(model.highestDay.total, 2);
  assert.equal(model.highestDay.count, 1);
});

test('10. Tied highest service days are all retained', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-01' }),
    visit('3', { vstdate: '2026-01-03' }),
    visit('4', { vstdate: '2026-01-03' })
  ], FILTERS);
  assert.deepEqual(model.dataQuality.highestDates, ['2026-01-01', '2026-01-03']);
  assert.equal(model.highestDay.total, 2);
  assert.equal(model.highestDay.count, 2);
});

test('11. Tied lowest service days exclude calendar gaps', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-03' })
  ], FILTERS);
  assert.deepEqual(model.dataQuality.lowestDates, ['2026-01-01', '2026-01-03']);
  assert.equal(model.lowestServiceDay.total, 1);
  assert.equal(model.lowestServiceDay.count, 2);
});

test('12. No-service day is present in timeline as null, not zero', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-03' })
  ], FILTERS);
  assert.equal(model.trend.length, 3);
  assert.deepEqual(model.trend.map((row) => row.total), [1, null, 1]);
  assert.equal(model.trend[1].isServiceDay, false);
  assert.equal(model.dataQuality.activeServiceDays, 2);
  assert.equal(model.dataQuality.calendarDays, 3);
  assert.equal(model.averagePerServiceDay, 1);
});

test('13. Empty period returns safe values and null timeline points', () => {
  const model = aggregateExecutiveOverview([], FILTERS);
  const metrics = buildExecutiveMetrics(model, model, FILTERS);
  assert.equal(model.total, 0);
  assert.equal(model.averagePerServiceDay, 0);
  assert.deepEqual(model.trend.map((row) => row.total), [null, null, null]);
  assert.equal(model.dataQuality.highestDates.length, 0);
  assert.equal(metrics.previousChangePercent, null);
  assert.equal(Number.isFinite(metrics.dmPercent), true);
  assert.equal(Number.isFinite(metrics.b2cPercent), true);
});

test('14. Duplicate VN with multiple-room evidence does not duplicate totals', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { depcode: '001', department: 'A', is_dm: 1 }),
    visit('1', { depcode: '002', department: 'B', is_ht: 1 })
  ], FILTERS);
  assert.equal(model.total, 1);
  assert.equal(model.disease.dmAndHt, 1);
  assert.equal(model.roomClassifiedTotal, 1);
  assert.equal(model.dataQuality.roomConflictVisits, 1);
  assert.equal(model.dataQuality.multipleRoomSourceVisits, 1);
  assert.equal(model.dataQuality.roomTotalsMatch, true);
});

test('15. Missing main department is kept separate from classified room ranking', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { depcode: '', department: '' }),
    visit('2', { depcode: '001', department: 'A' })
  ], FILTERS);
  assert.equal(model.roomClassifiedTotal, 1);
  assert.equal(model.roomUnclassifiedTotal, 1);
  assert.equal(model.topFiveTelemedTotal, 1);
  assert.equal(model.dataQuality.roomTotalsMatch, true);
});

test('16. Top five, other rooms, and unclassified rooms reconcile to total', () => {
  const rows = [
    visit('1', { depcode: '001', department: 'A' }),
    visit('2', { depcode: '002', department: 'B' }),
    visit('3', { depcode: '003', department: 'C' }),
    visit('4', { depcode: '004', department: 'D' }),
    visit('5', { depcode: '005', department: 'E' }),
    visit('6', { depcode: '006', department: 'F' }),
    visit('7', { depcode: '', department: '' })
  ];
  const model = aggregateExecutiveOverview(rows, FILTERS);
  assert.equal(model.topFiveTelemedTotal, 5);
  assert.equal(model.otherTelemedTotal, 1);
  assert.equal(model.roomUnclassifiedTotal, 1);
  assert.equal(model.topFiveTelemedTotal + model.otherTelemedTotal + model.roomUnclassifiedTotal, model.total);
  assert.equal(model.dataQuality.topRoomTotalsMatch, true);
  assert.equal(model.dataQuality.roomTotalsMatch, true);
});

test('17. Previous period has the same inclusive day count and zero baseline is explicit', () => {
  assert.deepEqual(previousPeriodFilters(FILTERS), {
    ...FILTERS,
    startDate: '2025-12-29',
    endDate: '2025-12-31'
  });
  const current = aggregateExecutiveOverview([visit('1')], FILTERS);
  const previous = aggregateExecutiveOverview([], previousPeriodFilters(FILTERS));
  const metrics = buildExecutiveMetrics(current, previous, FILTERS);
  assert.equal(metrics.previousChangeAmount, 1);
  assert.equal(metrics.previousChangePercent, null);
});

test('18. Channel partition, disease union, averages, and query safety hold', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { has_b2b_marker: 1, is_dm: 1 }),
    visit('2', { has_b2c_marker: 1, is_ht: 1 }),
    visit('3'),
    visit('4', { has_b2b_marker: 1, has_b2c_marker: 1 })
  ], FILTERS);
  assert.equal(
    model.channel.b2b + model.channel.b2c + model.channel.unclassified + model.channel.conflict,
    model.total
  );
  assert.equal(model.dataQuality.channelTotalsMatch, true);
  assert.equal(model.dataQuality.diseaseTotalsValid, true);
  assert.equal(model.dataQuality.diseaseUnionMatches, true);
  assert.equal(model.dataQuality.averageMatches, true);
  assert.equal(model.dataQuality.topRoomTotalsMatch, true);
  assert.equal((EXECUTIVE_VISIT_QUERY.match(/\?/g) || []).length, 2);
  assert.match(EXECUTIVE_VISIT_QUERY, /^\s*SELECT\b/i);
  assert.doesNotMatch(EXECUTIVE_VISIT_QUERY, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE)\b/i);
});

test('19. Continuous service days retain actual totals and the active-day average', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-02' }),
    visit('3', { vstdate: '2026-01-02' }),
    visit('4', { vstdate: '2026-01-03' })
  ], FILTERS);
  assert.deepEqual(model.trend.map((row) => row.total), [1, 2, 1]);
  assert.equal(model.dataQuality.activeServiceDays, 3);
  assert.equal(model.averagePerServiceDay, 4 / 3);
});

test('20. A single lowest service day is retained independently from calendar gaps', () => {
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-02' }),
    visit('3', { vstdate: '2026-01-02' })
  ], FILTERS);
  assert.deepEqual(model.extremes.lowest, { value: 1, dates: ['2026-01-01'], count: 1 });
  assert.equal(model.lowestServiceDay.dateSummary, '1 มกราคม 2569');
});

test('21. Thai date helpers format single dates, ranges, tied dates, months, and Buddhist year crossings', () => {
  assert.equal(formatThaiDate('2026-07-23'), '23 กรกฎาคม 2569');
  assert.equal(formatThaiShortDate('2026-07-03'), '03 ก.ค. 2569');
  assert.equal(formatThaiDateRange('2026-07-02', '2026-08-01'), '2 กรกฎาคม – 1 สิงหาคม 2569');
  assert.equal(formatThaiDateRange('2026-12-25', '2027-01-05'), '25 ธันวาคม 2569 – 5 มกราคม 2570');
  assert.equal(formatThaiDateList(['2026-07-23', '2026-07-25']), '23 และ 25 กรกฎาคม 2569');
  assert.equal(formatThaiMonth('2026-07'), 'กรกฎาคม 2569');
});

test('22. Overview metrics reuse one average and expose Thai current/previous period labels', () => {
  const current = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-03' })
  ], FILTERS);
  const metrics = buildExecutiveMetrics(current, aggregateExecutiveOverview([], FILTERS), FILTERS);
  assert.equal(metrics.averagePerDay, current.averagePerServiceDay);
  assert.equal(metrics.averagePerTrendPeriod, current.averagePerServiceDay);
  assert.equal(metrics.periodLabel, '1 – 3 มกราคม 2569');
  assert.equal(metrics.previousPeriodLabel, '29 – 31 ธันวาคม 2568');
  assert.equal(metrics.startDateLabel, '01 ม.ค. 2569');
  assert.equal(metrics.endDateLabel, '03 ม.ค. 2569');
});

test('23. Trend chart keeps visit gaps but renders a continuous average dataset', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'executive.js'), 'utf8');
  assert.match(source, /row\.isServiceDay === false \? null : row\.total/);
  assert.match(source, /data: trend\.map\(\(\) => payload\.metrics\.total > 0 \? averagePerServiceDay : null\)/);
  assert.match(source, /label: 'เฉลี่ยต่อวันให้บริการ'[\s\S]*?spanGaps: true/);
});

test('24. Incomplete channel data never qualifies for the B2C target', () => {
  const current = aggregateExecutiveOverview([
    visit('1', { has_b2c_marker: 1 }),
    visit('2')
  ], FILTERS);
  const metrics = buildExecutiveMetrics(current, aggregateExecutiveOverview([], FILTERS), FILTERS);
  assert.equal(metrics.channelDataComplete, false);
  assert.equal(metrics.b2cTargetMet, false);
});

test('25. Weekly trend groups existing daily visits without changing the query grain', () => {
  const weeklyFilters = { ...FILTERS, startDate: '2026-01-01', endDate: '2026-01-08', granularity: 'week' };
  const model = aggregateExecutiveOverview([
    visit('1', { vstdate: '2026-01-01' }),
    visit('2', { vstdate: '2026-01-04' }),
    visit('3', { vstdate: '2026-01-05' })
  ], weeklyFilters);

  assert.deepEqual(model.trend.map((row) => row.total), [2, 1]);
  assert.equal(model.trend[0].period, '2025-12-29');
  assert.equal(model.trend[1].period, '2026-01-05');
  assert.equal(model.total, 3);
});
