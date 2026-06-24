(function () {
  const subclinicMeta = {
    GENERAL_WARD: { label: 'หอผู้ป่วยรวม' },
    HOMEWARD: { label: 'Homeward' }
  };
  const subclinicKeys = ['GENERAL_WARD', 'HOMEWARD'];

  const statusEl = document.getElementById('ipdSubclinicStatus');
  const tableBody = document.getElementById('ipdSubclinicTableBody');
  const searchInput = document.getElementById('ipdSubclinicSearch');
  const saveButton = document.getElementById('saveIpdSubclinicButton');
  const tabButtons = Array.from(document.querySelectorAll('[data-subclinic-key]'));

  const state = {
    activeKey: 'GENERAL_WARD',
    wards: [],
    mapping: { GENERAL_WARD: [], HOMEWARD: [] },
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

  function isSelected(subclinicKey, ward) {
    return (state.mapping[subclinicKey] || []).some((item) => item.source_code === ward);
  }

  function selectedOwner(ward) {
    return subclinicKeys.find((key) => isSelected(key, ward)) || null;
  }

  function setSelected(subclinicKey, ward, displayName, checked) {
    const items = state.mapping[subclinicKey] || [];
    if (!checked) {
      state.mapping[subclinicKey] = items.filter((item) => item.source_code !== ward);
      return;
    }
    if (!items.some((item) => item.source_code === ward)) {
      items.push({ source_type: 'WARD', source_code: ward, display_name: displayName });
    }
    state.mapping[subclinicKey] = items;
  }

  function filteredRows() {
    const keyword = String(searchInput.value || '').trim().toLowerCase();
    if (!keyword) return state.wards;
    return state.wards.filter((row) => (
      String(row.ward || '').toLowerCase().includes(keyword)
      || String(row.name || '').toLowerCase().includes(keyword)
    ));
  }

  function renderTabs() {
    tabButtons.forEach((button) => {
      const active = button.dataset.subclinicKey === state.activeKey;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderTable() {
    renderTabs();
    const rows = filteredRows();
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="empty">ไม่พบรายการ</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((row) => {
      const ward = String(row.ward || '');
      const selected = isSelected(state.activeKey, ward);
      const owner = selectedOwner(ward);
      const lockedByOther = owner && owner !== state.activeKey;
      const note = lockedByOther
        ? `ถูกเลือกอยู่ใน ${subclinicMeta[owner].label}`
        : '-';

      return `
        <tr>
          <td>
            <input
              type="checkbox"
              data-ward="${escapeHtml(ward)}"
              data-display-name="${escapeHtml(row.name || ward)}"
              ${selected ? 'checked' : ''}
              ${lockedByOther ? 'disabled' : ''}
              aria-label="เลือก ${escapeHtml(row.name || ward)}">
          </td>
          <td><strong>${escapeHtml(ward)}</strong></td>
          <td>${escapeHtml(row.name || '-')}</td>
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
    setStatus('loading', 'กำลังโหลดรายการ Ward และ mapping คลินิกย่อย IPD...');
    saveButton.disabled = true;
    try {
      const [wards, mapping] = await Promise.all([
        requestJson('/api/admin/ipd-subclinics/wards'),
        requestJson('/api/admin/ipd-subclinics/mapping')
      ]);
      state.wards = wards.data || [];
      state.mapping = { GENERAL_WARD: [], HOMEWARD: [], ...(mapping.data || {}) };
      setStatus('success', 'โหลดข้อมูลสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
      tableBody.innerHTML = '<tr><td colspan="4" class="empty">ไม่สามารถโหลดรายการ Ward จาก HOSxP ได้</td></tr>';
    } finally {
      state.loading = false;
      saveButton.disabled = false;
    }
  }

  async function saveMapping() {
    setStatus('loading', 'กำลังบันทึกการตั้งค่า...');
    saveButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/ipd-subclinics/mapping', {
        method: 'POST',
        body: JSON.stringify(state.mapping)
      });
      state.mapping = { GENERAL_WARD: [], HOMEWARD: [], ...(payload.data || {}) };
      setStatus('success', payload.message || 'บันทึกการตั้งค่าสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      saveButton.disabled = false;
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeKey = button.dataset.subclinicKey;
      searchInput.value = '';
      renderTable();
    });
  });

  searchInput.addEventListener('input', renderTable);
  saveButton.addEventListener('click', saveMapping);
  tableBody.addEventListener('change', (event) => {
    const input = event.target.closest('input[type="checkbox"][data-ward]');
    if (!input) return;
    setSelected(
      state.activeKey,
      input.dataset.ward,
      input.dataset.displayName,
      input.checked
    );
    renderTable();
  });

  loadData();
}());
