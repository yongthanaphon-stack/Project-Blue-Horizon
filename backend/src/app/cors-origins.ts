const LOCAL_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];
const RENDER_ORIGINS = [/^https:\/\/[a-z0-9-]+\.onrender\.com$/i];
const NEXRESEARCH_ORIGINS = [
  'https://platform.nexresearch.net',
  'https://report.nexresearch.net',
];

function splitOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOrigins() {
  const configuredOrigins = [
    ...splitOrigins(process.env.FRONTEND_URL),
    ...splitOrigins(process.env.CORS_ORIGINS),
  ];
  const platformOrigins = process.env.RENDER === 'true' ? RENDER_ORIGINS : [];

  return [...LOCAL_ORIGINS, ...platformOrigins, ...NEXRESEARCH_ORIGINS, ...new Set(configuredOrigins)];
}
