const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { CATEGORY_KEYS } = require('./telemedService');

const HOSPCODE = process.env.HOSPCODE || '11202';

function nowText() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

function ymd(value) {
  return String(value || '').replaceAll('-', '');
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
  sheet.mergeCells('A1:K1');
  sheet.getCell('A1').value = 'รายงานติดตามเป้าหมาย Telemed รายห้อง';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  sheet.getCell('A2').value = `ช่วงวันที่: ${filters.startDate} ถึง ${filters.endDate}`;
  sheet.getCell('A3').value = 'เป้าหมาย: 50% ของ OPD รายห้อง';
  sheet.getCell('A4').value = `วันที่ export: ${nowText()}`;

  sheet.columns = [
    { key: 'no', width: 8 },
    { key: 'depcode', width: 14 },
    { key: 'department', width: 28 },
    { key: 'opd_total', width: 14 },
    { key: 'telemed_total', width: 16 },
    { key: 'b2b_total', width: 12 },
    { key: 'b2c_total', width: 12 },
    { key: 'target_50', width: 14 },
    { key: 'telemed_percent', width: 12 },
    { key: 'diff_from_target', width: 16 },
    { key: 'target_status', width: 18 }
  ];

  sheet.addRow([]);
  const header = sheet.addRow([
    'ลำดับ',
    'รหัสห้อง',
    'ห้องส่งตรวจ',
    'OPD ทั้งหมด',
    'Telemed ทั้งหมด',
    'B2B',
    'B2C',
    'เป้าหมาย 50%',
    'ทำได้ %',
    'ขาด/เกินเป้าหมาย',
    'สถานะ'
  ]);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F2FF' } };

  targetData.rows.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.depcode,
      row.department,
      row.opd_total,
      row.telemed_total,
      row.b2b_total,
      row.b2c_total,
      row.target_50,
      row.telemed_percent,
      row.diff_from_target,
      row.target_status
    ]);
  });

  const summary = targetData.summary;
  const footer = sheet.addRow([
    'รวมทั้งหมด',
    '',
    '',
    summary.opd_total,
    summary.telemed_total,
    summary.b2b_total,
    summary.b2c_total,
    summary.target_50_total,
    summary.telemed_percent,
    summary.diff_from_target,
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
  drawKpis(doc, data, executive);
  drawSummary(doc, data);
  drawTable(doc, data, filters.granularity === 'month' || executive ? 'month' : 'day');
  drawFooter(doc);
  doc.end();
}

function drawHeader(doc, title, filters) {
  doc.fontSize(18).fillColor('#0f1f2e').text(title, { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#42526b')
    .text(`hospcode: ${HOSPCODE}`, { align: 'center' })
    .text(`ช่วงวันที่: ${filters.startDate} ถึง ${filters.endDate}`, { align: 'center' })
    .text(`วันที่พิมพ์รายงาน: ${nowText()}`, { align: 'center' });
  doc.moveDown(1);
}

function drawKpis(doc, data, executive) {
  const dm = data.kpis['DM B2B'] + data.kpis['DM B2C'];
  const ht = data.kpis['HT B2B'] + data.kpis['HT B2C'];
  const items = executive
    ? [
      ['Total Telemed', data.total],
      ['DM รวม', dm],
      ['HT รวม', ht],
      ['B2B รวม', data.channel.b2b],
      ['B2C รวม', data.channel.b2c]
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
    doc.fillColor('#0f766e').fontSize(15).text(Number(value).toLocaleString('th-TH'), x + 8, y + 24, { width: width - 16 });
  });
  doc.y = y + 66;
}

function drawSummary(doc, data) {
  const dm = data.kpis['DM B2B'] + data.kpis['DM B2C'];
  const ht = data.kpis['HT B2B'] + data.kpis['HT B2C'];
  const channelTotal = data.channel.b2b + data.channel.b2c;
  const b2bPercent = channelTotal > 0 ? (data.channel.b2b / channelTotal) * 100 : 0;

  doc.fillColor('#172033').fontSize(12).text('สรุปภาพรวม', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#334155')
    .text(`ช่วงวันที่นี้มีบริการ Telemed รวม ${data.total.toLocaleString('th-TH')} ครั้ง`)
    .text(`กลุ่ม DM รวม ${dm.toLocaleString('th-TH')} ครั้ง และกลุ่ม HT รวม ${ht.toLocaleString('th-TH')} ครั้ง`)
    .text(`สัดส่วน B2B คิดเป็น ${b2bPercent.toFixed(1)}% ของกลุ่ม DM/HT ที่จัด B2B/B2C ได้`);
  doc.moveDown(1);
}

function drawTable(doc, data, mode) {
  const rows = data.dailySummary.slice().reverse();

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
