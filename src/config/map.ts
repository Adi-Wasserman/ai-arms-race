import type { MapConfig, MapRegion } from '@/types';

export const MAP_CONFIG: MapConfig = {
  defaultCenter: [37.5, -96],
  defaultZoom: 4,
  satelliteTileUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  labelTileUrl:
    'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
  attribution:
    'Imagery © Esri · Labels © CARTO · Data © Epoch AI',
} as const;

export const MAP_REGIONS: readonly MapRegion[] = [
  { key: 'all', label: 'ALL',  center: [37.5, -96],  zoom: 4 },
  { key: 'us',  label: 'US',   center: [37.5, -96],  zoom: 4 },
  { key: 'uae', label: 'UAE',  center: [24.15, 54.44], zoom: 8 },
] as const;
