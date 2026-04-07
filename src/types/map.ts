import type { Coordinates } from './facility';

export interface MapRegion {
  key: string;
  label: string;
  center: Coordinates;
  zoom: number;
}

export interface MapConfig {
  defaultCenter: Coordinates;
  defaultZoom: number;
  satelliteTileUrl: string;
  labelTileUrl: string;
  attribution: string;
}
