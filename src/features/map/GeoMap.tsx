import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { LAB_COLORS } from '@/config/labs';
import { FACILITY_COORD_OVERRIDES, FACILITY_COORDS } from '@/data/facilities';
import { scoreConfidence } from '@/services/confidence';
import { shortName } from '@/services/format';
import { useDashboard } from '@/store';
import type { EpochDataCenter, Lab, RegionKey } from '@/types';

import { buildLabMarkerIcon } from './LabMarker';
import styles from './GeoMap.module.css';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

interface RegionView {
  center: [number, number];
  zoom: number;
}

const REGION_VIEWS: Record<RegionKey, RegionView> = {
  all: { center: [37.5, -96], zoom: 4 },
  us: { center: [37.5, -96], zoom: 5 },
  uae: { center: [24.15, 54.44], zoom: 10 },
};

/**
 * Imperatively fly the Leaflet map view whenever `region` changes.
 * Mounted as a child of <MapContainer>; uses `useMap` to grab the
 * underlying L.Map instance and call setView.
 */
function RegionFlyer({ region }: { region: RegionKey }): null {
  const map = useMap();
  useEffect(() => {
    const view = REGION_VIEWS[region];
    map.setView(view.center, view.zoom, { animate: true });
  }, [map, region]);
  return null;
}

/**
 * Force a Leaflet `invalidateSize` after the section becomes visible
 * — required when the map is hidden during initial layout (e.g. inside
 * a hidden tab) so its tiles compute correctly.
 */
function ResizeOnMount(): null {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function GeoMap(): JSX.Element {
  const region = useDashboard((s) => s.region);
  const setSelectedFacility = useDashboard((s) => s.setSelectedFacility);
  const dataCenters = useDashboard((s) => s.dataCenters);
  const timeline = useDashboard((s) => s.timeline);
  // Filters are shared across the Map and Intel sections via intelSlice
  // — toggling either keeps both views in sync (matches the legacy).
  const statusFilter = useDashboard((s) => s.statusFilter);
  const labFilter = useDashboard((s) => s.labFilter);
  const dataVersion = useDashboard((s) => s.dataVersion);

  /**
   * Pre-compute the list of renderable markers (filtered + classified).
   * Each entry holds the DC, its coords, the confidence result, and the
   * built Leaflet divIcon.
   *
   * Coordinate resolution order:
   *   1. dc.lat / dc.lon from the Epoch CSV (the authoritative source —
   *      Epoch publishes lat/lon columns for every facility).
   *   2. FACILITY_COORDS hardcoded fallback (only used when running off
   *      the local fallback dataset, which has no lat/lon).
   *
   * The legacy did the same lookup via `CFG.coords[dc.handle]` only, but
   * its `coords` map happened to use Epoch's exact handle names. Our
   * hardcoded map uses the long fallback names, so a direct handle
   * lookup almost never hits — we have to use dc.lat/dc.lon first.
   */
  /**
   * Stable list of all renderable markers — only recomputes when the
   * underlying dataset changes, NOT when filters change. This is the
   * "expensive" pass: classify, build icon, resolve coords.
   */
  const allMarkers = useMemo(() => {
    return dataCenters
      .filter((dc) => dc.co !== 'Other')
      .map((dc) => {
        // Resolution order: verified override → Epoch lat/lon → hardcoded fallback.
        const override = FACILITY_COORD_OVERRIDES[dc.handle];
        const epochCoords: [number, number] | null =
          dc.lat != null && dc.lon != null ? [dc.lat, dc.lon] : null;
        const fallbackCoords = FACILITY_COORDS[dc.handle] ?? null;
        const coords = override ?? epochCoords ?? fallbackCoords;
        if (!coords) return null;

        const tl = timeline.filter((t) => t.dc === dc.handle);
        const cf = scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS);
        const icon = buildLabMarkerIcon(dc, cf, 'bld');
        return { dc, coords, cf, icon };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, dataCenters, timeline]);

  /**
   * Filter pass — cheap, only filters the stable allMarkers list. Does
   * NOT rebuild icons or coords, so existing react-leaflet markers
   * (matched by `dc.handle` key) stay mounted with their original icons.
   */
  const markers = useMemo(() => {
    return allMarkers.filter((m) => {
      if (statusFilter !== 'ALL' && m.cf.category !== statusFilter) return false;
      if (labFilter !== 'ALL' && m.dc.co !== labFilter) return false;
      return true;
    });
  }, [allMarkers, statusFilter, labFilter]);

  const initial = REGION_VIEWS[region];

  return (
    <MapContainer
      center={initial.center}
      zoom={initial.zoom}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      className={styles.map}
    >
      {/* ESRI satellite tiles */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      {/* CARTO dark labels overlay */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        opacity={0.6}
      />

      <RegionFlyer region={region} />
      <ResizeOnMount />

      {markers.map(({ dc, coords, icon }) => (
        <Marker
          key={dc.handle}
          position={coords as [number, number]}
          icon={icon}
          eventHandlers={{
            mouseover: () => setSelectedFacility(dc.handle),
            click: () => setSelectedFacility(dc.handle),
          }}
        >
          {/* Tooltip rendered via the leaflet popup; we keep titles
              minimal because the preview panel handles details. */}
        </Marker>
      ))}
    </MapContainer>
  );
}

// Local helpers exposed for the preview panel + tests.
export { TODAY_ISO };
// Reference these so dead-code elimination doesn't drop them in dev.
void shortName;
void ([] as readonly Lab[]);
void ([] as EpochDataCenter[]);
