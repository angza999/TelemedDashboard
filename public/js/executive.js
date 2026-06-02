(function () {
  const payloadEl = document.getElementById('executivePayload');
  const payload = payloadEl ? JSON.parse(payloadEl.textContent) : { metrics: { trend: [] }, channel: {}, target: { rows: [] } };
  const trend = payload.metrics.trend || [];
  const targetRows = (payload.target && payload.target.rows) || [];
  const charts = [];

  function resizeCharts() {
    charts.forEach((chart) => {
      if (chart && chart.canvas) chart.resize();
    });
    if (departmentTargetChart && departmentTargetChart.canvas) departmentTargetChart.resize();
    if (departmentPercentChart && departmentPercentChart.canvas) departmentPercentChart.resize();
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
      window.setTimeout(resizeCharts, 0);
    });
  });

  const trendEl = document.getElementById('execTrendChart');
  const channelEl = document.getElementById('execChannelChart');
  const diseaseEl = document.getElementById('execDiseaseChart');
  const departmentTargetEl = document.getElementById('departmentTargetChart');
  const departmentPercentEl = document.getElementById('departmentPercentChart');
  const numberFormat = new Intl.NumberFormat('th-TH');

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

  function percentChartRows(limit) {
    const sorted = targetRows.slice().sort((a, b) => {
      const failedA = a.telemed_percent < 50 ? 0 : 1;
      const failedB = b.telemed_percent < 50 ? 0 : 1;
      if (failedA !== failedB) return failedA - failedB;
      return a.telemed_percent - b.telemed_percent;
    });
    return limitRows(sorted, limit);
  }

  function resizeCanvas(canvas, rowCount) {
    if (!canvas) return;
    canvas.height = Math.max(280, Math.min(900, rowCount * 34 + 80));
  }

  function tooltipAfterBody(items) {
    const index = items[0] ? items[0].dataIndex : 0;
    const row = items[0] && items[0].chart.$targetRows ? items[0].chart.$targetRows[index] : null;
    if (!row) return [];
    const diffText = row.diff_from_target < 0
      ? `ขาด ${numberFormat.format(Math.abs(row.diff_from_target))} ราย`
      : `เกิน ${numberFormat.format(row.diff_from_target)} ราย`;
    return [
      `OPD: ${numberFormat.format(row.opd_total)} ราย`,
      `Telemed: ${numberFormat.format(row.telemed_total)} ราย`,
      `เป้าหมาย: ${numberFormat.format(row.target_50)} ราย`,
      diffText
    ];
  }

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
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
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
      options: { responsive: true, cutout: '64%', plugins: { legend: { position: 'bottom' } } }
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
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
      }
    }));
  }

  let departmentTargetChart = null;
  let departmentPercentChart = null;

  function renderDepartmentCharts(limit = '10') {
    const targetDataRows = targetChartRows(limit);
    const percentDataRows = percentChartRows(limit);
    resizeCanvas(departmentTargetEl, targetDataRows.length);
    resizeCanvas(departmentPercentEl, percentDataRows.length);

    if (departmentTargetChart) departmentTargetChart.destroy();
    if (departmentPercentChart) departmentPercentChart.destroy();

    if (departmentTargetEl) {
      departmentTargetChart = new Chart(departmentTargetEl, {
      type: 'bar',
      data: {
        labels: targetDataRows.map((row) => displayName(row.department)),
        datasets: [
          {
            label: 'Telemed จริง',
            data: targetDataRows.map((row) => row.telemed_total),
            backgroundColor: '#0f766e',
            borderWidth: 0
          },
          {
            label: 'เป้าหมาย 50%',
            data: targetDataRows.map((row) => row.target_50),
            backgroundColor: '#f59e0b',
            borderWidth: 0
          }
        ]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
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
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
      });
      departmentTargetChart.$targetRows = targetDataRows;
    }

    if (departmentPercentEl) {
      departmentPercentChart = new Chart(departmentPercentEl, {
      type: 'bar',
      data: {
        labels: percentDataRows.map((row) => displayName(row.department)),
        datasets: [
          {
            label: 'ทำได้ %',
            data: percentDataRows.map((row) => row.telemed_percent),
            backgroundColor: percentDataRows.map((row) => statusColor(row.telemed_percent)),
            borderWidth: 0
          },
          {
            label: 'เป้าหมาย 50%',
            data: percentDataRows.map(() => 50),
            type: 'line',
            borderColor: '#dc2626',
            backgroundColor: '#dc2626',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (items) => {
                const row = percentDataRows[items[0] ? items[0].dataIndex : 0];
                return row ? row.department : '';
              },
              label: (item) => `${item.dataset.label}: ${item.raw}%`,
              afterBody: tooltipAfterBody
            }
          }
        },
        scales: {
          x: { beginAtZero: true, suggestedMax: 100, ticks: { callback: (value) => `${value}%` } },
          y: { grid: { display: false } }
        }
      }
      });
      departmentPercentChart.$targetRows = percentDataRows;
    }
  }

  renderDepartmentCharts('10');

  document.querySelectorAll('[data-target-chart-limit]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-target-chart-limit]').forEach((item) => item.classList.toggle('active', item === button));
      renderDepartmentCharts(button.dataset.targetChartLimit || '10');
      window.setTimeout(resizeCharts, 0);
    });
  });
})();
