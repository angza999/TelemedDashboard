const { DEPARTMENT_TARGETS } = require('../config/departmentTargets');
const { fetchDepartmentTargetData } = require('./executiveService');
const { fetchExecutiveOverview } = require('./executiveOverviewService');

function result(id, label, status, evidence, recommendation = '') {
  return { id, label, status, evidence, recommendation };
}

function mappingOverlaps(field) {
  const owners = new Map();
  for (const target of DEPARTMENT_TARGETS.filter((item) => item.is_active !== false)) {
    for (const code of target[field] || []) {
      const key = String(code);
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(target.display_name);
    }
  }
  return Array.from(owners.entries())
    .filter(([, names]) => names.length > 1)
    .map(([code, names]) => ({ code, names }));
}

function buildDataQualityReport(overview, target, filters = {}) {
  const overviewQuality = overview.dataQuality || {};
  const targetAnomalies = (target.allRows || target.rows || []).filter((row) => row.is_data_anomaly);
  const noDataTargets = (target.allRows || target.rows || []).filter((row) => row.is_no_data);
  const opdOverlaps = mappingOverlaps('opd_source_deps');
  const telemedOverlaps = mappingOverlaps('telemed_count_deps');
  const checks = [
    result('query_guard', 'Query Guard ของ HOSxP', 'pass', 'อนุญาตเฉพาะ SELECT, SHOW, DESCRIBE และ EXPLAIN SELECT'),
    result(
      'channel_partition',
      'สมการช่องทางบริการ',
      overviewQuality.channelTotalsMatch ? 'pass' : 'review',
      `B2B ${Number(overview.channel.b2b || 0).toLocaleString('th-TH')} + B2C ${Number(overview.channel.b2c || 0).toLocaleString('th-TH')} + ไม่ระบุ ${Number(overview.channel.unclassified || 0).toLocaleString('th-TH')} + ขัดแย้ง ${Number(overview.channel.conflict || 0).toLocaleString('th-TH')} = Telemed ${Number(overview.total || 0).toLocaleString('th-TH')}`
    ),
    result(
      'disease_partition',
      'สมการกลุ่มโรค',
      overviewQuality.diseaseUnionMatches ? 'pass' : 'review',
      `DM อย่างเดียว ${Number(overview.disease.dmOnly || 0).toLocaleString('th-TH')} + HT อย่างเดียว ${Number(overview.disease.htOnly || 0).toLocaleString('th-TH')} + ซ้อนกัน ${Number(overview.disease.dmAndHt || 0).toLocaleString('th-TH')} + กลุ่มอื่น ${Number(overview.otherDiseaseVisits || 0).toLocaleString('th-TH')}`
    ),
    result(
      'room_reconciliation',
      'ยอดห้องบริการหลัก',
      overviewQuality.roomTotalsMatch ? 'pass' : 'review',
      `จัดกลุ่มได้ ${Number(overview.roomClassifiedTotal || 0).toLocaleString('th-TH')} ครั้ง · จัดกลุ่มไม่ได้ ${Number(overview.roomUnclassifiedTotal || 0).toLocaleString('th-TH')} ครั้ง · รวม ${Number(overview.total || 0).toLocaleString('th-TH')} ครั้ง`
    ),
    result(
      'channel_unclassified',
      'ช่องทางที่ยังจัดกลุ่มไม่ได้',
      Number(overview.channel.unclassified || 0) > 0 ? 'warning' : 'pass',
      `${Number(overview.channel.unclassified || 0).toLocaleString('th-TH')} ครั้ง`,
      'ตรวจ Mapping คำระบุ B2B/B2C ของ WebApp โดยไม่แก้ข้อมูล HOSxP'
    ),
    result(
      'channel_conflict',
      'ช่องทาง B2B/B2C ขัดแย้ง',
      Number(overview.channel.conflict || 0) > 0 ? 'review' : 'pass',
      `${Number(overview.channel.conflict || 0).toLocaleString('th-TH')} ครั้ง`,
      'ตรวจรายการที่พบ marker ทั้ง B2B และ B2C'
    ),
    result(
      'room_unclassified',
      'ครั้งรับบริการที่ไม่มีห้องหลัก',
      Number(overview.roomUnclassifiedTotal || 0) > 0 ? 'warning' : 'pass',
      `${Number(overview.roomUnclassifiedTotal || 0).toLocaleString('th-TH')} ครั้ง`,
      'ตรวจความครบถ้วนของ ovst.main_dep ที่ต้นทาง'
    ),
    result(
      'room_evidence',
      'หลักฐานหลายห้องในหนึ่ง VN',
      Number(overviewQuality.multipleRoomSourceVisits || 0) > 0 ? 'warning' : 'pass',
      `${Number(overviewQuality.multipleRoomSourceVisits || 0).toLocaleString('th-TH')} ครั้ง`,
      'Executive Overview ยังเลือกห้องหลักจาก ovst.main_dep เพียงหนึ่งห้อง'
    ),
    result(
      'target_anomaly',
      'แถวเป้าหมายที่ควรตรวจสอบ',
      targetAnomalies.length > 0 ? 'review' : 'pass',
      `${targetAnomalies.length.toLocaleString('th-TH')} แถว`,
      targetAnomalies.map((row) => row.department).join(', ')
    ),
    result(
      'target_no_data',
      'ห้องเป้าหมายที่ไม่มีข้อมูล',
      noDataTargets.length > 0 ? 'warning' : 'pass',
      `${noDataTargets.length.toLocaleString('th-TH')} ห้อง`,
      noDataTargets.map((row) => row.department).join(', ')
    ),
    result(
      'mapping_overlap',
      'รหัสแหล่งข้อมูลที่ใช้ร่วมหลาย Mapping',
      opdOverlaps.length + telemedOverlaps.length > 0 ? 'warning' : 'pass',
      `OPD ${opdOverlaps.length.toLocaleString('th-TH')} รหัส · Telemed ${telemedOverlaps.length.toLocaleString('th-TH')} รหัส`,
      'ผลรวมรายห้องเป็น Related Services และอาจไม่เท่ากับจำนวนครั้งระดับโรงพยาบาล'
    )
  ];
  const summary = checks.reduce((acc, check) => {
    acc[check.status] += 1;
    return acc;
  }, { pass: 0, warning: 0, review: 0 });

  return {
    filters,
    summary,
    checks,
    targetAnomalies,
    noDataTargets,
    mappingOverlaps: { opd: opdOverlaps, telemed: telemedOverlaps },
    lastUpdated: new Date().toISOString()
  };
}

async function fetchDataQualityReport(filters) {
  const [overview, target] = await Promise.all([
    fetchExecutiveOverview(filters),
    fetchDepartmentTargetData({ ...filters, depcode: 'all', serviceGroup: 'all', status: 'all', sortBy: 'target_gap' })
  ]);
  return buildDataQualityReport(overview, target, filters);
}

module.exports = {
  buildDataQualityReport,
  fetchDataQualityReport,
  mappingOverlaps
};
