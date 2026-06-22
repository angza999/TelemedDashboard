(function () {
  const refreshButton = document.getElementById('todayRefreshButton');
  const statusMessage = document.getElementById('todayStatusMessage');
  const dbStatus = document.getElementById('todayDbStatus');
  const dataDate = document.getElementById('todayDataDate');
  const lastUpdated = document.getElementById('todayLastUpdated');
  const valueEls = document.querySelectorAll('[data-today-value]');
  const ncdCard = document.getElementById('ncdSubclinicCard');
  const ncdModal = document.getElementById('ncdSubclinicModal');
  const ncdCloseButton = document.getElementById('ncdSubclinicCloseButton');
  const ncdCancelButton = document.getElementById('ncdSubclinicCancelButton');
  const ncdStatus = document.getElementById('ncdSubclinicStatus');
  const ncdGrid = document.getElementById('ncdSubclinicGrid');
  const ncdTotal = document.getElementById('ncdSubclinicTotal');
  const ncdUpdated = document.getElementById('ncdSubclinicUpdated');
  const ncdNote = document.getElementById('ncdSubclinicNote');

  let isRefreshing = false;
  let isLoadingNcd = false;
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

  function setNcdStatus(type, message) {
    if (!ncdStatus) return;
    ncdStatus.className = `dashboard-status ${type || ''}`.trim();
    ncdStatus.textContent = message;
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

  function renderNcdSubclinics(data) {
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    if (!ncdGrid) return;

    ncdGrid.innerHTML = subclinics.map((item) => {
      const mappedRooms = Number(item.mapped_rooms || 0);
      const roomText = mappedRooms > 0
        ? `นับจาก ${formatNumber(mappedRooms)} ห้อง`
        : 'ยังไม่ได้ตั้งค่าห้อง';
      const roomClass = mappedRooms > 0 ? 'configured' : 'not-configured';

      return `
        <article class="ncd-subclinic-card ${roomClass}">
          <span class="ncd-subclinic-icon"><i class="bi bi-heart-pulse"></i></span>
          <div>
            <p>${escapeHtml(item.name || '-')}</p>
            <div class="ncd-subclinic-metric">
              <strong>${formatNumber(item.total)}</strong>
              <span>คน</span>
            </div>
            <small>${escapeHtml(roomText)}</small>
          </div>
        </article>
      `;
    }).join('');

    if (ncdTotal) ncdTotal.textContent = `รวมคลินิกย่อย NCD วันนี้: ${formatNumber(data.total)} คน`;
    if (ncdUpdated) ncdUpdated.textContent = formatTime(data.last_updated);
    if (ncdNote) ncdNote.classList.toggle('hidden', data.totals_match_main !== false);
  }

  async function loadNcdSubclinics() {
    if (isLoadingNcd) return;
    isLoadingNcd = true;
    setNcdStatus('loading', 'กำลังโหลดข้อมูลคลินิกย่อย...');
    try {
      const response = await fetch('/api/today-patients/ncd-subclinics', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลคลินิกย่อย NCD ได้');
      }
      renderNcdSubclinics(payload.data || {});
      setNcdStatus('success', 'โหลดข้อมูลคลินิกย่อยสำเร็จ');
    } catch (err) {
      setNcdStatus('error', err.message || 'ไม่สามารถดึงข้อมูลคลินิกย่อย NCD ได้');
      if (ncdGrid) ncdGrid.innerHTML = '<div class="empty">ไม่สามารถแสดงข้อมูลคลินิกย่อย NCD ได้</div>';
      if (ncdTotal) ncdTotal.textContent = 'รวมคลินิกย่อย NCD วันนี้: - คน';
      if (ncdUpdated) ncdUpdated.textContent = 'อัปเดตล่าสุด -';
      if (ncdNote) ncdNote.classList.add('hidden');
    } finally {
      isLoadingNcd = false;
    }
  }

  function openNcdModal() {
    if (!ncdModal) return;
    ncdModal.classList.remove('hidden');
    ncdModal.setAttribute('aria-hidden', 'false');
    ncdCloseButton?.focus();
    loadNcdSubclinics();
  }

  function closeNcdModal() {
    if (!ncdModal) return;
    ncdModal.classList.add('hidden');
    ncdModal.setAttribute('aria-hidden', 'true');
    ncdCard?.focus();
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
  ncdCard?.addEventListener('click', openNcdModal);
  ncdCard?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openNcdModal();
  });
  ncdCloseButton?.addEventListener('click', closeNcdModal);
  ncdCancelButton?.addEventListener('click', closeNcdModal);
  ncdModal?.addEventListener('click', (event) => {
    if (event.target === ncdModal) closeNcdModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ncdModal && !ncdModal.classList.contains('hidden')) {
      closeNcdModal();
    }
  });

  refreshData();
}());
