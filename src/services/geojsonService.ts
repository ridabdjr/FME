import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import {
  GisFeatureType,
  GisLayerGroup,
  Site,
  TelecomGisFeature,
} from '../types/models';

const SUPPORTED_GEOMETRY_TYPES = new Set([
  'Point',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
]);

export function isValidCoordinatePair(pos: Position): boolean {
  if (!Array.isArray(pos) || pos.length < 2) return false;
  const [lng, lat] = pos;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (Number.isNaN(lng) || Number.isNaN(lat)) return false;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

export function validateGeometryCoordinates(geom: Geometry): { valid: boolean; reason?: string } {
  if (!geom || !SUPPORTED_GEOMETRY_TYPES.has(geom.type)) {
    return {
      valid: false,
      reason: `Unsupported geometry type "${(geom as { type?: string })?.type || 'Unknown'}". Supported types: Point, LineString, MultiLineString, Polygon, MultiPolygon.`,
    };
  }

  if (geom.type === 'Point') {
    if (!isValidCoordinatePair(geom.coordinates)) {
      return {
        valid: false,
        reason: 'Point coordinates must be [longitude, latitude] within [-180..180, -90..90].',
      };
    }
    return { valid: true };
  }

  if (geom.type === 'LineString') {
    if (!Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
      return { valid: false, reason: 'LineString requires at least 2 coordinate vertices.' };
    }
    if (!geom.coordinates.every(isValidCoordinatePair)) {
      return {
        valid: false,
        reason: 'LineString contains out-of-range [longitude, latitude] coordinates.',
      };
    }
    return { valid: true };
  }

  if (geom.type === 'MultiLineString') {
    if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
      return { valid: false, reason: 'MultiLineString requires at least 1 line array.' };
    }
    for (const line of geom.coordinates) {
      if (!Array.isArray(line) || line.length < 2 || !line.every(isValidCoordinatePair)) {
        return {
          valid: false,
          reason: 'MultiLineString contains an invalid line segment or out-of-range coordinates.',
        };
      }
    }
    return { valid: true };
  }

  if (geom.type === 'Polygon') {
    if (
      !Array.isArray(geom.coordinates) ||
      geom.coordinates.length === 0 ||
      !Array.isArray(geom.coordinates[0]) ||
      geom.coordinates[0].length < 4
    ) {
      return {
        valid: false,
        reason: 'Polygon outer ring requires at least 4 coordinates (closed linear ring).',
      };
    }
    for (const ring of geom.coordinates) {
      if (!ring.every(isValidCoordinatePair)) {
        return {
          valid: false,
          reason: 'Polygon ring contains out-of-range [longitude, latitude] coordinates.',
        };
      }
    }
    return { valid: true };
  }

  if (geom.type === 'MultiPolygon') {
    if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
      return { valid: false, reason: 'MultiPolygon requires at least 1 polygon array.' };
    }
    for (const poly of geom.coordinates) {
      if (!Array.isArray(poly) || poly.length === 0 || poly[0].length < 4) {
        return {
          valid: false,
          reason: 'MultiPolygon contains an invalid polygon linear ring.',
        };
      }
      for (const ring of poly) {
        if (!ring.every(isValidCoordinatePair)) {
          return {
            valid: false,
            reason: 'MultiPolygon ring contains out-of-range coordinates.',
          };
        }
      }
    }
    return { valid: true };
  }

  return { valid: false, reason: 'Unrecognized geometry structure.' };
}

/**
 * Turf.js Geospatial Measurement Utilities
 */
export function calculateStraightLineDistance(
  pointA: [number, number],
  pointB: [number, number]
): { kilometers: number; meters: number; bearingDegrees: number } {
  const from = turf.point(pointA);
  const to = turf.point(pointB);
  const kilometers = turf.distance(from, to, { units: 'kilometers' });
  const bearingDegrees = turf.bearing(from, to);
  return {
    kilometers,
    meters: kilometers * 1000,
    bearingDegrees,
  };
}

export function calculatePolylineLength(coordinates: [number, number][]): {
  kilometers: number;
  meters: number;
  vertexCount: number;
} {
  if (coordinates.length < 2) {
    return { kilometers: 0, meters: 0, vertexCount: coordinates.length };
  }
  const line = turf.lineString(coordinates);
  const kilometers = turf.length(line, { units: 'kilometers' });
  return {
    kilometers,
    meters: kilometers * 1000,
    vertexCount: coordinates.length,
  };
}

export function calculatePolygonMetrics(ringCoordinates: [number, number][]): {
  areaSqMeters: number;
  areaSqKilometers: number;
  hectares: number;
  perimeterKm: number;
} {
  if (ringCoordinates.length < 3) {
    return { areaSqMeters: 0, areaSqKilometers: 0, hectares: 0, perimeterKm: 0 };
  }
  const first = ringCoordinates[0];
  const last = ringCoordinates[ringCoordinates.length - 1];
  const closedRing: [number, number][] =
    first[0] === last[0] && first[1] === last[1]
      ? ringCoordinates
      : [...ringCoordinates, [first[0], first[1]]];

  const poly = turf.polygon([closedRing]);
  const areaSqMeters = turf.area(poly);
  const perimeterKm = turf.length(turf.lineString(closedRing), { units: 'kilometers' });

  return {
    areaSqMeters,
    areaSqKilometers: areaSqMeters / 1_000_000,
    hectares: areaSqMeters / 10_000,
    perimeterKm,
  };
}

export function getGeometryCenterCoordinates(geom: Geometry): [number, number] | null {
  try {
    if (geom.type === 'Point') {
      return [geom.coordinates[0], geom.coordinates[1]];
    }
    const center = turf.center(geom as turf.AllGeoJSON);
    const [lng, lat] = center.geometry.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return [lng, lat];
    }
    return null;
  } catch {
    return null;
  }
}

export interface GeoJsonImportCandidate {
  index: number;
  name: string;
  description: string;
  geometryType: string;
  featureType: GisFeatureType;
  region: string;
  operator: string;
  status: 'Operational' | 'Degraded' | 'Offline' | 'Maintenance' | 'Planned';
  geometry: Geometry;
  properties: Record<string, string | number | boolean>;
  duplicateWarning?: string;
}

export interface GeoJsonImportValidationReport {
  ok: boolean;
  fatalError?: string;
  validCandidates: GeoJsonImportCandidate[];
  rejectedReasons: Array<{ index: number; reason: string }>;
}

function inferFeatureType(geomType: string, layerGroup: GisLayerGroup, rawType?: string): GisFeatureType {
  if (rawType) {
    const validTypes: GisFeatureType[] = [
      'Fiber Route',
      'Underground Duct',
      'Microwave Link',
      'Manhole / Handhole',
      'Fiber Distribution Cabinet (FDT)',
      'Optical Splitter / FAT',
      'Outdoor Telecom Cabinet',
      'Power / Rectifier / DG Pad',
      'Battery & Env Sensor Node',
      'Infrastructure Area / Compound',
      'Maintenance / Incident Marker',
    ];
    const match = validTypes.find((t) => t.toLowerCase() === rawType.toLowerCase());
    if (match) return match;
  }

  if (geomType === 'LineString' || geomType === 'MultiLineString') {
    return 'Fiber Route';
  }
  if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
    return 'Infrastructure Area / Compound';
  }
  if (layerGroup === 'fiber-transmission') {
    return 'Manhole / Handhole';
  }
  if (layerGroup === 'operations-maintenance') {
    return 'Maintenance / Incident Marker';
  }
  return 'Outdoor Telecom Cabinet';
}

export function validateAndPreviewGeoJsonImport(
  rawJsonText: string,
  destinationLayer: GisLayerGroup,
  existingSites: Site[],
  existingGisFeatures: TelecomGisFeature[]
): GeoJsonImportValidationReport {
  if (!rawJsonText.trim()) {
    return {
      ok: false,
      fatalError: 'GeoJSON input is empty. Upload a .geojson/.json file or paste valid GeoJSON.',
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err) {
    return {
      ok: false,
      fatalError: `Invalid JSON syntax: ${(err as Error).message}`,
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      fatalError: 'Root GeoJSON element must be a JSON object.',
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  const rootObj = parsed as { type?: string; features?: unknown[]; geometry?: Geometry; properties?: Record<string, unknown> };
  let rawFeatures: unknown[] = [];

  if (rootObj.type === 'FeatureCollection') {
    if (!Array.isArray(rootObj.features)) {
      return {
        ok: false,
        fatalError: 'GeoJSON FeatureCollection is missing a valid "features" array.',
        validCandidates: [],
        rejectedReasons: [],
      };
    }
    rawFeatures = rootObj.features;
  } else if (rootObj.type === 'Feature') {
    rawFeatures = [rootObj];
  } else {
    return {
      ok: false,
      fatalError: `Unsupported GeoJSON root type "${rootObj.type || 'Unknown'}". Expected "FeatureCollection" or "Feature".`,
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  if (rawFeatures.length === 0) {
    return {
      ok: false,
      fatalError: 'The GeoJSON FeatureCollection contains 0 features.',
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  const MAX_IMPORT_FEATURES = 500;
  if (rawFeatures.length > MAX_IMPORT_FEATURES) {
    return {
      ok: false,
      fatalError: `File contains ${rawFeatures.length} features, exceeding the browser safety threshold of ${MAX_IMPORT_FEATURES} features per batch.`,
      validCandidates: [],
      rejectedReasons: [],
    };
  }

  const validCandidates: GeoJsonImportCandidate[] = [];
  const rejectedReasons: Array<{ index: number; reason: string }> = [];

  rawFeatures.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      rejectedReasons.push({ index: idx + 1, reason: 'Feature entry is not an object.' });
      return;
    }

    const feat = item as Feature;
    if (feat.type !== 'Feature' || !feat.geometry) {
      rejectedReasons.push({
        index: idx + 1,
        reason: 'Missing "type": "Feature" or "geometry" object.',
      });
      return;
    }

    const geomCheck = validateGeometryCoordinates(feat.geometry);
    if (!geomCheck.valid) {
      rejectedReasons.push({
        index: idx + 1,
        reason: geomCheck.reason || 'Invalid geometry coordinates.',
      });
      return;
    }

    const rawProps = (feat.properties || {}) as Record<string, unknown>;
    const name = String(
      rawProps.name || rawProps.siteName || rawProps.siteCode || rawProps.title || `Imported ${feat.geometry.type} #${idx + 1}`
    ).trim();
    const description = String(
      rawProps.description || rawProps.notes || `Imported via GeoJSON into ${destinationLayer}`
    ).trim();
    const region = String(rawProps.region || 'North Metro').trim();
    const operator = String(rawProps.operator || 'ApexTel Carrier Group').trim();

    // Check duplicate site code/id or feature name
    const incomingSiteCode = String(rawProps.siteCode || '').trim().toUpperCase();
    const incomingId = String(rawProps.id || feat.id || '').trim().toUpperCase();

    if (
      destinationLayer === 'sites' &&
      existingSites.some(
        (s) =>
          (incomingSiteCode && s.siteCode.toUpperCase() === incomingSiteCode) ||
          (incomingId && s.id.toUpperCase() === incomingId)
      )
    ) {
      rejectedReasons.push({
        index: idx + 1,
        reason: `Skipped to prevent duplicate telecom site record (${incomingSiteCode || incomingId}).`,
      });
      return;
    }

    const duplicateGis = existingGisFeatures.find(
      (g) => g.name.toLowerCase() === name.toLowerCase() || (incomingId && g.id.toUpperCase() === incomingId)
    );

    const sanitizedProps: Record<string, string | number | boolean> = {};
    Object.entries(rawProps).forEach(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        sanitizedProps[k] = v;
      }
    });

    validCandidates.push({
      index: idx + 1,
      name,
      description,
      geometryType: feat.geometry.type,
      featureType: inferFeatureType(
        feat.geometry.type,
        destinationLayer,
        typeof rawProps.featureType === 'string' ? rawProps.featureType : undefined
      ),
      region,
      operator,
      status: 'Operational',
      geometry: feat.geometry,
      properties: sanitizedProps,
      duplicateWarning: duplicateGis
        ? `Matches existing feature name/ID "${duplicateGis.name}"`
        : undefined,
    });
  });

  return {
    ok: validCandidates.length > 0,
    fatalError:
      validCandidates.length === 0
        ? 'No valid GeoJSON features could be imported. Review the validation errors below.'
        : undefined,
    validCandidates,
    rejectedReasons,
  };
}

export function buildSitesGeoJsonFeatures(sites: Site[]): Feature[] {
  return sites
    .filter(
      (s) =>
        typeof s.latitude === 'number' &&
        typeof s.longitude === 'number' &&
        !Number.isNaN(s.latitude) &&
        !Number.isNaN(s.longitude) &&
        s.latitude >= -90 &&
        s.latitude <= 90 &&
        s.longitude >= -180 &&
        s.longitude <= 180
    )
    .map((s) => ({
      type: 'Feature',
      id: s.id,
      geometry: {
        type: 'Point',
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        id: s.id,
        entityKind: 'TelecomSite',
        layerGroup: 'sites',
        siteCode: s.siteCode,
        name: s.siteName,
        operator: s.operator,
        region: s.region,
        district: s.district,
        address: s.address,
        siteType: s.siteType,
        technologies: s.technologies.join(', '),
        operationalStatus: s.operationalStatus,
        lastMaintenanceDate: s.lastMaintenanceDate,
        powerConfiguration: s.powerConfiguration,
      },
    }));
}

export function buildGisFeatureToGeoJson(feat: TelecomGisFeature): Feature {
  return {
    type: 'Feature',
    id: feat.id,
    geometry: feat.geometry,
    properties: {
      id: feat.id,
      entityKind: 'TelecomGisFeature',
      layerGroup: feat.layerGroup,
      featureType: feat.featureType,
      name: feat.name,
      description: feat.description,
      region: feat.region,
      operator: feat.operator,
      status: feat.status,
      linkedSiteId: feat.linkedSiteId || '',
      linkedIncidentId: feat.linkedIncidentId || '',
      createdBy: feat.createdBy,
      updatedAt: feat.updatedAt,
      ...feat.properties,
    },
  };
}

export function triggerGeoJsonDownload(
  collection: FeatureCollection,
  filenamePrefix: string
): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safePrefix = filenamePrefix.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const filename = `telecomops360-${safePrefix}-${dateStamp}.geojson`;
  const blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}
