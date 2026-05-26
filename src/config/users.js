const bcrypt = require('bcryptjs');

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
const executiveUsername = process.env.EXECUTIVE_USERNAME;
const executivePassword = process.env.EXECUTIVE_PASSWORD;
const userUsername = process.env.USER_USERNAME;
const userPassword = process.env.USER_PASSWORD;

const users = [
  {
    id: 1,
    username: adminUsername,
    name: 'ผู้ดูแลระบบ',
    role: 'admin',
    passwordHash: bcrypt.hashSync(adminPassword, 10)
  }
];

if (executiveUsername && executivePassword) {
  users.push({
    id: 2,
    username: executiveUsername,
    name: process.env.EXECUTIVE_NAME || 'ผู้บริหาร',
    role: 'executive',
    passwordHash: bcrypt.hashSync(executivePassword, 10)
  });
}

if (userUsername && userPassword) {
  users.push({
    id: 3,
    username: userUsername,
    name: process.env.USER_NAME || 'ผู้ใช้งาน',
    role: 'user',
    passwordHash: bcrypt.hashSync(userPassword, 10)
  });
}

function findUserByUsername(username) {
  return users.find((user) => user.username.toLowerCase() === String(username || '').toLowerCase());
}

function listUsers() {
  return users.map(({ passwordHash, ...user }) => user);
}

module.exports = { findUserByUsername, listUsers };
