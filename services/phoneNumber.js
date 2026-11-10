function normalizeVietnameseMobilePhone(value) {
  if (typeof value !== 'string') return null;
  const compact = value.trim().replace(/[\s().-]/g, '');
  const national = compact.startsWith('+84')
    ? `0${compact.slice(3)}`
    : compact.startsWith('84')
      ? `0${compact.slice(2)}`
      : compact;
  if (!/^0[35789]\d{8}$/.test(national)) return null;
  return `+84${national.slice(1)}`;
}

module.exports = { normalizeVietnameseMobilePhone };
