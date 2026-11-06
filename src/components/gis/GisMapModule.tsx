import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Crosshair,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Info,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointer,
  Navigation,
  Pentagon,
  Plus,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Ruler,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Waypoints,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
import { useApp } from '../../context/AppContext';
import {
  calculatePolygonMetrics,
  calculatePolylineLength,
  calculateStraightLineDistance,
  getGeometryCenterCoordinates,
  isValidCoordinatePair,
} from '../../services/geojsonService';
import {
  BASEMAP_STYLE_OPTIONS,
  GeocodePlaceResult,
  resolveBasemapStyle,
  searchExternalGeocode,
} from '../../services/mapProviderService';
import {
  AlarmSeverity,
  BasemapStyleId,
  EquipmentCategory,
  GisToolMode,
  IncidentStatus,
  NetworkTechnology,
  Site,
  SiteOperationalStatus,
  SiteType,
  TelecomGisFeature,
} from '../../types/models';
import {
  IncidentStatusIndicator,
  SeverityIndicator,
  SiteStatusIndicator,
} from '../common/StatusIndicators';
import { GeoJsonImportExportModal } from './GeoJsonImportExportModal';
import { GisFeatureModal } from './GisFeatureModal';

interface LayerVisibilityState {
  // 14 Core Telecom & Infrastructure Layers
  sitesGreenfield: boolean; // 1. Telecom Sites & Towers
  btsStations: boolean; // 2. BTS Stations
  sitesBscCore: boolean; // 3. BSC Core Hubs
  towersRooftops: boolean; // 4. Towers & Rooftops
  antennasRru: boolean; // 5. Antennas & RRH/RRU
  fiberRoutes: boolean; // 6. Fiber Routes
  undergroundDucts: boolean; // 7. Ducts & Underground Galleries
  manholesHandholes: boolean; // 8. Manholes & Handholes
  outdoorCabinets: boolean; // 9. Cabinets & Distribution Points
  fdtAndSplitters: boolean; // 10. ODF / FDT / FAT & Splitters
  microwaveLinks: boolean; // 11. Microwave Radio Links
  powerGenerators: boolean; // 12. Electrical & Generators
  activeIncidentHalos: boolean; // 13. Incidents & Work Cases
  plannedSiteVisits: boolean; // 14. Maintenance Visits

  // Additional Operational & Grouping Overlays
  sitesRooftopIndoor: boolean;
  sitesMicrowaveTx: boolean;
  clusterSites: boolean;
  batteryEnvSensors: boolean;
  infraPolygons: boolean;
  offlineSiteRings: boolean;
  openWorkOrders: boolean;
  overdueMaintenance: boolean;
  resolvedIncidents: boolean;
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibilityState = {
  sitesGreenfield: true,
  btsStations: true,
  sitesBscCore: true,
  towersRooftops: true,
  antennasRru: true,
  fiberRoutes: true,
  undergroundDucts: true,
  manholesHandholes: true,
  outdoorCabinets: true,
  fdtAndSplitters: true,
  microwaveLinks: true,
  powerGenerators: true,
  activeIncidentHalos: true,
  plannedSiteVisits: true,

  sitesRooftopIndoor: true,
  sitesMicrowaveTx: true,
  clusterSites: false,
  batteryEnvSensors: true,
  infraPolygons: true,
  offlineSiteRings: true,
  openWorkOrders: true,
  overdueMaintenance: false,
  resolvedIncidents: false,
};

function isMaintenanceOverdue(lastMaintenanceDate: string): boolean {
  const parsed = new Date(lastMaintenanceDate).getTime();
  if (Number.isNaN(parsed)) return false;
  const referenceNow = new Date('2026-10-27T12:00:00Z').getTime();
  const daysSince = (referenceNow - parsed) / (1000 * 60 * 60 * 24);
  return daysSince > 35;
}

export const GisMapModule: React.FC = () => {
  const {
    store,
    theme,
    focusedGisEntity,
    setFocusedGisEntity,
    can,
    navigateTo,
    openSiteById,
    openIncidentById,
    openWorkOrderById,
    openCreateSiteModal,
    archiveSite,
    upsertSite,
    openCreateIncidentModal,
    openCreateWorkOrderModal,
    openCreateCaseModal,
    openCaseById,
    deleteGisFeature,
    upsertGisFeature,
    showToast,
  } = useApp();

  const { t, isRTL } = useTranslation();

  // MapLibre instance & DOM refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const searchPinMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapProviderError, setMapProviderError] = useState<string | null>(null);

  // Basemap style state
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>(() =>
    theme === 'light' ? 'light' : 'dark'
  );
  const [customSatelliteUrl, setCustomSatelliteUrl] = useState('');
  const [showProviderConfigModal, setShowProviderConfigModal] = useState(false);

  // Panels, Fullscreen & UI layout state with localStorage persistence
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('telecomops_gis_layout_prefs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.leftPanelOpen === 'boolean') return parsed.leftPanelOpen;
      }
    } catch {}
    return true;
  });
  const [leftPanelTab, setLeftPanelTab] = useState<'layers' | 'filters'>('layers');
  const [rightInspectorOpen, setRightInspectorOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('telecomops_gis_layout_prefs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.rightInspectorOpen === 'boolean') return parsed.rightInspectorOpen;
      }
    } catch {}
    return true;
  });
  const [legendExpanded, setLegendExpanded] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('telecomops_gis_layout_prefs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.leftPanelWidth === 'number') return Math.max(260, Math.min(500, parsed.leftPanelWidth));
      }
    } catch {}
    return 320;
  });

  const [rightInspectorWidth, setRightInspectorWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('telecomops_gis_layout_prefs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.rightInspectorWidth === 'number') return Math.max(280, Math.min(600, parsed.rightInspectorWidth));
      }
    } catch {}
    return 384;
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newW = Math.max(260, Math.min(520, e.clientX));
        setLeftPanelWidth(newW);
        mapRef.current?.resize();
      } else if (isResizingRight) {
        const newW = Math.max(280, Math.min(640, window.innerWidth - e.clientX));
        setRightInspectorWidth(newW);
        mapRef.current?.resize();
      }
    };
    const handleMouseUp = () => {
      if (isResizingLeft) setIsResizingLeft(false);
      if (isResizingRight) setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight]);

  // Persist panel layout choices across sessions
  useEffect(() => {
    try {
      localStorage.setItem(
        'telecomops_gis_layout_prefs_v1',
        JSON.stringify({ leftPanelOpen, rightInspectorOpen, leftPanelWidth, rightInspectorWidth })
      );
    } catch {}
  }, [leftPanelOpen, rightInspectorOpen, leftPanelWidth, rightInspectorWidth]);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Asset creation, relocation & searched place pin state
  const [selectedSearchedPlace, setSelectedSearchedPlace] = useState<GeocodePlaceResult | null>(
    null
  );
  const [pendingAssetType, setPendingAssetType] = useState<SiteType | null>(null);
  const pendingAssetTypeRef = useRef<SiteType | null>(null);
  pendingAssetTypeRef.current = pendingAssetType;

  // Site relocation & safe archival modal states
  const [isRelocatingSite, setIsRelocatingSite] = useState(false);
  const isRelocatingSiteRef = useRef(isRelocatingSite);
  isRelocatingSiteRef.current = isRelocatingSite;

  const [siteToArchive, setSiteToArchive] = useState<Site | null>(null);

  // Layer visibility state
  const [layers, setLayers] = useState<LayerVisibilityState>(DEFAULT_LAYER_VISIBILITY);

  // Multi-Attribute Map Filters (Section 9)
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<'ALL' | NetworkTechnology>('ALL');
  const [siteTypeFilter, setSiteTypeFilter] = useState<'ALL' | SiteType>('ALL');
  const [siteStatusFilter, setSiteStatusFilter] = useState<'ALL' | SiteOperationalStatus>('ALL');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<'ALL' | AlarmSeverity>('ALL');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<
    'ALL' | EquipmentCategory
  >('ALL');
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<
    'ALL' | 'OVERDUE' | 'ACTIVE_WO' | 'SCHEDULED_VISIT'
  >('ALL');

  // Work Case Specific Map Filters (Section 6)
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('ALL');
  const [casePriorityFilter, setCasePriorityFilter] = useState<string>('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('ALL');

  // Map Search & Geocoding state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<GeocodePlaceResult[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Coordinate target parsing from search input
  const detectedCoords = useMemo<{ lat: number; lng: number } | null>(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    const match = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (!match) return null;
    const p1 = parseFloat(match[1]);
    const p3 = parseFloat(match[3]);
    let lat = p1;
    let lng = p3;
    if (Math.abs(p1) > 90 && Math.abs(p3) <= 90) {
      lng = p1;
      lat = p3;
    }
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
    return null;
  }, [searchQuery]);

  // Automatic 550ms debounced place geocoding search
  useEffect(() => {
    const q = searchQuery.trim();
    if (detectedCoords || q.length < 3) {
      if (q.length === 0) {
        setGeocodeResults([]);
        setGeocodeError(null);
      }
      return;
    }

    const timer = window.setTimeout(async () => {
      setGeocodeLoading(true);
      setGeocodeError(null);
      try {
        const res = await searchExternalGeocode(q);
        setGeocodeResults(res.results || []);
        if (res.error) setGeocodeError(res.error);
      } catch {
        // network or server error handled gracefully
      } finally {
        setGeocodeLoading(false);
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [searchQuery, detectedCoords]);

  // Tool & Drawing / Measurement state
  const [activeTool, setActiveTool] = useState<GisToolMode>('select');
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number }>({
    lng: -118.328,
    lat: 34.025,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(9.6);
  const [bearing, setBearing] = useState<number>(0);

  // Interactive Drawing / Measurement vertices ([lng, lat][])
  const [sketchCoordinates, setSketchCoordinates] = useState<[number, number][]>([]);

  // Modals state
  const [isGisFeatureModalOpen, setIsGisFeatureModalOpen] = useState(false);
  const [editingGisFeature, setEditingGisFeature] = useState<TelecomGisFeature | null>(null);
  const [draftGeometryForModal, setDraftGeometryForModal] = useState<Geometry | null>(null);

  const [geoJsonModalState, setGeoJsonModalState] = useState<{
    isOpen: boolean;
    tab: 'import' | 'export';
  }>({ isOpen: false, tab: 'import' });

  const [confirmDeleteFeature, setConfirmDeleteFeature] = useState<TelecomGisFeature | null>(null);

  // Selected entity on the map
  const selectedSite = useMemo(() => {
    if (focusedGisEntity?.kind !== 'site') return null;
    return store.sites.find((s) => s.id === focusedGisEntity.id) || null;
  }, [focusedGisEntity, store.sites]);

  const selectedGisFeature = useMemo(() => {
    if (focusedGisEntity?.kind !== 'gis-feature') return null;
    return store.gisFeatures.find((f) => f.id === focusedGisEntity.id) || null;
  }, [focusedGisEntity, store.gisFeatures]);

  const selectedSiteRef = useRef(selectedSite);
  selectedSiteRef.current = selectedSite;

  // Keep right inspector open when an entity is selected
  useEffect(() => {
    if (focusedGisEntity) {
      setRightInspectorOpen(true);
    }
  }, [focusedGisEntity]);

  // Synchronize Searched Place Pin Marker on Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }
    if (selectedSearchedPlace) {
      const el = document.createElement('div');
      el.className = 'searched-place-pin-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="background: radial-gradient(circle, #38bdf8 0%, #0284c7 100%); width: 34px; height: 34px; border-radius: 9999px; border: 3px solid #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
      `;
      searchPinMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([selectedSearchedPlace.longitude, selectedSearchedPlace.latitude])
        .addTo(mapRef.current);
    }
  }, [selectedSearchedPlace]);

  // Resize Map Canvas automatically whenever layout / panels / fullscreen toggles
  useEffect(() => {
    const timer = window.setTimeout(() => {
      mapRef.current?.resize();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isFullScreen, leftPanelOpen, rightInspectorOpen]);

  // Reset filters helper
  const resetMapFilters = () => {
    setRegionFilter('ALL');
    setOperatorFilter('ALL');
    setTechFilter('ALL');
    setSiteTypeFilter('ALL');
    setSiteStatusFilter('ALL');
    setIncidentSeverityFilter('ALL');
    setIncidentStatusFilter('ALL');
    setEquipmentCategoryFilter('ALL');
    setMaintenanceStatusFilter('ALL');
    setCaseStatusFilter('ALL');
    setCasePriorityFilter('ALL');
    setWorkTypeFilter('ALL');
  };

  // Filtered Sites with computed alarm & maintenance states
  const filteredSitesWithMeta = useMemo(() => {
    return store.sites
      .filter((site) => {
        // Validate coordinate ranges cleanly
        if (
          typeof site.latitude !== 'number' ||
          typeof site.longitude !== 'number' ||
          Number.isNaN(site.latitude) ||
          Number.isNaN(site.longitude) ||
          site.latitude < -90 ||
          site.latitude > 90 ||
          site.longitude < -180 ||
          site.longitude > 180
        ) {
          return false;
        }

        // Layer Group A visibility checks
        const isMwSite =
          site.technologies.includes('Microwave TX') && site.siteType === 'Greenfield Tower';
        if (site.siteType === 'Core/BSC Hub' && !layers.sitesBscCore) return false;
        if (
          (site.siteType === 'Rooftop' || site.siteType === 'Indoor IBS/DAS') &&
          !layers.sitesRooftopIndoor
        ) {
          return false;
        }
        if (site.siteType === 'Greenfield Tower') {
          if (isMwSite && !layers.sitesMicrowaveTx && !layers.sitesGreenfield) return false;
          if (!isMwSite && !layers.sitesGreenfield) return false;
        }

        // Attribute Filters
        if (regionFilter !== 'ALL' && site.region !== regionFilter) return false;
        if (operatorFilter !== 'ALL' && site.operator !== operatorFilter) return false;
        if (techFilter !== 'ALL' && !site.technologies.includes(techFilter)) return false;
        if (siteTypeFilter !== 'ALL' && site.siteType !== siteTypeFilter) return false;
        if (siteStatusFilter !== 'ALL' && site.operationalStatus !== siteStatusFilter) return false;

        const siteIncidents = store.incidents.filter((i) => i.siteId === site.id);
        if (
          incidentSeverityFilter !== 'ALL' &&
          !siteIncidents.some((i) => i.severity === incidentSeverityFilter)
        ) {
          return false;
        }
        if (
          incidentStatusFilter !== 'ALL' &&
          !siteIncidents.some((i) => i.status === incidentStatusFilter)
        ) {
          return false;
        }

        if (equipmentCategoryFilter !== 'ALL') {
          const siteEq = store.equipment.filter((e) => e.siteId === site.id);
          if (!siteEq.some((e) => e.category === equipmentCategoryFilter)) return false;
        }

        if (maintenanceStatusFilter === 'OVERDUE' && !isMaintenanceOverdue(site.lastMaintenanceDate)) {
          return false;
        }
        if (
          maintenanceStatusFilter === 'ACTIVE_WO' &&
          !store.workOrders.some(
            (w) =>
              w.siteId === site.id && (w.status === 'In Progress' || w.status === 'Dispatched')
          )
        ) {
          return false;
        }
        if (
          maintenanceStatusFilter === 'SCHEDULED_VISIT' &&
          !store.siteVisits.some(
            (sv) =>
              sv.siteId === site.id && (sv.status === 'Scheduled' || sv.status === 'On-Site')
          )
        ) {
          return false;
        }

        // Work Case Filters (Section 6)
        const siteCases = (store.workCases || []).filter(
          (c) => c.siteId === site.id || c.siteCode === site.siteCode
        );
        if (caseStatusFilter !== 'ALL') {
          if (!siteCases.some((c) => String(c.status).toLowerCase() === caseStatusFilter.toLowerCase())) {
            return false;
          }
        }
        if (casePriorityFilter !== 'ALL') {
          if (!siteCases.some((c) => String(c.priority).toLowerCase() === casePriorityFilter.toLowerCase())) {
            return false;
          }
        }
        if (workTypeFilter !== 'ALL') {
          if (
            !siteCases.some(
              (c) =>
                (c.workType || '').toLowerCase().includes(workTypeFilter.toLowerCase()) ||
                (c.category || '').toLowerCase().includes(workTypeFilter.toLowerCase())
            )
          ) {
            return false;
          }
        }

        return true;
      })
      .map((site) => {
        const activeIncidents = store.incidents.filter(
          (i) => i.siteId === site.id && i.status !== 'Resolved' && i.status !== 'Closed'
        );
        const resolvedIncidents = store.incidents.filter(
          (i) => i.siteId === site.id && (i.status === 'Resolved' || i.status === 'Closed')
        );
        const hasCritical = activeIncidents.some((i) => i.severity === 'Critical');
        const hasMajor = activeIncidents.some((i) => i.severity === 'Major');
        const hasOpenWo = store.workOrders.some(
          (w) => w.siteId === site.id && (w.status === 'In Progress' || w.status === 'Dispatched')
        );
        const hasPlannedVisit = store.siteVisits.some(
          (sv) => sv.siteId === site.id && (sv.status === 'Scheduled' || sv.status === 'On-Site')
        );
        const overduePm = isMaintenanceOverdue(site.lastMaintenanceDate);

        // Determine marker visual state & color
        let markerColor = '#10b981'; // Operational Green
        let markerStatusLabel = 'Operational';
        if (site.operationalStatus === 'Offline') {
          markerColor = '#dc2626'; // Offline Crimson
          markerStatusLabel = 'Offline';
        } else if (hasCritical) {
          markerColor = '#ef4444'; // Critical Alarm Red
          markerStatusLabel = 'Critical Alarm';
        } else if (hasMajor || site.operationalStatus === 'Degraded') {
          markerColor = '#f97316'; // Major / Degraded Orange
          markerStatusLabel = 'Major Alarm / Degraded';
        } else if (site.operationalStatus === 'Maintenance') {
          markerColor = '#eab308'; // Under Maintenance Amber
          markerStatusLabel = 'Under Maintenance';
        } else if (site.operationalStatus === 'Planned') {
          markerColor = '#64748b'; // Planned / No Live Telemetry
          markerStatusLabel = 'Planned';
        }

        return {
          site,
          activeIncidentsCount: activeIncidents.length,
          resolvedIncidentsCount: resolvedIncidents.length,
          hasCritical,
          hasMajor,
          hasOpenWo,
          hasPlannedVisit,
          overduePm,
          markerColor,
          markerStatusLabel,
        };
      });
  }, [
    store.sites,
    store.incidents,
    store.equipment,
    store.workOrders,
    store.siteVisits,
    layers.sitesGreenfield,
    layers.sitesBscCore,
    layers.sitesRooftopIndoor,
    layers.sitesMicrowaveTx,
    regionFilter,
    operatorFilter,
    techFilter,
    siteTypeFilter,
    siteStatusFilter,
    incidentSeverityFilter,
    incidentStatusFilter,
    equipmentCategoryFilter,
    maintenanceStatusFilter,
  ]);

  // Filtered GIS Infrastructure Features (Layers B, C, D)
  const visibleGisFeatures = useMemo(() => {
    return store.gisFeatures.filter((feat) => {
      if (regionFilter !== 'ALL' && feat.region !== regionFilter) return false;
      if (operatorFilter !== 'ALL' && feat.operator !== operatorFilter) return false;

      switch (feat.featureType) {
        case 'Fiber Route':
          return layers.fiberRoutes;
        case 'Underground Duct':
          return layers.undergroundDucts;
        case 'Microwave Link':
          return layers.microwaveLinks;
        case 'Manhole / Handhole':
          return layers.manholesHandholes;
        case 'Fiber Distribution Cabinet (FDT)':
        case 'Optical Splitter / FAT':
          return layers.fdtAndSplitters;
        case 'Outdoor Telecom Cabinet':
          return layers.outdoorCabinets;
        case 'Power / Rectifier / DG Pad':
          return layers.powerGenerators;
        case 'Battery & Env Sensor Node':
          return layers.batteryEnvSensors;
        case 'Infrastructure Area / Compound':
          return layers.infraPolygons;
        case 'Maintenance / Incident Marker':
          return layers.activeIncidentHalos || layers.openWorkOrders;
        default:
          return true;
      }
    });
  }, [
    store.gisFeatures,
    regionFilter,
    operatorFilter,
    layers.fiberRoutes,
    layers.undergroundDucts,
    layers.microwaveLinks,
    layers.manholesHandholes,
    layers.fdtAndSplitters,
    layers.outdoorCabinets,
    layers.powerGenerators,
    layers.batteryEnvSensors,
    layers.infraPolygons,
    layers.activeIncidentHalos,
    layers.openWorkOrders,
  ]);

  // Local Search Results (Site ID, Code, Name, Address, Region/District, Equipment ID, GIS Features)
  const localSearchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { sites: [], equipment: [], gisFeatures: [] };

    const sites = store.sites
      .filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.siteCode.toLowerCase().includes(q) ||
          s.siteName.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const equipment = store.equipment
      .filter(
        (eq) =>
          eq.id.toLowerCase().includes(q) ||
          eq.serialNumber.toLowerCase().includes(q) ||
          eq.name.toLowerCase().includes(q) ||
          eq.model.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const gisFeatures = store.gisFeatures
      .filter(
        (f) =>
          f.id.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          f.featureType.toLowerCase().includes(q) ||
          f.region.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return { sites, equipment, gisFeatures };
  }, [searchQuery, store.sites, store.equipment, store.gisFeatures]);

  // Fly to coordinate helper
  const flyToCoordinates = useCallback((lng: number, lat: number, zoom = 13.5) => {
    if (!mapRef.current) return;
    if (!isValidCoordinatePair([lng, lat])) return;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom,
      duration: 900,
    });
  }, []);

  // Build GeoJSON FeatureCollections for MapLibre sources
  const sitesGeoJson = useMemo<FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: filteredSitesWithMeta.map((item) => ({
        type: 'Feature',
        id: item.site.id,
        geometry: {
          type: 'Point',
          coordinates: [item.site.longitude, item.site.latitude],
        },
        properties: {
          id: item.site.id,
          entityKind: 'site',
          siteCode: item.site.siteCode,
          siteName: item.site.siteName,
          siteType: item.site.siteType,
          operationalStatus: item.site.operationalStatus,
          activeIncidentsCount: item.activeIncidentsCount,
          resolvedIncidentsCount: item.resolvedIncidentsCount,
          hasCritical: item.hasCritical,
          hasMajor: item.hasMajor,
          hasOpenWo: item.hasOpenWo,
          hasPlannedVisit: item.hasPlannedVisit,
          overduePm: item.overduePm,
          markerColor: item.markerColor,
          markerStatusLabel: item.markerStatusLabel,
          isSelected: focusedGisEntity?.kind === 'site' && focusedGisEntity?.id === item.site.id,
        },
      })),
    };
  }, [filteredSitesWithMeta, focusedGisEntity]);

  const gisLinesGeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = visibleGisFeatures
      .filter(
        (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
      )
      .map((f) => {
        let lineColor = '#0ea5e9'; // Fiber Route Sky Blue
        if (f.featureType === 'Underground Duct') lineColor = '#818cf8';
        if (f.featureType === 'Microwave Link') {
          lineColor = f.status === 'Degraded' ? '#f97316' : '#10b981';
        }
        return {
          type: 'Feature',
          id: f.id,
          geometry: f.geometry,
          properties: {
            id: f.id,
            entityKind: 'gis-feature',
            name: f.name,
            featureType: f.featureType,
            status: f.status,
            lineColor,
            isDashed:
              f.featureType === 'Microwave Link' || f.featureType === 'Underground Duct',
            isSelected:
              focusedGisEntity?.kind === 'gis-feature' && focusedGisEntity?.id === f.id,
          },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [visibleGisFeatures, focusedGisEntity]);

  const gisPolygonsGeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = visibleGisFeatures
      .filter((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      .map((f) => {
        const fillColor =
          f.status === 'Offline'
            ? '#ef4444'
            : f.status === 'Degraded'
            ? '#f97316'
            : '#0ea5e9';
        return {
          type: 'Feature',
          id: f.id,
          geometry: f.geometry,
          properties: {
            id: f.id,
            entityKind: 'gis-feature',
            name: f.name,
            featureType: f.featureType,
            status: f.status,
            fillColor,
            isSelected:
              focusedGisEntity?.kind === 'gis-feature' && focusedGisEntity?.id === f.id,
          },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [visibleGisFeatures, focusedGisEntity]);

  const gisPointsGeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = visibleGisFeatures
      .filter((f) => f.geometry.type === 'Point')
      .map((f) => {
        let pointColor = '#38bdf8';
        if (f.featureType === 'Manhole / Handhole') pointColor = '#94a3b8';
        else if (f.featureType === 'Fiber Distribution Cabinet (FDT)') pointColor = '#a855f7';
        else if (f.featureType === 'Optical Splitter / FAT') pointColor = '#ec4899';
        else if (f.featureType === 'Power / Rectifier / DG Pad') {
          pointColor = f.status === 'Offline' ? '#ef4444' : '#f59e0b';
        }
        return {
          type: 'Feature',
          id: f.id,
          geometry: f.geometry,
          properties: {
            id: f.id,
            entityKind: 'gis-feature',
            name: f.name,
            featureType: f.featureType,
            status: f.status,
            pointColor,
            isSelected:
              focusedGisEntity?.kind === 'gis-feature' && focusedGisEntity?.id === f.id,
          },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [visibleGisFeatures, focusedGisEntity]);

  // Active Sketch / Measurement GeoJSON
  const sketchGeoJson = useMemo<FeatureCollection>(() => {
    const features: Feature[] = [];
    sketchCoordinates.forEach((coord, idx) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
        properties: { vertexIndex: idx + 1 },
      });
    });

    if (sketchCoordinates.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: sketchCoordinates },
        properties: {},
      });
    }

    if (
      (activeTool === 'draw-polygon' || activeTool === 'measure-area') &&
      sketchCoordinates.length >= 3
    ) {
      const closedRing = [...sketchCoordinates, sketchCoordinates[0]];
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [closedRing] },
        properties: {},
      });
    }

    return { type: 'FeatureCollection', features };
  }, [sketchCoordinates, activeTool]);

  // Install or refresh all custom GeoJSON sources & layers onto the MapLibre instance
  const syncMapSourcesAndLayers = useCallback(
    (map: maplibregl.Map) => {
      if (!map.isStyleLoaded()) return;

      // 1. Polygons Source & Layers
      const polySrc = map.getSource('telecom-gis-polygons') as maplibregl.GeoJSONSource | undefined;
      if (!polySrc) {
        map.addSource('telecom-gis-polygons', {
          type: 'geojson',
          data: gisPolygonsGeoJson,
        });
        map.addLayer({
          id: 'layer-gis-polygons-fill',
          type: 'fill',
          source: 'telecom-gis-polygons',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.32, 0.16],
          },
        });
        map.addLayer({
          id: 'layer-gis-polygons-outline',
          type: 'line',
          source: 'telecom-gis-polygons',
          paint: {
            'line-color': ['get', 'fillColor'],
            'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3, 1.75],
            'line-dasharray': [2, 2],
          },
        });
      } else {
        polySrc.setData(gisPolygonsGeoJson);
      }

      // 2. Lines Source & Layers (Fiber Routes, Ducts, Microwave Links)
      const lineSrc = map.getSource('telecom-gis-lines') as maplibregl.GeoJSONSource | undefined;
      if (!lineSrc) {
        map.addSource('telecom-gis-lines', {
          type: 'geojson',
          data: gisLinesGeoJson,
        });
        map.addLayer({
          id: 'layer-gis-lines-solid',
          type: 'line',
          source: 'telecom-gis-lines',
          filter: ['==', ['get', 'isDashed'], false],
          paint: {
            'line-color': ['get', 'lineColor'],
            'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 5, 3],
            'line-opacity': 0.92,
          },
        });
        map.addLayer({
          id: 'layer-gis-lines-dashed',
          type: 'line',
          source: 'telecom-gis-lines',
          filter: ['==', ['get', 'isDashed'], true],
          paint: {
            'line-color': ['get', 'lineColor'],
            'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 4.5, 2.5],
            'line-dasharray': [3, 2],
            'line-opacity': 0.92,
          },
        });
      } else {
        lineSrc.setData(gisLinesGeoJson);
      }

      // 3. Infrastructure Points Source & Layer
      const ptsSrc = map.getSource('telecom-gis-points') as maplibregl.GeoJSONSource | undefined;
      if (!ptsSrc) {
        map.addSource('telecom-gis-points', {
          type: 'geojson',
          data: gisPointsGeoJson,
        });
        map.addLayer({
          id: 'layer-gis-points-circle',
          type: 'circle',
          source: 'telecom-gis-points',
          paint: {
            'circle-radius': ['case', ['boolean', ['get', 'isSelected'], false], 8, 5.5],
            'circle-color': ['get', 'pointColor'],
            'circle-stroke-width': ['case', ['boolean', ['get', 'isSelected'], false], 2.5, 1.5],
            'circle-stroke-color': '#ffffff',
          },
        });
      } else {
        ptsSrc.setData(gisPointsGeoJson);
      }

      // 4. Telecom Sites Source & Operational Overlay Layers
      const existingSitesSrc = map.getSource('telecom-sites') as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!existingSitesSrc) {
        map.addSource('telecom-sites', {
          type: 'geojson',
          data: sitesGeoJson,
          cluster: layers.clusterSites,
          clusterMaxZoom: 12,
          clusterRadius: 42,
        });

        // Cluster circles when clustering is enabled
        map.addLayer({
          id: 'layer-sites-clusters',
          type: 'circle',
          source: 'telecom-sites',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0284c7',
            'circle-radius': ['step', ['get', 'point_count'], 16, 4, 20, 8, 25],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // D. Operations & Maintenance Overlays: Active Incident Outer Halo
        map.addLayer({
          id: 'layer-ops-incident-halo',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['>', ['get', 'activeIncidentsCount'], 0],
          ],
          layout: {
            visibility: layers.activeIncidentHalos ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 17,
            'circle-color': [
              'case',
              ['boolean', ['get', 'hasCritical'], false],
              '#ef4444',
              ['boolean', ['get', 'hasMajor'], false],
              '#f97316',
              '#eab308',
            ],
            'circle-opacity': 0.25,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': [
              'case',
              ['boolean', ['get', 'hasCritical'], false],
              '#ef4444',
              ['boolean', ['get', 'hasMajor'], false],
              '#f97316',
              '#eab308',
            ],
          },
        });

        // D. Operations & Maintenance Overlays: Offline Site Ring
        map.addLayer({
          id: 'layer-ops-offline-ring',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'operationalStatus'], 'Offline'],
          ],
          layout: {
            visibility: layers.offlineSiteRings ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 22,
            'circle-color': 'transparent',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#dc2626',
          },
        });

        // D. Operations & Maintenance Overlays: Open Work Orders Ring
        map.addLayer({
          id: 'layer-ops-open-wo',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'hasOpenWo'], true],
          ],
          layout: {
            visibility: layers.openWorkOrders ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 13,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#38bdf8',
          },
        });

        // D. Operations & Maintenance Overlays: Overdue Maintenance Ring
        map.addLayer({
          id: 'layer-ops-overdue-pm',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'overduePm'], true],
          ],
          layout: {
            visibility: layers.overdueMaintenance ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 25,
            'circle-color': 'transparent',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#f59e0b',
          },
        });

        // D. Operations & Maintenance Overlays: Planned Site Visits Ring
        map.addLayer({
          id: 'layer-ops-planned-visits',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'hasPlannedVisit'], true],
          ],
          layout: {
            visibility: layers.plannedSiteVisits ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 19,
            'circle-color': 'transparent',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#a855f7',
          },
        });

        // D. Operations & Maintenance Overlays: Resolved Incidents Indicator
        map.addLayer({
          id: 'layer-ops-resolved-incidents',
          type: 'circle',
          source: 'telecom-sites',
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['>', ['get', 'resolvedIncidentsCount'], 0],
          ],
          layout: {
            visibility: layers.resolvedIncidents ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': 15,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#10b981',
          },
        });

        // Core Site Circle Marker
        map.addLayer({
          id: 'layer-sites-points',
          type: 'circle',
          source: 'telecom-sites',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': ['case', ['boolean', ['get', 'isSelected'], false], 10, 7.5],
            'circle-color': ['get', 'markerColor'],
            'circle-stroke-width': ['case', ['boolean', ['get', 'isSelected'], false], 3, 2],
            'circle-stroke-color': '#ffffff',
          },
        });
      } else {
        existingSitesSrc.setData(sitesGeoJson);
        const setVis = (layerId: string, visible: boolean) => {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
          }
        };
        setVis('layer-ops-incident-halo', layers.activeIncidentHalos);
        setVis('layer-ops-offline-ring', layers.offlineSiteRings);
        setVis('layer-ops-open-wo', layers.openWorkOrders);
        setVis('layer-ops-overdue-pm', layers.overdueMaintenance);
        setVis('layer-ops-planned-visits', layers.plannedSiteVisits);
        setVis('layer-ops-resolved-incidents', layers.resolvedIncidents);
      }

      // 5. Sketch / Measurement Source & Layers
      const sketchSrc = map.getSource('telecom-gis-sketch') as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!sketchSrc) {
        map.addSource('telecom-gis-sketch', {
          type: 'geojson',
          data: sketchGeoJson,
        });
        map.addLayer({
          id: 'layer-sketch-poly',
          type: 'fill',
          source: 'telecom-gis-sketch',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.25,
          },
        });
        map.addLayer({
          id: 'layer-sketch-line',
          type: 'line',
          source: 'telecom-gis-sketch',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#f59e0b',
            'line-width': 3,
            'line-dasharray': [2, 1],
          },
        });
        map.addLayer({
          id: 'layer-sketch-points',
          type: 'circle',
          source: 'telecom-gis-sketch',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5.5,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0f172a',
          },
        });
      } else {
        sketchSrc.setData(sketchGeoJson);
      }
    },
    [
      gisPolygonsGeoJson,
      gisLinesGeoJson,
      gisPointsGeoJson,
      sitesGeoJson,
      sketchGeoJson,
      layers.clusterSites,
      layers.activeIncidentHalos,
      layers.offlineSiteRings,
      layers.openWorkOrders,
      layers.overdueMaintenance,
      layers.plannedSiteVisits,
      layers.resolvedIncidents,
    ]
  );

  // Refs for latest state inside MapLibre click listeners
  const activeToolRef = useRef<GisToolMode>(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const focusedEntityRef = useRef(focusedGisEntity);
  useEffect(() => {
    focusedEntityRef.current = focusedGisEntity;
  }, [focusedGisEntity]);

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const resolved = resolveBasemapStyle(basemapStyle, customSatelliteUrl);
    const initialStyle =
      resolved.style || resolveBasemapStyle('dark').style!;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [-118.328, 34.025],
        zoom: 9.6,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.AttributionControl({
          compact: false,
        }),
        'bottom-right'
      );

      map.on('load', () => {
        setMapReady(true);
        setMapProviderError(null);
        syncMapSourcesAndLayers(map);
      });

      map.on('styledata', () => {
        syncMapSourcesAndLayers(map);
      });

      map.on('error', (ev: { error?: { message?: string } }) => {
        if (ev?.error?.message && ev.error.message.includes('Failed to fetch')) {
          setMapProviderError(
            'One or more basemap tiles could not be loaded from the remote tile server. Infrastructure vector layers remain active.'
          );
        }
      });

      map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
        setCursorCoords({
          lng: Number(e.lngLat.lng.toFixed(5)),
          lat: Number(e.lngLat.lat.toFixed(5)),
        });
      });

      map.on('moveend', () => {
        setZoomLevel(Number(map.getZoom().toFixed(2)));
        setBearing(Math.round(map.getBearing()));
      });

      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const lng = Number(e.lngLat.lng.toFixed(5));
        const lat = Number(e.lngLat.lat.toFixed(5));
        const tool = activeToolRef.current;

        // Tool 0: Relocate Active Site on Map Click
        if (isRelocatingSiteRef.current && selectedSiteRef.current) {
          const target = selectedSiteRef.current;
          const res = upsertSite({
            id: target.id,
            siteIdInput: target.id,
            siteCode: target.siteCode,
            siteName: target.siteName,
            operator: target.operator,
            region: target.region,
            district: target.district,
            address: target.address,
            latitude: lat,
            longitude: lng,
            siteType: target.siteType,
            technologies: target.technologies,
            operationalStatus: target.operationalStatus,
            assignedTeamId: target.assignedTeamId,
            lastMaintenanceDate: target.lastMaintenanceDate,
            towerHeightMeters: target.towerHeightMeters,
            powerConfiguration: target.powerConfiguration,
            accessInstructions: target.accessInstructions,
          });
          if (res.ok) {
            showToast(
              `Relocated ${target.siteCode} to (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
              'success'
            );
          } else {
            showToast(res.error || 'Failed to update site location', 'error');
          }
          setIsRelocatingSite(false);
          return;
        }

        // Tool 1: Add Site / BTS / BSC Asset Marker
        if (tool === 'add-site' || tool === 'add-bts' || tool === 'add-bsc') {
          const prefillType: SiteType =
            tool === 'add-bts'
              ? 'BTS'
              : tool === 'add-bsc'
              ? 'BSC'
              : (pendingAssetTypeRef.current || 'Greenfield Tower');
          openCreateSiteModal(undefined, {
            latitude: lat,
            longitude: lng,
            siteType: prefillType,
            siteName:
              tool === 'add-bts'
                ? 'New BTS Station'
                : tool === 'add-bsc'
                ? 'New BSC Hub'
                : undefined,
          });
          setActiveTool('select');
          setPendingAssetType(null);
          return;
        }

        // Tool 2: Draw Point Feature
        if (tool === 'draw-point') {
          setEditingGisFeature(null);
          setDraftGeometryForModal({
            type: 'Point',
            coordinates: [lng, lat],
          });
          setIsGisFeatureModalOpen(true);
          setActiveTool('select');
          return;
        }

        // Tool 3: Multi-vertex Line / Polygon / Measurement tools
        if (
          tool === 'draw-line' ||
          tool === 'draw-polygon' ||
          tool === 'measure-route' ||
          tool === 'measure-area'
        ) {
          setSketchCoordinates((prev) => [...prev, [lng, lat]]);
          return;
        }

        if (tool === 'measure-distance') {
          setSketchCoordinates((prev) => {
            if (prev.length >= 2) return [[lng, lat]];
            return [...prev, [lng, lat]];
          });
          return;
        }

        // Tool 4: Edit Geometry (relocate selected GIS Point or append/update geometry)
        if (tool === 'edit-geometry') {
          const currentFocus = focusedEntityRef.current;
          if (currentFocus?.kind === 'gis-feature') {
            setSketchCoordinates((prev) => [...prev, [lng, lat]]);
          }
          return;
        }

        // Default Select / Inspect tool: query rendered interactive layers
        const queryLayers = [
          'layer-sites-clusters',
          'layer-sites-points',
          'layer-gis-points-circle',
          'layer-gis-lines-solid',
          'layer-gis-lines-dashed',
          'layer-gis-polygons-fill',
        ].filter((id) => Boolean(map.getLayer(id)));

        const hits = map.queryRenderedFeatures(e.point, { layers: queryLayers });
        if (hits.length > 0) {
          const topHit = hits[0];
          if (topHit.layer.id === 'layer-sites-clusters') {
            map.easeTo({
              center: [lng, lat],
              zoom: map.getZoom() + 2,
            });
            return;
          }
          const props = topHit.properties || {};
          if (props.entityKind === 'site' && props.id) {
            setFocusedGisEntity({ kind: 'site', id: String(props.id) });
            return;
          }
          if (props.entityKind === 'gis-feature' && props.id) {
            setFocusedGisEntity({ kind: 'gis-feature', id: String(props.id) });
            return;
          }
        }
      });

      mapRef.current = map;
    } catch (err) {
      setMapProviderError(
        `MapLibre GL initialization error: ${(err as Error).message}`
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Re-sync GeoJSON data whenever store, filters, or layer toggles change
  useEffect(() => {
    if (mapRef.current && mapReady) {
      syncMapSourcesAndLayers(mapRef.current);
    }
  }, [mapReady, syncMapSourcesAndLayers]);

  // Recreate telecom-sites source when clusterSites toggle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.isStyleLoaded()) return;
    const DependentLayers = [
      'layer-sites-clusters',
      'layer-ops-incident-halo',
      'layer-ops-offline-ring',
      'layer-ops-open-wo',
      'layer-ops-overdue-pm',
      'layer-ops-planned-visits',
      'layer-ops-resolved-incidents',
      'layer-sites-points',
    ];
    DependentLayers.forEach((lid) => {
      if (map.getLayer(lid)) map.removeLayer(lid);
    });
    if (map.getSource('telecom-sites')) {
      map.removeSource('telecom-sites');
    }
    syncMapSourcesAndLayers(map);
  }, [layers.clusterSites]);

  // Fly to focused entity when navigated from another module
  useEffect(() => {
    if (!mapRef.current || !mapReady || !focusedGisEntity) return;
    if (focusedGisEntity.kind === 'site') {
      const site = store.sites.find((s) => s.id === focusedGisEntity.id);
      if (site) {
        flyToCoordinates(site.longitude, site.latitude, 13);
      }
    } else {
      const gf = store.gisFeatures.find((f) => f.id === focusedGisEntity.id);
      if (gf) {
        const center = getGeometryCenterCoordinates(gf.geometry);
        if (center) {
          flyToCoordinates(center[0], center[1], 12.5);
        }
      }
    }
  }, [focusedGisEntity, mapReady]);

  // Handle basemap style switch while preserving overlays
  const handleSelectBasemapStyle = (styleId: BasemapStyleId) => {
    setBasemapStyle(styleId);
    const resolved = resolveBasemapStyle(styleId, customSatelliteUrl);
    if (resolved.error || !resolved.style) {
      setMapProviderError(resolved.error || 'Selected style requires configuration.');
      setShowProviderConfigModal(true);
      return;
    }
    setMapProviderError(null);
    if (mapRef.current) {
      mapRef.current.setStyle(resolved.style);
    }
  };

  // Handle External Geocoding Search
  const handleRunExternalGeocode = async () => {
    setGeocodeLoading(true);
    setGeocodeError(null);
    const res = await searchExternalGeocode(searchQuery);
    setGeocodeLoading(false);
    if (res.error) {
      setGeocodeError(res.error);
    }
    setGeocodeResults(res.results);
  };

  // Finish drawing LineString or Polygon and open creation modal
  const handleFinishSketchFeature = () => {
    if (activeTool === 'draw-line') {
      if (sketchCoordinates.length < 2) {
        showToast('Click at least 2 points on the map to form a line route.', 'error');
        return;
      }
      setEditingGisFeature(null);
      setDraftGeometryForModal({
        type: 'LineString',
        coordinates: sketchCoordinates,
      });
      setIsGisFeatureModalOpen(true);
      setSketchCoordinates([]);
      setActiveTool('select');
    } else if (activeTool === 'draw-polygon') {
      if (sketchCoordinates.length < 3) {
        showToast('Click at least 3 vertices on the map to form a polygon area.', 'error');
        return;
      }
      const closedRing = [...sketchCoordinates, sketchCoordinates[0]];
      setEditingGisFeature(null);
      setDraftGeometryForModal({
        type: 'Polygon',
        coordinates: [closedRing],
      });
      setIsGisFeatureModalOpen(true);
      setSketchCoordinates([]);
      setActiveTool('select');
    } else if (activeTool === 'edit-geometry' && selectedGisFeature) {
      if (selectedGisFeature.geometry.type === 'Point' && sketchCoordinates.length >= 1) {
        const lastPt = sketchCoordinates[sketchCoordinates.length - 1];
        upsertGisFeature({
          id: selectedGisFeature.id,
          layerGroup: selectedGisFeature.layerGroup,
          featureType: selectedGisFeature.featureType,
          name: selectedGisFeature.name,
          description: selectedGisFeature.description,
          region: selectedGisFeature.region,
          operator: selectedGisFeature.operator,
          status: selectedGisFeature.status,
          linkedSiteId: selectedGisFeature.linkedSiteId,
          linkedIncidentId: selectedGisFeature.linkedIncidentId,
          geometry: { type: 'Point', coordinates: lastPt },
          properties: selectedGisFeature.properties,
        });
        setSketchCoordinates([]);
        setActiveTool('select');
      } else if (
        selectedGisFeature.geometry.type === 'LineString' &&
        sketchCoordinates.length >= 2
      ) {
        upsertGisFeature({
          id: selectedGisFeature.id,
          layerGroup: selectedGisFeature.layerGroup,
          featureType: selectedGisFeature.featureType,
          name: selectedGisFeature.name,
          description: selectedGisFeature.description,
          region: selectedGisFeature.region,
          operator: selectedGisFeature.operator,
          status: selectedGisFeature.status,
          linkedSiteId: selectedGisFeature.linkedSiteId,
          linkedIncidentId: selectedGisFeature.linkedIncidentId,
          geometry: { type: 'LineString', coordinates: sketchCoordinates },
          properties: selectedGisFeature.properties,
        });
        setSketchCoordinates([]);
        setActiveTool('select');
      } else if (
        selectedGisFeature.geometry.type === 'Polygon' &&
        sketchCoordinates.length >= 3
      ) {
        const closed = [...sketchCoordinates, sketchCoordinates[0]];
        upsertGisFeature({
          id: selectedGisFeature.id,
          layerGroup: selectedGisFeature.layerGroup,
          featureType: selectedGisFeature.featureType,
          name: selectedGisFeature.name,
          description: selectedGisFeature.description,
          region: selectedGisFeature.region,
          operator: selectedGisFeature.operator,
          status: selectedGisFeature.status,
          linkedSiteId: selectedGisFeature.linkedSiteId,
          linkedIncidentId: selectedGisFeature.linkedIncidentId,
          geometry: { type: 'Polygon', coordinates: [closed] },
          properties: selectedGisFeature.properties,
        });
        setSketchCoordinates([]);
        setActiveTool('select');
      } else {
        showToast('Add required vertices on the map before saving geometry update.', 'error');
      }
    }
  };

  // Copy coordinates helper
  const handleCopyCoordinates = (lat: number, lng: number) => {
    const formatted = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    navigator.clipboard?.writeText(formatted);
    showToast(`Copied coordinates: ${formatted}`, 'info');
  };

  // Computed live measurement results (Section 6)
  const measurementSummary = useMemo(() => {
    if (activeTool === 'measure-distance' && sketchCoordinates.length === 2) {
      const res = calculateStraightLineDistance(sketchCoordinates[0], sketchCoordinates[1]);
      return {
        title: 'Straight-Line Geodesic Distance',
        primaryValue: `${res.kilometers.toFixed(3)} km (${Math.round(res.meters)} m)`,
        secondaryValue: `Azimuth Bearing: ${res.bearingDegrees.toFixed(1)}°`,
        disclaimer:
          'Geodesic straight-line (great-circle) distance between points. Differs from actual road travel distance.',
      };
    }
    if (
      (activeTool === 'measure-route' || activeTool === 'draw-line') &&
      sketchCoordinates.length >= 2
    ) {
      const res = calculatePolylineLength(sketchCoordinates);
      return {
        title: 'Multi-Segment Route / Line Length',
        primaryValue: `${res.kilometers.toFixed(3)} km (${Math.round(res.meters)} m)`,
        secondaryValue: `${res.vertexCount} vertices plotted`,
        disclaimer:
          'Approximate 2D planimetric polyline length. Not equivalent to surveyed optical cable length (excludes vertical riser, splice loop, and catenary slack).',
      };
    }
    if (
      (activeTool === 'measure-area' || activeTool === 'draw-polygon') &&
      sketchCoordinates.length >= 3
    ) {
      const res = calculatePolygonMetrics(sketchCoordinates);
      return {
        title: 'Polygon Footprint Area & Perimeter',
        primaryValue: `${res.areaSqKilometers.toFixed(4)} km² (${Math.round(
          res.areaSqMeters
        ).toLocaleString()} m²)`,
        secondaryValue: `${res.hectares.toFixed(2)} ha · Perimeter: ${res.perimeterKm.toFixed(
          3
        )} km`,
        disclaimer: 'Geodesic spherical polygon area calculation via Turf.js.',
      };
    }
    return null;
  }, [activeTool, sketchCoordinates]);

  const currentBasemapOption =
    BASEMAP_STYLE_OPTIONS.find((o) => o.id === basemapStyle) || BASEMAP_STYLE_OPTIONS[0];

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none'
          : 'flex flex-col h-[calc(100vh-5.5rem)] -m-4 sm:-m-6 lg:-m-8 bg-slate-950 text-slate-100 overflow-hidden select-none'
      }
    >
      {/* Top GIS Workspace Control Bar */}
      <div className="h-14 px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Return to Dashboard & Workspace Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            title="Return to Main Operations Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Main Dashboard</span>
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <Globe className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
              GIS MAP · Infrastructure &amp; Topology
            </span>
          </div>
        </div>

        {/* Center: Map Search & Geocoding Navigation Bar */}
        <div className="relative flex-1 max-w-xl">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Search Site ID, Code, Name, Address, District, Equipment S/N, or Place..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setGeocodeResults([]);
                    setGeocodeError(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear map search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={!searchQuery.trim() || geocodeLoading}
              onClick={() => {
                setSearchDropdownOpen(true);
                handleRunExternalGeocode();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap cursor-pointer disabled:opacity-40"
              title="Query External OSM Place Geocoder"
            >
              {geocodeLoading ? 'Geocoding...' : 'Place Lookup'}
            </button>
          </div>

          {/* Search & Geocode Results Dropdown */}
          {searchDropdownOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs max-h-96 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-mono text-[10px] font-semibold text-slate-400">
                  GIS SEARCH RESULTS
                </span>
                <button
                  type="button"
                  onClick={() => setSearchDropdownOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {detectedCoords && (
                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      Direct Coordinates Target:
                    </span>
                    <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {detectedCoords.lat.toFixed(5)}°N, {detectedCoords.lng.toFixed(5)}°E
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      flyToCoordinates(detectedCoords.lng, detectedCoords.lat, 14);
                      setSelectedSearchedPlace({
                        displayName: `Coordinates (${detectedCoords.lat.toFixed(5)}, ${detectedCoords.lng.toFixed(5)})`,
                        latitude: detectedCoords.lat,
                        longitude: detectedCoords.lng,
                        placeId: `coords-${Date.now()}`,
                        type: 'coordinate',
                      });
                      setSearchDropdownOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Fly To &amp; Pin
                  </button>
                </div>
              )}

              {localSearchMatches.sites.length === 0 &&
                localSearchMatches.equipment.length === 0 &&
                localSearchMatches.gisFeatures.length === 0 &&
                geocodeResults.length === 0 && (
                  <p className="text-slate-500 py-2 text-center">
                    No matching internal telecom records. Click &ldquo;Place Lookup&rdquo; to query
                    external address geocoding.
                  </p>
                )}

              {localSearchMatches.sites.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] font-bold text-sky-500 mb-1">
                    NETWORK SITES ({localSearchMatches.sites.length})
                  </p>
                  {localSearchMatches.sites.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setFocusedGisEntity({ kind: 'site', id: s.id });
                        flyToCoordinates(s.longitude, s.latitude, 13.5);
                        setSearchDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {s.siteCode}
                        </span>{' '}
                        <span className="text-slate-400">({s.id})</span> ·{' '}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {s.siteName}
                        </span>
                        <div className="text-[11px] text-slate-500 truncate">
                          {s.region} · {s.district} · {s.address}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        Zoom To
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {localSearchMatches.equipment.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] font-bold text-amber-500 mb-1">
                    INSTALLED EQUIPMENT ({localSearchMatches.equipment.length})
                  </p>
                  {localSearchMatches.equipment.map((eq) => {
                    const hostSite = store.sites.find((s) => s.id === eq.siteId);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          if (hostSite) {
                            setFocusedGisEntity({ kind: 'site', id: hostSite.id });
                            flyToCoordinates(hostSite.longitude, hostSite.latitude, 14);
                          }
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            {eq.id}
                          </span>{' '}
                          · <span className="font-medium text-slate-900 dark:text-white">{eq.name}</span>
                          <div className="text-[11px] font-mono text-slate-500">
                            Site: {eq.siteCode} · S/N: {eq.serialNumber}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-sky-500 shrink-0">
                          Locate Site
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {localSearchMatches.gisFeatures.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] font-bold text-emerald-500 mb-1">
                    FIBER, MICROWAVE &amp; GIS INFRASTRUCTURE ({localSearchMatches.gisFeatures.length})
                  </p>
                  {localSearchMatches.gisFeatures.map((gf) => (
                    <button
                      key={gf.id}
                      type="button"
                      onClick={() => {
                        setFocusedGisEntity({ kind: 'gis-feature', id: gf.id });
                        const center = getGeometryCenterCoordinates(gf.geometry);
                        if (center) flyToCoordinates(center[0], center[1], 13);
                        setSearchDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {gf.id}
                        </span>{' '}
                        · <span className="font-medium text-slate-900 dark:text-white">{gf.name}</span>
                        <div className="text-[11px] text-slate-500">
                          {gf.featureType} · {gf.region}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        Inspect
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {geocodeError && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px]">
                  {geocodeError}
                </div>
              )}

              {geocodeResults.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="font-mono text-[10px] font-bold text-slate-400 mb-1">
                    EXTERNAL GEOCODER PLACES (OSM NOMINATIM)
                  </p>
                  {geocodeResults.map((pl) => (
                    <button
                      key={pl.placeId}
                      type="button"
                      onClick={() => {
                        flyToCoordinates(pl.longitude, pl.latitude, 14);
                        setSelectedSearchedPlace(pl);
                        setSearchDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200">
                        {pl.displayName}
                      </span>
                      <span className="font-mono text-[10px] text-sky-500 shrink-0">
                        {pl.latitude.toFixed(3)}, {pl.longitude.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: City Jump Shortcuts, Basemap Switcher & GeoJSON Import/Export Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Real-World Regional Center Shortcuts */}
          <div className="hidden lg:flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => {
                flyToCoordinates(3.2504, 34.6728, 13);
                showToast(t('gis.centerDjelfa', 'Centered on Djelfa telecom cluster'), 'info');
              }}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
              title="Fly to Djelfa Regional Telecom Cluster (34.6728°N, 3.2504°E)"
            >
              📍 Djelfa
            </button>
            <button
              type="button"
              onClick={() => {
                flyToCoordinates(2.8277, 36.4700, 13);
                showToast(t('gis.centerBlida', 'Centered on Blida telecom cluster'), 'info');
              }}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
              title="Fly to Blida Regional Telecom Cluster (36.4700°N, 2.8277°E)"
            >
              📍 Blida
            </button>
          </div>

          {/* Basemap Style Selector */}
          <div className="hidden xl:flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {BASEMAP_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectBasemapStyle(opt.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  basemapStyle === opt.id
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.id === 'dark'
                  ? 'Dark'
                  : opt.id === 'light'
                  ? 'Light'
                  : opt.id === 'street'
                  ? 'Street'
                  : 'Satellite'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowProviderConfigModal(true)}
            className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            title="Basemap Tile Provider & Attribution Details"
          >
            Tile Config
          </button>

          <button
            type="button"
            onClick={() => setGeoJsonModalState({ isOpen: true, tab: 'import' })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GeoJSON</span>
          </button>

          {/* Full Screen Map Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Toggle Full Screen Map'}
            aria-label="Toggle Full Screen"
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4 text-sky-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main GIS Workspace Split: Left Layer/Filter Panel + Central Map + Right Feature Inspector */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Collapsible Layer & Filter Panel */}
        {leftPanelOpen ? (
          <aside
            style={{ width: `${leftPanelWidth}px` }}
            className="max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 shrink-0 relative"
          >
            {/* Panel Tabs */}
            <div className="px-3 pt-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('layers')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    leftPanelTab === 'layers'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>GIS Layers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('filters')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    leftPanelTab === 'filters'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLeftPanelOpen(false)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                title="Collapse Layer Panel"
                aria-label="Collapse Layer Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {leftPanelTab === 'layers' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* Tab 1: Comprehensive 14 Infrastructure & Telecom Layers */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">
                    14 Infrastructure Layers
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLayers(DEFAULT_LAYER_VISIBILITY)}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      Show All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setLayers((prev) =>
                          Object.keys(prev).reduce(
                            (acc, k) => ({ ...acc, [k]: false }),
                            {} as LayerVisibilityState
                          )
                        )
                      }
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                {/* 14 Primary Telecom & Infrastructure Layers */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                    TELECOM NETWORK &amp; ASSETS
                  </span>

                  {[
                    {
                      key: 'sitesGreenfield' as const,
                      label: '1. Telecom Sites & Towers',
                      count: store.sites.length,
                      color: 'bg-emerald-500',
                    },
                    {
                      key: 'btsStations' as const,
                      label: '2. BTS Stations',
                      count: store.sites.filter(
                        (s) =>
                          s.siteType === 'BTS' ||
                          s.technologies.some(
                            (t) =>
                              t.includes('2G') ||
                              t.includes('3G') ||
                              t.includes('4G') ||
                              t.includes('5G')
                          )
                      ).length,
                      color: 'bg-emerald-400',
                    },
                    {
                      key: 'sitesBscCore' as const,
                      label: '3. BSC Core Hubs',
                      count: store.sites.filter(
                        (s) => s.siteType === 'Core/BSC Hub' || s.siteType === 'BSC'
                      ).length,
                      color: 'bg-blue-600',
                    },
                    {
                      key: 'towersRooftops' as const,
                      label: '4. Towers & Rooftops',
                      count: store.sites.filter(
                        (s) =>
                          s.siteType === 'Greenfield Tower' ||
                          s.siteType === 'Rooftop' ||
                          s.siteType === 'Rooftop Site' ||
                          s.siteType === 'Mobile Tower'
                      ).length,
                      color: 'bg-indigo-500',
                    },
                    {
                      key: 'antennasRru' as const,
                      label: '5. Antennas & RRH/RRU',
                      count: store.equipment.filter(
                        (e) =>
                          e.category === 'Antenna / Feeder / RET' ||
                          e.category === 'RRU / RRH (Remote Radio)'
                      ).length,
                      color: 'bg-cyan-500',
                    },
                    {
                      key: 'fiberRoutes' as const,
                      label: '6. Fiber Routes',
                      count: store.gisFeatures.filter((f) => f.featureType === 'Fiber Route').length,
                      color: 'bg-sky-500',
                    },
                    {
                      key: 'undergroundDucts' as const,
                      label: '7. Ducts & Underground Galleries',
                      count: store.gisFeatures.filter((f) => f.featureType === 'Underground Duct')
                        .length,
                      color: 'bg-indigo-400',
                    },
                    {
                      key: 'manholesHandholes' as const,
                      label: '8. Manholes & Handholes',
                      count: store.gisFeatures.filter((f) => f.featureType === 'Manhole / Handhole')
                        .length,
                      color: 'bg-slate-400',
                    },
                    {
                      key: 'outdoorCabinets' as const,
                      label: '9. Cabinets & Distribution Points',
                      count: store.gisFeatures.filter(
                        (f) => f.featureType === 'Outdoor Telecom Cabinet'
                      ).length,
                      color: 'bg-amber-500',
                    },
                    {
                      key: 'fdtAndSplitters' as const,
                      label: '10. ODF / FDT / FAT & Splitters',
                      count: store.gisFeatures.filter(
                        (f) =>
                          f.featureType === 'Fiber Distribution Cabinet (FDT)' ||
                          f.featureType === 'Optical Splitter / FAT'
                      ).length,
                      color: 'bg-purple-500',
                    },
                    {
                      key: 'microwaveLinks' as const,
                      label: '11. Microwave Radio Links',
                      count: store.gisFeatures.filter((f) => f.featureType === 'Microwave Link')
                        .length,
                      color: 'bg-emerald-500',
                    },
                    {
                      key: 'powerGenerators' as const,
                      label: '12. Electrical & Generators',
                      count:
                        store.gisFeatures.filter(
                          (f) => f.featureType === 'Power / Rectifier / DG Pad'
                        ).length +
                        store.equipment.filter(
                          (e) =>
                            e.category === 'Diesel Generator / ATS' ||
                            e.category === 'Rectifier & DC Power'
                        ).length,
                      color: 'bg-yellow-500',
                    },
                    {
                      key: 'activeIncidentHalos' as const,
                      label: '13. Incidents & Work Cases',
                      count:
                        store.incidents.filter((i) => i.status !== 'Closed').length +
                        (store.workCases || []).filter((c) => c.status !== 'closed').length,
                      color: 'bg-red-500',
                    },
                    {
                      key: 'plannedSiteVisits' as const,
                      label: '14. Maintenance Visits',
                      count: store.siteVisits.length,
                      color: 'bg-teal-500',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={layers[item.key]}
                          onChange={(e) =>
                            setLayers((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="rounded border-slate-400 text-sky-600 focus:ring-sky-500 shrink-0"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.count}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      </div>
                    </label>
                  ))}
                </div>

                {/* Operational Visual Indicators & Overlays */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                    OPERATIONAL RINGS &amp; OVERLAYS
                  </span>
                  {[
                    { key: 'offlineSiteRings' as const, label: 'Offline Site Pulsing Rings' },
                    { key: 'openWorkOrders' as const, label: 'Open Work Order Indicators' },
                    { key: 'overdueMaintenance' as const, label: 'Overdue Maintenance (>35d)' },
                    { key: 'clusterSites' as const, label: 'Cluster Dense Sites (Low Zoom)' },
                    { key: 'resolvedIncidents' as const, label: 'Resolved Historical Markers' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={layers[item.key]}
                          onChange={(e) =>
                            setLayers((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="rounded border-slate-400 text-sky-600 focus:ring-sky-500"
                        />
                        <span>{item.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* Tab 2: Multi-Attribute Map Filters */
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Synchronized GIS Filters
                  </span>
                  <button
                    type="button"
                    onClick={resetMapFilters}
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Region
                  </label>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Regions</option>
                    <option value="North Metro">North Metro</option>
                    <option value="Central">Central</option>
                    <option value="South Corridor">South Corridor</option>
                    <option value="Highland">Highland</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Operator / Carrier
                  </label>
                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Operators</option>
                    <option value="ApexTel Carrier Group">ApexTel Carrier Group</option>
                    <option value="National Shared Towers Co.">National Shared Towers Co.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Network Technology
                  </label>
                  <select
                    value={techFilter}
                    onChange={(e) => setTechFilter(e.target.value as 'ALL' | NetworkTechnology)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Technologies</option>
                    <option value="2G GSM">2G GSM</option>
                    <option value="3G UMTS">3G UMTS</option>
                    <option value="4G LTE">4G LTE</option>
                    <option value="5G NR">5G NR</option>
                    <option value="BSC/Core">BSC/Core</option>
                    <option value="Microwave TX">Microwave TX</option>
                    <option value="Fiber DWDM">Fiber DWDM</option>
                    <option value="DC Power/Gen">DC Power/Gen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Site Type
                  </label>
                  <select
                    value={siteTypeFilter}
                    onChange={(e) => setSiteTypeFilter(e.target.value as 'ALL' | SiteType)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Site Types</option>
                    <option value="Greenfield Tower">Greenfield Tower</option>
                    <option value="Rooftop">Rooftop</option>
                    <option value="Indoor IBS/DAS">Indoor IBS/DAS</option>
                    <option value="Core/BSC Hub">Core/BSC Hub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Site Operational Status
                  </label>
                  <select
                    value={siteStatusFilter}
                    onChange={(e) =>
                      setSiteStatusFilter(e.target.value as 'ALL' | SiteOperationalStatus)
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Operational Statuses</option>
                    <option value="Online">Online</option>
                    <option value="Degraded">Degraded</option>
                    <option value="Offline">Offline</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Incident Severity
                    </label>
                    <select
                      value={incidentSeverityFilter}
                      onChange={(e) =>
                        setIncidentSeverityFilter(e.target.value as 'ALL' | AlarmSeverity)
                      }
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="ALL">Any Severity</option>
                      <option value="Critical">Critical</option>
                      <option value="Major">Major</option>
                      <option value="Minor">Minor</option>
                      <option value="Warning">Warning</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Incident Status
                    </label>
                    <select
                      value={incidentStatusFilter}
                      onChange={(e) =>
                        setIncidentStatusFilter(e.target.value as 'ALL' | IncidentStatus)
                      }
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="ALL">Any Status</option>
                      <option value="New">New</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Monitoring">Monitoring</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Installed Equipment Category
                  </label>
                  <select
                    value={equipmentCategoryFilter}
                    onChange={(e) =>
                      setEquipmentCategoryFilter(e.target.value as 'ALL' | EquipmentCategory)
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Equipment Categories</option>
                    <option value="BSC / Core Node">BSC / Core Node</option>
                    <option value="BTS / eNodeB / gNodeB">BTS / eNodeB / gNodeB</option>
                    <option value="BBU (Baseband Unit)">BBU (Baseband Unit)</option>
                    <option value="RRU / RRH (Remote Radio)">RRU / RRH (Remote Radio)</option>
                    <option value="Antenna / Feeder / RET">Antenna / Feeder / RET</option>
                    <option value="Microwave IDU/ODU">Microwave IDU/ODU</option>
                    <option value="Fiber OLT / DWDM Mux">Fiber OLT / DWDM Mux</option>
                    <option value="Rectifier & DC Power">Rectifier &amp; DC Power</option>
                    <option value="Diesel Generator / ATS">Diesel Generator / ATS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Maintenance &amp; Dispatch State
                  </label>
                  <select
                    value={maintenanceStatusFilter}
                    onChange={(e) =>
                      setMaintenanceStatusFilter(
                        e.target.value as 'ALL' | 'OVERDUE' | 'ACTIVE_WO' | 'SCHEDULED_VISIT'
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ALL">All Maintenance States</option>
                    <option value="OVERDUE">Overdue Preventive Maintenance (&gt;35d)</option>
                    <option value="ACTIVE_WO">Active Work Order Dispatched</option>
                    <option value="SCHEDULED_VISIT">Scheduled / On-Site Field Visit</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Work Case &amp; Intervention Filters</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Work Case Work Type / Category
                    </label>
                    <select
                      value={workTypeFilter}
                      onChange={(e) => setWorkTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="ALL">All Work Types</option>
                      <option value="Radio Access Network">Radio Access Network &amp; Towers</option>
                      <option value="Fiber Optics">Fiber Optics &amp; Fixed Access</option>
                      <option value="Transmission">Transmission &amp; Networking</option>
                      <option value="Electrical">Electrical &amp; Power Systems</option>
                      <option value="Preventive">Preventive Maintenance</option>
                      <option value="Corrective">Corrective Maintenance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Case Status
                      </label>
                      <select
                        value={caseStatusFilter}
                        onChange={(e) => setCaseStatusFilter(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <option value="ALL">Any Status</option>
                        <option value="in_progress">In Progress</option>
                        <option value="planned">Planned</option>
                        <option value="completed">Completed</option>
                        <option value="verified">Verified</option>
                        <option value="closed">Closed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Case Priority
                      </label>
                      <select
                        value={casePriorityFilter}
                        onChange={(e) => setCasePriorityFilter(e.target.value)}
                        className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <option value="ALL">Any Priority</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
                  Visible Sites: {filteredSitesWithMeta.length} / {store.sites.length} · Visible
                  GIS Features: {visibleGisFeatures.length} / {store.gisFeatures.length}
                </div>
              </div>
            )}
            <div
              onMouseDown={() => setIsResizingLeft(true)}
              className="hidden md:block absolute -right-1 top-0 bottom-0 w-2 hover:bg-sky-500/60 cursor-col-resize transition-colors z-30"
              title="Drag to resize GIS layers panel"
            />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setLeftPanelOpen(true)}
            className="absolute top-3 left-3 z-20 px-3 py-2 rounded-lg bg-slate-900/90 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-lg cursor-pointer"
            title="Expand Layers & Filters Panel"
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Layers &amp; Filters ({filteredSitesWithMeta.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Central Map Viewport */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Real-World Searched Place Card with Save as Site */}
          {selectedSearchedPlace && (
            <div className="absolute top-16 left-4 z-30 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 text-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-5 h-5 text-sky-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate block">
                      {selectedSearchedPlace.displayName.split(',')[0]}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {t('gis.searchResult', 'Searched Location')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (searchPinMarkerRef.current) {
                      searchPinMarkerRef.current.remove();
                      searchPinMarkerRef.current = null;
                    }
                    setSelectedSearchedPlace(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  title={t('gis.clearSearch', 'Clear Pin')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed max-h-20 overflow-y-auto">
                {selectedSearchedPlace.displayName}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] flex items-center justify-between">
                <span className="tabular-nums text-slate-700 dark:text-slate-300">
                  {selectedSearchedPlace.latitude.toFixed(5)}°N,{' '}
                  {selectedSearchedPlace.longitude.toFixed(5)}°E
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${selectedSearchedPlace.latitude.toFixed(6)}, ${selectedSearchedPlace.longitude.toFixed(6)}`
                    );
                    showToast(t('common.coordsCopied', 'Coordinates copied to clipboard!'), 'info');
                  }}
                  className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-sans font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('common.copyCoords', 'Copy')}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    openCreateSiteModal(undefined, {
                      latitude: selectedSearchedPlace.latitude,
                      longitude: selectedSearchedPlace.longitude,
                      siteName: selectedSearchedPlace.displayName.split(',')[0],
                      address: selectedSearchedPlace.displayName,
                      siteType: 'Greenfield Tower',
                      region: 'North Metro',
                    });
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('gis.saveAsSite', 'Save as Site')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    flyToCoordinates(
                      selectedSearchedPlace.longitude,
                      selectedSearchedPlace.latitude,
                      15
                    );
                  }}
                  className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                  title="Zoom In"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Submenu when "+ Site / Asset" is active */}
          {activeTool === 'add-site' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900/95 border border-sky-500/70 shadow-2xl text-xs max-w-[95%]">
              <span className="text-[11px] font-bold text-sky-400 pl-1">
                {t('gis.assetType', 'Asset Type')}:
              </span>
              {(
                [
                  { type: 'Greenfield Tower', label: 'General Tower' },
                  { type: 'BTS', label: 'BTS' },
                  { type: 'BSC', label: 'BSC Hub' },
                  { type: 'Mobile Tower', label: 'Mobile Tower' },
                  { type: 'Rooftop Site', label: 'Rooftop' },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setPendingAssetType(item.type as SiteType);
                    showToast(
                      `Selected ${item.label}. Click anywhere on the map to set coordinates.`,
                      'info'
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    (pendingAssetType || 'Greenfield Tower') === item.type
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('select');
                  setPendingAssetType(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Cancel Asset Placement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Site Relocation Banner */}
          {isRelocatingSite && selectedSite && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
              <div className="p-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center justify-between gap-3 border border-amber-400">
                <div className="flex items-center gap-2 min-w-0">
                  <LocateFixed className="w-4 h-4 shrink-0 animate-bounce" />
                  <span className="truncate">
                    Click anywhere on the map to set new coordinates for <strong>{selectedSite.siteCode}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRelocatingSite(false)}
                  className="px-2.5 py-1 rounded bg-slate-950 text-white text-[11px] font-semibold hover:bg-slate-900 cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Floating Map Engineering Tools Toolbar (Top Center) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl max-w-[94%]">
            {(
              [
                {
                  id: 'select',
                  label: 'Select',
                  icon: MousePointer,
                  allowed: true,
                },
                {
                  id: 'add-site',
                  label: '+ Site',
                  icon: RadioTower,
                  allowed: can('site:create'),
                },
                {
                  id: 'add-bts',
                  label: '+ BTS',
                  icon: RadioTower,
                  allowed: can('site:create'),
                },
                {
                  id: 'add-bsc',
                  label: '+ BSC',
                  icon: RadioTower,
                  allowed: can('site:create'),
                },
                {
                  id: 'draw-point',
                  label: '+ Point',
                  icon: MapPin,
                  allowed: can('gis:create'),
                },
                {
                  id: 'draw-line',
                  label: '+ Line / Fiber',
                  icon: Waypoints,
                  allowed: can('gis:create'),
                },
                {
                  id: 'draw-polygon',
                  label: '+ Polygon',
                  icon: Pentagon,
                  allowed: can('gis:create'),
                },
                {
                  id: 'edit-geometry',
                  label: 'Edit Geom',
                  icon: Edit3,
                  allowed: can('gis:edit') && Boolean(selectedGisFeature),
                },
                {
                  id: 'measure-distance',
                  label: 'Straight Dist',
                  icon: Navigation,
                  allowed: true,
                },
                {
                  id: 'measure-route',
                  label: 'Route Length',
                  icon: Ruler,
                  allowed: true,
                },
                {
                  id: 'measure-area',
                  label: 'Area',
                  icon: Maximize2,
                  allowed: true,
                },
              ] as const
            ).map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={!tool.allowed}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setSketchCoordinates([]);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-35 ${
                    isActive
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tool.label}</span>
                </button>
              );
            })}

            {(sketchCoordinates.length > 0 || focusedGisEntity) && (
              <button
                type="button"
                onClick={() => {
                  setSketchCoordinates([]);
                  setActiveTool('select');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer whitespace-nowrap"
                title="Clear temporary sketch and measurements"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Active Drawing / Measurement Banner */}
          {(activeTool !== 'select' || measurementSummary) && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4">
              <div className="p-3 rounded-xl bg-slate-900/95 border border-sky-500/60 shadow-2xl text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sky-400">
                    {activeTool === 'add-site' &&
                      'ADD SITE MARKER: Click any map location to register a new Telecom Site'}
                    {activeTool === 'draw-point' &&
                      'DRAW POINT: Click map location to place Manhole, FDT, Splitter, or Cabinet'}
                    {activeTool === 'draw-line' &&
                      `DRAW FIBER / MW LINE: Click map vertices (${sketchCoordinates.length} plotted)`}
                    {activeTool === 'draw-polygon' &&
                      `DRAW COMPOUND POLYGON: Click perimeter vertices (${sketchCoordinates.length} plotted)`}
                    {activeTool === 'edit-geometry' &&
                      `EDIT GEOMETRY (${selectedGisFeature?.id || 'Select Feature'}): Click new vertex coordinates on map`}
                    {activeTool === 'measure-distance' &&
                      'MEASURE STRAIGHT-LINE DISTANCE: Click 2 points on map'}
                    {activeTool === 'measure-route' &&
                      `MEASURE ROUTE LENGTH: Click points along path (${sketchCoordinates.length} plotted)`}
                    {activeTool === 'measure-area' &&
                      `MEASURE POLYGON AREA: Click 3+ vertices (${sketchCoordinates.length} plotted)`}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(activeTool === 'draw-line' ||
                      activeTool === 'draw-polygon' ||
                      activeTool === 'edit-geometry') && (
                      <button
                        type="button"
                        onClick={handleFinishSketchFeature}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                      >
                        Finish &amp; Save
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSketchCoordinates([]);
                        setActiveTool('select');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {measurementSummary && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {measurementSummary.title}:
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {measurementSummary.primaryValue}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-300 mt-0.5">
                      {measurementSummary.secondaryValue}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      <strong>Engineering Note:</strong> {measurementSummary.disclaimer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Provider Error / Retry Banner */}
          {mapProviderError && (
            <div className="absolute top-20 right-4 z-20 max-w-md p-3.5 rounded-xl bg-red-950/95 border border-red-700 text-xs text-red-100 shadow-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Map Provider Configuration / Tile Notice</p>
                    <p className="mt-0.5 text-red-200">{mapProviderError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapProviderError(null)}
                  className="text-red-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectBasemapStyle('dark')}
                  className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-semibold cursor-pointer"
                >
                  Use Default Dark Basemap
                </button>
                <button
                  type="button"
                  onClick={() => setShowProviderConfigModal(true)}
                  className="px-2.5 py-1 rounded border border-red-600 text-red-100 hover:bg-red-900 cursor-pointer"
                >
                  Configure Tile Provider
                </button>
              </div>
            </div>
          )}

          {/* Zoom, Compass / Orientation & Fit Network Controls (Right Floating) */}
          <div className="absolute bottom-28 right-3 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700 p-1.5 rounded-xl shadow-lg">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.resetNorthPitch()}
              className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer"
              title={`Reset North Orientation (Current Bearing: ${bearing}°)`}
              aria-label="Reset North Orientation"
            >
              <Compass className="w-4 h-4 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                mapRef.current?.flyTo({
                  center: [-118.328, 34.025],
                  zoom: 9.6,
                  bearing: 0,
                  pitch: 0,
                });
              }}
              className="p-2 rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer"
              title="Reset Network Footprint Extent"
              aria-label="Reset Network Extent"
            >
              <LocateFixed className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Map Legend & Live Cursor Coordinates Bar (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 z-20 max-w-sm bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl text-xs overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] font-bold text-white">
                TELECOM GIS LEGEND &amp; SYMBOLOGY
              </span>
              <button
                type="button"
                onClick={() => setLegendExpanded((prev) => !prev)}
                className="text-[11px] text-sky-400 hover:underline cursor-pointer"
              >
                {legendExpanded ? 'Minimize' : 'Expand'}
              </button>
            </div>

            {legendExpanded && (
              <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white inline-block shrink-0" />
                  <span>Operational Site</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-white inline-block shrink-0" />
                  <span>Critical Alarm Site</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 border border-white inline-block shrink-0" />
                  <span>Major Alarm / Degraded</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-500 inline-block shrink-0" />
                  <span>Offline Site Outage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 border border-white inline-block shrink-0" />
                  <span>Under Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-500 border border-white inline-block shrink-0" />
                  <span>Planned / No Telemetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-sky-400 inline-block shrink-0" />
                  <span>Fiber-Optic Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-emerald-400 border-b border-dashed inline-block shrink-0" />
                  <span>Microwave Link</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-indigo-400 inline-block shrink-0" />
                  <span>Underground Duct</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shrink-0" />
                  <span>FDT / Splitter / MH</span>
                </div>
              </div>
            )}

            <div className="px-3.5 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 font-mono text-[10px] text-slate-400 tabular-nums">
              <span>
                WGS84: {cursorCoords.lat.toFixed(5)}°N, {cursorCoords.lng.toFixed(5)}°E
              </span>
              <span>Zoom: {zoomLevel}</span>
            </div>
          </div>
        </div>

        {/* Right Selected-Feature Details Inspector Panel */}
        {rightInspectorOpen && (selectedSite || selectedGisFeature) && (
          <aside
            style={{ width: `${rightInspectorWidth}px` }}
            className="fixed md:static inset-x-0 bottom-0 md:inset-auto md:max-w-[90vw] max-h-[75vh] md:max-h-none rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col z-30 md:z-10 shrink-0 relative"
          >
            <div
              onMouseDown={() => setIsResizingRight(true)}
              className="hidden md:block absolute -left-1 top-0 bottom-0 w-2 hover:bg-sky-500/60 cursor-col-resize transition-colors z-30"
              title="Drag to resize GIS inspector panel"
            />
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 min-w-0">
                <Crosshair className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedSite
                    ? `Site Inspector: ${selectedSite.siteCode}`
                    : `GIS Feature: ${selectedGisFeature?.id}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSite) {
                      flyToCoordinates(selectedSite.longitude, selectedSite.latitude, 14.5);
                    } else if (selectedGisFeature) {
                      const c = getGeometryCenterCoordinates(selectedGisFeature.geometry);
                      if (c) flyToCoordinates(c[0], c[1], 14);
                    }
                  }}
                  className="p-1.5 rounded text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom to Selected Feature"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRightInspectorOpen(false)}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  title="Collapse Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedSite && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                      {selectedSite.siteCode} ({selectedSite.id})
                    </span>
                    <SiteStatusIndicator status={selectedSite.operationalStatus} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {selectedSite.siteName}
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    {selectedSite.operator} · {selectedSite.siteType}
                  </p>
                </div>

                {/* Coordinates & Copy Action */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      Geographic Coordinates (WGS84)
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {selectedSite.latitude.toFixed(5)}° N, {selectedSite.longitude.toFixed(5)}° E
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCoordinates(selectedSite.latitude, selectedSite.longitude)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>

                {/* Primary Actions on Selected Site (Section 4) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateCaseModal({ siteId: selectedSite.id })}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>+ Work Case</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Directions</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => openSiteById(selectedSite.id)}
                    className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Record</span>
                  </button>

                  {can('site:edit') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRelocatingSite((prev) => !prev);
                        if (!isRelocatingSite) {
                          showToast(
                            `Click anywhere on the map to relocate ${selectedSite.siteCode}`,
                            'info'
                          );
                        }
                      }}
                      className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                        isRelocatingSite
                          ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                          : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Reposition site location by clicking on the map"
                    >
                      <LocateFixed className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isRelocatingSite ? 'Cancel Relocate' : 'Relocate on Map'}</span>
                    </button>
                  )}

                  {can('site:edit') && (
                    <button
                      type="button"
                      onClick={() => openCreateSiteModal(selectedSite)}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('gis.editSite', 'Edit Site')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSiteToArchive(selectedSite)}
                    className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    title={t('gis.archiveSite', 'Archive Site')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('gis.archiveSite', 'Archive')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('site-visits')}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Site Visits</span>
                  </button>
                </div>

                {/* Key Site Attributes */}
                <div className="space-y-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Region &amp; Address</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedSite.region} · {selectedSite.district} — {selectedSite.address}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Technologies</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedSite.technologies.join(' · ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Last Maintenance</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {selectedSite.lastMaintenanceDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Assigned Team</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {store.teams.find((t) => t.id === selectedSite.assignedTeamId)?.code ||
                          'Unassigned'}
                      </span>
                    </div>
                  </div>
                  {selectedSite.accessInstructions && (
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">
                        Site Access Instructions
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {can('site:view_sensitive_access')
                          ? selectedSite.accessInstructions
                          : '[Restricted Access Instructions Masked for Read-Only Auditor Role]'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active Incidents at this Site */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Site Incidents (
                      {store.incidents.filter((i) => i.siteId === selectedSite.id).length})
                    </span>
                    {can('incident:create') && (
                      <button
                        type="button"
                        onClick={() => openCreateIncidentModal(selectedSite.id)}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                      >
                        + Log Alarm
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {store.incidents.filter((i) => i.siteId === selectedSite.id).map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => openIncidentById(inc.id)}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {inc.id}
                          </span>
                          <SeverityIndicator severity={inc.severity} />
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 font-medium truncate mt-0.5">
                          {inc.alarmName}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <IncidentStatusIndicator status={inc.status} />
                          <span className="font-mono text-[10px] text-slate-500">
                            Inspect in Alarm Center →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linked Work Cases at this Site */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Work Cases &amp; Interventions (
                      {(store.workCases || []).filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateCaseModal({ siteId: selectedSite.id })}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      + New Case
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(store.workCases || []).filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode).length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        No work cases recorded for this site yet.
                      </p>
                    ) : (
                      (store.workCases || [])
                        .filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode)
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              openCaseById(c.id);
                              navigateTo('cases');
                            }}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {c.caseNumber}
                              </span>
                              <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                                {c.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-semibold truncate mt-0.5">
                              {c.title}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>{(c.workTypeCategory || c.category || '').replace('_', ' ')}</span>
                              <span>{c.scheduledDate}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedGisFeature && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                      {selectedGisFeature.id}
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedGisFeature.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {selectedGisFeature.name}
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    {selectedGisFeature.featureType} · {selectedGisFeature.geometry.type}
                  </p>
                </div>

                {/* Turf.js Computed Geospatial Metric for LineString or Polygon */}
                {selectedGisFeature.geometry.type === 'LineString' && (
                  <div className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                    <span className="text-[11px] text-sky-700 dark:text-sky-300 block">
                      Computed Geodesic Route Span (Turf.js)
                    </span>
                    <span className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
                      {calculatePolylineLength(
                        selectedGisFeature.geometry.coordinates as [number, number][]
                      ).kilometers.toFixed(3)}{' '}
                      km
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Planimetric route length (excludes vertical slack &amp; splice coil loops)
                    </span>
                  </div>
                )}

                {selectedGisFeature.geometry.type === 'Polygon' && (
                  <div className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                    <span className="text-[11px] text-sky-700 dark:text-sky-300 block">
                      Computed Footprint Area (Turf.js)
                    </span>
                    <span className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
                      {calculatePolygonMetrics(
                        selectedGisFeature.geometry.coordinates[0] as [number, number][]
                      ).areaSqKilometers.toFixed(4)}{' '}
                      km²
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-slate-700 dark:text-slate-300">
                    {selectedGisFeature.description}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Region</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedGisFeature.region}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Operator</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedGisFeature.operator}
                      </span>
                    </div>
                  </div>

                  {Object.entries(selectedGisFeature.properties).length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-500 block">
                        Technical Properties
                      </span>
                      {Object.entries(selectedGisFeature.properties).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-900 dark:text-slate-200 font-semibold">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-mono">
                    <div>Created by: {selectedGisFeature.createdBy}</div>
                    <div>Updated by: {selectedGisFeature.updatedBy}</div>
                  </div>
                </div>

                {/* Linked Site / Incident Deep Links */}
                {(selectedGisFeature.linkedSiteId || selectedGisFeature.linkedIncidentId) && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Linked Operations Records
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedGisFeature.linkedSiteId && (
                        <button
                          type="button"
                          onClick={() =>
                            setFocusedGisEntity({
                              kind: 'site',
                              id: selectedGisFeature.linkedSiteId!,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-mono font-semibold cursor-pointer"
                        >
                          Site: {selectedGisFeature.linkedSiteId}
                        </button>
                      )}
                      {selectedGisFeature.linkedIncidentId && (
                        <button
                          type="button"
                          onClick={() => openIncidentById(selectedGisFeature.linkedIncidentId!)}
                          className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-semibold cursor-pointer"
                        >
                          Incident: {selectedGisFeature.linkedIncidentId}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit / Delete / Export Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {can('gis:edit') && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGisFeature(selectedGisFeature);
                        setDraftGeometryForModal(null);
                        setIsGisFeatureModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Attributes / JSON</span>
                    </button>
                  )}

                  {can('gis:delete') && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFeature(selectedGisFeature)}
                      className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      title="Delete GIS Feature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Collapsed Inspector Restore Pill */}
        {!rightInspectorOpen && (selectedSite || selectedGisFeature) && (
          <button
            type="button"
            onClick={() => setRightInspectorOpen(true)}
            className="absolute bottom-20 right-4 z-20 px-3 py-2 rounded-xl bg-slate-900/95 text-white border border-slate-700 shadow-xl text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-slate-800"
          >
            <Crosshair className="w-4 h-4 text-sky-400" />
            <span>Inspector: {selectedSite ? selectedSite.siteCode : selectedGisFeature?.id}</span>
          </button>
        )}
      </div>

      {/* Create / Edit GIS Feature Modal */}
      <GisFeatureModal
        isOpen={isGisFeatureModalOpen}
        onClose={() => {
          setIsGisFeatureModalOpen(false);
          setEditingGisFeature(null);
          setDraftGeometryForModal(null);
        }}
        editingFeature={editingGisFeature}
        draftGeometry={draftGeometryForModal}
        onSaved={(savedFeature) => {
          setFocusedGisEntity({ kind: 'gis-feature', id: savedFeature.id });
        }}
      />

      {/* GeoJSON Import / Export Modal */}
      <GeoJsonImportExportModal
        isOpen={geoJsonModalState.isOpen}
        initialTab={geoJsonModalState.tab}
        onClose={() => setGeoJsonModalState((prev) => ({ ...prev, isOpen: false }))}
        selectedEntity={focusedGisEntity}
      />

      {/* Delete GIS Feature Confirmation Modal */}
      {confirmDeleteFeature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete GIS Feature &ldquo;{confirmDeleteFeature.name}&rdquo;?
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  This permanently removes feature{' '}
                  <span className="font-mono">{confirmDeleteFeature.id}</span> (
                  {confirmDeleteFeature.featureType}) from the GIS layer datastore and records an
                  audit event.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteFeature(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteGisFeature(confirmDeleteFeature.id);
                  setConfirmDeleteFeature(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Site Archival Confirmation Modal */}
      {siteToArchive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Safe Site Archival Confirmation
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {siteToArchive.siteCode} · {siteToArchive.siteName}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Linked Assets &amp; Operational Records Preserved:
              </span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>
                  • {(store.workCases || []).filter((c) => c.siteId === siteToArchive.id || c.siteCode === siteToArchive.siteCode).length} Work Cases &amp; Interventions
                </li>
                <li>
                  • {store.equipment.filter((e) => e.siteId === siteToArchive.id).length} Equipment Inventory Units
                </li>
                <li>
                  • {store.incidents.filter((i) => i.siteId === siteToArchive.id).length} Incident Records &amp; Alarms
                </li>
                <li>
                  • {store.siteVisits.filter((v) => v.siteId === siteToArchive.id).length} Field Inspection Visits
                </li>
              </ul>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Archiving deactivates this site from active monitoring maps and live dispatching while safely preserving all historical timelines, telemetry, photos, and compliance audit logs.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSiteToArchive(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  archiveSite(siteToArchive.id);
                  setSiteToArchive(null);
                  setFocusedGisEntity(null);
                  showToast(
                    `Site ${siteToArchive.siteCode} archived successfully. Records preserved.`,
                    'success'
                  );
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Archive Site</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Provider & Tile Configuration / Attribution Modal */}
      {showProviderConfigModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  GIS Basemap Provider, Attribution &amp; Production Tile Configuration
                </h3>
                <p className="text-slate-500">
                  MapLibre GL JS is separated from the tile/style provider via{' '}
                  <code className="font-mono">mapProviderService.ts</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProviderConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Select Active Basemap Style:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BASEMAP_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectBasemapStyle(opt.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer ${
                      basemapStyle === opt.id
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  Server-Side GIS Map API Key Active
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                  Authenticated via <code className="font-mono">/api/gis/*</code> backend proxy (
                  <code className="font-mono">GIS_MAP_API_KEY</code> stored in server environment; no credentials exposed in client bundle).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSelectBasemapStyle('satellite');
                  setShowProviderConfigModal(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0 cursor-pointer"
              >
                Use Satellite
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-900 dark:text-white">
                Attribution, Rate Limits &amp; Production Tile Policy:
              </p>
              <p>{currentBasemapOption.usagePolicyNote}</p>
              <p>
                <strong>Required Attribution:</strong> OpenStreetMap contributors (ODbL) &amp;
                CARTO. Public OSM standard tile servers are strictly rate-limited and must not be
                used for heavy production workloads without a dedicated commercial or self-hosted
                tile service.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowProviderConfigModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
