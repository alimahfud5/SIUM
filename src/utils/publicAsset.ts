export function resolvePublicAsset(assetPath?: string | null): string {
  const raw = (assetPath ?? '').trim();
  if (!raw) return '';

  if (
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('//')
  ) {
    return raw;
  }

  const baseRaw = import.meta.env.BASE_URL || '/';
  const base = baseRaw.endsWith('/') ? baseRaw : `${baseRaw}/`;
  const cleanPath = raw.replace(/^\/+/, '');
  const baseWithoutLeadingSlash = base.replace(/^\/+/, '');

  if (baseWithoutLeadingSlash && cleanPath.startsWith(baseWithoutLeadingSlash)) {
    return `/${cleanPath}`;
  }

  return `${base}${cleanPath}`;
}
