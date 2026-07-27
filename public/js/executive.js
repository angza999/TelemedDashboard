(function () {
  const payloadEl = document.getElementById('executivePayload');
  const payload = payloadEl ? JSON.parse(payloadEl.textContent) : { metrics: { trend: [] }, channel: {}, target: { rows: [] } };
  const trend = payload.metrics.trend || [];
  const targetRows = (payload.target && payload.target.rows) || [];
  const charts = [];
  const chartFontFamily = "'Segoe UI', Tahoma, 'Noto Sans Thai', 'Sarabun', sans-serif";
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function preferredScrollBehavior() {
    return prefersReducedMotion.matches ? 'auto' : 'smooth';
  }

  function resizeCharts() {
    charts.forEach((chart) => {
      if (chart && chart.canvas) {
        chart.resize();
        chart.update('none');
      }
    });
    refreshDepartmentCharts();
  }

  function chartFont(size = 12, weight = '500') {
    return {
      family: chartFontFamily,
      size,
      weight
    };
  }

  function textChartOptions() {
    return {
      devicePixelRatio: window.devicePixelRatio || 1,
      font: {
        family: chartFontFamily
      }
    };
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready.catch(() => undefined);
    }
    return Promise.resolve();
  }

  function afterLayout() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }

  function isVisibleCanvas(canvas) {
    const wrapper = canvas ? canvas.closest('.target-chart-canvas-wrap') : null;
    return Boolean(wrapper && wrapper.offsetWidth > 0 && wrapper.offsetHeight > 0);
  }

  function refreshDepartmentCharts() {
    [departmentTargetChart, departmentPercentChart].forEach((chart) => {
      if (chart && chart.canvas && isVisibleCanvas(chart.canvas)) {
        chart.resize();
        chart.update('none');
      }
    });
  }

  document.querySelectorAll('[data-exec-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.execTab;
      document.querySelectorAll('[data-exec-tab]').forEach((item) => item.classList.toggle('active', item === button));
      document.querySelectorAll('[data-exec-panel]').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.execPanel === tab);
      });
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
      if (tab === 'department-target') {
        scheduleDepartmentCharts(activeTargetChartLimit, 120);
      } else {
        window.setTimeout(resizeCharts, 120);
      }
    });
  });

  const trendEl = document.getElementById('execTrendChart');
  const channelEl = document.getElementById('execChannelChart');
  const departmentTargetEl = document.getElementById('departmentTargetChart');
  const departmentPercentEl = document.getElementById('departmentPercentChart');
  const numberFormat = new Intl.NumberFormat('th-TH');
  const departmentTargetPanel = document.querySelector('[data-exec-panel="department-target"]');

  function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    const label = button.querySelector('span');
    if (!button.dataset.defaultLabel && label) button.dataset.defaultLabel = label.textContent;
    button.classList.toggle('is-loading', loading);
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
    if ('disabled' in button) button.disabled = loading;
    if (label) label.textContent = loading ? loadingText : button.dataset.defaultLabel;
  }

  document.querySelectorAll('form[action="/executive"]').forEach((form) => {
    form.addEventListener('submit', () => {
      setButtonLoading(form.querySelector('[data-executive-submit], button[type="submit"]'), true, 'กำลังโหลด...');
    });
  });

  const pdfButton = document.querySelector('[data-executive-pdf]');
  const executiveStatus = document.querySelector('[data-executive-status]');
  if (pdfButton) {
    pdfButton.addEventListener('click', async (event) => {
      event.preventDefault();
      if (pdfButton.classList.contains('is-loading')) return;
      setButtonLoading(pdfButton, true, 'กำลังสร้าง PDF...');
      if (executiveStatus) executiveStatus.textContent = 'กำลังสร้างรายงาน PDF กรุณารอสักครู่';
      try {
        const response = await fetch(pdfButton.href, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('PDF export failed');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const download = document.createElement('a');
        const disposition = response.headers.get('content-disposition') || '';
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
        download.href = objectUrl;
        download.download = filenameMatch ? filenameMatch[1] : 'telemed_executive_report.pdf';
        document.body.appendChild(download);
        download.click();
        download.remove();
        URL.revokeObjectURL(objectUrl);
        if (executiveStatus) executiveStatus.textContent = 'สร้างรายงาน PDF สำเร็จ';
      } catch (error) {
        if (executiveStatus) executiveStatus.textContent = 'ไม่สามารถสร้างรายงาน PDF ได้ กรุณาลองใหม่';
      } finally {
        setButtonLoading(pdfButton, false, '');
      }
    });
  }

  function statusColor(percent) {
    if (percent >= 50) return '#16a34a';
    if (percent >= 45) return '#f59e0b';
    return '#f97316';
  }

  function displayName(name) {
    const text = String(name || 'ไม่ระบุห้อง');
    return text.length > 28 ? `${text.slice(0, 27)}...` : text;
  }

  function limitRows(rows, limit) {
    if (limit === 'all') return rows;
    return rows.slice(0, Number(limit || 10));
  }

  function hasDataAnomaly(row) {
    if (row && row.is_data_anomaly) return true;
    const opd = Number(row && row.opd_total || 0);
    const telemed = Number(row && row.telemed_total || 0);
    return (opd <= 0 && telemed > 0) || (opd > 0 && telemed > opd);
  }

  function hasNoData(row) {
    if (row && row.is_no_data) return true;
    const opd = Number(row && row.opd_total || 0);
    const telemed = Number(row && row.telemed_total || 0);
    return opd <= 0 && telemed <= 0;
  }

  function validTargetRows() {
    return targetRows.filter((row) => !hasDataAnomaly(row) && !hasNoData(row));
  }

  function targetChartRows(limit) {
    const sorted = validTargetRows().slice().sort((a, b) => {
      const failedA = a.diff_from_target < 0 ? 0 : 1;
      const failedB = b.diff_from_target < 0 ? 0 : 1;
      if (failedA !== failedB) return failedA - failedB;
      return a.diff_from_target - b.diff_from_target;
    });
    return limitRows(sorted, limit);
  }

  function gapChartRows(limit) {
    const sorted = validTargetRows()
      .filter((row) => Number(row.diff_from_target || 0) < 0)
      .slice()
      .sort((a, b) => Number(a.diff_from_target || 0) - Number(b.diff_from_target || 0));
    return limitRows(sorted, limit);
  }

  function sizeCanvas(canvas, rowCount) {
    if (!canvas) return false;
    const wrapper = canvas.closest('.target-chart-canvas-wrap');
    const height = Math.max(220, Math.min(420, rowCount * 29 + 92));
    const wrapperWidth = wrapper ? Math.floor(wrapper.clientWidth) : Math.floor(canvas.clientWidth);
    if (!wrapperWidth) return false;
    const width = wrapperWidth;

    if (wrapper) wrapper.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.display = 'block';
    return true;
  }

  function diffText(value) {
    const diff = Number(value || 0);
    if (diff < 0) return `ต้องเพิ่ม ${numberFormat.format(Math.abs(diff))} ราย`;
    if (diff > 0) return `เกินเป้า ${numberFormat.format(diff)} ราย`;
    return 'ถึงเป้า';
  }

  function tooltipAfterBody(items) {
    const index = items[0] ? items[0].dataIndex : 0;
    const row = items[0] && items[0].chart.$targetRows ? items[0].chart.$targetRows[index] : null;
    if (!row) return [];
    return [
      `ห้องส่งตรวจ: ${row.department || 'ไม่ระบุห้อง'}`,
      `กลุ่มบริการ: ${row.service_group || 'ไม่ระบุกลุ่ม'}`,
      `OPD ทั้งหมด: ${numberFormat.format(row.opd_total)} ราย`,
      `จำนวน Telemed ที่ทำได้: ${numberFormat.format(row.telemed_total)} ราย`,
      `เป้าหมาย 50%: ${numberFormat.format(row.target_50)} ราย`,
      `สัดส่วน Telemed ต่อ OPD: ${Number(row.telemed_percent || 0).toFixed(2)}%`,
      diffText(row.diff_from_target)
    ];
  }

  const barEndLabelPlugin = {
    id: 'barEndLabelPlugin',
    afterDatasetsDraw(chart, args, options) {
      if (!options || !options.enabled) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = `700 11px ${chartFontFamily}`;
      ctx.fillStyle = '#475569';
      ctx.textBaseline = 'middle';
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const rawValue = Number(dataset.data[index] || 0);
          if (!rawValue) return;
          const position = bar.tooltipPosition();
          const nearRightEdge = position.x + 56 > chartArea.right;
          ctx.textAlign = nearRightEdge ? 'right' : 'left';
          const x = nearRightEdge ? chartArea.right - 4 : position.x + 6;
          ctx.fillText(numberFormat.format(rawValue), x, position.y);
        });
      });
      ctx.restore();
    }
  };

  if (trendEl) {
    const highestTotal = trend.reduce((max, row) => Math.max(max, Number(row.total || 0)), 0);
    charts.push(new Chart(trendEl, {
      type: 'line',
      data: {
        labels: trend.map((row) => row.period),
        datasets: [
          {
            label: 'ผู้รับบริการ Telemed ทั้งหมด',
            data: trend.map((row) => row.total),
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.12)',
            fill: true,
            tension: 0.28,
            borderWidth: 3,
            pointRadius: trend.map((row) => Number(row.total || 0) === highestTotal && highestTotal > 0 ? 6 : 3),
            pointHoverRadius: 7,
            pointBackgroundColor: trend.map((row) => Number(row.total || 0) === highestTotal && highestTotal > 0 ? '#f59e0b' : '#0f766e')
          },
          {
            label: 'ค่าเฉลี่ย',
            data: trend.map(() => Number(payload.metrics.averagePerTrendPeriod || 0)),
            borderColor: '#64748b',
            backgroundColor: '#64748b',
            borderDash: [6, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        ...textChartOptions(),
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, font: chartFont(12, '600') }
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const row = trend[items[0] ? items[0].dataIndex : 0];
                if (!row) return '';
                return `${payload.filters && payload.filters.granularity === 'month' ? 'เดือน' : 'วันที่'}: ${row.period}`;
              },
              afterBody: (items) => {
                const row = trend[items[0] ? items[0].dataIndex : 0];
                if (!row) return [];
                const details = [
                  `เบาหวานรวม: ${numberFormat.format(row.dm || 0)} ครั้ง`,
                  `ความดันรวม: ${numberFormat.format(row.ht || 0)} ครั้ง`,
                  `B2B: ${numberFormat.format(row.b2b || 0)} ครั้ง`,
                  `B2C: ${numberFormat.format(row.b2c || 0)} ครั้ง`
                ];
                if (Number(row.total || 0) === highestTotal && highestTotal > 0) {
                  details.push('จุดสูงสุดของช่วงวันที่เลือก');
                }
                return details;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#e7edf4' },
            ticks: { precision: 0, font: chartFont(11), maxTicksLimit: 6 }
          },
          x: {
            grid: { display: false },
            ticks: { font: chartFont(11), maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
          }
        }
      }
    }));
  }

  if (channelEl) {
    charts.push(new Chart(channelEl, {
      type: 'doughnut',
      data: {
        labels: ['B2B', 'B2C'],
        datasets: [{ data: [payload.metrics.b2b || 0, payload.metrics.b2c || 0], backgroundColor: ['#2563eb', '#f59e0b'], borderWidth: 0 }]
      },
      options: {
        ...textChartOptions(),
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, font: chartFont(12, '600') }
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const total = Number(payload.metrics.b2b || 0) + Number(payload.metrics.b2c || 0);
                const value = Number(item.raw || 0);
                const percent = total > 0 ? (value / total) * 100 : 0;
                return `${item.label}: ${numberFormat.format(value)} ครั้ง (${percent.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    }));
  }

  let departmentTargetChart = null;
  let departmentPercentChart = null;
  let activeTargetChartLimit = '10';
  let departmentRenderTimer = null;

  function isDepartmentTargetActive() {
    return Boolean(
      departmentTargetPanel
      && departmentTargetPanel.classList.contains('active')
      && departmentTargetPanel.offsetWidth > 0
    );
  }

  async function scheduleDepartmentCharts(limit = '10', delay = 0) {
    activeTargetChartLimit = limit;
    window.clearTimeout(departmentRenderTimer);
    departmentRenderTimer = window.setTimeout(async () => {
      await waitForFonts();
      await afterLayout();
      if (!isDepartmentTargetActive()) return;
      renderDepartmentCharts(limit);
      window.setTimeout(refreshDepartmentCharts, 150);
    }, delay);
  }

  function setTargetChartEmpty(canvas, empty) {
    if (!canvas) return;
    const wrapper = canvas.closest('.target-chart-canvas-wrap');
    const message = wrapper && wrapper.querySelector('[data-target-chart-empty]');
    canvas.hidden = empty;
    canvas.style.display = empty ? 'none' : 'block';
    if (message) message.hidden = !empty;
    if (wrapper) wrapper.classList.toggle('empty', empty);
  }

  function renderDepartmentCharts(limit = '10') {
    if (!isDepartmentTargetActive()) return;
    activeTargetChartLimit = limit;
    const targetDataRows = targetChartRows(limit);
    const gapDataRows = gapChartRows(limit);

    if (departmentTargetChart) {
      departmentTargetChart.destroy();
      departmentTargetChart = null;
    }
    if (departmentPercentChart) {
      departmentPercentChart.destroy();
      departmentPercentChart = null;
    }

    setTargetChartEmpty(departmentTargetEl, targetDataRows.length === 0);
    setTargetChartEmpty(departmentPercentEl, gapDataRows.length === 0);
    const targetCanvasReady = targetDataRows.length > 0 && sizeCanvas(departmentTargetEl, targetDataRows.length);
    const percentCanvasReady = gapDataRows.length > 0 && sizeCanvas(departmentPercentEl, gapDataRows.length);

    if (!targetCanvasReady && !percentCanvasReady) return;

    if (departmentTargetEl && targetCanvasReady) {
      departmentTargetChart = new Chart(departmentTargetEl, {
      type: 'bar',
      plugins: [barEndLabelPlugin],
      data: {
        labels: targetDataRows.map((row) => displayName(row.department)),
        datasets: [
          {
            label: 'จำนวน Telemed ที่ทำได้',
            data: targetDataRows.map((row) => row.telemed_total),
            backgroundColor: '#0f766e',
            barThickness: 14,
            maxBarThickness: 18,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            borderWidth: 0
          },
          {
            label: 'เป้าหมาย 50%',
            data: targetDataRows.map((row) => row.target_50),
            backgroundColor: '#f59e0b',
            barThickness: 14,
            maxBarThickness: 18,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            borderWidth: 0
          }
        ]
      },
      options: {
        ...textChartOptions(),
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: chartFont(13, '600') } },
          barEndLabelPlugin: { enabled: targetDataRows.length <= 20 },
          tooltip: {
            callbacks: {
              title: (items) => {
                const row = targetDataRows[items[0] ? items[0].dataIndex : 0];
                return row ? row.department : '';
              },
              afterBody: tooltipAfterBody
            }
          }
        },
        layout: { padding: { top: 4, right: 10, bottom: 4, left: 4 } },
        scales: {
          x: { beginAtZero: true, alignToPixels: true, ticks: { precision: 0, font: chartFont(12) } },
          y: { alignToPixels: true, grid: { display: false }, ticks: { font: chartFont(12, '500') } }
        }
      }
      });
      departmentTargetChart.$targetRows = targetDataRows;
    }

    if (departmentPercentEl && percentCanvasReady) {
      departmentPercentChart = new Chart(departmentPercentEl, {
      type: 'bar',
      plugins: [barEndLabelPlugin],
      data: {
        labels: gapDataRows.map((row) => displayName(row.department)),
        datasets: [
          {
            label: 'ต้องเพิ่มเพื่อถึงเป้า',
            data: gapDataRows.map((row) => Math.max(0, -Number(row.diff_from_target || 0))),
            backgroundColor: gapDataRows.map((row) => (row.diff_from_target < 0 ? '#f97316' : '#16a34a')),
            barThickness: 16,
            maxBarThickness: 20,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            borderWidth: 0
          }
        ]
      },
      options: {
        ...textChartOptions(),
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: chartFont(13, '600') } },
          barEndLabelPlugin: { enabled: gapDataRows.length <= 20 },
          tooltip: {
            callbacks: {
              title: (items) => {
                const row = gapDataRows[items[0] ? items[0].dataIndex : 0];
                return row ? row.department : '';
              },
              label: (item) => `${item.dataset.label}: ${numberFormat.format(item.raw)} ราย`,
              afterBody: tooltipAfterBody
            }
          }
        },
        layout: { padding: { top: 4, right: 10, bottom: 4, left: 4 } },
        scales: {
          x: { beginAtZero: true, alignToPixels: true, ticks: { precision: 0, font: chartFont(12) } },
          y: { alignToPixels: true, grid: { display: false }, ticks: { font: chartFont(12, '500') } }
        }
      }
      });
      departmentPercentChart.$targetRows = gapDataRows;
    }

    refreshDepartmentCharts();
  }

  scheduleDepartmentCharts('10', 80);

  document.querySelectorAll('[data-target-chart-limit]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-target-chart-limit]').forEach((item) => item.classList.toggle('active', item === button));
      scheduleDepartmentCharts(button.dataset.targetChartLimit || '10', 40);
    });
  });

  const serviceGroupInput = document.querySelector('[data-service-group-input]');
  document.querySelectorAll('[data-service-group]').forEach((button) => {
    button.addEventListener('click', () => {
      if (serviceGroupInput && serviceGroupInput.form) {
        serviceGroupInput.value = button.dataset.serviceGroup || 'all';
        serviceGroupInput.form.submit();
      }
    });
  });

  const departmentTargetTable = document.querySelector('.department-target-table');
  document.querySelectorAll('[data-target-table-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.targetTableView === 'detail' ? 'detail' : 'summary';
      document.querySelectorAll('[data-target-table-view]').forEach((item) => item.classList.toggle('active', item === button));
      if (departmentTargetTable) {
        departmentTargetTable.classList.toggle('summary-mode', view === 'summary');
        departmentTargetTable.classList.toggle('detail-mode', view === 'detail');
      }
    });
  });

  const targetTableRows = Array.from(document.querySelectorAll('[data-target-row]'));
  const targetRoomSearch = document.querySelector('[data-target-room-search]');
  const targetTableLimitButton = document.querySelector('[data-target-table-limit]');
  const targetTableClearButton = document.querySelector('[data-target-clear-filters]');
  const targetStatusFilterButtons = Array.from(document.querySelectorAll('[data-target-status-filter]'));
  let targetTableShowAll = false;
  let targetTableStatusFilter = 'all';

  function scrollToTargetTable() {
    document.getElementById('departmentTargetTable')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  }

  function setTargetStatusFilter(status, shouldScroll = false) {
    targetTableStatusFilter = ['passed', 'near', 'failed', 'data_check', 'no_data'].includes(status) ? status : 'all';
    targetTableShowAll = false;
    targetStatusFilterButtons.forEach((button) => {
      const active = button.dataset.targetStatusFilter === targetTableStatusFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateTargetTableRows();
    if (shouldScroll) scrollToTargetTable();
  }

  function updateTargetTableRows() {
    const term = String(targetRoomSearch && targetRoomSearch.value || '').trim().toLocaleLowerCase('th-TH');
    let visibleIndex = 0;
    targetTableRows.forEach((row) => {
      const department = String(row.dataset.department || '').toLocaleLowerCase('th-TH');
      const matchesSearch = !term || department.includes(term);
      const matchesStatus = targetTableStatusFilter === 'all' || row.dataset.targetStatus === targetTableStatusFilter;
      const matches = matchesSearch && matchesStatus;
      const withinLimit = targetTableShowAll || term || targetTableStatusFilter !== 'all' || visibleIndex < 10;
      row.hidden = !matches || !withinLimit;
      if (matches) visibleIndex += 1;
    });

    if (targetTableLimitButton) {
      const matchedCount = targetTableRows.filter((row) => {
        const department = String(row.dataset.department || '').toLocaleLowerCase('th-TH');
        const matchesSearch = !term || department.includes(term);
        const matchesStatus = targetTableStatusFilter === 'all' || row.dataset.targetStatus === targetTableStatusFilter;
        return matchesSearch && matchesStatus;
      }).length;
      const hasMore = matchedCount > 10 && !term && targetTableStatusFilter === 'all';
      targetTableLimitButton.hidden = !hasMore && !targetTableShowAll;
      targetTableLimitButton.textContent = targetTableShowAll ? 'แสดง Top 10' : 'ดูทั้งหมด';
    }

    if (targetTableClearButton) targetTableClearButton.hidden = !term && targetTableStatusFilter === 'all';
  }

  if (targetRoomSearch) {
    targetRoomSearch.addEventListener('input', () => {
      targetTableShowAll = false;
      updateTargetTableRows();
    });
  }

  if (targetTableLimitButton) {
    targetTableLimitButton.addEventListener('click', () => {
      targetTableShowAll = !targetTableShowAll;
      updateTargetTableRows();
    });
  }

  targetStatusFilterButtons.forEach((button) => {
    button.addEventListener('click', () => setTargetStatusFilter(button.dataset.targetStatusFilter || 'all'));
  });

  if (targetTableClearButton) {
    targetTableClearButton.addEventListener('click', () => {
      if (targetRoomSearch) targetRoomSearch.value = '';
      setTargetStatusFilter('all');
    });
  }

  updateTargetTableRows();

  const departmentDetailModal = document.getElementById('departmentDetailModal');
  const dataQualityPanel = document.getElementById('departmentTargetDataQuality');
  const dataQualityContent = document.querySelector('[data-target-data-quality-content]');
  const dataQualityToggle = document.querySelector('[data-target-data-quality-toggle]');
  const targetRowsByDepcode = new Map(targetRows.map((row) => [String(row.depcode || ''), row]));
  let lastModalTrigger = null;

  function setDataQualityCollapsed(collapsed) {
    if (!dataQualityContent || !dataQualityToggle) return;
    dataQualityContent.hidden = collapsed;
    dataQualityToggle.textContent = collapsed ? 'แสดงรายการ' : 'ซ่อนรายการ';
    dataQualityToggle.setAttribute('aria-expanded', String(!collapsed));
  }

  if (dataQualityToggle) {
    dataQualityToggle.addEventListener('click', () => {
      setDataQualityCollapsed(!dataQualityContent.hidden);
    });
  }

  function targetDisplayStatus(row) {
    if (hasNoData(row)) return 'ไม่มีข้อมูล';
    if (hasDataAnomaly(row)) return 'ตรวจสอบข้อมูล';
    if (row.display_status) return row.display_status;
    if (Number(row.telemed_total || 0) >= Number(row.target_50 || 0)) return 'ผ่าน';
    if (Number(row.telemed_percent || 0) >= 45) return 'ใกล้ถึงเป้า';
    return 'ไม่ผ่าน';
  }

  function targetStatusClass(row) {
    const status = targetDisplayStatus(row);
    if (status === 'ไม่มีข้อมูล') return 'no-data';
    if (status === 'ตรวจสอบข้อมูล') return 'data-check';
    if (status === 'ผ่าน') return 'passed';
    if (status === 'ใกล้ถึงเป้า') return 'near';
    return 'failed';
  }

  function targetRisk(row) {
    if (row.risk && row.risk.label && row.risk.className) return row.risk;
    if (hasNoData(row)) return { label: 'ไม่มีข้อมูล', className: 'no-data' };
    if (hasDataAnomaly(row)) return { label: 'ตรวจสอบข้อมูล', className: 'data-check' };
    if (targetDisplayStatus(row) === 'ผ่าน') return { label: 'ผ่านเป้า', className: 'passed' };
    if (targetDisplayStatus(row) === 'ใกล้ถึงเป้า') return { label: 'ใกล้ถึงเป้า', className: 'near' };
    const shortage = Math.abs(Math.min(Number(row.diff_from_target || 0), 0));
    if (shortage > 500) return { label: 'เร่งด่วนมาก', className: 'critical' };
    if (shortage >= 200) return { label: 'เร่งด่วน', className: 'urgent' };
    return { label: 'ควรติดตาม', className: 'watch' };
  }

  function targetRecommendation(row) {
    if (row.recommendation) return row.recommendation;
    if (hasNoData(row)) return 'ไม่พบ OPD และ Telemed ในช่วงวันที่เลือก จึงยังไม่สามารถประเมินเป้าหมายได้';
    if (hasDataAnomaly(row)) return 'ควรตรวจสอบข้อมูลก่อนใช้ประเมินเป้าหมาย';
    const shortage = Math.abs(Math.min(Number(row.diff_from_target || 0), 0));
    return shortage > 0
      ? `ควรเพิ่มอีก ${numberFormat.format(shortage)} รายเพื่อถึงเป้าหมาย 50%`
      : 'ผลการดำเนินงานถึงเป้าหมายแล้ว ควรรักษาแนวทางการให้บริการปัจจุบัน';
  }

  function setDetailText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function openDepartmentDetail(row, trigger) {
    if (!departmentDetailModal || !row) return;
    const anomaly = hasDataAnomaly(row);
    const noData = hasNoData(row);
    const status = targetDisplayStatus(row);
    const risk = targetRisk(row);
    const statusElement = document.querySelector('[data-target-detail-status]');
    const riskElement = document.querySelector('[data-target-detail-risk]');
    const qualityWrap = document.querySelector('[data-target-detail-quality-wrap]');

    setDetailText('[data-target-detail-name]', row.department || 'ไม่ระบุห้อง');
    setDetailText('[data-target-detail-group]', row.service_group || 'ไม่ระบุกลุ่มบริการ');
    setDetailText('[data-target-detail-opd]', `${numberFormat.format(row.opd_total || 0)} ราย`);
    setDetailText('[data-target-detail-telemed]', `${numberFormat.format(row.telemed_total || 0)} ราย`);
    setDetailText('[data-target-detail-target]', `${numberFormat.format(row.target_50 || 0)} ราย`);
    setDetailText('[data-target-detail-percent]', noData ? 'ไม่มีข้อมูล' : (anomaly ? 'สูงผิดปกติ' : `${Number(row.telemed_percent || 0).toFixed(2)}%`));
    setDetailText('[data-target-detail-gap]', noData ? 'ประเมินไม่ได้' : diffText(row.diff_from_target));
    setDetailText('[data-target-detail-recommendation]', targetRecommendation(row));
    setDetailText('[data-target-detail-quality-title]', noData ? 'สถานะข้อมูล' : 'ข้อมูลควรตรวจสอบ');
    setDetailText('[data-target-detail-quality]', noData ? (row.no_data_reason || 'ไม่พบ OPD และ Telemed ในช่วงวันที่เลือก') : (row.data_quality_reason || ''));

    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = `target-status ${targetStatusClass(row)}`;
    }
    if (riskElement) {
      riskElement.textContent = risk.label;
      riskElement.className = `followup-priority ${risk.className}`;
    }
    if (qualityWrap) qualityWrap.classList.toggle('hidden', !anomaly && !noData);

    const adminDetail = document.querySelector('[data-target-detail-admin]');
    if (adminDetail) {
      const opdSource = Array.isArray(row.opd_source_deps) ? row.opd_source_deps.join(', ') : '-';
      const telemedSource = Array.isArray(row.telemed_count_deps) ? row.telemed_count_deps.join(', ') : '-';
      adminDetail.textContent = `${row.calculation_note || '-'} | OPD source: ${opdSource} | Telemed source: ${telemedSource}`;
    }

    lastModalTrigger = trigger || document.activeElement;
    departmentDetailModal.classList.remove('hidden');
    departmentDetailModal.setAttribute('aria-hidden', 'false');
    departmentDetailModal.querySelector('[data-target-detail-close]')?.focus();
  }

  function closeDepartmentDetail() {
    if (!departmentDetailModal) return;
    departmentDetailModal.classList.add('hidden');
    departmentDetailModal.setAttribute('aria-hidden', 'true');
    lastModalTrigger?.focus?.();
  }

  document.querySelectorAll('[data-target-detail]').forEach((button) => {
    button.addEventListener('click', () => openDepartmentDetail(targetRowsByDepcode.get(String(button.dataset.targetDetail || '')), button));
  });

  document.querySelectorAll('[data-target-detail-close]').forEach((button) => {
    button.addEventListener('click', closeDepartmentDetail);
  });

  if (departmentDetailModal) {
    departmentDetailModal.addEventListener('click', (event) => {
      if (event.target === departmentDetailModal) closeDepartmentDetail();
    });
  }

  const departmentGapModal = document.getElementById('departmentGapModal');

  function openDepartmentGap(trigger) {
    if (!departmentGapModal) return;
    lastModalTrigger = trigger || document.activeElement;
    departmentGapModal.classList.remove('hidden');
    departmentGapModal.setAttribute('aria-hidden', 'false');
    departmentGapModal.querySelector('[data-target-gap-close]')?.focus();
  }

  function closeDepartmentGap() {
    if (!departmentGapModal) return;
    departmentGapModal.classList.add('hidden');
    departmentGapModal.setAttribute('aria-hidden', 'true');
    lastModalTrigger?.focus?.();
  }

  document.querySelectorAll('[data-target-gap-close]').forEach((button) => button.addEventListener('click', closeDepartmentGap));
  if (departmentGapModal) {
    departmentGapModal.addEventListener('click', (event) => {
      if (event.target === departmentGapModal) closeDepartmentGap();
    });
  }

  function trapModalFocus(event) {
    const modal = [departmentDetailModal, departmentGapModal].find((item) => item && !item.classList.contains('hidden'));
    if (!modal || event.key !== 'Tab') return;
    const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleTargetAction(action, trigger) {
    if (action === 'gap') {
      openDepartmentGap(trigger);
      return;
    }
    if (action === 'data_check') {
      if (dataQualityPanel) {
        setDataQualityCollapsed(false);
        dataQualityPanel.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
      } else {
        setTargetStatusFilter('data_check', true);
      }
      return;
    }
    if (action === 'passed' || action === 'failed') setTargetStatusFilter(action, true);
  }

  document.querySelectorAll('[data-target-kpi-action]').forEach((element) => {
    element.addEventListener('click', () => handleTargetAction(element.dataset.targetKpiAction, element));
    if (element.getAttribute('role') === 'button') {
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleTargetAction(element.dataset.targetKpiAction, element);
        }
      });
    }
  });

  const stickySummary = document.querySelector('[data-target-sticky-summary]');
  const targetKpiAnchor = document.getElementById('departmentTargetKpis');
  const targetStatusChips = document.querySelector('.target-status-chips');
  if (stickySummary && targetKpiAnchor && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const visible = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      stickySummary.classList.toggle('visible', visible);
      stickySummary.setAttribute('aria-hidden', String(!visible));
    }, { threshold: 0 }).observe(targetKpiAnchor);
  }
  if (stickySummary && targetStatusChips && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      stickySummary.classList.toggle('status-chips-visible', entry.isIntersecting);
    }, { threshold: 0.15 }).observe(targetStatusChips);
  }

  const hoverPreview = document.querySelector('[data-target-hover-preview]');
  let hoverPreviewTimer = null;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  function showDepartmentPreview(trigger) {
    const row = targetRowsByDepcode.get(String(trigger.dataset.targetDetail || ''));
    if (!hoverPreview || !row || window.matchMedia('(hover: none)').matches) return;
    const anomaly = hasDataAnomaly(row);
    const noData = hasNoData(row);
    const percentText = noData ? 'สัดส่วน: ไม่มีข้อมูล' : (anomaly ? 'สัดส่วน: ตรวจสอบข้อมูล' : `สัดส่วน: ${Number(row.telemed_percent || 0).toFixed(2)}%`);
    const gapText = noData ? 'ประเมินไม่ได้' : diffText(row.diff_from_target);
    hoverPreview.innerHTML = `<strong>${escapeHtml(row.department || 'ไม่ระบุห้อง')}</strong><span>OPD ${numberFormat.format(row.opd_total || 0)} | Telemed ${numberFormat.format(row.telemed_total || 0)}</span><span>${percentText} | เป้าหมาย ${numberFormat.format(row.target_50 || 0)}</span><span>${gapText} | สถานะ: ${targetDisplayStatus(row)}</span>`;
    const rect = trigger.getBoundingClientRect();
    const previewWidth = 286;
    const left = Math.max(12, Math.min(window.innerWidth - previewWidth - 12, rect.left));
    const top = Math.min(window.innerHeight - 124, rect.bottom + 8);
    hoverPreview.style.left = `${left}px`;
    hoverPreview.style.top = `${Math.max(12, top)}px`;
    hoverPreview.classList.remove('hidden');
  }

  function hideDepartmentPreview() {
    window.clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = window.setTimeout(() => hoverPreview?.classList.add('hidden'), 80);
  }

  document.querySelectorAll('[data-target-detail]').forEach((trigger) => {
    trigger.addEventListener('pointerenter', () => showDepartmentPreview(trigger));
    trigger.addEventListener('pointerleave', hideDepartmentPreview);
    trigger.addEventListener('focusin', () => showDepartmentPreview(trigger));
    trigger.addEventListener('focusout', hideDepartmentPreview);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDepartmentDetail();
      closeDepartmentGap();
    }
    trapModalFocus(event);
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => scheduleDepartmentCharts(activeTargetChartLimit, 0), 150);
  });
})();
