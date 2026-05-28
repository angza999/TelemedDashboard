(function () {
  const payloadEl = document.getElementById('executivePayload');
  const payload = payloadEl ? JSON.parse(payloadEl.textContent) : { metrics: { trend: [] }, channel: {}, target: { rows: [] } };
  const trend = payload.metrics.trend || [];
  const targetRows = (payload.target && payload.target.rows) || [];
  const charts = [];

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
      window.setTimeout(() => charts.forEach((chart) => chart.resize()), 0);
    });
  });

  const trendEl = document.getElementById('execTrendChart');
  const channelEl = document.getElementById('execChannelChart');
  const diseaseEl = document.getElementById('execDiseaseChart');
  const departmentTargetEl = document.getElementById('departmentTargetChart');
  const departmentPercentEl = document.getElementById('departmentPercentChart');

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

  if (departmentTargetEl) {
    charts.push(new Chart(departmentTargetEl, {
      type: 'bar',
      data: {
        labels: targetRows.map((row) => row.department),
        datasets: [
          {
            label: 'Telemed จริง',
            data: targetRows.map((row) => row.telemed_total),
            backgroundColor: '#0f766e',
            borderWidth: 0
          },
          {
            label: 'เป้าหมาย 50%',
            data: targetRows.map((row) => row.target_50),
            backgroundColor: '#f59e0b',
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } }
        }
      }
    }));
  }

  if (departmentPercentEl) {
    charts.push(new Chart(departmentPercentEl, {
      type: 'bar',
      data: {
        labels: targetRows.map((row) => row.department),
        datasets: [
          {
            label: 'ทำได้ %',
            data: targetRows.map((row) => row.telemed_percent),
            backgroundColor: targetRows.map((row) => (row.telemed_percent >= 50 ? '#16a34a' : row.telemed_percent >= 45 ? '#f59e0b' : '#f97316')),
            borderWidth: 0
          },
          {
            label: 'เป้าหมาย 50%',
            data: targetRows.map(() => 50),
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
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, suggestedMax: 100, ticks: { callback: (value) => `${value}%` } },
          x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } }
        }
      }
    }));
  }
})();
