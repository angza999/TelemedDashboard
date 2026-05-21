(function () {
  const payloadEl = document.getElementById('telemedPayload');
  const payload = payloadEl
    ? JSON.parse(payloadEl.textContent)
    : { trend: [], channel: {}, categories: [], data: null, filters: {} };

  const colors = {
    'DM B2B': '#0f766e',
    'DM B2C': '#14b8a6',
    'HT B2B': '#be123c',
    'HT B2C': '#fb7185'
  };

  let trendChart = null;
  let channelChart = null;
  let isRefreshing = false;

  const trendEl = document.getElementById('trendChart');
  const channelEl = document.getElementById('channelChart');

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('th-TH');
  }

  function formatPercent(value) {
    return Number(value || 0).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function thaiDateTime(value) {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleString('th-TH');
  }

  function currentFilters() {
    const form = document.getElementById('telemedFilterForm');
    const params = new URLSearchParams(new FormData(form));
    return {
      startDate: params.get('startDate') || '',
      endDate: params.get('endDate') || '',
      fiscalYear: params.get('fiscalYear') || '',
      granularity: params.get('granularity') === 'month' ? 'month' : 'day',
      params
    };
  }

  function buildQueryString(filters) {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.fiscalYear) params.set('fiscalYear', filters.fiscalYear);
    params.set('granularity', filters.granularity || 'day');
    return params.toString();
  }

  function updateExportLinks(filters) {
    const query = buildQueryString(filters);
    const excel = document.getElementById('exportExcelLink');
    const pdf = document.getElementById('exportPdfLink');
    if (excel) excel.href = `/telemed/export.xlsx?${query}`;
    if (pdf) pdf.href = `/telemed/export.pdf?${query}`;
  }

  function createTrendChart(data, categories) {
    if (!trendEl) return null;
    return new Chart(trendEl, {
      type: 'line',
      data: trendChartData(data.trend || [], categories),
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function trendChartData(trend, categories) {
    return {
      labels: trend.map((row) => row.period),
      datasets: categories.map((category) => ({
        label: category,
        data: trend.map((row) => row[category] || 0),
        borderColor: colors[category],
        backgroundColor: colors[category],
        tension: 0.28,
        pointRadius: 3,
        borderWidth: 2
      }))
    };
  }

  function createChannelChart(data) {
    if (!channelEl) return null;
    return new Chart(channelEl, {
      type: 'doughnut',
      data: channelChartData(data.channel || {}),
      options: {
        responsive: true,
        cutout: '64%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function channelChartData(channel) {
    return {
      labels: ['B2B', 'B2C'],
      datasets: [{
        data: [channel.b2b || 0, channel.b2c || 0],
        backgroundColor: ['#2563eb', '#f59e0b'],
        borderWidth: 0
      }]
    };
  }

  function renderDashboard(data, filters, categories) {
    renderQueryInfo(data, filters);
    renderAlerts(data);
    renderKpis(data, categories);
    renderCharts(data, categories);
    renderTable(data, filters, categories);
    updateExportLinks(filters);
  }

  function renderQueryInfo(data, filters) {
    setText('queryName', data.queryInfo.name);
    setText('queryDataSource', data.queryInfo.dataSource);
    setText('lastUpdated', thaiDateTime(data.queryInfo.loadedAt || new Date()));
    setText('queryDateRange', `${filters.startDate} ถึง ${filters.endDate}`);
    setText('trendSubtitle', `${filters.granularity === 'month' ? 'รายเดือน' : 'รายวัน'} | ${filters.startDate} ถึง ${filters.endDate}`);
  }

  function renderAlerts(data) {
    const alert = document.getElementById('dashboardAlert');
    if (!alert) return;
    if (data.total === 0) {
      alert.innerHTML = '<div class="alert warning dashboard-alert">ไม่พบข้อมูล Telemed ในช่วงวันที่ที่เลือก</div>';
      return;
    }
    if ((data.totals.b2b || 0) === 0) {
      alert.innerHTML = '<div class="alert warning dashboard-alert">ไม่พบข้อมูล B2B ในช่วงวันที่ที่เลือก กรุณาตรวจสอบการบันทึกคำว่า B2B ใน ovstist.name หรือ opdscreen.cc</div>';
      return;
    }
    alert.innerHTML = '';
  }

  function renderKpis(data, categories) {
    setTextBySelector('[data-kpi="total"]', formatNumber(data.total));
    categories.forEach((category) => {
      setTextBySelector(`[data-kpi="${cssEscape(category)}"]`, formatNumber(data.kpis[category]));
    });
    setTextBySelector('[data-total="dm"]', formatNumber(data.totals.dm));
    setTextBySelector('[data-total="ht"]', formatNumber(data.totals.ht));
    setTextBySelector('[data-total="b2b"]', formatNumber(data.totals.b2b));
    setTextBySelector('[data-total="b2c"]', formatNumber(data.totals.b2c));
    setText('b2bSummary', `${formatNumber(data.totals.b2b)} ราย (${formatPercent(data.percentages.b2b)}%)`);
    setText('b2cSummary', `${formatNumber(data.totals.b2c)} ราย (${formatPercent(data.percentages.b2c)}%)`);
  }

  function renderCharts(data, categories) {
    if (trendChart) {
      trendChart.data = trendChartData(data.trend || [], categories);
      trendChart.update();
    }
    if (channelChart) {
      channelChart.data = channelChartData(data.channel || {});
      channelChart.update();
    }
  }

  function renderTable(data, filters, categories) {
    const rows = data.dailySummary || [];
    const maxTotal = rows.reduce((max, row) => Math.max(max, Number(row.total || 0)), 0);
    const totals = tableTotals(rows, categories);
    const granularity = filters.granularity === 'month' ? 'month' : 'day';

    setText('tableTitle', granularity === 'month' ? 'ตารางสรุปรายเดือน' : 'ตารางสรุปรายวัน');
    setText('tableCount', `${formatNumber(rows.length)} ${granularity === 'month' ? 'เดือน' : 'วัน'}`);
    setText('periodHeader', granularity === 'month' ? 'เดือน' : 'วันที่');

    const body = document.getElementById('telemedTableBody');
    const foot = document.getElementById('telemedTableFoot');
    if (!body || !foot) return;

    if (rows.length === 0) {
      body.innerHTML = '<tr><td colspan="10" class="empty">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</td></tr>';
      foot.innerHTML = '';
      return;
    }

    body.innerHTML = rows.map((row) => renderTableRow(row, categories, maxTotal)).join('');
    foot.innerHTML = renderFooterRow(totals, categories);
  }

  function tableTotals(rows, categories) {
    return rows.reduce((sum, row) => {
      sum.total += Number(row.total || 0);
      sum.dm_total += Number(row.dm_total || 0);
      sum.ht_total += Number(row.ht_total || 0);
      sum.b2b_total += Number(row.b2b_total || 0);
      sum.b2c_total += Number(row.b2c_total || 0);
      categories.forEach((category) => {
        sum[category] += Number(row[category] || 0);
      });
      return sum;
    }, {
      total: 0,
      dm_total: 0,
      ht_total: 0,
      b2b_total: 0,
      b2c_total: 0,
      ...Object.fromEntries(categories.map((category) => [category, 0]))
    });
  }

  function renderTableRow(row, categories, maxTotal) {
    const isMax = maxTotal > 0 && Number(row.total || 0) === maxTotal;
    return `
      <tr class="${isMax ? 'max-total-row' : ''}">
        <td><span class="date-cell">${escapeHtml(row.date)}${isMax ? '<span class="max-badge">สูงสุด</span>' : ''}</span></td>
        <td class="number">${formatNumber(row.total)}</td>
        <td class="number">${formatNumber(row.dm_total)}</td>
        <td class="number">${formatNumber(row.ht_total)}</td>
        <td class="number">${formatNumber(row.b2b_total)}</td>
        <td class="number">${formatNumber(row.b2c_total)}</td>
        ${categories.map((category) => `<td class="number detail-column">${formatNumber(row[category])}</td>`).join('')}
      </tr>
    `;
  }

  function renderFooterRow(totals, categories) {
    return `
      <tr>
        <td>รวมทั้งหมด</td>
        <td class="number">${formatNumber(totals.total)}</td>
        <td class="number">${formatNumber(totals.dm_total)}</td>
        <td class="number">${formatNumber(totals.ht_total)}</td>
        <td class="number">${formatNumber(totals.b2b_total)}</td>
        <td class="number">${formatNumber(totals.b2c_total)}</td>
        ${categories.map((category) => `<td class="number detail-column">${formatNumber(totals[category])}</td>`).join('')}
      </tr>
    `;
  }

  async function refreshDashboard() {
    if (isRefreshing) return;
    const button = document.getElementById('refreshDashboardButton');
    const status = document.getElementById('dashboardStatus');
    const filters = currentFilters();
    const categories = payload.categories || [];

    isRefreshing = true;
    setStatus('กำลังอัปเดต...', 'loading');
    setButtonLoading(button, true);

    try {
      const response = await fetch(`/telemed/api/summary?${buildQueryString(filters)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('API_ERROR');
      const result = await response.json();
      renderDashboard(result.data, result.filters, categories);
      payload.data = result.data;
      payload.filters = result.filters;
      setStatus('อัปเดตข้อมูลสำเร็จ', 'success');
      if (status) window.setTimeout(() => setStatus('', ''), 3500);
    } catch (err) {
      setStatus('ไม่สามารถอัปเดตข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล', 'error');
    } finally {
      setButtonLoading(button, false);
      isRefreshing = false;
    }
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('loading', loading);
    const label = button.querySelector('span');
    if (label) label.textContent = loading ? 'กำลังอัปเดต...' : 'รีเฟรชข้อมูล';
  }

  function setStatus(message, type) {
    const status = document.getElementById('dashboardStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `dashboard-status ${type || ''}`.trim();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setTextBySelector(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replaceAll('"', '\\"');
  }

  function setupTableToggle() {
    const summaryTable = document.getElementById('telemedSummaryTable');
    const tableViewButtons = document.querySelectorAll('[data-table-view]');
    if (!summaryTable || tableViewButtons.length === 0) return;

    tableViewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.tableView === 'detail' ? 'detail' : 'summary';
        summaryTable.classList.toggle('detail-mode', view === 'detail');
        summaryTable.classList.toggle('summary-mode', view === 'summary');
        tableViewButtons.forEach((item) => item.classList.toggle('active', item === button));
      });
    });
  }

  trendChart = createTrendChart(payload.data || payload, payload.categories || []);
  channelChart = createChannelChart(payload.data || payload);
  setupTableToggle();

  const refreshButton = document.getElementById('refreshDashboardButton');
  if (refreshButton) refreshButton.addEventListener('click', refreshDashboard);
})();
