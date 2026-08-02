function boundedPercent(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed;
}

const hospitalTargetPercent = boundedPercent(process.env.EXECUTIVE_HOSPITAL_TARGET_PERCENT, 50);
const departmentTargetPercent = boundedPercent(process.env.DEPARTMENT_TARGET_PERCENT, hospitalTargetPercent);
const b2cTargetPercent = boundedPercent(process.env.EXECUTIVE_B2C_TARGET_PERCENT, 50);

module.exports = {
  b2cTargetPercent,
  boundedPercent,
  departmentTargetPercent,
  hospitalTargetPercent
};
