export function difficultyBadgeClass(difficulty) {
  switch ((difficulty || '').toLowerCase()) {
    case 'easy':
      return 'badge badge-easy';
    case 'medium':
      return 'badge badge-medium';
    case 'hard':
      return 'badge badge-hard';
    default:
      return 'badge';
  }
}

export function statusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'accepted':
      return 'badge badge-accepted';
    case 'pending':
    case 'running':
      return 'badge badge-pending';
    case 'wrong answer':
      return 'badge badge-wrong';
    default:
      return 'badge badge-error';
  }
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
