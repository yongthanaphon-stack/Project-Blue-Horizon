export function truncateText(value, maxLength = 96, suffix = '...') {
  if (!value) return '';

  const text = String(value).trim();
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}${suffix}`;
}

export function getInitials(name, fallback = 'BH') {
  if (!name) return fallback;

  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return initials || fallback;
}
