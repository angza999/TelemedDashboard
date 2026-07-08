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
  const ncdSummary = document.getElementById('ncdSubclinicSummary');
  const ncdGrid = document.getElementById('ncdSubclinicGrid');
  const ncdTotal = document.getElementById('ncdSubclinicTotal');
  const ncdUpdated = document.getElementById('ncdSubclinicUpdated');
  const ncdNote = document.getElementById('ncdSubclinicNote');
  const ipdCard = document.getElementById('ipdSubclinicCard');
  const ipdModal = document.getElementById('ipdSubclinicModal');
  const ipdCloseButton = document.getElementById('ipdSubclinicCloseButton');
  const ipdCancelButton = document.getElementById('ipdSubclinicCancelButton');
  const ipdStatus = document.getElementById('ipdSubclinicStatus');
  const ipdSummary = document.getElementById('ipdSubclinicSummary');
  const ipdGrid = document.getElementById('ipdSubclinicGrid');
  const ipdTotal = document.getElementById('ipdSubclinicTotal');
  const ipdUpdated = document.getElementById('ipdSubclinicUpdated');
  const ipdNote = document.getElementById('ipdSubclinicNote');
  const ipdSettingsLink = document.querySelector('.ipd-subclinic-settings');
  const erCard = document.getElementById('erSubclinicCard');
  const erModal = document.getElementById('erSubclinicModal');
  const erCloseButton = document.getElementById('erSubclinicCloseButton');
  const erCancelButton = document.getElementById('erSubclinicCancelButton');
  const erStatus = document.getElementById('erSubclinicStatus');
  const erSummary = document.getElementById('erSubclinicSummary');
  const erGrid = document.getElementById('erSubclinicGrid');
  const erTotal = document.getElementById('erSubclinicTotal');
  const erUpdated = document.getElementById('erSubclinicUpdated');
  const erNote = document.getElementById('erSubclinicNote');
  const ncdSettingsLink = document.querySelector('.ncd-subclinic-settings');
  const erSettingsLink = document.querySelector('.er-subclinic-settings');

  let isRefreshing = false;
  let isLoadingNcd = false;
  let isLoadingIpd = false;
  let isLoadingEr = false;
  let isNcdUngroupedOpen = false;
  let hasData = false;

  if (ipdSettingsLink) {
    ipdSettingsLink.innerHTML = '<i class="bi bi-gear"></i> ตั้งค่า Ward IPD';
  }

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

  function setIpdStatus(type, message) {
    if (!ipdStatus) return;
    ipdStatus.className = `dashboard-status ${type || ''}`.trim();
    ipdStatus.textContent = message;
  }

  function setErStatus(type, message) {
    if (!erStatus) return;
    erStatus.className = `dashboard-status ${type || ''}`.trim();
    erStatus.textContent = message;
  }

  function getNcdMainTotal(data) {
    const fromApi = Number(data.main_ncd_total ?? data.main_total);
    if (Number.isFinite(fromApi)) return fromApi;
    const ncdValue = document.querySelector('[data-today-value="ncd_total"]');
    return Number((ncdValue?.textContent || '0').replace(/,/g, '')) || 0;
  }

  function getIpdMainTotal(data) {
    const fromApi = Number(data.main_ipd_total ?? data.main_total);
    if (Number.isFinite(fromApi)) return fromApi;
    const ipdValue = document.querySelector('[data-today-value="ipd_total"]');
    return Number((ipdValue?.textContent || '0').replace(/,/g, '')) || 0;
  }

  function getErMainTotal(data) {
    const fromApi = Number(data.main_er_total);
    if (Number.isFinite(fromApi)) return fromApi;
    const value = document.querySelector('[data-today-value="er_total"]');
    return Number((value?.textContent || '0').replace(/,/g, '')) || 0;
  }

  function getNcdSubclinicVisual(key) {
    const visuals = {
      HT: { theme: 'ht', icon: 'bi-heart-pulse' },
      DM: { theme: 'dm', icon: 'bi-droplet-half' },
      COPD: { theme: 'copd', icon: 'bi-activity' },
      CKD: { theme: 'ckd', icon: 'bi-hospital' }
    };
    return visuals[key] || { theme: 'default', icon: 'bi-heart-pulse' };
  }

  function getIpdSubclinicVisual(key) {
    const visuals = {
      GENERAL_WARD: { theme: 'general', icon: 'bi-hospital' },
      HOMEWARD: { theme: 'homeward', icon: 'bi-house-heart' }
    };
    return visuals[key] || { theme: 'default', icon: 'bi-building' };
  }

  function legacyRenderNcdSummary(data, mainTotal, subclinicTotal, difference, ungroupedTotal) {
    if (!ncdSummary) return;
    const gapLabel = difference < 0 ? 'ตรวจสอบ Mapping' : 'ยังไม่จัดกลุ่ม';
    const gapValue = difference < 0 ? Math.abs(difference) : ungroupedTotal;
    const gapClass = difference !== 0 ? 'attention' : 'balanced';
    ncdSummary.innerHTML = `
      <div class="ncd-summary-card main">
        <span>NCD หลัก</span>
        <strong>${formatNumber(mainTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ncd-summary-card total">
        <span>รวมคลินิกย่อย</span>
        <strong>${formatNumber(subclinicTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ncd-summary-card ${gapClass}">
        <span>${gapLabel}</span>
        <strong>${formatNumber(gapValue)}</strong>
        <small>${difference < 0 ? 'คนเกินยอดหลัก' : 'คน'}</small>
      </div>
    `;
  }

  function renderIpdSummary(mainTotal, subclinicTotal, difference, ungroupedTotal) {
    if (!ipdSummary) return;
    const gapLabel = difference < 0 ? 'ตรวจสอบ Mapping' : 'ยังไม่จัดกลุ่ม';
    const gapValue = difference < 0 ? Math.abs(difference) : ungroupedTotal;
    const gapClass = difference !== 0 ? 'attention' : 'balanced';
    ipdSummary.innerHTML = `
      <div class="ipd-summary-card main">
        <span>IPD หลัก</span>
        <strong>${formatNumber(mainTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ipd-summary-card total">
        <span>รวมคลินิกย่อย</span>
        <strong>${formatNumber(subclinicTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ipd-summary-card ${gapClass}">
        <span>${gapLabel}</span>
        <strong>${formatNumber(gapValue)}</strong>
        <small>${difference < 0 ? 'คนเกินยอดหลัก' : 'คน'}</small>
      </div>
    `;
  }

  function renderErSummary(cardTotal, totalRelated, serviceCount) {
    if (!erSummary) return;
    erSummary.innerHTML = `
      <div class="er-summary-card main"><span>ยอดบนการ์ด ER</span><strong>${formatNumber(cardTotal)}</strong><small>คน</small></div>
      <div class="er-summary-card total"><span>รวมบริการที่เกี่ยวข้อง</span><strong>${formatNumber(totalRelated)}</strong><small>คน</small></div>
      <div class="er-summary-card balanced"><span>บริการที่แสดง</span><strong>${formatNumber(serviceCount)}</strong><small>รายการ</small></div>
    `;
  }

  function legacyRenderNcdNote(data, difference) {
    if (!ncdNote) return;
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    const hasUnmappedSubclinic = subclinics.some((item) => Number(item.mapped_rooms || 0) === 0);

    if (difference > 0) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = `พบส่วนต่าง ${formatNumber(difference)} คน: อาจเกิดจากห้อง NCD บางห้องยังไม่ได้ผูกกับคลินิกย่อย กรุณาตรวจสอบการตั้งค่าคลินิกย่อย NCD`;
      return;
    }

    if (difference < 0) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = `รวมคลินิกย่อยมากกว่ายอด NCD หลัก ${formatNumber(Math.abs(difference))} คน กรุณาตรวจสอบ Mapping คลินิกย่อย NCD`;
      return;
    }

    if (hasUnmappedSubclinic) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = 'มีคลินิกย่อยบางรายการที่ยังไม่ได้ตั้งค่าห้อง กรุณาตรวจสอบการตั้งค่าคลินิกย่อย NCD';
      return;
    }

    ncdNote.classList.add('hidden');
  }

  function renderIpdNote(data, difference) {
    if (!ipdNote) return;
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    const hasUnmappedSubclinic = subclinics.some((item) => Number(item.mapped_wards || 0) === 0);

    if (difference > 0) {
      ipdNote.className = 'alert warning ipd-subclinic-note';
      ipdNote.textContent = `พบส่วนต่าง ${formatNumber(difference)} คน: อาจเกิดจาก Ward IPD บางรายการยังไม่ได้ผูกกับคลินิกย่อย IPD กรุณาตรวจสอบการตั้งค่า Ward`;
      return;
    }

    if (difference < 0) {
      ipdNote.className = 'alert warning ipd-subclinic-note';
      ipdNote.textContent = `รวมคลินิกย่อย IPD มากกว่ายอด IPD หลัก ${formatNumber(Math.abs(difference))} คน กรุณาตรวจสอบ Mapping Ward`;
      return;
    }

    if (hasUnmappedSubclinic) {
      ipdNote.className = 'alert warning ipd-subclinic-note';
      ipdNote.textContent = 'มีคลินิกย่อย IPD บางรายการที่ยังไม่ได้ตั้งค่า Ward กรุณาตรวจสอบการตั้งค่าคลินิกย่อย IPD';
      return;
    }

    ipdNote.classList.add('hidden');
  }

  function renderErNote() {
    if (!erNote) return;
    erNote.classList.add('hidden');
  }

  function formatMappedCodes(item) {
    const codes = Array.isArray(item.mapped_codes)
      ? item.mapped_codes
      : (Array.isArray(item.rooms) ? item.rooms.map((room) => room.depcode) : []);
    const cleanCodes = codes.map((code) => String(code || '').trim()).filter(Boolean);
    if (!cleanCodes.length) return '';
    return `รหัสห้อง: ${cleanCodes.map(escapeHtml).join(', ')}`;
  }

  function getSubclinicStatusLines(total, mappedRooms) {
    if (total === 0 && mappedRooms === 0) {
      return ['ยังไม่ได้ตั้งค่าห้อง'];
    }
    if (total === 0 && mappedRooms > 0) {
      return [
        `ตั้งค่าแล้ว ${formatNumber(mappedRooms)} ห้อง`,
        'วันนี้ยังไม่มีผู้รับบริการ'
      ];
    }
    if (mappedRooms > 0) {
      return [`นับจาก ${formatNumber(mappedRooms)} ห้อง`];
    }
    return ['ตรวจสอบ Mapping'];
  }

  function getIpdSubclinicStatusLines(total, mappedWards) {
    if (total === 0 && mappedWards === 0) {
      return ['ยังไม่ได้ตั้งค่า Ward'];
    }
    if (total === 0 && mappedWards > 0) {
      return [
        `ตั้งค่าแล้ว ${formatNumber(mappedWards)} Ward`,
        'ยังไม่มีผู้ป่วยกำลังนอนรักษา'
      ];
    }
    if (mappedWards > 0) {
      return [`นับจาก ${formatNumber(mappedWards)} Ward`];
    }
    return ['ตรวจสอบ Mapping'];
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

  function legacyRenderNcdSubclinics(data) {
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    if (!ncdGrid) return;
    const subclinicTotal = Number(data.total || 0);
    const mainTotal = getNcdMainTotal(data);
    const difference = mainTotal - subclinicTotal;
    const ungroupedTotal = Math.max(difference, 0);
    const totals = subclinics.map((item) => Number(item.total || 0));
    const maxTotal = Math.max(0, ...totals);

    renderNcdSummary(data, mainTotal, subclinicTotal, difference, ungroupedTotal);

    ncdGrid.innerHTML = subclinics.map((item) => {
      const mappedRooms = Number(item.mapped_rooms || 0);
      const total = Number(item.total || 0);
      const visual = getNcdSubclinicVisual(item.key);
      const statusLines = getSubclinicStatusLines(total, mappedRooms);
      const roomClass = mappedRooms > 0 ? 'configured' : 'not-configured';
      const emptyClass = total === 0 ? 'empty-total' : 'has-total';
      const topBadge = maxTotal > 0 && total === maxTotal
        ? '<span class="ncd-subclinic-badge">สูงสุดวันนี้</span>'
        : '';

      return `
        <article class="ncd-subclinic-card ${roomClass} ${emptyClass} theme-${visual.theme}">
          <span class="ncd-subclinic-icon"><i class="bi ${visual.icon}"></i></span>
          <div>
            <div class="ncd-subclinic-card-heading">
              <p>${escapeHtml(item.name || '-')}</p>
              ${topBadge}
            </div>
            <div class="ncd-subclinic-metric">
              <strong>${formatNumber(total)}</strong>
              <span>คน</span>
            </div>
            <div class="ncd-subclinic-status-text">
              ${statusLines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (ncdTotal) ncdTotal.textContent = `รวมคลินิกย่อย NCD วันนี้: ${formatNumber(subclinicTotal)} คน`;
    if (ncdUpdated) ncdUpdated.textContent = formatTime(data.last_updated);
    renderNcdNote(data, difference);
  }

  function renderNcdSummary(data, mainTotal, subclinicTotal, difference) {
    if (!ncdSummary) return;
    const ungroupedRooms = Array.isArray(data.ungrouped) ? data.ungrouped : [];
    const hasUngrouped = difference > 0;
    const gapLabel = difference < 0
      ? 'ตรวจสอบ Mapping'
      : (difference === 0 ? 'จัดกลุ่มครบแล้ว' : 'ยังไม่จัดกลุ่ม');
    const gapValue = difference < 0 ? Math.abs(difference) : Math.max(difference, 0);
    const gapClass = difference < 0 ? 'mapping-warning' : (difference > 0 ? 'attention' : 'balanced');
    const gapSmall = difference < 0 ? 'คนเกินยอดหลัก' : 'คน';
    const gapHint = hasUngrouped
      ? `<em>${isNcdUngroupedOpen ? 'คลิกซ่อนห้อง' : 'คลิกดูห้อง'}</em>`
      : (difference === 0 ? '<em>ยอดตรงกับ NCD หลัก</em>' : '');
    const gapContent = `
      <span>${gapLabel}</span>
      <strong>${formatNumber(gapValue)}</strong>
      <small>${gapSmall}</small>
      ${gapHint}
    `;
    const gapCard = hasUngrouped
      ? `<button type="button" class="ncd-summary-card ${gapClass} clickable" id="ncdUngroupedToggle" aria-expanded="${isNcdUngroupedOpen ? 'true' : 'false'}">${gapContent}</button>`
      : `<div class="ncd-summary-card ${gapClass}">${gapContent}</div>`;
    const settingsLink = ncdSettingsLink
      ? `<a class="secondary-button mini" href="/admin/ncd-subclinics"><i class="bi bi-gear"></i> ไปตั้งค่าคลินิกย่อย NCD</a>`
      : '';
    const ungroupedList = ungroupedRooms.length ? ungroupedRooms.map((room) => `
      <li>
        <div>
          <strong>${escapeHtml(room.depcode || '-')}</strong>
          <span>${escapeHtml(room.department_name || 'ไม่ระบุชื่อห้อง')}</span>
        </div>
        <b>${formatNumber(room.patient_total || 0)} คน</b>
      </li>
    `).join('') : '<li><div><span>ไม่พบรายการห้อง กรุณาตรวจสอบ mapping NCD หลักและคลินิกย่อย</span></div></li>';
    const ungroupedDetail = hasUngrouped ? `
      <div class="ncd-ungrouped-detail ${isNcdUngroupedOpen ? '' : 'hidden'}" id="ncdUngroupedDetail">
        <div class="ncd-ungrouped-heading">
          <div>
            <strong>ห้อง NCD ที่ยังไม่จัดกลุ่ม</strong>
            <span>เรียงตามจำนวนผู้รับบริการมากไปน้อย</span>
          </div>
          ${settingsLink}
        </div>
        <ul>${ungroupedList}</ul>
      </div>
    ` : '';

    ncdSummary.innerHTML = `
      <div class="ncd-summary-card main">
        <span>NCD หลัก</span>
        <strong>${formatNumber(mainTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ncd-summary-card total">
        <span>รวมคลินิกย่อย</span>
        <strong>${formatNumber(subclinicTotal)}</strong>
        <small>คน</small>
      </div>
      ${gapCard}
      ${ungroupedDetail}
    `;

    const toggleButton = document.getElementById('ncdUngroupedToggle');
    toggleButton?.addEventListener('click', () => {
      isNcdUngroupedOpen = !isNcdUngroupedOpen;
      renderNcdSummary(data, mainTotal, subclinicTotal, difference);
    });
  }

  function renderNcdNote(data, difference) {
    if (!ncdNote) return;
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    const hasUnmappedSubclinic = subclinics.some((item) => Number(item.mapped_rooms || 0) === 0);

    if (difference > 0) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = `พบห้อง NCD หลักที่ยังไม่ได้ผูกกับคลินิกย่อย ${formatNumber(difference)} คน คลิกกล่อง "ยังไม่จัดกลุ่ม" เพื่อดูห้องที่เกี่ยวข้อง และปรับ Mapping หากจำเป็น`;
      return;
    }

    if (difference < 0) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = `ยอดรวมคลินิกย่อยมากกว่ายอด NCD หลัก ${formatNumber(Math.abs(difference))} คน กรุณาตรวจสอบว่า Mapping คลินิกย่อย NCD ไม่ได้นับห้องนอกกลุ่ม NCD หลัก`;
      return;
    }

    if (hasUnmappedSubclinic) {
      ncdNote.className = 'alert warning ncd-subclinic-note';
      ncdNote.textContent = 'มีคลินิกย่อยบางรายการที่ยังไม่ได้ตั้งค่าห้อง กรุณาตรวจสอบการตั้งค่าคลินิกย่อย NCD';
      return;
    }

    ncdNote.className = 'alert success ncd-subclinic-note';
    ncdNote.textContent = 'ยอดคลินิกย่อยตรงกับยอด NCD หลัก';
  }

  function renderNcdSubclinics(data) {
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    if (!ncdGrid) return;
    const subclinicTotal = Number(data.total || 0);
    const mainTotal = getNcdMainTotal(data);
    const apiDiff = Number(data.diff_total);
    const difference = Number.isFinite(apiDiff) ? apiDiff : mainTotal - subclinicTotal;
    if (difference <= 0) isNcdUngroupedOpen = false;
    const totals = subclinics.map((item) => Number(item.total || 0));
    const maxTotal = Math.max(0, ...totals);

    renderNcdSummary(data, mainTotal, subclinicTotal, difference);

    ncdGrid.innerHTML = subclinics.map((item) => {
      const mappedRooms = Number(item.mapped_rooms || 0);
      const total = Number(item.total || 0);
      const visual = getNcdSubclinicVisual(item.key);
      const statusLines = getSubclinicStatusLines(total, mappedRooms);
      const mappedCodesLine = formatMappedCodes(item);
      const roomClass = mappedRooms > 0 ? 'configured' : 'not-configured';
      const emptyClass = total === 0 ? 'empty-total' : 'has-total';
      const topBadge = maxTotal > 0 && total === maxTotal
        ? '<span class="ncd-subclinic-badge">สูงสุดวันนี้</span>'
        : '';

      return `
        <article class="ncd-subclinic-card ${roomClass} ${emptyClass} theme-${visual.theme}">
          <span class="ncd-subclinic-icon"><i class="bi ${visual.icon}"></i></span>
          <div>
            <div class="ncd-subclinic-card-heading">
              <p>${escapeHtml(item.name || '-')}</p>
              ${topBadge}
            </div>
            <div class="ncd-subclinic-metric">
              <strong>${formatNumber(total)}</strong>
              <span>คน</span>
            </div>
            <div class="ncd-subclinic-status-text">
              ${statusLines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}
              ${mappedCodesLine ? `<small class="ncd-subclinic-codes">${mappedCodesLine}</small>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (ncdTotal) ncdTotal.textContent = `รวมคลินิกย่อย NCD วันนี้: ${formatNumber(subclinicTotal)} คน`;
    if (ncdUpdated) ncdUpdated.textContent = formatTime(data.last_updated);
    renderNcdNote(data, difference);
  }

  function renderIpdSubclinics(data) {
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    if (!ipdGrid) return;
    const subclinicTotal = Number(data.total || 0);
    const mainTotal = getIpdMainTotal(data);
    const difference = mainTotal - subclinicTotal;
    const ungroupedTotal = Math.max(difference, 0);
    const totals = subclinics.map((item) => Number(item.total || 0));
    const maxTotal = Math.max(0, ...totals);

    renderIpdSummary(mainTotal, subclinicTotal, difference, ungroupedTotal);

    ipdGrid.innerHTML = subclinics.map((item) => {
      const mappedWards = Number(item.mapped_wards || 0);
      const total = Number(item.total || 0);
      const visual = getIpdSubclinicVisual(item.key);
      const statusLines = getIpdSubclinicStatusLines(total, mappedWards);
      const roomClass = mappedWards > 0 ? 'configured' : 'not-configured';
      const emptyClass = total === 0 ? 'empty-total' : 'has-total';
      const topBadge = maxTotal > 0 && total === maxTotal
        ? '<span class="ipd-subclinic-badge">สูงสุดวันนี้</span>'
        : '';

      return `
        <article class="ipd-subclinic-card ${roomClass} ${emptyClass} theme-${visual.theme}">
          <span class="ipd-subclinic-icon"><i class="bi ${visual.icon}"></i></span>
          <div>
            <div class="ipd-subclinic-card-heading">
              <p>${escapeHtml(item.name || '-')}</p>
              ${topBadge}
            </div>
            <div class="ipd-subclinic-metric">
              <strong>${formatNumber(total)}</strong>
              <span>คน</span>
            </div>
            <div class="ipd-subclinic-status-text">
              ${statusLines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (ipdTotal) ipdTotal.textContent = `รวมคลินิกย่อย IPD วันนี้: ${formatNumber(subclinicTotal)} คน`;
    if (ipdUpdated) ipdUpdated.textContent = formatTime(data.last_updated);
    renderIpdNote(data, difference);
  }

  function getIpdSubclinicStatusLines(total, mappedWards) {
    if (total === 0 && mappedWards === 0) {
      return ['ยังไม่ได้ตั้งค่า Ward'];
    }
    if (total === 0 && mappedWards > 0) {
      return [
        `ตั้งค่าแล้ว ${formatNumber(mappedWards)} Ward`,
        'ยังไม่มีผู้ป่วยกำลังนอนรักษา'
      ];
    }
    if (mappedWards > 0) {
      return [`นับจาก ${formatNumber(mappedWards)} Ward`];
    }
    return ['ยังไม่ได้ตั้งค่า Ward'];
  }

  function formatMappedWards(item) {
    const codes = Array.isArray(item.mapped_codes)
      ? item.mapped_codes
      : (Array.isArray(item.wards) ? item.wards.map((ward) => ward.ward) : []);
    const cleanCodes = codes.map((code) => String(code || '').trim()).filter(Boolean);
    if (!cleanCodes.length) return '';
    return `รหัส Ward: ${cleanCodes.map(escapeHtml).join(', ')}`;
  }

  function renderIpdSummary(mainTotal, relatedTotal, visibleWardCount) {
    if (!ipdSummary) return;
    ipdSummary.innerHTML = `
      <div class="ipd-summary-card main">
        <span>หอผู้ป่วยรวม</span>
        <strong>${formatNumber(mainTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ipd-summary-card total">
        <span>รวมบริการ IPD ที่เกี่ยวข้อง</span>
        <strong>${formatNumber(relatedTotal)}</strong>
        <small>คน</small>
      </div>
      <div class="ipd-summary-card balanced">
        <span>แสดง</span>
        <strong>${formatNumber(visibleWardCount)}</strong>
        <small>Ward</small>
      </div>
    `;
  }

  function renderIpdNote() {
    if (!ipdNote) return;
    ipdNote.classList.add('hidden');
  }

  function renderIpdSubclinics(data) {
    const subclinics = Array.isArray(data.subclinics) ? data.subclinics : [];
    if (!ipdGrid) return;
    const relatedTotal = Number(data.total || 0);
    const mainTotal = getIpdMainTotal(data);
    const visibleWardCountFromApi = Number(data.visible_ward_count);
    const visibleWardCount = Number.isFinite(visibleWardCountFromApi)
      ? visibleWardCountFromApi
      : subclinics.filter((item) => Number(item.mapped_wards || 0) > 0).length;
    const totals = subclinics.map((item) => Number(item.total || 0));
    const maxTotal = Math.max(0, ...totals);

    renderIpdSummary(mainTotal, relatedTotal, visibleWardCount);

    ipdGrid.innerHTML = subclinics.map((item) => {
      const mappedWards = Number(item.mapped_wards || 0);
      const total = Number(item.total || 0);
      const visual = getIpdSubclinicVisual(item.key);
      const statusLines = getIpdSubclinicStatusLines(total, mappedWards);
      const mappedWardsLine = formatMappedWards(item);
      const roomClass = mappedWards > 0 ? 'configured' : 'not-configured';
      const emptyClass = total === 0 ? 'empty-total' : 'has-total';
      const topBadge = maxTotal > 0 && total === maxTotal
        ? '<span class="ipd-subclinic-badge">สูงสุดวันนี้</span>'
        : '';

      return `
        <article class="ipd-subclinic-card ${roomClass} ${emptyClass} theme-${visual.theme}">
          <span class="ipd-subclinic-icon"><i class="bi ${visual.icon}"></i></span>
          <div>
            <div class="ipd-subclinic-card-heading">
              <p>${escapeHtml(item.name || '-')}</p>
              ${topBadge}
            </div>
            <div class="ipd-subclinic-metric">
              <strong>${formatNumber(total)}</strong>
              <span>คน</span>
            </div>
            <div class="ipd-subclinic-status-text">
              ${statusLines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}
              ${mappedWardsLine ? `<small class="ipd-subclinic-codes">${mappedWardsLine}</small>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (ipdTotal) ipdTotal.textContent = `รวมบริการ IPD ที่เกี่ยวข้องวันนี้: ${formatNumber(relatedTotal)} คน`;
    if (ipdUpdated) ipdUpdated.textContent = formatTime(data.last_updated);
    renderIpdNote();
  }

  function renderErSubclinics(data) {
    const subclinics = Array.isArray(data.services)
      ? data.services
      : (Array.isArray(data.subclinics) ? data.subclinics : []);
    if (!erGrid) return;
    const subclinicTotal = Number(data.total_related || data.total || 0);
    const cardTotal = Number(data.card_total ?? data.main_er_total ?? getErMainTotal(data));
    renderErSummary(cardTotal, subclinicTotal, subclinics.length);
    erGrid.innerHTML = subclinics.map((item) => {
      const mappedRooms = Number(item.mapped_rooms || 0);
      const total = Number(item.total || 0);
      const statusLines = getSubclinicStatusLines(total, mappedRooms);
      const mappedCodesLine = formatMappedCodes(item);
      const theme = item.key === 'ER_PATIENT' ? 'patient' : (item.key === 'ER_TELEMED' ? 'telemed' : 'dressing');
      const icon = item.key === 'ER_PATIENT' ? 'bi-hospital' : (item.key === 'ER_TELEMED' ? 'bi-camera-video' : 'bi-bandaid');
      const cardBadge = item.include_in_card_total ? '<small class="er-service-flag">นับรวมในการ์ด ER หลัก</small>' : '';
      return `<article class="er-subclinic-card ${mappedRooms ? 'configured' : 'not-configured'} ${total ? 'has-total' : 'empty-total'} theme-${theme}">
        <span class="er-subclinic-icon"><i class="bi ${icon}"></i></span><div>
          <div class="er-subclinic-card-heading"><p>${escapeHtml(item.name || '-')}</p></div>
          <div class="er-subclinic-metric"><strong>${formatNumber(total)}</strong><span>คน</span></div>
          <div class="er-subclinic-status-text">
            ${cardBadge}
            ${statusLines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}
            ${mappedCodesLine ? `<small class="er-subclinic-codes">${mappedCodesLine}</small>` : ''}
          </div>
        </div></article>`;
    }).join('');
    if (erTotal) erTotal.textContent = `รวมบริการที่เกี่ยวข้องกับ ER วันนี้: ${formatNumber(subclinicTotal)} คน`;
    if (erUpdated) erUpdated.textContent = formatTime(data.last_updated);
    renderErNote();
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
      if (ncdSummary) ncdSummary.innerHTML = '';
      if (ncdTotal) ncdTotal.textContent = 'รวมคลินิกย่อย NCD วันนี้: - คน';
      if (ncdUpdated) ncdUpdated.textContent = 'อัปเดตล่าสุด -';
      if (ncdNote) ncdNote.classList.add('hidden');
    } finally {
      isLoadingNcd = false;
    }
  }

  async function loadIpdSubclinics() {
    if (isLoadingIpd) return;
    isLoadingIpd = true;
    setIpdStatus('loading', 'กำลังโหลดข้อมูลคลินิกย่อย IPD...');
    try {
      const response = await fetch('/api/today-patients/ipd-subclinics', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลคลินิกย่อย IPD ได้');
      }
      renderIpdSubclinics(payload.data || {});
      setIpdStatus('success', 'โหลดข้อมูลคลินิกย่อย IPD สำเร็จ');
    } catch (err) {
      setIpdStatus('error', err.message || 'ไม่สามารถดึงข้อมูลคลินิกย่อย IPD ได้');
      if (ipdGrid) ipdGrid.innerHTML = '<div class="empty">ไม่สามารถแสดงข้อมูลคลินิกย่อย IPD ได้</div>';
      if (ipdSummary) ipdSummary.innerHTML = '';
      if (ipdTotal) ipdTotal.textContent = 'รวมบริการ IPD ที่เกี่ยวข้องวันนี้: - คน';
      if (ipdUpdated) ipdUpdated.textContent = 'อัปเดตล่าสุด -';
      if (ipdNote) ipdNote.classList.add('hidden');
    } finally {
      isLoadingIpd = false;
    }
  }

  async function loadErSubclinics() {
    if (isLoadingEr) return;
    isLoadingEr = true;
    setErStatus('loading', 'กำลังโหลดข้อมูลบริการ ER...');
    try {
      const response = await fetch('/api/today-patients/er-subclinics', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลบริการ ER ได้');
      renderErSubclinics(payload.data || {});
      setErStatus('success', 'โหลดข้อมูลบริการ ER สำเร็จ');
    } catch (err) {
      setErStatus('error', err.message || 'ไม่สามารถดึงข้อมูลบริการ ER ได้');
      if (erGrid) erGrid.innerHTML = '<div class="empty">ไม่สามารถแสดงข้อมูลบริการ ER ได้</div>';
      if (erSummary) erSummary.innerHTML = '';
      if (erTotal) erTotal.textContent = 'รวมบริการที่เกี่ยวข้องกับ ER วันนี้: - คน';
      if (erUpdated) erUpdated.textContent = 'อัปเดตล่าสุด -';
      if (erNote) erNote.classList.add('hidden');
    } finally { isLoadingEr = false; }
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

  function openIpdModal() {
    if (!ipdModal) return;
    ipdModal.classList.remove('hidden');
    ipdModal.setAttribute('aria-hidden', 'false');
    ipdCloseButton?.focus();
    loadIpdSubclinics();
  }

  function closeIpdModal() {
    if (!ipdModal) return;
    ipdModal.classList.add('hidden');
    ipdModal.setAttribute('aria-hidden', 'true');
    ipdCard?.focus();
  }

  function openErModal() {
    if (!erModal) return;
    erModal.classList.remove('hidden');
    erModal.setAttribute('aria-hidden', 'false');
    erCloseButton?.focus();
    loadErSubclinics();
  }

  function closeErModal() {
    if (!erModal) return;
    erModal.classList.add('hidden');
    erModal.setAttribute('aria-hidden', 'true');
    erCard?.focus();
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
  ipdCard?.addEventListener('click', openIpdModal);
  ipdCard?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openIpdModal();
  });
  ipdCloseButton?.addEventListener('click', closeIpdModal);
  ipdCancelButton?.addEventListener('click', closeIpdModal);
  ipdModal?.addEventListener('click', (event) => {
    if (event.target === ipdModal) closeIpdModal();
  });
  erCard?.addEventListener('click', openErModal);
  erCard?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openErModal();
  });
  erCloseButton?.addEventListener('click', closeErModal);
  erCancelButton?.addEventListener('click', closeErModal);
  erModal?.addEventListener('click', (event) => {
    if (event.target === erModal) closeErModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ncdModal && !ncdModal.classList.contains('hidden')) {
      closeNcdModal();
    }
    if (event.key === 'Escape' && ipdModal && !ipdModal.classList.contains('hidden')) {
      closeIpdModal();
    }
    if (event.key === 'Escape' && erModal && !erModal.classList.contains('hidden')) {
      closeErModal();
    }
  });

  refreshData();
}());
