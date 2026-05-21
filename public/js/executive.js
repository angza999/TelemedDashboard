(function () {
  const payloadEl = document.getElementById('executivePayload');
  const payload = payloadEl ? JSON.parse(payloadEl.textContent) : { metrics: { trend: [] }, channel: {} };
  const trend = payload.metrics.trend || [];

  const trendEl = document.getElementById('execTrendChart');
  const channelEl = document.getElementById('execChannelChart');
  const diseaseEl = document.getElementById('execDiseaseChart');

  if (trendEl) {
    new Chart(trendEl, {
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
    });
  }

  if (channelEl) {
    new Chart(channelEl, {
      type: 'doughnut',
      data: {
        labels: ['B2B', 'B2C'],
        datasets: [{ data: [payload.metrics.b2b || 0, payload.metrics.b2c || 0], backgroundColor: ['#2563eb', '#f59e0b'], borderWidth: 0 }]
      },
      options: { responsive: true, cutout: '64%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  if (diseaseEl) {
    new Chart(diseaseEl, {
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
    });
  }
})();
