const DEPARTMENT_TARGETS = [
  {
    display_depcode: '080',
    display_name: 'OPD Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['111'],
    telemed_count_deps: ['111', '080'],
    telemed_mode: 'B2C_ONLY',
    is_active: true,
    note: 'OPD ทั้งหมดอ้างอิงจากซักประวัติ OPD depcode 111 และนับ Telemed B2C จาก 111,080'
  },
  {
    display_depcode: '082',
    display_name: 'ER Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['004'],
    telemed_count_deps: ['004', '082'],
    telemed_mode: 'B2C_ONLY',
    is_active: false,
    note: 'ปิดการแสดงผลเพื่อเลี่ยงการนับซ้ำ โดยรวมข้อมูล ER Telemed ไว้ที่แถวอุบัติเหตุ - ฉุกเฉิน'
  },
  {
    display_depcode: '066',
    display_name: 'NCD Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['014'],
    telemed_count_deps: ['014', '066'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '085',
    display_name: 'NCDCSG Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['055'],
    telemed_count_deps: ['055', '085'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '077',
    display_name: 'คลินิกความดัน-Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['015'],
    telemed_count_deps: ['015', '077', '075'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '084',
    display_name: 'จิตเวช Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['052'],
    telemed_count_deps: ['052', '084'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '083',
    display_name: 'ทันตกรรม Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['005'],
    telemed_count_deps: ['005', '083'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '081',
    display_name: 'ห้องจ่ายยา Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['012', '070'],
    telemed_count_deps: ['012', '070', '081'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '037',
    display_name: 'กายภาพบำบัด',
    service_group: 'กายภาพ',
    opd_source_deps: ['037', '078'],
    telemed_count_deps: ['037', '078'],
    telemed_mode: 'B2C_ONLY',
    is_active: true,
    note: 'รวมข้อมูลกายภาพบำบัด(รองเท้ารองช้ำ) depcode 078 ไว้ในแถวกายภาพบำบัด'
  },
  {
    display_depcode: '078',
    display_name: 'กายภาพบำบัด(รองเท้ารองช้ำ)',
    service_group: 'กายภาพ',
    opd_source_deps: ['078'],
    telemed_count_deps: ['078'],
    telemed_mode: 'B2C_ONLY',
    is_active: false,
    note: 'ปิดการแสดงผลเพื่อเลี่ยงการแยกซ้ำ โดยรวมข้อมูลไว้ที่แถวกายภาพบำบัด'
  },
  {
    display_depcode: '004',
    display_name: 'อุบัติเหตุ - ฉุกเฉิน',
    service_group: 'อุบัติเหตุฉุกเฉิน',
    opd_source_deps: ['004'],
    telemed_count_deps: ['004', '082'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '007',
    display_name: 'งานแพทย์แผนไทย',
    service_group: 'แผนไทย',
    opd_source_deps: ['007'],
    telemed_count_deps: ['007'],
    telemed_mode: 'B2C_ONLY',
    is_active: true
  },
  {
    display_depcode: '079',
    display_name: 'PHDTelemed',
    service_group: 'Telemed',
    opd_source_deps: ['079'],
    telemed_count_deps: ['079'],
    telemed_mode: 'B2C_ONLY',
    is_active: true,
    note: 'ยังไม่มี depcode ห้องต้นทางที่ชัดเจน จึงใช้ 079 ชั่วคราว'
  },
  {
    display_depcode: '086',
    display_name: 'B2B Telemed',
    service_group: 'Telemed',
    opd_source_deps: ['086'],
    telemed_count_deps: ['086'],
    telemed_mode: 'B2B_ONLY',
    is_active: true,
    note: 'B2B เป็นช่องทางบริการเฉพาะ อาจไม่ควรใช้สูตรเป้าหมาย 50% แบบเดียวกับห้อง OPD ทั่วไป'
  }
];

module.exports = {
  DEPARTMENT_TARGETS
};
