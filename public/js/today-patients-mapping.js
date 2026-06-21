(function () {
  const cardMeta = {
    OPD: { label: 'ผู้ป่วยนอก OPD', sourceType: 'DEP' },
    NCD: { label: 'งาน NCD', sourceType: 'DEP' },
    IPD: { label: 'ผู้ป่วยใน IPD', sourceType: 'WARD' },
    ER: { label: 'อุบัติเหตุฉุกเฉิน ER', sourceType: 'DEP' }
  };
  const depCards = ['OPD', 'NCD', 'ER'];

  const statusEl = document.getElementById('mappingStatus');
  const tableBody = document.getElementById('mappingTableBody');
  const searchInput = document.getElementById('mappingSearch');
  const saveButton = document.getElementById('saveMappingButton');
  const resetButton = document.getElementById('resetMappingButton');
  const tabButtons = Array.from(document.querySelectorAll('[data-card-key]'));

  const state = {
    activeCard: 'OPD',
    departments: [],
    wards: [],
    mapping: { OPD: [], NCD: [], IPD: [], ER: [] },
    loading: false
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setStatus(type, message) {
    statusEl.className = `dashboard-status ${type || ''}`.trim();
    statusEl.textContent = message;
  }

  function isSelected(cardKey, sourceCode) {
    return (state.mapping[cardKey] || []).some((item) => item.source_code === sourceCode);
  }

  function selectedDepOwner(sourceCode) {
    return depCards.find((cardKey) => isSelected(cardKey, sourceCode)) || null;
  }

  function setSelected(cardKey, sourceType, sourceCode, displayName, checked) {
    const items = state.mapping[cardKey] || [];
    if (checked) {
      if (!items.some((item) => item.source_code === sourceCode)) {
        items.push({ source_type: sourceType, source_code: sourceCode, display_name: displayName });
      }
    } else {
      state.mapping[cardKey] = items.filter((item) => item.source_code !== sourceCode);
      return;
    }
    state.mapping[cardKey] = items;
  }

  function currentRows() {
    if (state.activeCard === 'IPD') {
      return state.wards.map((ward) => ({
        code: ward.ward,
        name: ward.name,
        activeText: 'Ward',
        inactive: false,
        sourceType: 'WARD'
      }));
    }

    return state.departments.map((department) => ({
      code: department.depcode,
      name: department.department,
      activeText: department.depcode_active === 'N' ? 'Inactive' : 'Active',
      inactive: department.depcode_active === 'N',
      sourceType: 'DEP'
    }));
  }

  function filteredRows() {
    const keyword = String(searchInput.value || '').trim().toLowerCase();
    if (!keyword) return currentRows();
    return currentRows().filter((row) => (
      row.code.toLowerCase().includes(keyword)
      || String(row.name || '').toLowerCase().includes(keyword)
    ));
  }

  function renderTabs() {
    tabButtons.forEach((button) => {
      const active = button.dataset.cardKey === state.activeCard;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderTable() {
    renderTabs();
    const rows = filteredRows();
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่พบรายการ</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((row) => {
      const selected = isSelected(state.activeCard, row.code);
      const owner = row.sourceType === 'DEP' ? selectedDepOwner(row.code) : null;
      const lockedByOther = owner && owner !== state.activeCard;
      const note = lockedByOther
        ? `ถูกเลือกอยู่ใน ${cardMeta[owner].label}`
        : (row.inactive ? 'ห้อง inactive ใน HOSxP แต่ยังเลือกได้หากต้องการนับ' : '-');

      return `
        <tr class="${row.inactive ? 'muted-row' : ''}">
          <td>
            <input
              type="checkbox"
              data-source-code="${escapeHtml(row.code)}"
              data-source-type="${escapeHtml(row.sourceType)}"
              data-display-name="${escapeHtml(row.name || row.code)}"
              ${selected ? 'checked' : ''}
              ${lockedByOther ? 'disabled' : ''}
              aria-label="เลือก ${escapeHtml(row.name || row.code)}">
          </td>
          <td><strong>${escapeHtml(row.code)}</strong></td>
          <td>${escapeHtml(row.name || '-')}</td>
          <td>
            <span class="status-badge ${row.inactive ? 'inactive' : 'active'}">${escapeHtml(row.activeText)}</span>
          </td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    }).join('');
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'ทำรายการไม่สำเร็จ');
    }
    return payload;
  }

  async function loadData() {
    state.loading = true;
    setStatus('loading', 'กำลังโหลดรายการห้องและ mapping...');
    saveButton.disabled = true;
    resetButton.disabled = true;
    try {
      const [departments, wards, mapping] = await Promise.all([
        requestJson('/api/admin/today-patients/departments'),
        requestJson('/api/admin/today-patients/wards'),
        requestJson('/api/admin/today-patients/mapping')
      ]);
      state.departments = departments.data || [];
      state.wards = wards.data || [];
      state.mapping = { OPD: [], NCD: [], IPD: [], ER: [], ...(mapping.data || {}) };
      setStatus('success', 'โหลดข้อมูลสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่สามารถโหลดรายการจาก HOSxP ได้</td></tr>';
    } finally {
      state.loading = false;
      saveButton.disabled = false;
      resetButton.disabled = false;
    }
  }

  async function saveMapping() {
    setStatus('loading', 'กำลังบันทึกการตั้งค่า...');
    saveButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/today-patients/mapping', {
        method: 'POST',
        body: JSON.stringify(state.mapping)
      });
      state.mapping = { OPD: [], NCD: [], IPD: [], ER: [], ...(payload.data || {}) };
      setStatus('success', payload.message || 'บันทึกการตั้งค่าสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      saveButton.disabled = false;
    }
  }

  async function resetMapping() {
    if (!window.confirm('ยืนยันรีเซ็ตค่าเริ่มต้นผู้รับบริการวันนี้?')) return;
    setStatus('loading', 'กำลังรีเซ็ตค่าเริ่มต้น...');
    resetButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/today-patients/mapping/reset', { method: 'POST' });
      state.mapping = { OPD: [], NCD: [], IPD: [], ER: [], ...(payload.data || {}) };
      setStatus('success', payload.message || 'รีเซ็ตค่าเริ่มต้นสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'รีเซ็ตค่าเริ่มต้นไม่สำเร็จ');
    } finally {
      resetButton.disabled = false;
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeCard = button.dataset.cardKey;
      searchInput.value = '';
      renderTable();
    });
  });

  searchInput.addEventListener('input', renderTable);
  saveButton.addEventListener('click', saveMapping);
  resetButton.addEventListener('click', resetMapping);
  tableBody.addEventListener('change', (event) => {
    const input = event.target.closest('input[type="checkbox"][data-source-code]');
    if (!input) return;
    setSelected(
      state.activeCard,
      input.dataset.sourceType,
      input.dataset.sourceCode,
      input.dataset.displayName,
      input.checked
    );
    renderTable();
  });

  loadData();
}());
