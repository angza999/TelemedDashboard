(function () {
  const meta = {
    ER_PATIENT: { label: 'ผู้ป่วยห้องฉุกเฉิน', includeInCardTotal: true, showInDetail: true, active: true },
    INJECTION_WOUND: { label: 'ฉีดยา/ทำแผล', includeInCardTotal: false, showInDetail: true, active: true },
    ER_TELEMED: { label: 'ER Telemed', includeInCardTotal: false, showInDetail: true, active: true }
  };
  const legacyKeyMap = { INJECTION_DRESSING: 'INJECTION_WOUND' };
  const keys = ['ER_PATIENT', 'INJECTION_WOUND', 'ER_TELEMED'];
  const statusEl = document.getElementById('erSubclinicStatus');
  const tableBody = document.getElementById('erSubclinicTableBody');
  const searchInput = document.getElementById('erSubclinicSearch');
  const saveButton = document.getElementById('saveErSubclinicButton');
  const includeToggle = document.getElementById('erIncludeInCardToggle');
  const detailToggle = document.getElementById('erShowInDetailToggle');
  const activeToggle = document.getElementById('erActiveToggle');
  const tabButtons = Array.from(document.querySelectorAll('[data-subclinic-key]'));
  const state = {
    activeKey: keys[0],
    departments: [],
    mapping: Object.fromEntries(keys.map((key) => [key, []])),
    options: Object.fromEntries(keys.map((key) => [key, {
      include_in_card_total: meta[key].includeInCardTotal,
      show_in_detail: meta[key].showInDetail,
      active: meta[key].active
    }]))
  };

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function normalizeFlag(value, fallback) {
    if (value === undefined || value === null || value === '') return Boolean(fallback);
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function setStatus(type, message) {
    statusEl.className = `dashboard-status ${type || ''}`.trim();
    statusEl.textContent = message;
  }

  function canonicalKey(key) {
    return legacyKeyMap[key] || key;
  }

  function normalizeMapping(raw) {
    const normalized = Object.fromEntries(keys.map((key) => [key, []]));
    const options = Object.fromEntries(keys.map((key) => [key, {
      include_in_card_total: meta[key].includeInCardTotal,
      show_in_detail: meta[key].showInDetail,
      active: meta[key].active
    }]));
    Object.entries(raw || {}).forEach(([rawKey, items]) => {
      const key = canonicalKey(rawKey);
      if (!keys.includes(key) || !Array.isArray(items)) return;
      normalized[key] = items.map((item) => ({
        source_type: 'DEP',
        source_code: String(item.source_code || ''),
        display_name: item.display_name || item.source_code || '',
        include_in_card_total: normalizeFlag(item.include_in_card_total, meta[key].includeInCardTotal),
        show_in_detail: normalizeFlag(item.show_in_detail, meta[key].showInDetail),
        active: normalizeFlag(item.active, meta[key].active)
      })).filter((item) => item.source_code);
      if (normalized[key].length) {
        options[key] = {
          include_in_card_total: normalized[key].some((item) => item.include_in_card_total),
          show_in_detail: normalized[key].some((item) => item.show_in_detail),
          active: normalized[key].some((item) => item.active)
        };
      }
    });
    return { mapping: normalized, options };
  }

  function rowsForActiveKey() {
    return state.mapping[state.activeKey] || [];
  }

  function currentOptions() {
    return state.options[state.activeKey] || {
      include_in_card_total: meta[state.activeKey].includeInCardTotal,
      show_in_detail: meta[state.activeKey].showInDetail,
      active: meta[state.activeKey].active
    };
  }

  function applyOptionsToActiveRows() {
    const options = {
      include_in_card_total: includeToggle.checked,
      show_in_detail: detailToggle.checked,
      active: activeToggle.checked
    };
    state.options[state.activeKey] = options;
    state.mapping[state.activeKey] = rowsForActiveKey().map((item) => ({ ...item, ...options }));
  }

  function isSelected(key, code) {
    return (state.mapping[key] || []).some((item) => item.source_code === code);
  }

  function ownerOf(code) {
    return keys.find((key) => {
      if (key === state.activeKey) return false;
      return (state.mapping[key] || []).some((item) => item.source_code === code && normalizeFlag(item.active, meta[key].active));
    }) || null;
  }

  function setSelected(key, code, name, checked) {
    const options = currentOptions();
    const items = state.mapping[key] || [];
    state.mapping[key] = checked
      ? (items.some((item) => item.source_code === code)
        ? items
        : [...items, { source_type: 'DEP', source_code: code, display_name: name, ...options }])
      : items.filter((item) => item.source_code !== code);
  }

  function filteredRows() {
    const keyword = String(searchInput.value || '').trim().toLowerCase();
    return keyword
      ? state.departments.filter((row) => String(row.depcode || '').toLowerCase().includes(keyword)
        || String(row.department || '').toLowerCase().includes(keyword))
      : state.departments;
  }

  function renderOptions() {
    const options = currentOptions();
    includeToggle.checked = options.include_in_card_total;
    detailToggle.checked = options.show_in_detail;
    activeToggle.checked = options.active;
  }

  function render() {
    tabButtons.forEach((button) => {
      const active = button.dataset.subclinicKey === state.activeKey;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderOptions();
    const rows = filteredRows();
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่พบรายการ</td></tr>';
      return;
    }
    tableBody.innerHTML = rows.map((row) => {
      const code = String(row.depcode || '');
      const selected = isSelected(state.activeKey, code);
      const owner = ownerOf(code);
      const locked = owner && owner !== state.activeKey && activeToggle.checked;
      const inactive = row.depcode_active === 'N';
      const note = locked ? `ถูกเลือกอยู่ใน ${meta[owner].label}` : (inactive ? 'ห้อง inactive ใน HOSxP' : '-');
      return `<tr class="${inactive ? 'muted-row' : ''}">
        <td><input type="checkbox" data-depcode="${escapeHtml(code)}" data-display-name="${escapeHtml(row.department || code)}" ${selected ? 'checked' : ''} ${locked ? 'disabled' : ''}></td>
        <td><strong>${escapeHtml(code)}</strong></td>
        <td>${escapeHtml(row.department || '-')}</td>
        <td><span class="status-badge ${inactive ? 'inactive' : 'active'}">${inactive ? 'Inactive' : 'Active'}</span></td>
        <td>${escapeHtml(note)}</td>
      </tr>`;
    }).join('');
  }

  async function requestJson(url, options) {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'ทำรายการไม่สำเร็จ');
    return payload;
  }

  async function loadData() {
    setStatus('loading', 'กำลังโหลดรายการห้องและ mapping บริการ ER...');
    saveButton.disabled = true;
    try {
      const [departments, mapping] = await Promise.all([
        requestJson('/api/admin/er-subclinics/departments'),
        requestJson('/api/admin/er-subclinics/mapping')
      ]);
      state.departments = departments.data || [];
      const normalized = normalizeMapping(mapping.data || {});
      state.mapping = normalized.mapping;
      state.options = normalized.options;
      setStatus('success', 'โหลดข้อมูลสำเร็จ');
      render();
    } catch (err) {
      setStatus('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่สามารถโหลดรายการจาก HOSxP ได้</td></tr>';
    } finally {
      saveButton.disabled = false;
    }
  }

  async function saveMapping() {
    applyOptionsToActiveRows();
    setStatus('loading', 'กำลังบันทึกการตั้งค่า...');
    saveButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/er-subclinics/mapping', {
        method: 'POST',
        body: JSON.stringify(state.mapping)
      });
      const normalized = normalizeMapping(payload.data || {});
      state.mapping = normalized.mapping;
      state.options = normalized.options;
      setStatus(payload.warning ? 'warning' : 'success', payload.warning || payload.message || 'บันทึกการตั้งค่าสำเร็จ');
      render();
    } catch (err) {
      setStatus('error', err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      saveButton.disabled = false;
    }
  }

  tabButtons.forEach((button) => button.addEventListener('click', () => {
    applyOptionsToActiveRows();
    state.activeKey = button.dataset.subclinicKey;
    searchInput.value = '';
    render();
  }));
  [includeToggle, detailToggle, activeToggle].forEach((toggle) => {
    toggle.addEventListener('change', () => {
      applyOptionsToActiveRows();
      render();
    });
  });
  searchInput.addEventListener('input', render);
  saveButton.addEventListener('click', saveMapping);
  tableBody.addEventListener('change', (event) => {
    const input = event.target.closest('input[type="checkbox"][data-depcode]');
    if (!input) return;
    setSelected(state.activeKey, input.dataset.depcode, input.dataset.displayName, input.checked);
    render();
  });
  loadData();
}());
