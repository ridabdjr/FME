import type { Feature, FeatureCollection } from 'geojson';
import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  FileUp,
  Info,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  buildGisFeatureToGeoJson,
  buildSitesGeoJsonFeatures,
  triggerGeoJsonDownload,
  validateAndPreviewGeoJsonImport,
} from '../../services/geojsonService';
import { GisLayerGroup } from '../../types/models';

interface GeoJsonModalProps {
  isOpen: boolean;
  initialTab?: 'import' | 'export';
  onClose: () => void;
  selectedEntity: { kind: 'site' | 'gis-feature'; id: string } | null;
}

const SAMPLE_VALID_GEOJSON = JSON.stringify(
  {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'West Harbor Feeder Fiber Spur B2',
          featureType: 'Fiber Route',
          description: '72-core SM G.652D underground feeder spur to West Pier terminal',
          region: 'North Metro',
          operator: 'ApexTel Carrier Group',
          cableType: '72F SM Armored',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-118.4452, 34.0689],
            [-118.465, 34.052],
            [-118.492, 34.048],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'FDT-NTH-210 Pier Distribution Cabinet',
          featureType: 'Fiber Distribution Cabinet (FDT)',
          description: '144-port outdoor optical cross-connect cabinet at West Pier',
          region: 'North Metro',
          operator: 'ApexTel Carrier Group',
        },
        geometry: {
          type: 'Point',
          coordinates: [-118.492, 34.048],
        },
      },
    ],
  },
  null,
  2
);

export const GeoJsonImportExportModal: React.FC<GeoJsonModalProps> = ({
  isOpen,
  initialTab = 'import',
  onClose,
  selectedEntity,
}) => {
  const {
    store,
    can,
    importGeoJsonCandidates,
    recordGeoJsonExportAudit,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const [destinationLayer, setDestinationLayer] = useState<GisLayerGroup>('fiber-transmission');
  const [rawGeoJsonText, setRawGeoJsonText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [exportScope, setExportScope] = useState<'selected' | 'layer' | 'all'>(
    selectedEntity ? 'selected' : 'all'
  );
  const [exportLayerGroup, setExportLayerGroup] = useState<GisLayerGroup>('fiber-transmission');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (selectedEntity) {
        setExportScope('selected');
      } else {
        setExportScope('all');
      }
    }
  }, [isOpen, initialTab, selectedEntity]);

  const validationReport = useMemo(() => {
    if (!rawGeoJsonText.trim()) return null;
    return validateAndPreviewGeoJsonImport(
      rawGeoJsonText,
      destinationLayer,
      store.sites,
      store.gisFeatures
    );
  }, [rawGeoJsonText, destinationLayer, store.sites, store.gisFeatures]);

  const exportCollectionPreview = useMemo<FeatureCollection>(() => {
    let features: Feature[] = [];

    if (exportScope === 'selected' && selectedEntity) {
      if (selectedEntity.kind === 'site') {
        const site = store.sites.find((s) => s.id === selectedEntity.id);
        if (site) {
          features = buildSitesGeoJsonFeatures([site]);
        }
      } else {
        const gf = store.gisFeatures.find((f) => f.id === selectedEntity.id);
        if (gf) {
          features = [buildGisFeatureToGeoJson(gf)];
        }
      }
    } else if (exportScope === 'layer') {
      if (exportLayerGroup === 'sites') {
        features = buildSitesGeoJsonFeatures(store.sites);
      } else {
        features = store.gisFeatures
          .filter((f) => f.layerGroup === exportLayerGroup)
          .map(buildGisFeatureToGeoJson);
      }
    } else {
      features = [
        ...buildSitesGeoJsonFeatures(store.sites),
        ...store.gisFeatures.map(buildGisFeatureToGeoJson),
      ];
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [exportScope, exportLayerGroup, selectedEntity, store.sites, store.gisFeatures]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setRawGeoJsonText(content);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    if (!validationReport || !validationReport.ok) return;
    const res = importGeoJsonCandidates(validationReport.validCandidates, destinationLayer);
    if (res.ok) {
      setRawGeoJsonText('');
      setUploadedFileName(null);
      onClose();
    }
  };

  const handleTriggerExport = () => {
    if (exportCollectionPreview.features.length === 0) return;
    const prefix =
      exportScope === 'selected'
        ? `feature-${selectedEntity?.id || 'selected'}`
        : exportScope === 'layer'
        ? `layer-${exportLayerGroup}`
        : 'all-gis-layers';

    triggerGeoJsonDownload(exportCollectionPreview, prefix);
    recordGeoJsonExportAudit(prefix, exportCollectionPreview.features.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="geojson-modal-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-sky-500" />
            <div>
              <h2
                id="geojson-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                GeoJSON Infrastructure Data Exchange (RFC 7946)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Validate, preview, import, and export Point, LineString, MultiLineString, Polygon,
                and MultiPolygon features.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import &amp; Validate GeoJSON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GeoJSON Dataset</span>
          </button>
        </div>

        {activeTab === 'import' ? (
          <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
            {!can('gis:import') && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Your current role does not have GeoJSON import permissions. Switch to
                  Administrator, Team Leader, or Maintenance Manager to commit imports.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Telecom GIS Layer *
                </label>
                <select
                  value={destinationLayer}
                  onChange={(e) => setDestinationLayer(e.target.value as GisLayerGroup)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="fiber-transmission">
                    B. Fiber &amp; Transmission Infrastructure (Routes, Ducts, MW, FDT, Manholes)
                  </option>
                  <option value="equipment-infra">
                    C. Equipment &amp; Infrastructure (Cabinets, Generators, Polygons)
                  </option>
                  <option value="operations-maintenance">
                    D. Operations &amp; Maintenance Markers
                  </option>
                  <option value="sites">
                    A. Network Sites Register (Creates Managed Site Records)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload .geojson / .json File or Load Sample
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-sky-500 cursor-pointer text-slate-700 dark:text-slate-300 font-medium truncate">
                    <FileUp className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="truncate">
                      {uploadedFileName || 'Choose GeoJSON File...'}
                    </span>
                    <input
                      type="file"
                      accept=".geojson,.json,application/geo+json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRawGeoJsonText(SAMPLE_VALID_GEOJSON);
                      setUploadedFileName('sample-west-harbor-spur.geojson');
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap cursor-pointer"
                  >
                    Load Valid Sample
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  GeoJSON Payload (Feature or FeatureCollection)
                </label>
                {rawGeoJsonText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawGeoJsonText('');
                      setUploadedFileName(null);
                    }}
                    className="text-slate-500 hover:text-red-500 cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={rawGeoJsonText}
                onChange={(e) => setRawGeoJsonText(e.target.value)}
                placeholder='{"type": "FeatureCollection", "features": [...]}'
                className="w-full p-3 font-mono text-[11px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Validation & Preview Section */}
            {validationReport && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                {validationReport.fatalError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">GeoJSON Validation Failed</p>
                      <p className="mt-0.5">{validationReport.fatalError}</p>
                    </div>
                  </div>
                )}

                {validationReport.rejectedReasons.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-bold">
                      Rejected / Skipped Features ({validationReport.rejectedReasons.length}):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {validationReport.rejectedReasons.slice(0, 5).map((r) => (
                        <li key={r.index}>
                          Feature #{r.index}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationReport.validCandidates.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Import Preview: {validationReport.validCandidates.length} Valid Feature(s)
                          Ready
                        </span>
                      </span>
                      <span className="font-mono text-slate-500">
                        Target Layer: {destinationLayer}
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                            <th className="py-1.5 px-2.5">#</th>
                            <th className="py-1.5 px-2.5">Name</th>
                            <th className="py-1.5 px-2.5">Geometry</th>
                            <th className="py-1.5 px-2.5">Classified Type</th>
                            <th className="py-1.5 px-2.5">Region / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {validationReport.validCandidates.map((cand) => (
                            <tr key={cand.index}>
                              <td className="py-1.5 px-2.5 font-mono">{cand.index}</td>
                              <td className="py-1.5 px-2.5 font-semibold text-slate-900 dark:text-white">
                                {cand.name}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-sky-600 dark:text-sky-400">
                                {cand.geometryType}
                              </td>
                              <td className="py-1.5 px-2.5">{cand.featureType}</td>
                              <td className="py-1.5 px-2.5 text-slate-500">
                                {cand.region}
                                {cand.duplicateWarning && (
                                  <span className="ml-1 text-amber-500">
                                    ({cand.duplicateWarning})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !can('gis:import') ||
                  !validationReport ||
                  !validationReport.ok ||
                  validationReport.validCandidates.length === 0
                }
                onClick={handleCommitImport}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                Commit Import ({validationReport?.validCandidates.length || 0} Features)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={!selectedEntity}
                onClick={() => setExportScope('selected')}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-40 ${
                  exportScope === 'selected'
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">1. Selected Feature</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {selectedEntity
                    ? `Active selection: ${selectedEntity.id}`
                    : 'No feature currently selected on map'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('layer')}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  exportScope === 'layer'
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">2. Chosen Layer</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Export all features belonging to a specific telecom GIS layer
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  exportScope === 'all'
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">
                  3. All Permitted GIS Features
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complete FeatureCollection of Sites, Fiber/MW, and Equipment layers
                </p>
              </button>
            </div>

            {exportScope === 'layer' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Layer to Export
                </label>
                <select
                  value={exportLayerGroup}
                  onChange={(e) => setExportLayerGroup(e.target.value as GisLayerGroup)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="sites">A. Network Sites ({store.sites.length})</option>
                  <option value="fiber-transmission">
                    B. Fiber &amp; Transmission Infrastructure (
                    {store.gisFeatures.filter((f) => f.layerGroup === 'fiber-transmission').length})
                  </option>
                  <option value="equipment-infra">
                    C. Equipment &amp; Infrastructure (
                    {store.gisFeatures.filter((f) => f.layerGroup === 'equipment-infra').length})
                  </option>
                  <option value="operations-maintenance">
                    D. Operations &amp; Maintenance Markers (
                    {
                      store.gisFeatures.filter((f) => f.layerGroup === 'operations-maintenance')
                        .length
                    }
                    )
                  </option>
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  RFC 7946 GeoJSON Output Preview ({exportCollectionPreview.features.length}{' '}
                  Features)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Coordinate Order: [longitude, latitude]
                </span>
              </div>
              <pre className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto">
                {JSON.stringify(exportCollectionPreview, null, 2).slice(0, 1800)}
                {JSON.stringify(exportCollectionPreview, null, 2).length > 1800
                  ? '\n... [Preview Truncated — Full Dataset Included in Downloaded File]'
                  : ''}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Scope Notice:</strong> GeoJSON exports contain geographic vector geometries
                and structured feature attributes only. Binary site photographs and PDF maintenance
                dossiers are managed separately (Phase 3/4) and are not embedded inside GeoJSON
                files.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!can('gis:export') || exportCollectionPreview.features.length === 0}
                onClick={handleTriggerExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  Download .geojson ({exportCollectionPreview.features.length} Features)
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
