export const formatDJF = (value, { suffix = true } = {}) => {
  const formatted = new Intl.NumberFormat('fr-DJ', { maximumFractionDigits: 0 }).format(value || 0);
  return suffix ? `${formatted} DJF` : formatted;
};

// All monetary values use Djibouti Franc (DJF).
export const formatCurrency = (value) => formatDJF(value);

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-US').format(value || 0);

export const formatWeight = (kg) => `${formatNumber(kg)} kg`;

export const formatCompactTons = (kg) => {
  const tons = (kg || 0) / 1000;
  if (tons >= 1) return `${tons >= 10 ? Math.round(tons) : tons.toFixed(1)}k`;
  return `${Math.round(kg || 0)} kg`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const CONTAINER_STATUSES = ['Pending', 'Loading', 'Exported', 'Delivered'];

export const EXPENSE_CATEGORIES = [
  'transport',
  'porter',
  'fuel',
  'loading',
  'loan',
  'utilities',
  'maintenance',
  'supplies',
  'general',
  'other',
];

export const MONEY_TRANSFER_TYPES = [
  { value: 'taaj', label: 'Taaj' },
  { value: 'bakery', label: 'Bakery' },
];

export const INCOME_SOURCE_LABELS = {
  taaj: 'Taaj',
  bakery: 'Bakery',
};
