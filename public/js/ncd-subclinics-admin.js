(function () {
  const subclinicMeta = {
    HT: { label: 'คลินิกความดัน' },
    DM: { label: 'คลินิกเบาหวาน' },
    COPD: { label: 'คลินิก COPD' },
    CKD: { label: 'คลินิกโรคไต' }
  };
  const subclinicKeys = ['HT', 'DM', 'COPD', 'CKD'];

  const statusEl = document.getElementById('ncdSubclinicStatus');
  const tableBody = document.getElementById('ncdSubclinicTableBody');
  const searchInput = document.getElementById('ncdSubclinicSearch');
  const saveButton = document.getElementById('saveNcdSubclinicButton');
  const tabButtons = Array.from(document.querySelectorAll('[data-subclinic-key]'));

  const state = {
    activeKey: 'HT',
    departments: [],
    mapping: { HT: [], DM: [], COPD: [], CKD: [] },
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

  function isSelected(subclinicKey, depcode) {
    return (state.mapping[subclinicKey] || []).some((item) => item.source_code === depcode);
  }

  function selectedOwner(depcode) {
    return subclinicKeys.find((key) => isSelected(key, depcode)) || null;
  }

  function setSelected(subclinicKey, depcode, displayName, checked) {
    const items = state.mapping[subclinicKey] || [];
    if (!checked) {
      state.mapping[subclinicKey] = items.filter((item) => item.source_code !== depcode);
      return;
    }
    if (!items.some((item) => item.source_code === depcode)) {
      items.push({ source_type: 'DEP', source_code: depcode, display_name: displayName });
    }
    state.mapping[subclinicKey] = items;
  }

  function filteredRows() {
    const keyword = String(searchInput.value || '').trim().toLowerCase();
    if (!keyword) return state.departments;
    return state.departments.filter((row) => (
      String(row.depcode || '').toLowerCase().includes(keyword)
      || String(row.department || '').toLowerCase().includes(keyword)
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
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่พบรายการ</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((row) => {
      const depcode = String(row.depcode || '');
      const selected = isSelected(state.activeKey, depcode);
      const owner = selectedOwner(depcode);
      const lockedByOther = owner && owner !== state.activeKey;
      const inactive = row.depcode_active === 'N';
      const note = lockedByOther
        ? `ถูกเลือกอยู่ใน ${subclinicMeta[owner].label}`
        : (inactive ? 'ห้อง inactive ใน HOSxP แต่ยังเลือกได้หากต้องการนับ' : '-');

      return `
        <tr class="${inactive ? 'muted-row' : ''}">
          <td>
            <input
              type="checkbox"
              data-depcode="${escapeHtml(depcode)}"
              data-display-name="${escapeHtml(row.department || depcode)}"
              ${selected ? 'checked' : ''}
              ${lockedByOther ? 'disabled' : ''}
              aria-label="เลือก ${escapeHtml(row.department || depcode)}">
          </td>
          <td><strong>${escapeHtml(depcode)}</strong></td>
          <td>${escapeHtml(row.department || '-')}</td>
          <td>
            <span class="status-badge ${inactive ? 'inactive' : 'active'}">${inactive ? 'Inactive' : 'Active'}</span>
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
    setStatus('loading', 'กำลังโหลดรายการห้องและ mapping คลินิกย่อย...');
    saveButton.disabled = true;
    try {
      const [departments, mapping] = await Promise.all([
        requestJson('/api/admin/ncd-subclinics/departments'),
        requestJson('/api/admin/ncd-subclinics/mapping')
      ]);
      state.departments = departments.data || [];
      state.mapping = { HT: [], DM: [], COPD: [], CKD: [], ...(mapping.data || {}) };
      setStatus('success', 'โหลดข้อมูลสำเร็จ');
      renderTable();
    } catch (err) {
      setStatus('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่สามารถโหลดรายการจาก HOSxP ได้</td></tr>';
    } finally {
      state.loading = false;
      saveButton.disabled = false;
    }
  }

  async function saveMapping() {
    setStatus('loading', 'กำลังบันทึกการตั้งค่า...');
    saveButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/ncd-subclinics/mapping', {
        method: 'POST',
        body: JSON.stringify(state.mapping)
      });
      state.mapping = { HT: [], DM: [], COPD: [], CKD: [], ...(payload.data || {}) };
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
    const input = event.target.closest('input[type="checkbox"][data-depcode]');
    if (!input) return;
    setSelected(
      state.activeKey,
      input.dataset.depcode,
      input.dataset.displayName,
      input.checked
    );
    renderTable();
  });

  loadData();
}());
