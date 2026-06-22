(function () {
  const deleteButtons = document.querySelectorAll('.delete-user-button:not(:disabled)');
  const modal = document.getElementById('deleteUserModal');
  const closeButton = document.getElementById('deleteUserCloseButton');
  const cancelButton = document.getElementById('deleteUserCancelButton');
  const confirmButton = document.getElementById('deleteUserConfirmButton');
  const userNameEl = document.getElementById('deleteUserName');
  const errorEl = document.getElementById('deleteUserError');
  const noticeEl = document.getElementById('usersNotice');
  const usersCountEl = document.getElementById('usersCount');

  let selectedUserId = null;
  let selectedRow = null;

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('hidden', hidden);
  }

  function showNotice(type, message) {
    if (!noticeEl) return;
    noticeEl.className = `alert ${type === 'success' ? 'success' : ''}`.trim();
    noticeEl.textContent = message;
    setHidden(noticeEl, false);
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    setHidden(errorEl, false);
  }

  function openModal(button) {
    selectedUserId = button.dataset.userId;
    selectedRow = document.querySelector(`[data-user-row="${selectedUserId}"]`);
    userNameEl.textContent = button.dataset.username || '-';
    setHidden(errorEl, true);
    setHidden(modal, false);
    modal.setAttribute('aria-hidden', 'false');
    confirmButton.focus();
  }

  function closeModal() {
    selectedUserId = null;
    selectedRow = null;
    setHidden(modal, true);
    modal.setAttribute('aria-hidden', 'true');
    setHidden(errorEl, true);
  }

  function updateUserCount() {
    if (!usersCountEl) return;
    const rows = document.querySelectorAll('[data-user-row]');
    usersCountEl.textContent = rows.length.toLocaleString('th-TH');
  }

  function setLoading(isLoading) {
    if (!confirmButton) return;
    confirmButton.disabled = isLoading;
    confirmButton.innerHTML = isLoading
      ? '<i class="bi bi-arrow-clockwise"></i> กำลังลบ...'
      : '<i class="bi bi-trash"></i> ยืนยันลบผู้ใช้งาน';
  }

  async function confirmDelete() {
    if (!selectedUserId) return;
    setLoading(true);
    setHidden(errorEl, true);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserId)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'ไม่สามารถลบผู้ใช้งานนี้ได้');
      }

      if (selectedRow) selectedRow.remove();
      updateUserCount();
      closeModal();
      showNotice('success', payload.message || 'ลบผู้ใช้งานสำเร็จ');
    } catch (err) {
      showError(err.message || 'ไม่สามารถลบผู้ใช้งานนี้ได้');
    } finally {
      setLoading(false);
    }
  }

  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => openModal(button));
  });

  closeButton?.addEventListener('click', closeModal);
  cancelButton?.addEventListener('click', closeModal);
  confirmButton?.addEventListener('click', confirmDelete);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
  });
}());
