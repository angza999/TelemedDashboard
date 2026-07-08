(function () {
  const meta = {
    INJECTION_DRESSING: { label: 'ฉีดยา/ทำแผล' },
    ER_TELEMED: { label: 'ER Telemed' }
  };
  const keys = ['INJECTION_DRESSING', 'ER_TELEMED'];
  const statusEl = document.getElementById('erSubclinicStatus');
  const tableBody = document.getElementById('erSubclinicTableBody');
  const searchInput = document.getElementById('erSubclinicSearch');
  const saveButton = document.getElementById('saveErSubclinicButton');
  const tabButtons = Array.from(document.querySelectorAll('[data-subclinic-key]'));
  const state = { activeKey: keys[0], departments: [], mapping: { INJECTION_DRESSING: [], ER_TELEMED: [] } };

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
  function setStatus(type, message) {
    statusEl.className = `dashboard-status ${type || ''}`.trim();
    statusEl.textContent = message;
  }
  function isSelected(key, code) {
    return (state.mapping[key] || []).some((item) => item.source_code === code);
  }
  function ownerOf(code) { return keys.find((key) => isSelected(key, code)) || null; }
  function setSelected(key, code, name, checked) {
    const items = state.mapping[key] || [];
    state.mapping[key] = checked
      ? (items.some((item) => item.source_code === code) ? items : [...items, { source_type: 'DEP', source_code: code, display_name: name }])
      : items.filter((item) => item.source_code !== code);
  }
  function filteredRows() {
    const keyword = String(searchInput.value || '').trim().toLowerCase();
    return keyword ? state.departments.filter((row) => String(row.depcode || '').toLowerCase().includes(keyword)
      || String(row.department || '').toLowerCase().includes(keyword)) : state.departments;
  }
  function render() {
    tabButtons.forEach((button) => {
      const active = button.dataset.subclinicKey === state.activeKey;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const rows = filteredRows();
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่พบรายการ</td></tr>';
      return;
    }
    tableBody.innerHTML = rows.map((row) => {
      const code = String(row.depcode || '');
      const selected = isSelected(state.activeKey, code);
      const owner = ownerOf(code);
      const locked = owner && owner !== state.activeKey;
      const inactive = row.depcode_active === 'N';
      const note = locked ? `ถูกเลือกอยู่ใน ${meta[owner].label}` : (inactive ? 'ห้อง inactive ใน HOSxP' : '-');
      return `<tr class="${inactive ? 'muted-row' : ''}">
        <td><input type="checkbox" data-depcode="${escapeHtml(code)}" data-display-name="${escapeHtml(row.department || code)}" ${selected ? 'checked' : ''} ${locked ? 'disabled' : ''}></td>
        <td><strong>${escapeHtml(code)}</strong></td><td>${escapeHtml(row.department || '-')}</td>
        <td><span class="status-badge ${inactive ? 'inactive' : 'active'}">${inactive ? 'Inactive' : 'Active'}</span></td>
        <td>${escapeHtml(note)}</td></tr>`;
    }).join('');
  }
  async function requestJson(url, options) {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'ทำรายการไม่สำเร็จ');
    return payload;
  }
  async function loadData() {
    setStatus('loading', 'กำลังโหลดรายการห้องและ mapping คลินิกย่อย ER...');
    saveButton.disabled = true;
    try {
      const [departments, mapping] = await Promise.all([
        requestJson('/api/admin/er-subclinics/departments'),
        requestJson('/api/admin/er-subclinics/mapping')
      ]);
      state.departments = departments.data || [];
      state.mapping = { INJECTION_DRESSING: [], ER_TELEMED: [], ...(mapping.data || {}) };
      setStatus('success', 'โหลดข้อมูลสำเร็จ');
      render();
    } catch (err) {
      setStatus('error', err.message || 'ไม่สามารถโหลดข้อมูลได้');
      tableBody.innerHTML = '<tr><td colspan="5" class="empty">ไม่สามารถโหลดรายการจาก HOSxP ได้</td></tr>';
    } finally { saveButton.disabled = false; }
  }
  async function saveMapping() {
    setStatus('loading', 'กำลังบันทึกการตั้งค่า...');
    saveButton.disabled = true;
    try {
      const payload = await requestJson('/api/admin/er-subclinics/mapping', { method: 'POST', body: JSON.stringify(state.mapping) });
      state.mapping = { INJECTION_DRESSING: [], ER_TELEMED: [], ...(payload.data || {}) };
      setStatus('success', payload.message || 'บันทึกการตั้งค่าสำเร็จ');
      render();
    } catch (err) { setStatus('error', err.message || 'บันทึกการตั้งค่าไม่สำเร็จ'); }
    finally { saveButton.disabled = false; }
  }
  tabButtons.forEach((button) => button.addEventListener('click', () => {
    state.activeKey = button.dataset.subclinicKey;
    searchInput.value = '';
    render();
  }));
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
