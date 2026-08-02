const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildDepartmentTargetModel,
  TARGET_PERCENT
} = require('../src/services/executiveService');
const {
  buildDataQualitySummary,
  buildTargetPerformance
} = require('../src/services/executiveOverviewService');
const {
  buildDataQualityReport,
  mappingOverlaps
} = require('../src/services/dataQualityService');

function targetRow(name, overrides = {}) {
  return {
    display_depcode: name,
    display_name: name,
    service_group: 'Telemed',
    opd_source_deps: [name],
    telemed_count_deps: [name],
    telemed_mode: 'B2C_ONLY',
    target_percent: 50,
    opd_total: 100,
    telemed_total: 20,
    b2b_total: 0,
    b2c_total: 20,
    ...overrides
  };
}

function overviewFixture() {
  return {
    total: 20,
    disease: { dmOnly: 5, htOnly: 5, dmAndHt: 2, dmTotal: 7, htTotal: 7 },
    otherDiseaseVisits: 8,
    channel: { b2b: 0, b2c: 20, unclassified: 0, conflict: 0 },
    roomClassifiedTotal: 20,
    roomUnclassifiedTotal: 0,
    dataQuality: {
      channelTotalsMatch: true,
      roomTotalsMatch: true,
      topRoomTotalsMatch: true,
      diseaseTotalsValid: true,
      diseaseUnionMatches: true,
      averageMatches: true,
      multipleRoomSourceVisits: 0
    }
  };
}

test('30. Department target uses the configured per-room percentage', () => {
  const model = buildDepartmentTargetModel([targetRow('040', { target_percent: 40 })]);
  assert.equal(model.rows[0].target_50, 40);
  assert.equal(model.rows[0].target_percent, 40);
});

test('31. Department target has one bounded central default', () => {
  assert.ok(Number.isFinite(TARGET_PERCENT));
  assert.ok(TARGET_PERCENT >= 0 && TARGET_PERCENT <= 100);
});

test('32. No-data rooms are excluded from evaluable target performance', () => {
  const model = buildDepartmentTargetModel([targetRow('empty', { opd_total: 0, telemed_total: 0, b2c_total: 0 })]);
  const performance = buildTargetPerformance(model);
  assert.equal(performance.available, false);
  assert.equal(performance.noDataCount, 1);
});

test('33. Anomalous rooms remain auditable but do not count as performance', () => {
  const model = buildDepartmentTargetModel([targetRow('review', { opd_total: 0, telemed_total: 3, b2c_total: 3 })]);
  const performance = buildTargetPerformance(model);
  assert.equal(performance.available, false);
  assert.equal(performance.reviewCount, 1);
  assert.equal(performance.telemedTotal, 0);
});

test('34. Follow-up rooms are ranked by the largest shortage first', () => {
  const model = buildDepartmentTargetModel([
    targetRow('small-gap', { telemed_total: 45, b2c_total: 45 }),
    targetRow('large-gap', { telemed_total: 5, b2c_total: 5 })
  ]);
  const performance = buildTargetPerformance(model);
  assert.equal(performance.followUp[0].department, 'large-gap');
  assert.equal(performance.followUp[1].department, 'small-gap');
});

test('35. Mixed room targets remain explicit in the executive aggregate', () => {
  const model = buildDepartmentTargetModel([
    targetRow('forty', { target_percent: 40 }),
    targetRow('fifty', { target_percent: 50 })
  ]);
  const performance = buildTargetPerformance(model);
  assert.equal(performance.usesMixedTargets, true);
  assert.equal(performance.targetPercent, null);
  assert.equal(performance.targetTotal, 90);
});

test('36. Data-quality summary reports review state without patient identifiers', () => {
  const overview = overviewFixture();
  overview.channel.unclassified = 1;
  const performance = buildTargetPerformance(buildDepartmentTargetModel([targetRow('room')]));
  const summary = buildDataQualitySummary(overview, performance);
  assert.equal(summary.status, 'review');
  assert.ok(summary.issueCount > 0);
  assert.ok(summary.categories.length > 0);
  assert.ok(summary.impacts.length > 0);
  assert.doesNotMatch(JSON.stringify(summary), /\b(?:HN|VN|CID)\d+/i);
});

test('37. Admin data-quality report reconciles aggregate evidence only', () => {
  const overview = overviewFixture();
  const target = buildDepartmentTargetModel([targetRow('room')]);
  const report = buildDataQualityReport(overview, target, { startDate: '2026-01-01', endDate: '2026-01-31' });
  assert.ok(report.checks.length >= 10);
  assert.equal(report.checks.find((item) => item.id === 'query_guard').status, 'pass');
  assert.doesNotMatch(JSON.stringify(report), /passwordHash|patient-secret/i);
});

test('38. Mapping overlap audit uses the central department mapping', () => {
  const overlaps = mappingOverlaps('opd_source_deps');
  assert.ok(Array.isArray(overlaps));
  assert.ok(overlaps.every((item) => item.code && item.names.length > 1));
});

test('39. Executive overview keeps four focused KPI cards', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  const overview = view.split('data-exec-panel="department-target"')[0];
  const cards = overview.match(/<article class="executive-primary-kpi(?:\s|\")/g) || [];
  assert.equal(cards.length, 4);
});

test('40. Executive overview presents one primary chart and links detailed quality checks to Admin', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  const overview = view.split('data-exec-panel="department-target"')[0];
  const canvases = overview.match(/<canvas\b/g) || [];
  assert.equal(canvases.length, 1);
  assert.match(overview, /\/admin\/data-quality/);
});

test('41. Total target shortage is the sum of per-room shortages without excess offset', () => {
  const model = buildDepartmentTargetModel([
    targetRow('excess-room', { opd_total: 100, telemed_total: 70, b2c_total: 70 }),
    targetRow('short-room', { opd_total: 100, telemed_total: 10, b2c_total: 10 })
  ]);
  const performance = buildTargetPerformance(model);

  assert.equal(performance.targetTotal, 100);
  assert.equal(performance.telemedTotal, 80);
  assert.equal(performance.netGap, -20);
  assert.equal(performance.shortage, 40);
  assert.equal(performance.excess, 20);
  assert.equal(performance.gap, -40);
  assert.equal(model.summary.shortage_total, 40);
  assert.equal(model.summary.excess_total, 20);
  assert.equal(model.summary.net_diff_from_target, -20);
  assert.equal(model.summary.diff_from_target, -40);
});

test('42. Target aggregates exclude no-data and anomalous rows from evaluable totals', () => {
  const model = buildDepartmentTargetModel([
    targetRow('valid-room', { opd_total: 100, telemed_total: 25, b2c_total: 25 }),
    targetRow('empty-room', { opd_total: 0, telemed_total: 0, b2c_total: 0 }),
    targetRow('review-room', { opd_total: 0, telemed_total: 9, b2c_total: 9 })
  ]);

  assert.equal(model.summary.opd_total, 100);
  assert.equal(model.summary.telemed_total, 25);
  assert.equal(model.summary.target_50_total, 50);
  assert.equal(model.summary.evaluable_department_count, 1);
  assert.equal(model.summary.no_data_count, 1);
  assert.equal(model.summary.data_check_count, 1);
});

test('43. Executive KPI and target progress copy keeps hospital and evaluable scopes explicit', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  assert.match(view, /OPD ห้องที่ประเมิน/);
  assert.match(view, /Telemedicine ที่ใช้ประเมิน/);
  assert.match(view, /สัดส่วน Telemedicine ต่อ OPD/);
  assert.match(view, /Telemedicine ทั้งโรงพยาบาล/);
  assert.match(view, /ผลเทียบเป้าหมายรายห้อง/);
  assert.match(view, /ทำได้ <%= targetProgressRaw\.toFixed\(1\) %>% ของเป้าหมาย/);
  assert.match(view, /ยังขาดจากเป้าหมาย/);
});

test('44. Executive trend keeps daily bars, monthly lines, null gaps, and active-day average', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'executive.js'), 'utf8');
  assert.match(script, /type: isDailyTrend \? 'bar' : 'line'/);
  assert.match(script, /row\.isServiceDay === false \? null : row\.total/);
  assert.match(script, /averagePerServiceDay/);
  assert.match(script, /spanGaps: false/);
  assert.match(script, /trendPeakLabelPlugin/);
  assert.match(script, /return '#0f766e'/);
});

test('45. Executive overview follows target progress, trend/follow-up, insight, details, and quality order', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  const overview = view.split('data-exec-panel="department-target"')[0];
  const markers = [
    'executive-target-progress',
    'แนวโน้มบริการ Telemedicine',
    '5 ห้องที่ควรเร่งติดตาม',
    'สรุปเพื่อการตัดสินใจ',
    'executive-summary-lines',
    '<summary aria-expanded="false">ข้อมูลเพิ่มเติม</summary>',
    'executive-secondary-strip',
    'executive-quality-summary'
  ];
  let previousIndex = -1;
  markers.forEach((marker) => {
    const index = overview.indexOf(marker);
    assert.ok(index > previousIndex, `${marker} must follow the preceding executive section`);
    previousIndex = index;
  });
});

test('47. Executive overview keeps compact decision insight, follow-up ranking, and an eight-item support grid', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'executive.js'), 'utf8');
  const overview = view.split('data-exec-panel="department-target"')[0];
  const support = overview.split('class="executive-secondary-strip"')[1].split('</section>')[0];
  assert.match(overview, /class="executive-summary-lines"/);
  assert.doesNotMatch(overview, /class="executive-followup-columns"/);
  assert.match(overview, /class="executive-followup-content"/);
  assert.match(overview, /aria-valuenow=/);
  assert.match(overview, /Telemedicine ทั้งโรงพยาบาล/);
  assert.match(overview, /ห้องที่นำมาประเมิน/);
  assert.match(overview, /ควรเร่งติดตาม/);
  assert.equal((support.match(/<div/g) || []).length, 8);
  assert.match(script, /บริการ Telemedicine รายวัน/);
  assert.match(script, /บริการ Telemedicine รายสัปดาห์/);
});

test('46. Executive overview provides loading, empty, and error states without fabricating zero KPIs', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'executive', 'dashboard.ejs'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'executive.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
  assert.match(view, /executive-state-panel error/);
  assert.match(view, /executive-state-panel empty/);
  assert.match(view, /else if \(metrics\.total === 0\)/);
  assert.match(script, /panel\.classList\.add\('is-loading'\)/);
  assert.match(styles, /\.tab-panel\.is-loading/);
});
