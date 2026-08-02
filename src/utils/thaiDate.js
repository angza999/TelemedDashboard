const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
];

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
];

function parseIsoDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return date;
}

function thaiYear(date) {
  return date.getUTCFullYear() + 543;
}

function formatThaiDate(value) {
  const date = parseIsoDate(value);
  if (!date) return String(value || '');
  return `${date.getUTCDate()} ${THAI_MONTHS[date.getUTCMonth()]} ${thaiYear(date)}`;
}

function formatThaiShortDate(value) {
  const date = parseIsoDate(value);
  if (!date) return String(value || '');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${THAI_SHORT_MONTHS[date.getUTCMonth()]} ${thaiYear(date)}`;
}

function formatThaiMonth(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return String(value || '');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return String(value || '');
  return `${THAI_MONTHS[month - 1]} ${year + 543}`;
}

function formatThaiDateRange(startValue, endValue) {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end) return `${startValue || ''} ถึง ${endValue || ''}`.trim();

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  const startYear = thaiYear(start);
  const endYear = thaiYear(end);

  if (start.getTime() === end.getTime()) return formatThaiDate(startValue);
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} – ${endDay} ${THAI_MONTHS[startMonth]} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${THAI_MONTHS[startMonth]} – ${endDay} ${THAI_MONTHS[endMonth]} ${startYear}`;
  }
  return `${formatThaiDate(startValue)} – ${formatThaiDate(endValue)}`;
}

function joinThaiList(values) {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} และ ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} และ ${values.at(-1)}`;
}

function formatThaiDateList(values, limit = 3) {
  const dates = (values || []).map(parseIsoDate).filter(Boolean);
  if (!dates.length) return '';

  const visible = dates.slice(0, limit);
  const remaining = dates.length - visible.length;
  const sameMonth = visible.every((date) => (
    date.getUTCFullYear() === visible[0].getUTCFullYear()
    && date.getUTCMonth() === visible[0].getUTCMonth()
  ));
  const dateText = sameMonth
    ? `${joinThaiList(visible.map((date) => String(date.getUTCDate())))} ${THAI_MONTHS[visible[0].getUTCMonth()]} ${thaiYear(visible[0])}`
    : joinThaiList(visible.map((date) => formatThaiDate(date.toISOString().slice(0, 10))));

  return `${dateText}${remaining > 0 ? ` และอีก ${remaining.toLocaleString('th-TH')} วัน` : ''}`;
}

function formatThaiPeriod(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ''))
    ? formatThaiMonth(value)
    : formatThaiDate(value);
}

module.exports = {
  formatThaiDate,
  formatThaiDateList,
  formatThaiDateRange,
  formatThaiMonth,
  formatThaiPeriod,
  formatThaiShortDate,
  parseIsoDate
};
