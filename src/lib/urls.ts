const PRODUCTION_ORIGIN = (import.meta.env.VITE_APP_URL || 'https://leonardo-alvarez-mt.github.io').replace(/\/$/, '');

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export function buildShareableUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${PRODUCTION_ORIGIN}${BASE_PATH}${cleanPath}`;
}
