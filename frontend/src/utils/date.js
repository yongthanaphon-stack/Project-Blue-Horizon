const DEFAULT_DATE_OPTIONS = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export function formatDate(value, options = DEFAULT_DATE_OPTIONS, fallback = '-') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString('en-US', options);
}

export function formatTime(value, fallback = '-') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(value, fallback = 'Just now') {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return fallback;
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}
