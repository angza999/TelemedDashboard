require('dotenv').config();

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = process.env.USERS_FILE || path.join(dataDir, 'users.json');
const adminUsername = String(process.env.ADMIN_USERNAME || 'admin').trim();
const adminName = String(process.env.ADMIN_NAME || 'ผู้ดูแลระบบ').trim();
const resetPassword = String(process.env.RESET_ADMIN_PASSWORD || '').trim().toLowerCase() === 'true';

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(users) {
  return users.reduce((max, user) => Math.max(max, Number(user.id) || 0), 0) + 1;
}

function requireAdminPassword() {
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD ต้องมีอย่างน้อย 6 ตัวอักษรสำหรับสร้างหรือรีเซ็ตรหัสผ่าน admin');
  }
  return password;
}

function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('ไฟล์ users.json ต้องเป็น array');
  return parsed;
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(usersPath), { recursive: true });
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function ensureAdmin() {
  if (!adminUsername) throw new Error('ADMIN_USERNAME ต้องไม่ว่าง');

  const users = readUsers();
  const index = users.findIndex((user) => normalizeUsername(user.username) === normalizeUsername(adminUsername));
  const timestamp = nowIso();
  let action;

  if (index === -1) {
    const password = requireAdminPassword();
    users.push({
      id: nextId(users),
      username: adminUsername,
      name: adminName,
      role: 'admin',
      passwordHash: bcrypt.hashSync(password, 10),
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    action = 'created';
  } else {
    const current = users[index];
    const updated = {
      ...current,
      username: adminUsername,
      name: current.name || adminName,
      role: 'admin',
      isActive: true,
      updatedAt: timestamp
    };

    delete updated.deletedAt;
    delete updated.deletedBy;

    if (resetPassword) {
      updated.passwordHash = bcrypt.hashSync(requireAdminPassword(), 10);
    }

    users[index] = updated;
    action = resetPassword ? 'repaired_and_password_reset' : 'repaired';
  }

  writeUsers(users);
  console.info(`[ensure-admin] completed action=${action} username=${adminUsername}`);
}

try {
  ensureAdmin();
} catch (err) {
  console.error(`[ensure-admin] failed: ${err.message}`);
  process.exitCode = 1;
}
