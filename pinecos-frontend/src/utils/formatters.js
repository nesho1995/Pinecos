const currencyHnl = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatCurrencyHNL = (value) => {
  const amount = Number(value || 0);
  return currencyHnl.format(Number.isFinite(amount) ? amount : 0);
};

export const formatNumber = (value, decimals = 2) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return (0).toFixed(decimals);
  return amount.toFixed(decimals);
};

export const formatDateTimeHN = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-HN');
};

export const formatTimeHN = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-HN');
};

