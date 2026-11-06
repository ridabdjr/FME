import type { StyleSpecification } from 'maplibre-gl';
import { BasemapStyleId } from '../types/models';

/**
 * Centralized Map & Tile Provider Configuration Service (Phase 2).
 *
 * ARCHITECTURAL SEPARATION:
 * MapLibre GL JS is strictly the WebGL map rendering engine and does not host map tiles.
 * All basemap styles, tile endpoints, attributions, and geocoding services are configured
 * centrally in this module via `VITE_GIS_*` environment variables or runtime overrides.
 *
 * USAGE & RATE-LIMIT POLICY:
 * - Default development styles use CARTO OpenStreetMap-derived public styles and OpenStreetMap
 *   standard raster tiles for low-volume development and demonstration only.
 * - Do NOT use public OpenStreetMap tile servers (`tile.openstreetmap.org`) for high-volume
 *   production workloads (see https://operations.osmfoundation.org/policies/tiles/).
 * - For production deployments, set `VITE_GIS_STYLE_DARK_URL`, `VITE_GIS_STYLE_LIGHT_URL`,
 *   `VITE_GIS_STYLE_STREET_URL`, and `VITE_GIS_SATELLITE_TILE_URL` to a commercial or
 *   self-hosted tile service (e.g., MapTiler, Protomaps, Stadia Maps, or OpenMapTiles).
 */

export interface BasemapStyleOption {
  id: BasemapStyleId;
  label: string;
  description: string;
  attributionHtml: string;
  usagePolicyNote: string;
  requiresLicenseConfig?: boolean;
}

export const BASEMAP_STYLE_OPTIONS: BasemapStyleOption[] = [
  {
    id: 'dark',
    label: 'NOC Dark Canvas',
    description: 'High-contrast dark slate basemap optimized for critical/major alarm visibility.',
    attributionHtml:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    usagePolicyNote:
      'Development basemap powered by CARTO Dark Matter (OSM data). Configure VITE_GIS_STYLE_DARK_URL for production.',
  },
  {
    id: 'light',
    label: 'Field Light Map',
    description: 'Clean daylight basemap for field engineering laptops and outdoor tablets.',
    attributionHtml:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    usagePolicyNote:
      'Development basemap powered by CARTO Positron (OSM data). Configure VITE_GIS_STYLE_LIGHT_URL for production.',
  },
  {
    id: 'street',
    label: 'Standard Street (OSM)',
    description: 'Detailed street, highway, and parcel labels from OpenStreetMap.',
    attributionHtml:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors (ODbL)',
    usagePolicyNote:
      'Standard OSM raster tiles are subject to the OSMF Tile Usage Policy (strictly capped rate limits; not for heavy production traffic).',
  },
  {
    id: 'satellite',
    label: 'Satellite Imagery (Aerial)',
    description: 'High-resolution orthophoto aerial imagery for tower, rooftop, and terrain inspection.',
    attributionHtml:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    usagePolicyNote:
      'High-resolution aerial imagery enabled via server-side GIS configuration (/api/gis/status).',
    requiresLicenseConfig: false,
  },
];

function createRasterStyle(
  name: string,
  tileUrls: string[],
  attribution: string,
  bgColor = '#0f172a'
): StyleSpecification {
  return {
    version: 8,
    name,
    sources: {
      'basemap-raster': {
        type: 'raster',
        tiles: tileUrls,
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'basemap-background',
        type: 'background',
        paint: {
          'background-color': bgColor,
        },
      },
      {
        id: 'basemap-raster-layer',
        type: 'raster',
        source: 'basemap-raster',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

const DEFAULT_CARTO_API_KEY = 'cb1_50a2_1_35699cc2c825dc341309325e';

export function resolveBasemapStyle(
  styleId: BasemapStyleId,
  customSatelliteTileUrl?: string
): {
  style: string | StyleSpecification | null;
  error?: string;
  option: BasemapStyleOption;
} {
  const option =
    BASEMAP_STYLE_OPTIONS.find((o) => o.id === styleId) || BASEMAP_STYLE_OPTIONS[0];

  const cartoApiKey =
    (import.meta.env.VITE_GIS_MAP_API_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim() ||
    DEFAULT_CARTO_API_KEY;
  const envDark = import.meta.env.VITE_GIS_STYLE_DARK_URL as string | undefined;
  const envLight = import.meta.env.VITE_GIS_STYLE_LIGHT_URL as string | undefined;
  const envStreet = import.meta.env.VITE_GIS_STYLE_STREET_URL as string | undefined;
  const envSatellite = import.meta.env.VITE_GIS_SATELLITE_TILE_URL as string | undefined;

  if (styleId === 'dark') {
    if (envDark && envDark.trim()) {
      return { style: envDark.trim(), option };
    }
    return {
      style: createRasterStyle(
        'TelecomOps Dark Matter',
        [
          `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
        ],
        option.attributionHtml,
        '#090d16'
      ),
      option,
    };
  }

  if (styleId === 'light') {
    if (envLight && envLight.trim()) {
      return { style: envLight.trim(), option };
    }
    return {
      style: createRasterStyle(
        'TelecomOps Positron Light',
        [
          `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`,
        ],
        option.attributionHtml,
        '#f8fafc'
      ),
      option,
    };
  }

  if (styleId === 'street') {
    if (envStreet && envStreet.trim()) {
      return { style: envStreet.trim(), option };
    }
    return {
      style: createRasterStyle(
        'CARTO Voyager Street',
        [
          `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoApiKey}`,
          `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoApiKey}`,
        ],
        option.attributionHtml,
        '#e2e8f0'
      ),
      option,
    };
  }

  const effectiveSatUrl =
    (customSatelliteTileUrl || envSatellite || '').trim() ||
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  return {
    style: createRasterStyle(
      'Satellite Imagery (Aerial)',
      [effectiveSatUrl],
      option.attributionHtml,
      '#0f172a'
    ),
    option,
  };
}

export interface GeocodePlaceResult {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
}

let lastGeocodeTimestamp = 0;

/**
 * Place & Address Geocoding Service routed through the server-side `/api/gis/geocode` proxy
 * so that `GIS_MAP_API_KEY` remains exclusively on the backend server.
 */
export async function searchExternalGeocode(
  query: string
): Promise<{ results: GeocodePlaceResult[]; error?: string }> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { results: [], error: 'Enter at least 3 characters for place geocoding.' };
  }

  const now = Date.now();
  if (now - lastGeocodeTimestamp < 1100) {
    return {
      results: [],
      error: 'Geocoder rate-limit protection active (max 1 request/second). Please wait a moment.',
    };
  }
  lastGeocodeTimestamp = now;

  try {
    const proxyRes = await fetch(`/api/gis/geocode?q=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: 'application/json' },
    });
    if (proxyRes.ok) {
      const proxyPayload = (await proxyRes.json()) as {
        results?: GeocodePlaceResult[];
        error?: string;
      };
      if (Array.isArray(proxyPayload.results)) {
        return { results: proxyPayload.results };
      }
    }

    const endpoint =
      (import.meta.env.VITE_GIS_GEOCODER_URL as string | undefined) ||
      'https://nominatim.openstreetmap.org/search';
    const url = `${endpoint}?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        results: [],
        error: `Geocoding provider returned HTTP ${response.status}.`,
      };
    }
    const raw = (await response.json()) as Array<{
      place_id: number | string;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;

    const parsed: GeocodePlaceResult[] = raw
      .map((item) => ({
        placeId: String(item.place_id),
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type || 'location',
      }))
      .filter(
        (r) =>
          !Number.isNaN(r.latitude) &&
          !Number.isNaN(r.longitude) &&
          r.latitude >= -90 &&
          r.latitude <= 90 &&
          r.longitude >= -180 &&
          r.longitude <= 180
      );

    return { results: parsed };
  } catch {
    return {
      results: [],
      error:
        'External geocoding service unreachable. Local Site ID, Site Code, Address, and Equipment search remains fully available.',
    };
  }
}
