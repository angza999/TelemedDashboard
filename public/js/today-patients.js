(function () {
  const refreshButton = document.getElementById('todayRefreshButton');
  const statusMessage = document.getElementById('todayStatusMessage');
  const dbStatus = document.getElementById('todayDbStatus');
  const dataDate = document.getElementById('todayDataDate');
  const lastUpdated = document.getElementById('todayLastUpdated');
  const valueEls = document.querySelectorAll('[data-today-value]');

  let isRefreshing = false;
  let hasData = false;

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('th-TH');
  }

  function formatDataDate(value) {
    if (!value) return 'ข้อมูลประจำวันที่ -';
    const date = new Date(`${value}T00:00:00+07:00`);
    return `ข้อมูลประจำวันที่ ${date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`;
  }

  function formatTime(value) {
    if (!value) return 'อัปเดตล่าสุด -';
    const date = new Date(value);
    return `อัปเดตล่าสุด ${date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} น.`;
  }

  function setLoading(isLoading) {
    isRefreshing = isLoading;
    if (!refreshButton) return;
    refreshButton.disabled = isLoading;
    refreshButton.classList.toggle('loading', isLoading);
    refreshButton.innerHTML = isLoading
      ? '<i class="bi bi-arrow-clockwise"></i> กำลังรีเฟรช...'
      : '<i class="bi bi-arrow-clockwise"></i> รีเฟรชข้อมูล';
  }

  function setStatus(type, message) {
    statusMessage.className = `dashboard-status ${type || ''}`.trim();
    statusMessage.textContent = message;
  }

  function setConnection(type, text) {
    dbStatus.className = `connection-pill ${type}`;
    dbStatus.innerHTML = `<i class="bi bi-circle-fill"></i> ${text}`;
  }

  function renderData(data) {
    valueEls.forEach((el) => {
      const key = el.dataset.todayValue;
      el.textContent = formatNumber(data[key]);
      el.closest('.today-card')?.classList.remove('loading');
    });
    dataDate.textContent = formatDataDate(data.data_date);
    lastUpdated.textContent = formatTime(data.last_updated);
    hasData = true;
  }

  async function refreshData() {
    if (isRefreshing) return;
    setLoading(true);
    setStatus('loading', hasData ? 'กำลังรีเฟรชข้อมูลล่าสุด...' : 'กำลังดึงข้อมูลล่าสุด...');

    try {
      const response = await fetch('/api/today-patients/summary', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลล่าสุดได้');
      }

      renderData(payload.data || {});
      setConnection('online', 'เชื่อมต่อ HOSxP สำเร็จ');
      setStatus('success', 'อัปเดตข้อมูลสำเร็จ');
    } catch (err) {
      setConnection('offline', 'เชื่อมต่อมีปัญหา');
      setStatus('error', hasData
        ? 'ไม่สามารถดึงข้อมูลล่าสุดได้ ระบบยังคงแสดงข้อมูลเดิม'
        : 'ไม่สามารถดึงข้อมูลล่าสุดได้');
    } finally {
      setLoading(false);
    }
  }

  valueEls.forEach((el) => el.closest('.today-card')?.classList.add('loading'));
  refreshButton?.addEventListener('click', refreshData);

  refreshData();
}());
