const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { departmentTargetPercent } = require('../config/dashboardTargets');
const { CATEGORY_KEYS } = require('./telemedService');
const {
  formatThaiDateRange,
  formatThaiPeriod
} = require('../utils/thaiDate');

const HOSPCODE = process.env.HOSPCODE || '11202';

function nowText() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

function ymd(value) {
  return String(value || '').replaceAll('-', '');
}

function targetDiffLabel(value, row = null) {
  if (row && row.is_no_data) return 'ประเมินไม่ได้';
  const diff = Number(value || 0);
  if (diff < 0) return `ต้องเพิ่ม ${Math.abs(diff).toLocaleString('th-TH')} ครั้ง`;
  if (diff > 0) return `เกินเป้า ${diff.toLocaleString('th-TH')} ครั้ง`;
  return 'ถึงเป้า';
}

function targetStatusLabel(row) {
  if (row.is_no_data) return 'ไม่มีข้อมูล';
  if (row.is_data_anomaly) return 'ตรวจสอบข้อมูล';
  if (row.display_status) return row.display_status;
  if (Number(row.telemed_total || 0) >= Number(row.target_50 || 0)) return 'ผ่าน';
  if (Number(row.telemed_percent || 0) >= Math.max(Number(row.target_percent || departmentTargetPercent) - 5, 0)) return 'ใกล้ถึง';
  return 'ไม่ผ่าน';
}

function telemedFilename(filters, extension) {
  return `telemed_report_${ymd(filters.startDate)}_${ymd(filters.endDate)}.${extension}`;
}

function departmentTargetFilename(filters) {
  return `telemed_department_target_${ymd(filters.startDate)}_${ymd(filters.endDate)}.xlsx`;
}

function totalRow(data) {
  return {
    date: 'รวม',
    'DM B2B': data.kpis['DM B2B'],
    'DM B2C': data.kpis['DM B2C'],
    'HT B2B': data.kpis['HT B2B'],
    'HT B2C': data.kpis['HT B2C'],
    total: data.total
  };
}

async function writeTelemedExcel(res, filters, data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Telemed Dashboard';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Telemed Report');
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'รายงานสรุปบริการ Telemedicine';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  sheet.getCell('A2').value = `hospcode: ${HOSPCODE}`;
  sheet.getCell('A3').value = `ช่วงวันที่: ${filters.startDate} ถึง ${filters.endDate}`;
  sheet.getCell('A4').value = `วันที่ export: ${nowText()}`;

  sheet.columns = [
    { key: 'date', width: 16 },
    { key: 'DM B2B', width: 14 },
    { key: 'DM B2C', width: 14 },
    { key: 'HT B2B', width: 14 },
    { key: 'HT B2C', width: 14 },
    { key: 'total', width: 14 }
  ];

  sheet.addRow([]);
  const periodLabel = filters.granularity === 'month' ? 'เดือน' : 'วันที่';
  const header = sheet.addRow([periodLabel, 'DM B2B', 'DM B2C', 'HT B2B', 'HT B2C', 'Total']);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F2FF' } };

  const rows = data.dailySummary.slice().reverse();
  for (const row of rows) {
    sheet.addRow([row.date, row['DM B2B'], row['DM B2C'], row['HT B2B'], row['HT B2C'], row.total]);
  }

  const total = totalRow(data);
  const footer = sheet.addRow([total.date, total['DM B2B'], total['DM B2C'], total['HT B2B'], total['HT B2C'], total.total]);
  footer.font = { bold: true };
  footer.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFA' } };

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2EC' } }
      };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${telemedFilename(filters, 'xlsx')}"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function writeDepartmentTargetExcel(res, filters, targetData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Telemed Dashboard';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Department Target');
  sheet.mergeCells('A1:P1');
  sheet.getCell('A1').value = 'รายงานติดตามเป้าหมาย Telemed รายห้อง';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  sheet.getCell('A2').value = `ช่วงวันที่: ${filters.startDate} ถึง ${filters.endDate}`;
  const targetLabel = targetData.summary.uses_mixed_targets
    ? 'เป้าหมาย: ใช้ค่าที่กำหนดเฉพาะแต่ละห้อง'
    : `เป้าหมาย: ${Number(targetData.summary.target_percent ?? targetData.targetPercent ?? departmentTargetPercent).toLocaleString('th-TH', { maximumFractionDigits: 2 })}% ของ OPD รายห้อง`;
  sheet.getCell('A3').value = targetLabel;
  sheet.getCell('A4').value = `วันที่ export: ${nowText()}`;

  sheet.columns = [
    { key: 'no', width: 8 },
    { key: 'depcode', width: 14 },
    { key: 'department', width: 28 },
    { key: 'service_group', width: 18 },
    { key: 'opd_source_deps', width: 18 },
    { key: 'telemed_count_deps', width: 22 },
    { key: 'telemed_mode', width: 14 },
    { key: 'opd_total', width: 14 },
    { key: 'telemed_total', width: 24 },
    { key: 'b2b_total', width: 12 },
    { key: 'b2c_total', width: 12 },
    { key: 'target_50', width: 14 },
    { key: 'telemed_percent', width: 22 },
    { key: 'diff_from_target', width: 20 },
    { key: 'target_status', width: 14 },
    { key: 'note', width: 42 }
  ];

  sheet.addRow([]);
  const header = sheet.addRow([
    'ลำดับ',
    'รหัสห้อง',
    'ห้องส่งตรวจ',
    'กลุ่มบริการ',
    'OPD source',
    'Telemed source',
    'Mode',
    'OPD ทั้งหมด (ครั้ง)',
    'จำนวน Telemed ที่ทำได้ (ครั้ง)',
    'B2B (ครั้ง)',
    'B2C (ครั้ง)',
    'เป้าหมายตามห้อง (ครั้ง)',
    'สัดส่วน Telemed ต่อ OPD',
    'ต้องเพิ่ม/เกินเป้า',
    'สถานะ',
    'หมายเหตุ'
  ]);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F2FF' } };

  targetData.rows.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.depcode,
      row.department,
      row.service_group,
      (row.opd_source_deps || []).join(', '),
      (row.telemed_count_deps || []).join(', '),
      row.telemed_mode,
      row.opd_total,
      row.telemed_total,
      row.b2b_total,
      row.b2c_total,
      row.target_50,
      row.telemed_percent,
      targetDiffLabel(row.diff_from_target, row),
      targetStatusLabel(row),
      row.note || row.calculation_note || ''
    ]);
  });

  const summary = targetData.summary;
  const footer = sheet.addRow([
    'รวมทั้งหมด',
    '',
    '',
    '',
    '',
    '',
    '',
    summary.opd_total,
    summary.telemed_total,
    summary.b2b_total,
    summary.b2c_total,
    summary.target_50_total,
    summary.telemed_percent,
    targetDiffLabel(summary.diff_from_target),
    '',
    ''
  ]);
  footer.font = { bold: true };
  footer.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFA' } };

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2EC' } }
      };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${departmentTargetFilename(filters)}"`);
  await workbook.xlsx.write(res);
  res.end();
}

function thaiFontPath() {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSansThai-Regular.ttf'),
    'C:\\Windows\\Fonts\\tahoma.ttf',
    'C:\\Windows\\Fonts\\THSarabunNew.ttf',
    'C:\\Windows\\Fonts\\NotoSansThai-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansThaiUI-Regular.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansThai-Regular.ttf',
    '/usr/share/fonts/truetype/tlwg/Garuda.ttf',
    '/usr/share/fonts/truetype/thai/Garuda.ttf'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function writeTelemedPdf(res, filters, data, options = {}) {
  const title = options.title || 'รายงานสรุปบริการ Telemedicine';
  const executive = Boolean(options.executive);
  const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
  const fontPath = thaiFontPath();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${telemedFilename(filters, 'pdf')}"`);
  doc.pipe(res);

  if (fontPath) {
    doc.registerFont('thai', fontPath);
    doc.font('thai');
  } else {
    doc.font('Helvetica');
  }

  drawHeader(doc, title, filters);
  drawKpis(doc, data, executive, options.metrics);
  drawSummary(doc, data, executive, options.metrics);
  if (executive) {
    drawExecutiveFollowUp(doc, options.metrics);
    drawExecutiveTrend(doc, data, filters.granularity);
  }
  drawTable(doc, data, executive ? filters.granularity : (filters.granularity === 'month' ? 'month' : 'day'), executive);
  drawFooter(doc);
  doc.end();
}

function drawHeader(doc, title, filters) {
  doc.fontSize(18).fillColor('#0f1f2e').text(title, { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#42526b')
    .text(`hospcode: ${HOSPCODE}`, { align: 'center' })
    .text(`ช่วงวันที่: ${formatThaiDateRange(filters.startDate, filters.endDate)}`, { align: 'center' })
    .text(`วันที่พิมพ์รายงาน: ${nowText()}`, { align: 'center' });
  doc.moveDown(1);
}

function drawKpis(doc, data, executive, metrics = null) {
  const dm = executive && data.disease ? data.disease.dmTotal : data.kpis['DM B2B'] + data.kpis['DM B2C'];
  const ht = executive && data.disease ? data.disease.htTotal : data.kpis['HT B2B'] + data.kpis['HT B2C'];
  const performance = metrics && metrics.targetPerformance;
  const items = executive && performance && performance.available
    ? [
      ['บริการ Telemedicine', data.total],
      ['OPD ห้องที่นำมาประเมิน', performance.opdTotal],
      ['Telemedicine ห้องเป้าหมาย', performance.telemedTotal],
      ['ผลงานเทียบเป้าหมาย', `${performance.rate.toFixed(2)}%`],
      [performance.gap < 0 ? 'จำนวนที่ยังขาด' : 'จำนวนที่เกินเป้า', performance.gap < 0 ? performance.shortage : performance.excess]
    ]
    : executive
      ? [
        ['ครั้งรับบริการ Telemed', data.total],
        ['DM รวม', dm],
        ['HT รวม', ht],
        ['B2B ที่จำแนกได้', data.channel.b2b],
        ['B2C ที่จำแนกได้', data.channel.b2c]
      ]
    : [
      ['Total', data.total],
      ['DM B2B', data.kpis['DM B2B']],
      ['DM B2C', data.kpis['DM B2C']],
      ['HT B2B', data.kpis['HT B2B']],
      ['HT B2C', data.kpis['HT B2C']]
    ];

  const startX = doc.x;
  const width = 100;
  const gap = 8;
  const y = doc.y;

  items.forEach(([label, value], index) => {
    const x = startX + (width + gap) * index;
    doc.roundedRect(x, y, width, 48, 4).fillAndStroke('#f8fafc', '#d9e2ec');
    doc.fillColor('#64748b').fontSize(8).text(label, x + 8, y + 8, { width: width - 16 });
    const displayValue = typeof value === 'number' ? value.toLocaleString('th-TH') : String(value);
    doc.fillColor('#0f766e').fontSize(15).text(displayValue, x + 8, y + 24, { width: width - 16 });
  });
  doc.y = y + 66;
}

function drawSummary(doc, data, executive = false, metrics = null) {
  const dm = executive && data.disease ? data.disease.dmTotal : data.kpis['DM B2B'] + data.kpis['DM B2C'];
  const ht = executive && data.disease ? data.disease.htTotal : data.kpis['HT B2B'] + data.kpis['HT B2C'];
  const channelTotal = data.channel.b2b + data.channel.b2c;
  const b2bPercent = channelTotal > 0 ? (data.channel.b2b / channelTotal) * 100 : 0;

  doc.fillColor('#172033').fontSize(12).text('สรุปภาพรวม', { underline: true });
  doc.moveDown(0.4);
  if (executive && metrics && metrics.executiveSummary) {
    doc.fontSize(10).fillColor('#334155').text(metrics.executiveSummary);
    doc.moveDown(0.35);
    doc.fillColor(metrics.qualitySummary && metrics.qualitySummary.status === 'ok' ? '#047857' : '#b45309')
      .text(metrics.qualitySummary ? metrics.qualitySummary.label : 'ข้อมูลครบถ้วน');
    doc.moveDown(1);
    return;
  }
  doc.fontSize(10).fillColor('#334155')
    .text(`ช่วงวันที่นี้มีบริการ Telemed รวม ${data.total.toLocaleString('th-TH')} ครั้ง`)
    .text(`กลุ่ม DM รวม ${dm.toLocaleString('th-TH')} ครั้ง และกลุ่ม HT รวม ${ht.toLocaleString('th-TH')} ครั้ง`)
    .text(executive && data.channel.dataComplete
      ? `สัดส่วน B2B คิดเป็น ${b2bPercent.toFixed(1)}% ของครั้งรับบริการที่จำแนกช่องทางครบ`
      : (executive
        ? `ข้อมูลช่องทางยังไม่ครบ: ไม่ระบุ ${Number(data.channel.unclassified || 0).toLocaleString('th-TH')} ครั้ง และขัดแย้ง ${Number(data.channel.conflict || 0).toLocaleString('th-TH')} ครั้ง`
        : `สัดส่วน B2B คิดเป็น ${b2bPercent.toFixed(1)}% ของกลุ่ม DM/HT ที่จัด B2B/B2C ได้`));
  if (executive && data.disease) {
    doc.text(`มีบริการจริง ${Number(data.dataQuality.activeServiceDays || 0).toLocaleString('th-TH')} วัน จาก ${Number(data.dataQuality.calendarDays || 0).toLocaleString('th-TH')} วันปฏิทิน เฉลี่ย ${Number(data.averagePerServiceDay || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ครั้งต่อวันให้บริการ`);
    if (data.highestDay) {
      doc.text(`วันที่มีบริการสูงสุด ${Number(data.highestDay.total || 0).toLocaleString('th-TH')} ครั้ง: ${data.highestDay.dateSummary}`);
    }
    if (data.lowestServiceDay) {
      doc.text(`วันที่มีบริการต่ำสุด ${Number(data.lowestServiceDay.total || 0).toLocaleString('th-TH')} ครั้ง: ${data.lowestServiceDay.dateSummary}`);
    }
    doc.text(`DM และ HT ซ้อนกันในครั้งรับบริการเดียวกัน ${Number(data.disease.dmAndHt || 0).toLocaleString('th-TH')} ครั้ง`);
    doc.text(`DM อย่างเดียว ${Number(data.disease.dmOnly || 0).toLocaleString('th-TH')} ครั้ง, HT อย่างเดียว ${Number(data.disease.htOnly || 0).toLocaleString('th-TH')} ครั้ง และกลุ่มอื่น ${Number(data.otherDiseaseVisits || 0).toLocaleString('th-TH')} ครั้ง`);
    doc.text(`Top 5 ห้องบริการหลัก ${Number(data.topFiveTelemedTotal || 0).toLocaleString('th-TH')} ครั้ง, ห้องอื่น ${Number(data.otherTelemedTotal || 0).toLocaleString('th-TH')} ครั้ง และจัดกลุ่มห้องไม่ได้ ${Number(data.roomUnclassifiedTotal || 0).toLocaleString('th-TH')} ครั้ง`);
  }
  doc.moveDown(1);
}

function drawExecutiveFollowUp(doc, metrics = null) {
  const performance = metrics && metrics.targetPerformance;
  const rows = performance && Array.isArray(performance.followUp) ? performance.followUp : [];
  if (rows.length === 0) return;

  if (doc.y > 665) doc.addPage();
  doc.fillColor('#172033').fontSize(12).text('5 ห้องที่ควรเร่งติดตาม', { underline: true });
  doc.moveDown(0.35);
  rows.forEach((row, index) => {
    const targetPercent = Number(row.target_percent || departmentTargetPercent);
    const gap = Math.abs(Number(row.diff_from_target || 0));
    doc.fontSize(9).fillColor('#334155').text(
      `${index + 1}. ${row.department}: ทำได้ ${Number(row.telemed_total || 0).toLocaleString('th-TH')} ครั้ง, เป้าหมาย ${Number(row.target_50 || 0).toLocaleString('th-TH')} ครั้ง (${targetPercent.toLocaleString('th-TH', { maximumFractionDigits: 2 })}%), ยังขาด ${gap.toLocaleString('th-TH')} ครั้ง`
    );
  });
  doc.moveDown(0.8);
}

function drawExecutiveTrend(doc, data, mode = 'day') {
  const rows = Array.isArray(data.trend) ? data.trend : [];
  if (rows.length === 0 || Number(data.total || 0) === 0) return;
  if (doc.y > 560) doc.addPage();

  const daily = mode === 'day';
  const periodName = mode === 'month' ? 'รายเดือน' : (mode === 'week' ? 'รายสัปดาห์' : 'รายวัน');
  const chartX = doc.page.margins.left;
  const chartY = doc.y + 30;
  const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartHeight = 150;
  const values = rows.map((row) => row.isServiceDay === false ? null : Number(row.total || 0));
  const numericValues = values.filter(Number.isFinite);
  const maxValue = Math.max(...numericValues, 1);
  const average = Number(data.averagePerServiceDay || 0);

  doc.fillColor('#172033').fontSize(12).text(`แนวโน้มจำนวนบริการ Telemedicine ${periodName}`, chartX, doc.y, { underline: true });
  doc.fontSize(8).fillColor('#64748b').text(
    `รวม ${Number(data.total || 0).toLocaleString('th-TH')} ครั้ง · ให้บริการ ${Number(data.dataQuality.activeServiceDays || 0).toLocaleString('th-TH')} วัน · เฉลี่ย ${average.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ครั้งต่อวันให้บริการ`,
    chartX,
    doc.y + 3
  );

  doc.strokeColor('#dbe4ee').lineWidth(0.7).moveTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).stroke();
  doc.strokeColor('#eef2f7').moveTo(chartX, chartY).lineTo(chartX, chartY + chartHeight).stroke();

  if (daily) {
    const slot = chartWidth / Math.max(rows.length, 1);
    const barWidth = Math.max(2, Math.min(14, slot * 0.62));
    rows.forEach((row, index) => {
      const value = values[index];
      if (!Number.isFinite(value)) return;
      const height = (value / maxValue) * chartHeight;
      const x = chartX + (slot * index) + ((slot - barWidth) / 2);
      doc.rect(x, chartY + chartHeight - height, barWidth, height).fill('#0f766e');
    });
    if (average > 0) {
      const averageY = chartY + chartHeight - ((average / maxValue) * chartHeight);
      doc.save().strokeColor('#64748b').lineWidth(1).dash(4, { space: 3 })
        .moveTo(chartX, averageY).lineTo(chartX + chartWidth, averageY).stroke().undash().restore();
      doc.fillColor('#475569').fontSize(7).text(`เฉลี่ย ${average.toFixed(1)}`, chartX + chartWidth - 72, Math.max(chartY, averageY - 11), { width: 70, align: 'right' });
    }
  } else {
    const step = rows.length > 1 ? chartWidth / (rows.length - 1) : chartWidth;
    let drawing = false;
    doc.save().strokeColor('#0f766e').lineWidth(2);
    rows.forEach((row, index) => {
      const value = values[index];
      if (!Number.isFinite(value)) {
        if (drawing) doc.stroke();
        drawing = false;
        return;
      }
      const x = chartX + (step * index);
      const y = chartY + chartHeight - ((value / maxValue) * chartHeight);
      if (!drawing) {
        doc.moveTo(x, y);
        drawing = true;
      } else {
        doc.lineTo(x, y);
      }
    });
    if (drawing) doc.stroke();
    doc.restore();
  }

  const tickIndexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])].filter((index) => index >= 0);
  tickIndexes.forEach((index) => {
    const x = rows.length > 1 ? chartX + ((chartWidth / (rows.length - 1)) * index) : chartX;
    const label = String(rows[index].periodLabel || rows[index].period || '');
    doc.fillColor('#64748b').fontSize(7).text(label, Math.max(chartX, x - 40), chartY + chartHeight + 5, { width: 80, align: 'center' });
  });
  doc.y = chartY + chartHeight + 28;
}

function drawTable(doc, data, mode, executive = false) {
  const rows = executive && Array.isArray(data.trend)
    ? data.trend
    : data.dailySummary.slice().reverse();

  if (executive) {
    const headers = [mode === 'month' ? 'เดือน' : (mode === 'week' ? 'สัปดาห์' : 'วันที่'), 'Telemed', 'DM', 'HT', 'B2B', 'B2C'];
    const widths = [92, 70, 70, 70, 70, 70];
    drawTableHeader(doc, headers, widths);
    for (const row of rows) {
      if (doc.y > 760) {
        doc.addPage();
        drawTableHeader(doc, headers, widths);
      }
      drawTableRow(doc, [row.periodLabel || formatThaiPeriod(row.period || row.date), row.total, row.dm, row.ht, row.b2b, row.b2c], widths);
    }
    drawTableRow(doc, [
      'รวม',
      data.total,
      data.disease ? data.disease.dmTotal : 0,
      data.disease ? data.disease.htTotal : 0,
      data.channel.b2b,
      data.channel.b2c
    ], widths, true);
    return;
  }

  const headers = [mode === 'month' ? 'เดือน' : 'วันที่', 'DM B2B', 'DM B2C', 'HT B2B', 'HT B2C', 'Total'];
  const widths = [82, 72, 72, 72, 72, 72];
  drawTableHeader(doc, headers, widths);

  for (const row of rows) {
    if (doc.y > 760) {
      doc.addPage();
      drawTableHeader(doc, headers, widths);
    }
    drawTableRow(doc, [row.date, row['DM B2B'], row['DM B2C'], row['HT B2B'], row['HT B2C'], row.total], widths);
  }

  const total = totalRow(data);
  drawTableRow(doc, [total.date, total['DM B2B'], total['DM B2C'], total['HT B2B'], total['HT B2C'], total.total], widths, true);
}

function drawTableHeader(doc, headers, widths) {
  doc.fillColor('#172033').fontSize(11).text('ตารางสรุป', { underline: true });
  doc.moveDown(0.4);
  drawTableRow(doc, headers, widths, true);
}

function drawTableRow(doc, values, widths, bold = false) {
  const x = doc.x;
  const y = doc.y;
  let offset = 0;
  doc.fontSize(8).fillColor('#172033');
  values.forEach((value, index) => {
    const isNumber = typeof value === 'number' || (value !== '' && value !== null && !Number.isNaN(Number(value)));
    const text = isNumber ? Number(value || 0).toLocaleString('th-TH') : String(value || '');
    doc.rect(x + offset, y, widths[index], 20).stroke('#d9e2ec');
    if (bold) doc.fillColor('#0f766e');
    doc.text(text, x + offset + 4, y + 6, { width: widths[index] - 8, align: index === 0 || !isNumber ? 'left' : 'right' });
    doc.fillColor('#172033');
    offset += widths[index];
  });
  doc.y = y + 20;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#64748b')
      .text(`หน้า ${i + 1} / ${range.count}`, 36, 806, { align: 'center' });
  }
}

module.exports = {
  HOSPCODE,
  telemedFilename,
  departmentTargetFilename,
  writeTelemedExcel,
  writeDepartmentTargetExcel,
  writeTelemedPdf
};
