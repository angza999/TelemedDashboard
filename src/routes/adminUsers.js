const express = require('express');
const {
  roles,
  findUserById,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  toggleActive
} = require('../config/users');

const router = express.Router();

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function pullFlash(req) {
  const message = req.session.flash || null;
  delete req.session.flash;
  return message;
}

function checkedActive(value) {
  return value === 'on' || value === 'true' || value === true;
}

function formUser(user = {}) {
  return {
    id: user.id || '',
    username: user.username || '',
    name: user.name || '',
    role: user.role || 'user',
    isActive: user.isActive !== false
  };
}

function renderForm(res, options) {
  return res.status(options.status || 200).render('admin/users/form', {
    title: options.title,
    mode: options.mode,
    user: options.user,
    roles,
    error: options.error || null
  });
}

router.get('/', (req, res) => {
  res.render('admin/users/index', {
    title: 'จัดการผู้ใช้งาน',
    users: listUsers(),
    flash: pullFlash(req)
  });
});

router.get('/new', (req, res) => {
  renderForm(res, {
    title: 'เพิ่มผู้ใช้งาน',
    mode: 'new',
    user: formUser()
  });
});

router.post('/', (req, res) => {
  const user = formUser({
    ...req.body,
    isActive: checkedActive(req.body.isActive)
  });

  try {
    if (String(req.body.password || '') !== String(req.body.confirmPassword || '')) {
      throw new Error('password และ confirm password ต้องตรงกัน');
    }
    createUser({ ...user, password: req.body.password });
    flash(req, 'success', 'เพิ่มผู้ใช้งานสำเร็จ');
    return res.redirect('/admin/users');
  } catch (err) {
    return renderForm(res, {
      status: 400,
      title: 'เพิ่มผู้ใช้งาน',
      mode: 'new',
      user,
      error: err.message
    });
  }
});

router.get('/:id/edit', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });
  return renderForm(res, {
    title: 'แก้ไขผู้ใช้งาน',
    mode: 'edit',
    user: formUser(user)
  });
});

router.post('/:id', (req, res) => {
  const current = findUserById(req.params.id);
  if (!current) return res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });

  const user = formUser({
    id: current.id,
    username: req.body.username || current.username,
    name: req.body.name,
    role: req.body.role,
    isActive: checkedActive(req.body.isActive)
  });

  try {
    updateUser(req.params.id, user);
    flash(req, 'success', 'แก้ไขผู้ใช้งานสำเร็จ');
    return res.redirect('/admin/users');
  } catch (err) {
    return renderForm(res, {
      status: 400,
      title: 'แก้ไขผู้ใช้งาน',
      mode: 'edit',
      user,
      error: err.message
    });
  }
});

router.get('/:id/reset-password', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });
  return res.render('admin/users/reset-password', {
    title: 'Reset Password',
    user,
    error: null
  });
});

router.post('/:id/reset-password', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });

  try {
    if (String(req.body.password || '') !== String(req.body.confirmPassword || '')) {
      throw new Error('password และ confirm password ต้องตรงกัน');
    }
    resetPassword(req.params.id, req.body.password);
    flash(req, 'success', 'รีเซ็ตรหัสผ่านสำเร็จ');
    return res.redirect('/admin/users');
  } catch (err) {
    return res.status(400).render('admin/users/reset-password', {
      title: 'Reset Password',
      user,
      error: err.message
    });
  }
});

router.post('/:id/toggle-active', (req, res) => {
  try {
    const user = toggleActive(req.params.id);
    flash(req, 'success', user.isActive ? 'เปิดใช้งานผู้ใช้สำเร็จ' : 'ปิดใช้งานผู้ใช้สำเร็จ');
  } catch (err) {
    flash(req, 'error', err.message);
  }
  return res.redirect('/admin/users');
});

module.exports = router;
