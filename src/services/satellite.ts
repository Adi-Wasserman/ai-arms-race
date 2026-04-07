/**
 * ESRI World Imagery export URL builder.
 *
 * Centers a satellite image precisely on (lat, lon) by computing a
 * lat/lon bounding box that matches the requested pixel size and
 * physical span. Avoids tile-grid math entirely — we hand the server a
 * bbox and get back a single rendered JPEG.
 *
 * Ported from `satelliteImgURL` in ai-arms-race.html (lines 2161-2178).
 */
export function satelliteImgURL(
  lat: number,
  lon: number,
  widthPx: number,
  heightPx: number,
  spanKm: number,
): string {
  const latPerKm = 1 / 111.32;
  const lonPerKm = 1 / (111.32 * Math.cos((lat * Math.PI) / 180));
  const halfLatSpan = (spanKm / 2) * latPerKm;
  const halfLonSpan = (spanKm / 2) * lonPerKm * (widthPx / heightPx);

  const bbox = [
    lon - halfLonSpan,
    lat - halfLatSpan,
    lon + halfLonSpan,
    lat + halfLatSpan,
  ].join(',');

  return (
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export' +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326` +
    `&size=${widthPx},${heightPx}` +
    '&format=jpg&f=image'
  );
}
