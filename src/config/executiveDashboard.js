function boundedPercent(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed;
}

module.exports = {
  b2cTargetPercent: boundedPercent(process.env.EXECUTIVE_B2C_TARGET_PERCENT, 50)
};
