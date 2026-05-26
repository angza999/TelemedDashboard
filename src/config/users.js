const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const roles = ['admin', 'executive', 'user'];
const dataDir = path.join(__dirname, '..', '..', 'data');
const usersPath = process.env.USERS_FILE || path.join(dataDir, 'users.json');

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function ensureDataDir() {
  const dir = path.dirname(usersPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function envSeedUsers() {
  const timestamp = nowIso();
  const users = [{
    id: 1,
    username: process.env.ADMIN_USERNAME || 'admin',
    name: process.env.ADMIN_NAME || 'ผู้ดูแลระบบ',
    role: 'admin',
    passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin1234', 10),
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  }];

  if (process.env.EXECUTIVE_USERNAME && process.env.EXECUTIVE_PASSWORD) {
    users.push({
      id: 2,
      username: process.env.EXECUTIVE_USERNAME,
      name: process.env.EXECUTIVE_NAME || 'ผู้บริหาร',
      role: 'executive',
      passwordHash: bcrypt.hashSync(process.env.EXECUTIVE_PASSWORD, 10),
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  if (process.env.USER_USERNAME && process.env.USER_PASSWORD) {
    users.push({
      id: 3,
      username: process.env.USER_USERNAME,
      name: process.env.USER_NAME || 'ผู้ใช้งาน',
      role: 'user',
      passwordHash: bcrypt.hashSync(process.env.USER_PASSWORD, 10),
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  return users;
}

function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(usersPath)) {
    const users = envSeedUsers();
    writeUsers(users);
    return users;
  }

  const parsed = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const users = Array.isArray(parsed) ? parsed : [];
  if (!users.some((user) => user.role === 'admin')) {
    const seededAdmin = envSeedUsers()[0];
    users.unshift({ ...seededAdmin, id: nextId(users) });
    writeUsers(users);
  }
  return users;
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function nextId(users) {
  return users.reduce((max, user) => Math.max(max, Number(user.id) || 0), 0) + 1;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function listUsers() {
  return readUsers()
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map(publicUser);
}

function findUserByUsername(username) {
  const normalized = normalizeUsername(username);
  return readUsers().find((user) => normalizeUsername(user.username) === normalized) || null;
}

function findUserById(id) {
  return readUsers().find((user) => Number(user.id) === Number(id)) || null;
}

function usernameExists(username, exceptId = null) {
  const normalized = normalizeUsername(username);
  return readUsers().some((user) => (
    normalizeUsername(user.username) === normalized && Number(user.id) !== Number(exceptId)
  ));
}

function validateRole(role) {
  return roles.includes(role);
}

function countActiveAdmins(users) {
  return users.filter((user) => user.role === 'admin' && user.isActive !== false).length;
}

function isLastActiveAdminChange(currentUser, nextValues) {
  const users = readUsers();
  const current = users.find((user) => Number(user.id) === Number(currentUser.id));
  if (!current || current.role !== 'admin' || current.isActive === false) return false;

  const nextRole = nextValues.role || current.role;
  const nextIsActive = nextValues.isActive === undefined ? current.isActive !== false : Boolean(nextValues.isActive);
  return countActiveAdmins(users) <= 1 && (nextRole !== 'admin' || !nextIsActive);
}

function createUser(input) {
  const users = readUsers();
  const timestamp = nowIso();
  const username = String(input.username || '').trim();
  const name = String(input.name || '').trim();
  const role = String(input.role || '').trim();
  const password = String(input.password || '');

  if (!username) throw new Error('กรุณาระบุ username');
  if (!name) throw new Error('กรุณาระบุชื่อแสดงผล');
  if (!validateRole(role)) throw new Error('role ไม่ถูกต้อง');
  if (usernameExists(username)) throw new Error('username นี้ถูกใช้งานแล้ว');
  if (password.length < 6) throw new Error('password ต้องมีอย่างน้อย 6 ตัวอักษร');

  const user = {
    id: nextId(users),
    username,
    name,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    isActive: input.isActive !== false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  users.push(user);
  writeUsers(users);
  return publicUser(user);
}

function updateUser(id, input) {
  const users = readUsers();
  const index = users.findIndex((user) => Number(user.id) === Number(id));
  if (index === -1) throw new Error('ไม่พบผู้ใช้งาน');

  const current = users[index];
  const username = String(input.username || current.username).trim();
  const name = String(input.name || '').trim();
  const role = String(input.role || '').trim();
  const isActive = input.isActive === true;

  if (!username) throw new Error('กรุณาระบุ username');
  if (!name) throw new Error('กรุณาระบุชื่อแสดงผล');
  if (!validateRole(role)) throw new Error('role ไม่ถูกต้อง');
  if (usernameExists(username, current.id)) throw new Error('username นี้ถูกใช้งานแล้ว');
  if (isLastActiveAdminChange(current, { role, isActive })) {
    throw new Error('ไม่สามารถปิดใช้งานหรือลดสิทธิ์ admin คนสุดท้ายได้');
  }

  users[index] = {
    ...current,
    username,
    name,
    role,
    isActive,
    updatedAt: nowIso()
  };
  writeUsers(users);
  return publicUser(users[index]);
}

function resetPassword(id, password) {
  const users = readUsers();
  const index = users.findIndex((user) => Number(user.id) === Number(id));
  if (index === -1) throw new Error('ไม่พบผู้ใช้งาน');
  if (String(password || '').length < 6) throw new Error('password ต้องมีอย่างน้อย 6 ตัวอักษร');

  users[index] = {
    ...users[index],
    passwordHash: bcrypt.hashSync(String(password), 10),
    updatedAt: nowIso()
  };
  writeUsers(users);
  return publicUser(users[index]);
}

function toggleActive(id) {
  const users = readUsers();
  const index = users.findIndex((user) => Number(user.id) === Number(id));
  if (index === -1) throw new Error('ไม่พบผู้ใช้งาน');
  const current = users[index];
  const nextActive = current.isActive === false;
  if (isLastActiveAdminChange(current, { isActive: nextActive })) {
    throw new Error('ไม่สามารถปิดใช้งานหรือลดสิทธิ์ admin คนสุดท้ายได้');
  }

  users[index] = {
    ...current,
    isActive: nextActive,
    updatedAt: nowIso()
  };
  writeUsers(users);
  return publicUser(users[index]);
}

module.exports = {
  roles,
  findUserByUsername,
  findUserById,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  toggleActive
};
