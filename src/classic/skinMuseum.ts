// Helper for the Winamp Skin Museum (https://skins.webamp.org). Skin files are
// served from its CDN by MD5, CORS-enabled, so they can be passed straight to
// ClassicWinampPlayer's `skinUrl`.
const MUSEUM_CDN = "https://r2.webampskins.org/skins";

/** URL of a Skin Museum `.wsz` by its MD5 hash. */
export function skinMuseumUrl(md5: string): string {
  return `${MUSEUM_CDN}/${md5}.wsz`;
}
