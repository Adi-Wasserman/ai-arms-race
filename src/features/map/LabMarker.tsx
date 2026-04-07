import L from 'leaflet';

import { LAB_COLORS } from '@/config/labs';
import { shortName } from '@/services/format';
import type { ConfidenceResult, EpochDataCenter, Lab } from '@/types';

/** Hex → "r,g,b" tuple for the CSS pulse animation variable. */
function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/**
 * Build a Leaflet `divIcon` for one facility marker. The HTML matches
 * the legacy `mp` pattern (ai-arms-race.html lines 2210-2222):
 *
 *   <div class="mp [bld]" data-dc="..." style="--g:r,g,b;...">
 *     <div class="dt" style="background:#color"></div>
 *     ● Site Name
 *   </div>
 *
 * Building sites get the `bld` class which triggers the pulse animation
 * defined in GeoMap.module.css.
 */
export function buildLabMarkerIcon(
  dc: EpochDataCenter,
  cf: ConfidenceResult,
  bldClass: string,
): L.DivIcon {
  const lab = dc.co as Lab | 'Other';
  const color = lab === 'Other' ? '#555' : LAB_COLORS[lab];
  const triplet = hexToRgbTriplet(color);

  const icon =
    cf.category === 'OP' ? '●' : cf.category === 'BLD' ? '◐' : '○';
  const borderAlpha = cf.category === 'PLN' ? '55' : 'aa';
  const bgAlpha = cf.category === 'OP' ? '0.88' : '0.75';
  const dotOpacity = cf.category === 'PLN' ? '0.4' : '1';

  const escapedHandle = dc.handle.replace(/"/g, '&quot;');
  const buildingClass = cf.category === 'BLD' ? ` ${bldClass}` : '';

  return L.divIcon({
    className: '',
    html:
      `<div class="mp${buildingClass}" data-dc="${escapedHandle}" ` +
      `style="--g:${triplet};border-color:${color}${borderAlpha};` +
      `background:rgba(8,8,28,${bgAlpha});color:${color}">` +
      `<div class="dt" style="background:${color};opacity:${dotOpacity}"></div>` +
      `${icon} ${shortName(dc.title)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [-8, 14],
  });
}
