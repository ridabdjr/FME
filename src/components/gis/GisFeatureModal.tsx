import type { Geometry } from 'geojson';
import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  GisFeatureType,
  GisLayerGroup,
  TelecomGisFeature,
} from '../../types/models';

interface GisFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFeature: TelecomGisFeature | null;
  draftGeometry: Geometry | null;
  onSaved?: (feature: TelecomGisFeature) => void;
}

const FEATURE_TYPES_BY_LAYER: Record<GisLayerGroup, GisFeatureType[]> = {
  'fiber-transmission': [
    'Fiber Route',
    'Underground Duct',
    'Microwave Link',
    'Manhole / Handhole',
    'Fiber Distribution Cabinet (FDT)',
    'Optical Splitter / FAT',
  ],
  'equipment-infra': [
    'Outdoor Telecom Cabinet',
    'Power / Rectifier / DG Pad',
    'Battery & Env Sensor Node',
    'Infrastructure Area / Compound',
  ],
  'operations-maintenance': ['Maintenance / Incident Marker'],
  sites: ['Outdoor Telecom Cabinet'],
};

export const GisFeatureModal: React.FC<GisFeatureModalProps> = ({
  isOpen,
  onClose,
  editingFeature,
  draftGeometry,
  onSaved,
}) => {
  const { store, upsertGisFeature } = useApp();

  const [layerGroup, setLayerGroup] = useState<GisLayerGroup>('fiber-transmission');
  const [featureType, setFeatureType] = useState<GisFeatureType>('Fiber Route');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('North Metro');
  const [operator, setOperator] = useState('ApexTel Carrier Group');
  const [status, setStatus] = useState<
    'Operational' | 'Degraded' | 'Offline' | 'Maintenance' | 'Planned'
  >('Operational');
  const [linkedSiteId, setLinkedSiteId] = useState('');
  const [linkedIncidentId, setLinkedIncidentId] = useState('');
  const [geometryJson, setGeometryJson] = useState('');
  const [customSpecKey, setCustomSpecKey] = useState('specNotes');
  const [customSpecValue, setCustomSpecValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (editingFeature) {
      setLayerGroup(editingFeature.layerGroup);
      setFeatureType(editingFeature.featureType);
      setName(editingFeature.name);
      setDescription(editingFeature.description);
      setRegion(editingFeature.region);
      setOperator(editingFeature.operator);
      setStatus(editingFeature.status);
      setLinkedSiteId(editingFeature.linkedSiteId || '');
      setLinkedIncidentId(editingFeature.linkedIncidentId || '');
      setGeometryJson(JSON.stringify(editingFeature.geometry, null, 2));
      const firstProp = Object.entries(editingFeature.properties)[0];
      if (firstProp) {
        setCustomSpecKey(firstProp[0]);
        setCustomSpecValue(String(firstProp[1]));
      } else {
        setCustomSpecKey('cableOrModelSpec');
        setCustomSpecValue('');
      }
    } else if (draftGeometry) {
      setGeometryJson(JSON.stringify(draftGeometry, null, 2));
      if (draftGeometry.type === 'LineString' || draftGeometry.type === 'MultiLineString') {
        setLayerGroup('fiber-transmission');
        setFeatureType('Fiber Route');
        setName(`New Fiber / TX Route #${store.gisFeatures.length + 1}`);
        setCustomSpecKey('cableType');
        setCustomSpecValue('96F SM G.652D Armored');
      } else if (draftGeometry.type === 'Polygon' || draftGeometry.type === 'MultiPolygon') {
        setLayerGroup('equipment-infra');
        setFeatureType('Infrastructure Area / Compound');
        setName(`Telecom Compound / Coverage Zone #${store.gisFeatures.length + 1}`);
        setCustomSpecKey('zoneClassification');
        setCustomSpecValue('Managed Telecom Perimeter');
      } else {
        setLayerGroup('fiber-transmission');
        setFeatureType('Manhole / Handhole');
        setName(`Splice Chamber / FDT Node #${store.gisFeatures.length + 1}`);
        setCustomSpecKey('chamberSpec');
        setCustomSpecValue('Heavy-Duty J4 Splice Chamber');
      }
      setDescription('');
      setRegion('North Metro');
      setOperator('ApexTel Carrier Group');
      setStatus('Operational');
      setLinkedSiteId('');
      setLinkedIncidentId('');
    }
  }, [isOpen, editingFeature, draftGeometry, store.gisFeatures.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedGeometry: Geometry;
    try {
      parsedGeometry = JSON.parse(geometryJson) as Geometry;
    } catch (err) {
      setError(`Invalid GeoJSON geometry syntax: ${(err as Error).message}`);
      return;
    }

    const properties: Record<string, string | number | boolean> = {
      ...(editingFeature?.properties || {}),
    };
    if (customSpecKey.trim() && customSpecValue.trim()) {
      properties[customSpecKey.trim()] = customSpecValue.trim();
    }

    const res = upsertGisFeature({
      id: editingFeature?.id,
      layerGroup,
      featureType,
      name,
      description,
      region,
      operator,
      status,
      linkedSiteId: linkedSiteId || undefined,
      linkedIncidentId: linkedIncidentId || undefined,
      geometry: parsedGeometry,
      properties,
    });

    if (!res.ok) {
      setError(res.error || 'Could not save GIS feature.');
      return;
    }
    if (res.feature && onSaved) {
      onSaved(res.feature);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gis-feature-modal-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2
              id="gis-feature-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              {editingFeature
                ? `Edit GIS Feature ${editingFeature.id}`
                : 'Register New Telecom GIS Feature'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validates RFC 7946 GeoJSON geometry and persists feature attributes to the GIS
              repository.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GIS Layer Group *
              </label>
              <select
                value={layerGroup}
                onChange={(e) => {
                  const nextGroup = e.target.value as GisLayerGroup;
                  setLayerGroup(nextGroup);
                  const allowed = FEATURE_TYPES_BY_LAYER[nextGroup];
                  if (allowed && allowed[0]) setFeatureType(allowed[0]);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="fiber-transmission">
                  B. Fiber &amp; Transmission Infrastructure
                </option>
                <option value="equipment-infra">C. Equipment &amp; Infrastructure</option>
                <option value="operations-maintenance">
                  D. Operations &amp; Maintenance Markers
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feature Classification *
              </label>
              <select
                value={featureType}
                onChange={(e) => setFeatureType(e.target.value as GisFeatureType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                {[
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
                ].map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feature Name / Identifier *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Metro 144F Ring Segment B"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status *
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                      | 'Operational'
                      | 'Degraded'
                      | 'Offline'
                      | 'Maintenance'
                      | 'Planned'
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="Operational">Operational</option>
                <option value="Degraded">Degraded</option>
                <option value="Offline">Offline</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Planned">Planned</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Region *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="North Metro">North Metro</option>
                <option value="Central">Central</option>
                <option value="South Corridor">South Corridor</option>
                <option value="Highland">Highland</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operator / Owner *
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Linked Telecom Site (Optional)
              </label>
              <select
                value={linkedSiteId}
                onChange={(e) => setLinkedSiteId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="">-- Not Linked to a Single Site --</option>
                {store.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} — {s.siteName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Linked Incident Ticket (Optional)
              </label>
              <select
                value={linkedIncidentId}
                onChange={(e) => setLinkedIncidentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="">-- No Linked Incident --</option>
                {store.incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} [{inc.severity}] — {inc.siteCode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Technical Attribute Name
              </label>
              <input
                type="text"
                value={customSpecKey}
                onChange={(e) => setCustomSpecKey(e.target.value)}
                placeholder="e.g. cableType or frequencyBand"
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Technical Attribute Value
              </label>
              <input
                type="text"
                value={customSpecValue}
                onChange={(e) => setCustomSpecValue(e.target.value)}
                placeholder="e.g. 144F SM G.652D or 18 GHz"
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Engineering Description &amp; Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide duct depth, fiber core count, microwave azimuth, or compound access details..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              GeoJSON Geometry ([longitude, latitude] coordinates) *
            </label>
            <textarea
              rows={5}
              value={geometryJson}
              onChange={(e) => setGeometryJson(e.target.value)}
              className="w-full p-2.5 font-mono text-[11px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              {editingFeature ? 'Save Feature Changes' : 'Save GIS Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
