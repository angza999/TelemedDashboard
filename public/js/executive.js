(function () {
  const payloadEl = document.getElementById('executivePayload');
  const payload = payloadEl ? JSON.parse(payloadEl.textContent) : { metrics: { trend: [] }, channel: {}, target: { rows: [] } };
  const trend = payload.metrics.trend || [];
  const targetRows = (payload.target && payload.target.rows) || [];
  const charts = [];
  const chartFontFamily = "'Segoe UI', Tahoma, 'Noto Sans Thai', 'Sarabun', sans-serif";

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
  const diseaseEl = document.getElementById('execDiseaseChart');
  const departmentTargetEl = document.getElementById('departmentTargetChart');
  const departmentPercentEl = document.getElementById('departmentPercentChart');
  const numberFormat = new Intl.NumberFormat('th-TH');
  const departmentTargetPanel = document.querySelector('[data-exec-panel="department-target"]');

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

  function targetChartRows(limit) {
    const sorted = targetRows.slice().sort((a, b) => {
      const failedA = a.diff_from_target < 0 ? 0 : 1;
      const failedB = b.diff_from_target < 0 ? 0 : 1;
      if (failedA !== failedB) return failedA - failedB;
      return a.diff_from_target - b.diff_from_target;
    });
    return limitRows(sorted, limit);
  }

  function gapChartRows(limit) {
    const sorted = targetRows.slice().sort((a, b) => {
      const failedA = a.diff_from_target < 0 ? 0 : 1;
      const failedB = b.diff_from_target < 0 ? 0 : 1;
      if (failedA !== failedB) return failedA - failedB;
      return a.diff_from_target - b.diff_from_target;
    });
    return limitRows(sorted, limit);
  }

  function sizeCanvas(canvas, rowCount) {
    if (!canvas) return false;
    const wrapper = canvas.closest('.target-chart-canvas-wrap');
    const height = Math.max(240, Math.min(520, rowCount * 38 + 96));
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

  function sourceList(values) {
    return Array.isArray(values) && values.length > 0 ? values.join(', ') : '-';
  }

  function tooltipAfterBody(items) {
    const index = items[0] ? items[0].dataIndex : 0;
    const row = items[0] && items[0].chart.$targetRows ? items[0].chart.$targetRows[index] : null;
    if (!row) return [];
    return [
      `ห้องส่งตรวจ: ${row.department || 'ไม่ระบุห้อง'}`,
      `กลุ่มบริการ: ${row.service_group || 'ไม่ระบุกลุ่ม'}`,
      `OPD source: ${sourceList(row.opd_source_deps)}`,
      `Telemed source: ${sourceList(row.telemed_count_deps)}`,
      `Mode: ${row.telemed_mode || '-'}`,
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
    charts.push(new Chart(trendEl, {
      type: 'line',
      data: {
        labels: trend.map((row) => row.period),
        datasets: [{
          label: 'Total Telemed',
          data: trend.map((row) => row.total),
          borderColor: '#0f766e',
          backgroundColor: '#0f766e',
          tension: 0.28,
          borderWidth: 3,
          pointRadius: 3
        }]
      },
      options: {
        ...textChartOptions(),
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, font: chartFont(12) } },
          x: { grid: { display: false }, ticks: { font: chartFont(12) } }
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
        cutout: '64%',
        plugins: { legend: { position: 'bottom', labels: { font: chartFont(13, '600') } } }
      }
    }));
  }

  if (diseaseEl) {
    charts.push(new Chart(diseaseEl, {
      type: 'bar',
      data: {
        labels: ['DM', 'HT'],
        datasets: [{ data: [payload.metrics.dm || 0, payload.metrics.ht || 0], backgroundColor: ['#14b8a6', '#fb7185'], borderWidth: 0 }]
      },
      options: {
        ...textChartOptions(),
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, font: chartFont(12) } },
          x: { grid: { display: false }, ticks: { font: chartFont(12) } }
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

  function renderDepartmentCharts(limit = '10') {
    if (!isDepartmentTargetActive()) return;
    activeTargetChartLimit = limit;
    const targetDataRows = targetChartRows(limit);
    const gapDataRows = gapChartRows(limit);
    const targetCanvasReady = sizeCanvas(departmentTargetEl, targetDataRows.length);
    const percentCanvasReady = sizeCanvas(departmentPercentEl, gapDataRows.length);

    if (!targetCanvasReady && !percentCanvasReady) return;

    if (departmentTargetChart) departmentTargetChart.destroy();
    if (departmentPercentChart) departmentPercentChart.destroy();

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

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => scheduleDepartmentCharts(activeTargetChartLimit, 0), 150);
  });
})();
