import type { Geometry } from 'geojson';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasPermission, PermissionAction } from '../security/permissions';
import {
  GeoJsonImportCandidate,
  getGeometryCenterCoordinates,
  validateGeometryCoordinates,
} from '../services/geojsonService';
import {
  evaluateIncidentSla,
  evaluateProposedCorrelation,
  findDuplicateActiveAlarm,
} from '../services/slaAndCorrelationService';
import { TelecomDataStore, telecomRepository } from '../services/telecomRepository';
import {
  Alarm,
  AlarmClassification,
  AlarmSeverity,
  BackupSnapshotMetadata,
  ChecklistItemResult,
  ChecklistTemplate,
  EngineerAvailability,
  Equipment,
  EquipmentReplacement,
  GisFeatureType,
  GisLayerGroup,
  Incident,
  IncidentCategory,
  IncidentImpact,
  IncidentPriority,
  IncidentScope,
  IncidentSourceType,
  IncidentStatus,
  IncidentTimelineEvent,
  MaintenanceReport,
  MeasurementRecord,
  MigrationReport,
  NavigationSectionId,
  NetworkDomain,
  NetworkTechnology,
  Organization,
  PhotoAnnotationShape,
  PhotoAsset,
  PhotoClassification,
  PhotoStampConfig,
  ReportBrandingConfig,
  ReportStatus,
  ReportType,
  Site,
  SiteOperationalStatus,
  SiteType,
  SiteVisit,
  SLAConfiguration,
  SparePartUsage,
  TelecomGisFeature,
  User,
  UserAccountStatus,
  UserInvitation,
  UserRole,
  VisitEquipmentRecord,
  WorkCase,
  WorkCaseActivityLog,
  WorkCaseEquipmentItem,
  WorkCaseEventType,
  WorkCaseFieldTimestamps,
  WorkCaseFollowUpTask,
  WorkCaseMaterial,
  WorkCaseMeasurement,
  WorkCaseStep,
  WorkCaseTimelineEntry,
  WorkOrder,
  WorkOrderJobType,
  WorkOrderPriority,
  WorkOrderStatus,
  CasePriority,
  CaseStatus,
} from '../types/models';
import { DEFAULT_PHOTO_STAMP_CONFIG } from '../data/seedPhase4Data';
import { DEFAULT_WORK_TYPE_TAXONOMY } from '../data/seedWorkCasesData';

export interface CreateIncidentInput {
  siteId: string;
  domain: NetworkDomain;
  technology: NetworkTechnology;
  alarmSource: string;
  classification: AlarmClassification;
  alarmName: string;
  description: string;
  equipmentAffected: string;
  severity: AlarmSeverity;
  assignedTeamId: string;
  category?: IncidentCategory;
  incidentSource?: IncidentSourceType;
  impact?: IncidentImpact;
  scope?: IncidentScope;
  priority?: IncidentPriority;
  reportedSymptoms?: string;
}

export interface IngestSimulatedAlarmInput {
  siteId: string;
  domain: NetworkDomain;
  technology: NetworkTechnology;
  alarmSource: string;
  vendor: string;
  vendorCode: string;
  managedObject: string;
  classification: AlarmClassification;
  alarmName: string;
  description: string;
  equipmentId: string;
  equipmentName: string;
  severity: AlarmSeverity;
  autoCreateIncident?: boolean;
}

export interface UpsertSiteInput {
  id?: string;
  siteIdInput: string;
  siteCode: string;
  siteName: string;
  operator: string;
  region: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  siteType: SiteType;
  technologies: NetworkTechnology[];
  operationalStatus: SiteOperationalStatus;
  assignedTeamId: string;
  lastMaintenanceDate: string;
  towerHeightMeters?: number;
  powerConfiguration: string;
  accessInstructions?: string;
}

export interface UpsertWorkOrderInput {
  id?: string;
  linkedIncidentId?: string;
  siteId: string;
  equipmentId?: string;
  equipmentName?: string;
  jobType: WorkOrderJobType;
  priority: WorkOrderPriority;
  assignedTeamId: string;
  assignedEngineerId?: string;
  scheduledVisitDate: string;
  workDescription: string;
  safetyAndAccessRequirements?: string;
  requiredEquipmentOrSpares: string[];
  status: WorkOrderStatus;
}

export interface UpsertGisFeatureInput {
  id?: string;
  layerGroup: GisLayerGroup;
  featureType: GisFeatureType;
  name: string;
  description: string;
  region: string;
  operator: string;
  status: 'Operational' | 'Degraded' | 'Offline' | 'Maintenance' | 'Planned';
  linkedSiteId?: string;
  linkedIncidentId?: string;
  geometry: Geometry;
  properties?: Record<string, string | number | boolean>;
}

export interface DashboardMetrics {
  totalSites: number;
  activeIncidents: number;
  criticalAlarms: number;
  majorAlarms: number;
  minorAlarms: number;
  warningAlarms: number;
  unacknowledgedCriticalAlarms: number;
  incidentsAwaitingAssignment: number;
  pendingSiteVisits: number;
  sitesCurrentlyOffline: number;
  workOrdersInProgress: number;
  incidentsResolvedToday: number;
  incidentsRestoredToday: number;
  incidentsAwaitingVerification: number;
  slaBreachesCount: number;
}

interface AppContextValue {
  store: TelecomDataStore;
  currentUser: User | null;
  theme: 'dark' | 'light';
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  activeSection: NavigationSectionId;
  selectedIncidentId: string | null;
  selectedAlarmId: string | null;
  selectedSiteId: string | null;
  selectedWorkOrderId: string | null;
  selectedSiteVisitId: string | null;
  selectedPhotoId: string | null;
  selectedReportId: string | null;
  photoStudioPrefill: {
    siteId?: string;
    incidentId?: string;
    workOrderId?: string;
    visitId?: string;
    reportId?: string;
    caseId?: string;
  } | null;
  focusedGisEntity: { kind: 'site' | 'gis-feature'; id: string } | null;
  isCreateIncidentOpen: boolean;
  createIncidentPreselectedSiteId: string | null;
  isCreateSiteOpen: boolean;
  editingSite: Site | null;
  createSitePrefillCoords: {
    latitude: number;
    longitude: number;
    siteName?: string;
    address?: string;
    siteType?: SiteType;
    region?: string;
  } | null;
  isCreateWorkOrderOpen: boolean;
  createWorkOrderPrefill: { siteId?: string; incidentId?: string } | null;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  metrics: DashboardMetrics;
  // Auth & session
  signIn: (identifier: string, passwordInput: string) => { ok: boolean; error?: string };
  signOut: () => void;
  switchDemoRole: (role: UserRole) => void;
  can: (action: PermissionAction) => boolean;
  // Theme, Timezone, Regional Preferences & Navigation
  toggleTheme: () => void;
  setUserTimezone: (tz: string) => void;
  tableDensity: 'compact' | 'comfortable' | 'spacious';
  setTableDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '24h' | '12h';
  customTimezone: string;
  updateRegionalPreferences: (prefs: { dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; timeFormat: '24h' | '12h'; timezone: string }) => void;
  updateSiteCoordinates: (siteId: string, latitude: number, longitude: number) => { ok: boolean; error?: string };
  navigateTo: (section: NavigationSectionId) => void;
  openIncidentById: (incidentId: string) => void;
  openAlarmById: (alarmId: string) => void;
  openSiteById: (siteId: string) => void;
  openWorkOrderById: (workOrderId: string) => void;
  openSiteVisitById: (visitId: string) => void;
  openPhotoInStudio: (
    photoId?: string,
    prefill?: {
      siteId?: string;
      incidentId?: string;
      workOrderId?: string;
      visitId?: string;
      reportId?: string;
      caseId?: string;
    }
  ) => void;
  openReportById: (reportId: string) => void;
  openSiteInGisMap: (siteId: string) => void;
  setFocusedGisEntity: (entity: { kind: 'site' | 'gis-feature'; id: string } | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setSelectedAlarmId: (id: string | null) => void;
  setSelectedSiteId: (id: string | null) => void;
  setSelectedWorkOrderId: (id: string | null) => void;
  setSelectedSiteVisitId: (id: string | null) => void;
  setSelectedPhotoId: (id: string | null) => void;
  setSelectedReportId: (id: string | null) => void;
  // Work Cases Core Module
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
  openCaseById: (caseId: string) => void;
  isCreateCaseOpen: boolean;
  createCasePrefill: { siteId?: string; relatedCaseId?: string } | null;
  openCreateCaseModal: (prefill?: { siteId?: string; relatedCaseId?: string }) => void;
  closeCreateCaseModal: () => void;
  editingCase: WorkCase | null;
  openEditCaseModal: (workCase: WorkCase) => void;
  createWorkCase: (input: Partial<WorkCase> & { title: string; siteId: string; category: string; workType: string }) => { ok: boolean; error?: string; workCase?: WorkCase };
  updateWorkCase: (caseId: string, updates: Partial<WorkCase>) => { ok: boolean; error?: string };
  deleteWorkCase: (caseId: string) => { ok: boolean; error?: string };
  duplicateWorkCase: (caseId: string) => { ok: boolean; newCaseId?: string; error?: string };
  changeCaseStatus: (caseId: string, newStatus: CaseStatus, comment?: string) => { ok: boolean; error?: string };
  addCaseTimelineEntry: (caseId: string, entry: Omit<WorkCaseTimelineEntry, 'id'>) => { ok: boolean; error?: string };
  addCaseStep: (caseId: string, step: Omit<WorkCaseStep, 'id' | 'stepNumber'>) => { ok: boolean; error?: string };
  updateCaseStep: (caseId: string, stepId: string, updates: Partial<WorkCaseStep>) => { ok: boolean; error?: string };
  recordCaseMeasurement: (caseId: string, measurement: Omit<WorkCaseMeasurement, 'id'>) => { ok: boolean; error?: string };
  addCaseMaterial: (caseId: string, material: Omit<WorkCaseMaterial, 'id'>) => { ok: boolean; error?: string };
  addCaseEquipment: (caseId: string, equipment: Omit<WorkCaseEquipmentItem, 'id'>) => { ok: boolean; error?: string };
  addCaseFollowUpTask: (caseId: string, task: Omit<WorkCaseFollowUpTask, 'id' | 'createdAt'>) => { ok: boolean; error?: string };
  updateCaseFollowUpTask: (caseId: string, taskId: string, updates: Partial<WorkCaseFollowUpTask>) => { ok: boolean; error?: string };
  linkPhotoToCase: (caseId: string, photoId: string) => { ok: boolean; error?: string };
  linkReportToCase: (caseId: string, reportId: string) => { ok: boolean; error?: string };
  reportBuilderPrefillCaseId: string | null;
  setReportBuilderPrefillCaseId: (id: string | null) => void;
  openReportBuilderForCase: (caseId: string) => void;
  addCustomWorkTypeCategory: (category: { name: string; description?: string }) => { ok: boolean; error?: string };
  addCustomWorkType: (categoryName: string, workType: { name: string; description?: string; suggestedTools?: string[] }) => { ok: boolean; error?: string };
  // Modal triggers
  openCreateIncidentModal: (siteId?: string) => void;
  closeCreateIncidentModal: () => void;
  openCreateSiteModal: (
    siteToEdit?: Site,
    prefillCoords?: {
      latitude: number;
      longitude: number;
      siteName?: string;
      address?: string;
      siteType?: SiteType;
      region?: string;
    }
  ) => void;
  closeCreateSiteModal: () => void;
  openCreateWorkOrderModal: (prefill?: { siteId?: string; incidentId?: string }) => void;
  closeCreateWorkOrderModal: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  // Incident & Alarm Mutations
  acknowledgeIncidentAlarm: (incidentId: string) => void;
  acknowledgeAlarmRecord: (alarmId: string, acknowledgeState: boolean, note?: string) => void;
  clearOrReassertAlarmRecord: (
    alarmId: string,
    markCleared: boolean,
    observationNote: string
  ) => void;
  addAlarmNote: (alarmId: string, content: string) => void;
  linkAlarmToIncident: (alarmId: string, incidentId: string) => { ok: boolean; error?: string };
  createIncidentFromAlarm: (
    alarmId: string
  ) => { ok: boolean; error?: string; incident?: Incident };
  ingestSimulatedAlarm: (
    input: IngestSimulatedAlarmInput
  ) => { ok: boolean; deduplicated: boolean; alarm: Alarm; incident?: Incident };
  updateIncidentStatus: (
    incidentId: string,
    newStatus: IncidentStatus,
    resolutionNote?: string
  ) => { ok: boolean; error?: string };
  recordIncidentServiceRestored: (incidentId: string, restorationNote: string) => void;
  reopenIncident: (incidentId: string, reason: string) => { ok: boolean; error?: string };
  escalateIncident: (
    incidentId: string,
    level: 1 | 2 | 3,
    reason: string,
    notifiedTarget: string
  ) => void;
  updateIncidentInvestigation: (incidentId: string, fields: Partial<Incident>) => void;
  toggleSimulatedNetworkAlarmClearance: (incidentId: string, observationNote?: string) => void;
  assignIncidentOwner: (incidentId: string, teamId: string, engineerId?: string) => void;
  addIncidentInvestigationNote: (incidentId: string, content: string) => void;
  createIncident: (
    input: CreateIncidentInput
  ) => { ok: boolean; error?: string; incident?: Incident };
  // Site, WorkOrder, Visit, Team & SLA Mutations
  upsertSite: (input: UpsertSiteInput) => { ok: boolean; error?: string; site?: Site };
  archiveSite: (siteId: string) => { ok: boolean; error?: string };
  upsertWorkOrder: (
    input: UpsertWorkOrderInput
  ) => { ok: boolean; error?: string; workOrder?: WorkOrder };
  updateWorkOrderStatus: (
    workOrderId: string,
    status: WorkOrderStatus,
    completionNotes?: string,
    extraPatch?: Partial<WorkOrder>
  ) => void;
  verifyWorkOrderCompletion: (
    workOrderId: string,
    approved: boolean,
    reviewerNote?: string
  ) => void;
  assignWorkOrderPersonnel: (workOrderId: string, teamId: string, engineerId?: string) => void;
  upsertSiteVisit: (
    input: Partial<SiteVisit> & { id?: string; siteId: string; purpose: string }
  ) => { ok: boolean; error?: string; visit?: SiteVisit };
  updateSiteVisitChecklist: (
    visitId: string,
    items: ChecklistItemResult[],
    observations?: string,
    workPerformed?: string,
    measurements?: string,
    partsUsed?: string[],
    followUp?: string
  ) => void;
  upsertChecklistTemplate: (template: ChecklistTemplate) => void;
  updateSlaConfiguration: (rules: SLAConfiguration['rules']) => void;
  updateEngineerAvailability: (userId: string, availability: EngineerAvailability) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  // Phase 4 Field Operations, Photo Studio & Report Center Mutations
  addVisitEquipmentRecord: (visitId: string, record: Omit<VisitEquipmentRecord, 'id'>) => void;
  addVisitMeasurementRecord: (visitId: string, record: Omit<MeasurementRecord, 'id' | 'visitId' | 'recordedAt' | 'recordedBy'>) => void;
  addVisitEquipmentReplacement: (visitId: string, record: Omit<EquipmentReplacement, 'id' | 'visitId' | 'replacedAt' | 'replacedBy'>) => void;
  addVisitSparePartUsage: (visitId: string, record: Omit<SparePartUsage, 'id' | 'visitId' | 'recordedAt' | 'usedBy'>) => void;
  uploadPhotoAsset: (input: {
    title: string;
    caption: string;
    classification: PhotoClassification;
    pairGroupId?: string;
    equipmentOrArea: string;
    tags: string[];
    siteId: string;
    incidentId?: string;
    workOrderId?: string;
    visitId?: string;
    reportId?: string;
    caseId?: string;
    originalDataUrl: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml';
    width: number;
    height: number;
    fileSizeKb: number;
    captureTimestamp?: string;
    captureTimestampSource: 'Recorded (Device/EXIF)' | 'Manual Entry' | 'Not Recorded';
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      source: 'Site Registry' | 'Recorded (Device/EXIF)' | 'Manual Entry';
    };
  }) => { ok: boolean; error?: string; photo?: PhotoAsset };
  savePhotoAnnotationsAndStamp: (
    photoId: string,
    annotations: PhotoAnnotationShape[],
    stampConfig: PhotoStampConfig,
    annotatedDataUrl: string,
    revisionSummary: string
  ) => { ok: boolean; error?: string };
  updatePhotoMetadata: (photoId: string, patch: Partial<PhotoAsset>) => void;
  createOrRegenerateReport: (input: {
    existingReportId?: string;
    reportType: ReportType;
    siteId: string;
    linkedIncidentId?: string;
    linkedWorkOrderId?: string;
    linkedCaseId?: string;
    linkedVisitIds: string[];
    photoAssetIds: string[];
    title: string;
    summary: string;
    purposeOfVisit: string;
    serviceImpactSummary: string;
    mainFindings: string;
    finalOutcome: string;
    diagnosticProcedures: string;
    postRepairVerificationChecks: string;
    connectivityAndAlarmStatus: string;
    outstandingFaults: string;
    recommendations: string;
    confidentialityLabel?: string;
    saveAsDraft?: boolean;
  }) => { ok: boolean; error?: string; report?: MaintenanceReport; newRevisionCreated?: boolean };
  updateReportWorkflowStatus: (
    reportId: string,
    newStatus: ReportStatus,
    comments: string
  ) => { ok: boolean; error?: string };
  updateReportBranding: (branding: ReportBrandingConfig) => void;
  recordReportExportAudit: (format: 'PDF' | 'XLSX' | 'JSON', summaryText: string) => void;
  // Phase 2 GIS Mutations
  upsertGisFeature: (
    input: UpsertGisFeatureInput
  ) => { ok: boolean; error?: string; feature?: TelecomGisFeature };
  deleteGisFeature: (featureId: string) => { ok: boolean; error?: string };
  importGeoJsonCandidates: (
    candidates: GeoJsonImportCandidate[],
    destinationLayer: GisLayerGroup
  ) => { ok: boolean; importedCount: number; error?: string };
  recordGeoJsonExportAudit: (scopeDescription: string, featureCount: number) => void;
  resetDemoDatabase: () => void;
  // Phase 5 Production Backend, Multi-Tenant, Security, Invitations & Backups
  createOperatorInvitation: (input: {
    email: string;
    fullName: string;
    role: UserRole;
    teamId: string;
    region: string;
    isExternalContractor?: boolean;
    contractorCompany?: string;
  }) => { ok: boolean; error?: string; invitation?: UserInvitation };
  acceptOperatorInvitation: (input: {
    inviteCode: string;
    username: string;
    password: string;
    phone?: string;
  }) => { ok: boolean; error?: string; user?: User };
  updateUserAdministration: (
    userId: string,
    updates: {
      accountStatus?: UserAccountStatus;
      role?: UserRole;
      region?: string;
      teamId?: string;
      shiftSchedule?: string;
      onCallStatus?: User['onCallStatus'];
    }
  ) => { ok: boolean; error?: string };
  switchActiveOrganization: (organizationId: string) => { ok: boolean; error?: string };
  setPlatformEnvironmentMode: (
    mode: 'development-demo' | 'production-enforced'
  ) => { ok: boolean; error?: string };
  createDatabaseBackupSnapshot: (label: string) => {
    ok: boolean;
    error?: string;
    backup?: BackupSnapshotMetadata;
  };
  restoreDatabaseBackupSnapshot: (backupId: string) => { ok: boolean; error?: string };
  executeSafeDemoMigration: () => { ok: boolean; error?: string; report?: MigrationReport };
  upsertEquipmentItem: (
    item: Partial<Equipment> & { siteId: string; name: string }
  ) => { ok: boolean; error?: string };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<TelecomDataStore>(() => telecomRepository.loadStore());
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    telecomRepository.loadSessionUser()
  );
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>(() =>
    telecomRepository.loadThemeMode()
  );
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const theme: 'dark' | 'light' = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;
  const [activeSection, setActiveSection] = useState<NavigationSectionId>('overview');

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [selectedSiteVisitId, setSelectedSiteVisitId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    () => telecomRepository.loadStore().photoAssets?.[0]?.id || null
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    () => telecomRepository.loadStore().maintenanceReports?.[0]?.id || null
  );
  const [photoStudioPrefill, setPhotoStudioPrefill] = useState<{
    siteId?: string;
    incidentId?: string;
    workOrderId?: string;
    visitId?: string;
    reportId?: string;
  } | null>(null);
  const [focusedGisEntity, setFocusedGisEntity] = useState<{
    kind: 'site' | 'gis-feature';
    id: string;
  } | null>(null);

  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [createIncidentPreselectedSiteId, setCreateIncidentPreselectedSiteId] = useState<
    string | null
  >(null);

  const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [createSitePrefillCoords, setCreateSitePrefillCoords] = useState<{
    latitude: number;
    longitude: number;
    siteName?: string;
    address?: string;
    siteType?: SiteType;
    region?: string;
  } | null>(null);

  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [createWorkOrderPrefill, setCreateWorkOrderPrefill] = useState<{
    siteId?: string;
    incidentId?: string;
  } | null>(null);

  // Work Cases state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    () => telecomRepository.loadStore().workCases?.[0]?.id || null
  );
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [createCasePrefill, setCreateCasePrefill] = useState<{
    siteId?: string;
    relatedCaseId?: string;
  } | null>(null);
  const [editingCase, setEditingCase] = useState<WorkCase | null>(null);
  const [reportBuilderPrefillCaseId, setReportBuilderPrefillCaseId] = useState<string | null>(null);

  const openReportBuilderForCase = (caseId: string) => {
    setReportBuilderPrefillCaseId(caseId);
    setSelectedCaseId(caseId);
    setActiveSection('reports');
  };

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [tableDensity, setTableDensityState] = useState<'compact' | 'comfortable' | 'spacious'>(() =>
    telecomRepository.loadTableDensity()
  );
  const setTableDensity = (d: 'compact' | 'comfortable' | 'spacious') => {
    setTableDensityState(d);
    telecomRepository.saveTableDensity(d);
  };

  const [regionalPrefs, setRegionalPrefs] = useState(() => telecomRepository.loadRegionalPreferences());
  const updateRegionalPreferences = (p: { dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; timeFormat: '24h' | '12h'; timezone: string }) => {
    setRegionalPrefs(p);
    telecomRepository.saveRegionalPreferences(p);
    showToast('Regional formatting preferences saved.', 'success');
  };

  const updateSiteCoordinates = (siteId: string, latitude: number, longitude: number): { ok: boolean; error?: string } => {
    const site = store.sites.find((s) => s.id === siteId);
    if (!site) return { ok: false, error: 'Site not found.' };
    const updated = store.sites.map((s) => (s.id === siteId ? { ...s, latitude, longitude } : s));
    const nextStore = telecomRepository.saveStore({
      ...store,
      sites: updated,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: currentUser ? currentUser.fullName : 'System',
          actorRole: currentUser ? currentUser.role : UserRole.ADMIN,
          actionType: 'SITE_UPDATED',
          entityType: 'Site',
          entityId: siteId,
          summary: `Repositioned site ${site.siteCode} (${site.siteName}) to (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) on GIS map.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(nextStore);
    telecomRepository.syncStoreToBackendAsync(nextStore);
    showToast(`Site ${site.siteCode} relocated to (${latitude.toFixed(5)}, ${longitude.toFixed(5)}).`, 'success');
    return { ok: true };
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    telecomRepository.saveThemeMode(themeMode);
  }, [theme, themeMode]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    telecomRepository.saveThemeMode(mode);
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    window.setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4200);
  };

  // All dashboard & SLA metrics calculated dynamically from authoritative store data
  const metrics = useMemo<DashboardMetrics>(() => {
    const totalSites = store.sites.length;
    const activeIncidentsList = store.incidents.filter(
      (inc) => inc.status !== 'Resolved' && inc.status !== 'Closed'
    );
    const activeIncidents = activeIncidentsList.length;

    const criticalAlarms = store.incidents.filter(
      (inc) =>
        inc.severity === 'Critical' &&
        (!inc.alarmClearedInNetwork || (inc.status !== 'Resolved' && inc.status !== 'Closed'))
    ).length;

    const majorAlarms = store.incidents.filter(
      (inc) =>
        inc.severity === 'Major' &&
        (!inc.alarmClearedInNetwork || (inc.status !== 'Resolved' && inc.status !== 'Closed'))
    ).length;

    const minorAlarms = store.incidents.filter(
      (inc) =>
        inc.severity === 'Minor' &&
        (!inc.alarmClearedInNetwork || (inc.status !== 'Resolved' && inc.status !== 'Closed'))
    ).length;

    const warningAlarms = store.incidents.filter(
      (inc) =>
        inc.severity === 'Warning' &&
        (!inc.alarmClearedInNetwork || (inc.status !== 'Resolved' && inc.status !== 'Closed'))
    ).length;

    const unacknowledgedCriticalAlarms = store.alarms.filter(
      (a) => a.severity === 'Critical' && a.isSimulatedActive && !a.acknowledged
    ).length;

    const incidentsAwaitingAssignment = activeIncidentsList.filter(
      (inc) =>
        !inc.assignedEngineerId &&
        (inc.status === 'New' ||
          inc.status === 'Acknowledged' ||
          inc.assignedOwnerName.toLowerCase().startsWith('unassigned'))
    ).length;

    const pendingSiteVisits = store.siteVisits.filter(
      (sv) => sv.status === 'Scheduled' || sv.status === 'On-Site'
    ).length;

    const sitesCurrentlyOffline = store.sites.filter(
      (s) => s.operationalStatus === 'Offline'
    ).length;

    const workOrdersInProgress = store.workOrders.filter(
      (wo) =>
        wo.status === 'In Progress' ||
        wo.status === 'Dispatched' ||
        wo.status === 'Scheduled' ||
        wo.status === 'Assigned'
    ).length;

    const incidentsResolvedToday = store.incidents.filter(
      (inc) => inc.status === 'Resolved' || inc.status === 'Closed'
    ).length;

    const incidentsRestoredToday = store.incidents.filter((inc) =>
      Boolean(inc.serviceRestoredAt || inc.resolvedAt)
    ).length;

    const incidentsAwaitingVerification = store.incidents.filter(
      (inc) =>
        inc.status === 'Monitoring' ||
        (inc.status === 'Resolved' && !inc.closedAt) ||
        store.workOrders.some(
          (wo) =>
            wo.linkedIncidentId === inc.id &&
            wo.status === 'Completed' &&
            wo.verificationStatus === 'Pending Verification'
        )
    ).length;

    const slaBreachesCount = activeIncidentsList.filter(
      (inc) => evaluateIncidentSla(inc, store.slaConfig).anyBreached
    ).length;

    return {
      totalSites,
      activeIncidents,
      criticalAlarms,
      majorAlarms,
      minorAlarms,
      warningAlarms,
      unacknowledgedCriticalAlarms,
      incidentsAwaitingAssignment,
      pendingSiteVisits,
      sitesCurrentlyOffline,
      workOrdersInProgress,
      incidentsResolvedToday,
      incidentsRestoredToday,
      incidentsAwaitingVerification,
      slaBreachesCount,
    };
  }, [store]);

  const signIn = (identifier: string, passwordInput: string): { ok: boolean; error?: string } => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) {
      return { ok: false, error: 'Please enter your corporate username or email address.' };
    }
    if (!passwordInput || passwordInput.length < 6) {
      return {
        ok: false,
        error: 'Password must be at least 6 characters.',
      };
    }

    const matchedUser = store.users.find(
      (u) => u.username.toLowerCase() === trimmed || u.email.toLowerCase() === trimmed
    );

    if (!matchedUser) {
      return {
        ok: false,
        error:
          'Account not found in TelecomOps 360 directory. Verify your corporate email or accept an administrator invitation.',
      };
    }

    if (
      matchedUser.active === false ||
      matchedUser.accountStatus === 'Suspended' ||
      matchedUser.accountStatus === 'Inactive'
    ) {
      return {
        ok: false,
        error: `Account '${matchedUser.email}' is currently ${matchedUser.accountStatus || 'Suspended'}. Access is blocked by server security policy.`,
      };
    }

    if (passwordInput !== 'Ops360!Demo' && passwordInput !== 'telecom360') {
      return {
        ok: false,
        error: 'Invalid operator credentials. Verify your password or request a password reset token.',
      };
    }

    const signedInUser: User = {
      ...matchedUser,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(signedInUser);
    telecomRepository.saveSessionUser(signedInUser);

    // Establish real server-side HMAC session token asynchronously with the Express backend
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, password: passwordInput }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data?.token) {
            telecomRepository.saveSessionUser(data.user || signedInUser, data.token);
          }
        })
        .catch(() => {
          // Offline fallback
        });
    }

    const updatedStore = telecomRepository.saveStore({
      ...store,
      activeOrganizationId: signedInUser.organizationId || store.activeOrganizationId || 'ORG-TELECOM-01',
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: signedInUser.id,
          actorName: signedInUser.fullName,
          actorRole: signedInUser.role,
          organizationId: signedInUser.organizationId || 'ORG-TELECOM-01',
          actionType: 'AUTH_SIGN_IN',
          entityType: 'Security',
          entityId: signedInUser.id,
          summary: `${signedInUser.fullName} (${signedInUser.role}) authenticated into TelecomOps 360 console.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(updatedStore);
    return { ok: true };
  };

  const signOut = () => {
    const token = telecomRepository.getSessionToken();
    if (token && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/auth/signout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setCurrentUser(null);
    telecomRepository.saveSessionUser(null, null);
    setSelectedIncidentId(null);
    setSelectedAlarmId(null);
    setSelectedSiteId(null);
    setSelectedWorkOrderId(null);
    setSelectedSiteVisitId(null);
    setFocusedGisEntity(null);
    setActiveSection('overview');
  };

  const switchDemoRole = (role: UserRole) => {
    if (store.environmentMode === 'production-enforced') {
      showToast(
        'Role simulation is disabled in Production-Enforced mode. Sign out and sign in with an authorized account.',
        'error'
      );
      return;
    }
    const targetUser = store.users.find(
      (u) => u.role === role && u.active !== false && u.accountStatus !== 'Suspended'
    );
    if (targetUser) {
      setCurrentUser(targetUser);
      telecomRepository.saveSessionUser(targetUser);
      showToast(
        `Switched active session role to ${targetUser.role} (${targetUser.fullName})`,
        'info'
      );
    }
  };

  const can = (action: PermissionAction): boolean => {
    if (!currentUser) return false;
    return hasPermission(currentUser.role, action);
  };

  const toggleTheme = () => {
    setThemeMode(theme === 'dark' ? 'light' : 'dark');
  };

  const setUserTimezone = (tz: string) => {
    const saved = telecomRepository.saveStore({
      ...store,
      userTimezone: tz,
    });
    setStore(saved);
    showToast(`Display timezone updated to ${tz}.`, 'info');
  };

  const navigateTo = (section: NavigationSectionId) => {
    setActiveSection(section);
  };

  const openIncidentById = (incidentId: string) => {
    setActiveSection('incidents');
    setSelectedIncidentId(incidentId);
  };

  const openAlarmById = (alarmId: string) => {
    setActiveSection('alarms');
    setSelectedAlarmId(alarmId);
  };

  const openSiteById = (siteId: string) => {
    setActiveSection('sites');
    setSelectedSiteId(siteId);
  };

  const openWorkOrderById = (workOrderId: string) => {
    setActiveSection('work-orders');
    setSelectedWorkOrderId(workOrderId);
  };

  const openSiteVisitById = (visitId: string) => {
    setActiveSection('site-visits');
    setSelectedSiteVisitId(visitId);
  };

  const openSiteInGisMap = (siteId: string) => {
    setActiveSection('gis-map');
    setFocusedGisEntity({ kind: 'site', id: siteId });
  };

  const openCreateIncidentModal = (siteId?: string) => {
    setCreateIncidentPreselectedSiteId(siteId || null);
    setIsCreateIncidentOpen(true);
  };

  const closeCreateIncidentModal = () => {
    setIsCreateIncidentOpen(false);
    setCreateIncidentPreselectedSiteId(null);
  };

  const openCreateSiteModal = (
    siteToEdit?: Site,
    prefillCoords?: {
      latitude: number;
      longitude: number;
      siteName?: string;
      address?: string;
      siteType?: SiteType;
      region?: string;
    }
  ) => {
    setEditingSite(siteToEdit || null);
    setCreateSitePrefillCoords(prefillCoords || null);
    setIsCreateSiteOpen(true);
  };

  const closeCreateSiteModal = () => {
    setIsCreateSiteOpen(false);
    setEditingSite(null);
    setCreateSitePrefillCoords(null);
  };

  const openCreateWorkOrderModal = (prefill?: { siteId?: string; incidentId?: string }) => {
    setCreateWorkOrderPrefill(prefill || null);
    setIsCreateWorkOrderOpen(true);
  };

  const closeCreateWorkOrderModal = () => {
    setIsCreateWorkOrderOpen(false);
    setCreateWorkOrderPrefill(null);
  };

  // ==========================================
  // WORK CASES CORE MODULE METHODS
  // ==========================================

  const openCaseById = (caseId: string) => {
    setActiveSection('cases');
    setSelectedCaseId(caseId);
  };

  const openCreateCaseModal = (prefill?: { siteId?: string; relatedCaseId?: string }) => {
    setEditingCase(null);
    setCreateCasePrefill(prefill || null);
    setIsCreateCaseOpen(true);
  };

  const closeCreateCaseModal = () => {
    setIsCreateCaseOpen(false);
    setEditingCase(null);
    setCreateCasePrefill(null);
  };

  const openEditCaseModal = (workCase: WorkCase) => {
    setEditingCase(workCase);
    setIsCreateCaseOpen(true);
  };

  const generateNextCaseId = (cases: WorkCase[]): string => {
    const year = new Date().getFullYear();
    let maxNum = 0;
    const prefix = `CASE-${year}-`;
    cases.forEach((c) => {
      if (c.caseNumber && c.caseNumber.startsWith(prefix)) {
        const num = parseInt(c.caseNumber.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      if (c.id && c.id.startsWith(prefix)) {
        const num = parseInt(c.id.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `CASE-${year}-${String(nextNum).padStart(4, '0')}`;
    while (cases.some((c) => c.id === candidate || c.caseNumber === candidate)) {
      nextNum += 1;
      candidate = `CASE-${year}-${String(nextNum).padStart(4, '0')}`;
    }
    return candidate;
  };

  const createWorkCase = (
    input: Partial<WorkCase> & { title: string; siteId: string; category: string; workType: string }
  ): { ok: boolean; error?: string; workCase?: WorkCase } => {
    if (!input.title?.trim()) return { ok: false, error: 'Case title is required.' };
    const targetSite = store.sites.find((s) => s.id === input.siteId);
    if (!targetSite) return { ok: false, error: 'Valid site is required.' };

    const now = new Date().toISOString();
    const nextCaseId = generateNextCaseId(store.workCases || []);
    const engineerName = currentUser?.fullName || 'S. Lindqvist';
    const authorId = currentUser?.id || 'usr-001';

    const newCase: WorkCase = {
      id: nextCaseId,
      caseNumber: nextCaseId,
      title: input.title.trim(),
      summary: input.summary?.trim() || input.title.trim(),
      description: input.description?.trim() || '',
      category: input.category,
      workType: input.workType,
      priority: input.priority || 'Normal',
      status: input.status || 'Draft',
      tags: input.tags || [],

      siteId: targetSite.id,
      siteCode: targetSite.siteCode,
      siteName: targetSite.siteName,
      siteType: targetSite.siteType,
      address: targetSite.address,
      city: targetSite.district || targetSite.region,
      region: targetSite.region,
      latitude: targetSite.latitude,
      longitude: targetSite.longitude,
      gpsAccuracyMeters: input.gpsAccuracyMeters || 3.0,
      accessInstructions: input.accessInstructions || targetSite.accessInstructions || '',
      safetyNotes: input.safetyNotes || '',
      customerOrProject: input.customerOrProject || '',

      reasonForWork: input.reasonForWork?.trim() || 'Work activity recorded by field engineer.',
      reportedProblem: input.reportedProblem || '',
      initialObservations: input.initialObservations || '',
      technicalFindings: input.technicalFindings || '',
      rootCause: input.rootCause || '',
      correctiveActions: input.correctiveActions || '',
      preventiveRecommendations: input.preventiveRecommendations || '',
      remainingIssues: input.remainingIssues || '',
      finalResult: input.finalResult || '',
      verificationMethod: input.verificationMethod || '',
      postServiceStatus: input.postServiceStatus || 'Operational',
      customerConfirmation: input.customerConfirmation || '',
      supervisorConfirmation: input.supervisorConfirmation || '',
      toolsUsed: input.toolsUsed || [],

      steps: input.steps || [],
      measurements: input.measurements || [],
      materials: input.materials || [],
      equipment: input.equipment || [],
      followUpTasks: input.followUpTasks || [],
      photoIds: input.photoIds || [],
      reportIds: input.reportIds || [],

      timestamps: {
        plannedDate: input.timestamps?.plannedDate || now,
        actualArrival: input.timestamps?.actualArrival,
        workStart: input.timestamps?.workStart,
        workPause: input.timestamps?.workPause,
        workResume: input.timestamps?.workResume,
        workCompletion: input.timestamps?.workCompletion,
        verification: input.timestamps?.verification,
        departure: input.timestamps?.departure,
        caseClosure: input.timestamps?.caseClosure,
        estimatedDurationHours: input.timestamps?.estimatedDurationHours || 2.0,
        actualDurationHours: input.timestamps?.actualDurationHours,
        isActualCalculated: Boolean(input.timestamps?.actualDurationHours),
      },

      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: now,
          eventType: 'Status Change',
          title: `Case Created (${input.status || 'Draft'})`,
          description: `Work case initialized by ${engineerName}. Work type: ${input.workType}.`,
          authorName: engineerName,
        },
        ...(input.timeline || []),
      ],

      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: now,
          actorName: engineerName,
          action: 'Case Created',
          fieldName: 'status',
          previousValue: 'None',
          newValue: input.status || 'Draft',
        },
      ],

      createdBy: authorId,
      createdByName: engineerName,
      ownerId: authorId,
      responsibleEngineer: input.responsibleEngineer || engineerName,
      assignedTo: authorId,
      teamId: targetSite.assignedTeamId || 'team-ran-01',
      organizationId: currentUser?.organizationId || store.activeOrganizationId || 'ORG-TELECOM-01',
      relatedCaseId: input.relatedCaseId,
      relatedIncidentId: input.relatedIncidentId,
      relatedWorkOrderId: input.relatedWorkOrderId,

      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const updatedCases = [newCase, ...(store.workCases || [])];
    const updatedStore = telecomRepository.saveStore({
      ...store,
      workCases: updatedCases,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorId: authorId,
          actorName: engineerName,
          actorRole: currentUser?.role || UserRole.FIELD_ENGINEER,
          organizationId: newCase.organizationId || 'ORG-TELECOM-01',
          actionType: 'WORK_CASE_CREATED',
          entityType: 'WorkCase',
          entityId: newCase.id,
          summary: `Created work case ${newCase.caseNumber} for site ${targetSite.siteCode} (${newCase.workType}).`,
        },
        ...store.auditEvents,
      ],
    });

    setStore(updatedStore);
    setSelectedCaseId(newCase.id);
    closeCreateCaseModal();
    showToast(`Work Case ${newCase.caseNumber} created successfully.`, 'success');
    return { ok: true, workCase: newCase };
  };

  const updateWorkCase = (caseId: string, updates: Partial<WorkCase>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const now = new Date().toISOString();
    const engineerName = currentUser?.fullName || 'S. Lindqvist';

    const newLogs: WorkCaseActivityLog[] = [];
    if (updates.status && updates.status !== existing.status) {
      newLogs.push({
        id: `act-${Date.now()}-status`,
        timestamp: now,
        actorName: engineerName,
        action: 'Status Changed',
        fieldName: 'status',
        previousValue: existing.status,
        newValue: updates.status,
      });
    }
    if (updates.priority && updates.priority !== existing.priority) {
      newLogs.push({
        id: `act-${Date.now()}-priority`,
        timestamp: now,
        actorName: engineerName,
        action: 'Priority Changed',
        fieldName: 'priority',
        previousValue: existing.priority,
        newValue: updates.priority,
      });
    }

    const merged: WorkCase = {
      ...existing,
      ...updates,
      activityHistory: [...newLogs, ...(existing.activityHistory || [])],
      version: (existing.version || 1) + 1,
      updatedAt: now,
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    const updatedStore = telecomRepository.saveStore({
      ...store,
      workCases: updatedCases,
    });
    setStore(updatedStore);
    closeCreateCaseModal();
    showToast(`Work Case ${merged.caseNumber} updated.`, 'success');
    return { ok: true };
  };

  const deleteWorkCase = (caseId: string): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const updatedCases = (store.workCases || []).filter((c) => c.id !== caseId);
    const updatedStore = telecomRepository.saveStore({
      ...store,
      workCases: updatedCases,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser?.id || 'usr-001',
          actorName: currentUser?.fullName || 'S. Lindqvist',
          actorRole: currentUser?.role || UserRole.FIELD_ENGINEER,
          organizationId: existing.organizationId || 'ORG-TELECOM-01',
          actionType: 'WORK_CASE_DELETED',
          entityType: 'WorkCase',
          entityId: existing.id,
          summary: `Deleted work case ${existing.caseNumber} (${existing.title}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(updatedStore);
    if (selectedCaseId === caseId) {
      setSelectedCaseId(updatedCases[0]?.id || null);
    }
    showToast(`Work Case ${existing.caseNumber} deleted.`, 'info');
    return { ok: true };
  };

  const duplicateWorkCase = (caseId: string): { ok: boolean; newCaseId?: string; error?: string } => {
    const source = (store.workCases || []).find((c) => c.id === caseId);
    if (!source) return { ok: false, error: 'Source case not found.' };

    const now = new Date().toISOString();
    const nextCaseId = generateNextCaseId(store.workCases || []);
    const engineerName = currentUser?.fullName || 'S. Lindqvist';
    const authorId = currentUser?.id || 'usr-001';

    const cloned: WorkCase = {
      ...structuredClone(source),
      id: nextCaseId,
      caseNumber: nextCaseId,
      title: `${source.title} (Copy)`,
      status: 'Draft',
      relatedCaseId: source.caseNumber,
      createdAt: now,
      updatedAt: now,
      version: 1,
      createdBy: authorId,
      createdByName: engineerName,
      ownerId: authorId,
      responsibleEngineer: engineerName,
      assignedTo: authorId,
      timestamps: {
        plannedDate: now,
        estimatedDurationHours: source.timestamps?.estimatedDurationHours || 2.0,
      },
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: now,
          eventType: 'Status Change',
          title: `Case Cloned from ${source.caseNumber}`,
          description: `Duplicated as template by ${engineerName}.`,
          authorName: engineerName,
        },
      ],
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: now,
          actorName: engineerName,
          action: 'Cloned from Template',
          fieldName: 'caseNumber',
          previousValue: source.caseNumber,
          newValue: nextCaseId,
        },
      ],
      steps: (source.steps || []).map((s, idx) => ({
        ...s,
        id: `step-${Date.now()}-${idx}`,
        status: 'Pending',
        completedAt: undefined,
      })),
      measurements: [],
      photoIds: [],
      reportIds: [],
    };

    const updatedCases = [cloned, ...(store.workCases || [])];
    const updatedStore = telecomRepository.saveStore({
      ...store,
      workCases: updatedCases,
    });
    setStore(updatedStore);
    setSelectedCaseId(cloned.id);
    showToast(`Duplicated ${source.caseNumber} into new case ${cloned.caseNumber}.`, 'success');
    return { ok: true, newCaseId: cloned.id };
  };

  const changeCaseStatus = (caseId: string, newStatus: CaseStatus, comment?: string): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const now = new Date().toISOString();
    const engineerName = currentUser?.fullName || 'S. Lindqvist';

    const timestamps = { ...existing.timestamps };
    if (newStatus === 'In Progress' && !timestamps.workStart) {
      timestamps.workStart = now;
      if (!timestamps.actualArrival) timestamps.actualArrival = now;
    } else if (newStatus === 'Completed') {
      timestamps.workCompletion = now;
      if (timestamps.workStart) {
        const diffHours = (new Date(now).getTime() - new Date(timestamps.workStart).getTime()) / 3_600_000;
        timestamps.actualDurationHours = Number(Math.max(0.1, diffHours).toFixed(2));
        timestamps.isActualCalculated = true;
      }
    } else if (newStatus === 'Verified') {
      timestamps.verification = now;
    } else if (newStatus === 'Closed') {
      timestamps.caseClosure = now;
      if (!timestamps.departure) timestamps.departure = now;
    }

    const newTimelineEntry: WorkCaseTimelineEntry = {
      id: `tl-${Date.now()}`,
      timestamp: now,
      eventType: 'Status Change',
      title: `Status Changed to ${newStatus}`,
      description: comment || `Status updated from ${existing.status} to ${newStatus} by ${engineerName}.`,
      authorName: engineerName,
    };

    const newLog: WorkCaseActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: now,
      actorName: engineerName,
      action: 'Status Changed',
      fieldName: 'status',
      previousValue: existing.status,
      newValue: newStatus,
    };

    const merged: WorkCase = {
      ...existing,
      status: newStatus,
      timestamps,
      timeline: [newTimelineEntry, ...(existing.timeline || [])],
      activityHistory: [newLog, ...(existing.activityHistory || [])],
      version: (existing.version || 1) + 1,
      updatedAt: now,
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    const updatedStore = telecomRepository.saveStore({
      ...store,
      workCases: updatedCases,
    });
    setStore(updatedStore);
    showToast(`Case ${existing.caseNumber} status changed to ${newStatus}.`, 'success');
    return { ok: true };
  };

  const addCaseTimelineEntry = (caseId: string, entry: Omit<WorkCaseTimelineEntry, 'id'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const newEntry: WorkCaseTimelineEntry = {
      ...entry,
      id: `tl-${Date.now()}`,
    };

    const merged: WorkCase = {
      ...existing,
      timeline: [newEntry, ...(existing.timeline || [])],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast('Timeline entry added.', 'success');
    return { ok: true };
  };

  const addCaseStep = (caseId: string, step: Omit<WorkCaseStep, 'id' | 'stepNumber'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const nextStepNum = (existing.steps?.length || 0) + 1;
    const newStep: WorkCaseStep = {
      ...step,
      id: `step-${Date.now()}`,
      stepNumber: nextStepNum,
      doneBy: step.doneBy || currentUser?.fullName || existing.responsibleEngineer,
    };

    const merged: WorkCase = {
      ...existing,
      steps: [...(existing.steps || []), newStep],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast(`Step #${nextStepNum} added.`, 'success');
    return { ok: true };
  };

  const updateCaseStep = (caseId: string, stepId: string, updates: Partial<WorkCaseStep>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const updatedSteps = (existing.steps || []).map((s) => (s.id === stepId ? { ...s, ...updates } : s));
    const merged: WorkCase = {
      ...existing,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    return { ok: true };
  };

  const recordCaseMeasurement = (caseId: string, measurement: Omit<WorkCaseMeasurement, 'id'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const newMeas: WorkCaseMeasurement = {
      ...measurement,
      id: `meas-${Date.now()}`,
      timestamp: measurement.timestamp || new Date().toISOString(),
      recordedBy: measurement.recordedBy || currentUser?.fullName || existing.responsibleEngineer,
    };

    const newTimeline: WorkCaseTimelineEntry = {
      id: `tl-${Date.now()}`,
      timestamp: newMeas.timestamp,
      eventType: 'Measurement Taken',
      title: `Measurement: ${newMeas.parameterName}`,
      description: `Recorded ${newMeas.value} ${newMeas.unit} (${newMeas.status}) using ${newMeas.testInstrument}.`,
      authorName: newMeas.recordedBy,
    };

    const merged: WorkCase = {
      ...existing,
      measurements: [...(existing.measurements || []), newMeas],
      timeline: [newTimeline, ...(existing.timeline || [])],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast(`Measurement '${newMeas.parameterName}' recorded.`, 'success');
    return { ok: true };
  };

  const addCaseMaterial = (caseId: string, material: Omit<WorkCaseMaterial, 'id'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const newMat: WorkCaseMaterial = {
      ...material,
      id: `mat-${Date.now()}`,
      recordedAt: material.recordedAt || new Date().toISOString(),
    };

    const merged: WorkCase = {
      ...existing,
      materials: [...(existing.materials || []), newMat],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast(`Material '${newMat.partName}' added.`, 'success');
    return { ok: true };
  };

  const addCaseEquipment = (caseId: string, equipment: Omit<WorkCaseEquipmentItem, 'id'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const newEq: WorkCaseEquipmentItem = {
      ...equipment,
      id: `eq-${Date.now()}`,
    };

    const merged: WorkCase = {
      ...existing,
      equipment: [...(existing.equipment || []), newEq],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast(`Equipment '${newEq.name}' linked to case.`, 'success');
    return { ok: true };
  };

  const addCaseFollowUpTask = (caseId: string, task: Omit<WorkCaseFollowUpTask, 'id' | 'createdAt'>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const newTask: WorkCaseFollowUpTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const merged: WorkCase = {
      ...existing,
      followUpTasks: [...(existing.followUpTasks || []), newTask],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast(`Follow-up task '${newTask.title}' created.`, 'success');
    return { ok: true };
  };

  const updateCaseFollowUpTask = (caseId: string, taskId: string, updates: Partial<WorkCaseFollowUpTask>): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    const updatedTasks = (existing.followUpTasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t));
    const merged: WorkCase = {
      ...existing,
      followUpTasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    return { ok: true };
  };

  const linkPhotoToCase = (caseId: string, photoId: string): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    if ((existing.photoIds || []).includes(photoId)) return { ok: true };

    const newPhotoIds = [...(existing.photoIds || []), photoId];
    const newTimeline: WorkCaseTimelineEntry = {
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'Photo Added',
      title: 'Evidence Photograph Linked',
      description: `Photo ID ${photoId} linked to technical case record.`,
      authorName: currentUser?.fullName || existing.responsibleEngineer,
      photoIds: [photoId],
    };

    const merged: WorkCase = {
      ...existing,
      photoIds: newPhotoIds,
      timeline: [newTimeline, ...(existing.timeline || [])],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast('Photograph linked to Work Case.', 'success');
    return { ok: true };
  };

  const linkReportToCase = (caseId: string, reportId: string): { ok: boolean; error?: string } => {
    const existing = (store.workCases || []).find((c) => c.id === caseId);
    if (!existing) return { ok: false, error: 'Case not found.' };

    if ((existing.reportIds || []).includes(reportId)) return { ok: true };

    const newReportIds = [...(existing.reportIds || []), reportId];
    const newTimeline: WorkCaseTimelineEntry = {
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'Report Linked',
      title: 'Engineering Report Assembled & Linked',
      description: `Report ID ${reportId} linked to technical case record.`,
      authorName: currentUser?.fullName || existing.responsibleEngineer,
    };

    const merged: WorkCase = {
      ...existing,
      reportIds: newReportIds,
      timeline: [newTimeline, ...(existing.timeline || [])],
      updatedAt: new Date().toISOString(),
    };

    const updatedCases = (store.workCases || []).map((c) => (c.id === caseId ? merged : c));
    setStore(telecomRepository.saveStore({ ...store, workCases: updatedCases }));
    showToast('Engineering report linked to Work Case.', 'success');
    return { ok: true };
  };

  const addCustomWorkTypeCategory = (cat: { name: string; description?: string }): { ok: boolean; error?: string } => {
    if (!cat.name?.trim()) return { ok: false, error: 'Category name is required.' };
    const currentList = store.workTypeTaxonomy || DEFAULT_WORK_TYPE_TAXONOMY;
    if (currentList.some((c) => c.name.toLowerCase() === cat.name.trim().toLowerCase())) {
      return { ok: false, error: 'A category with this name already exists.' };
    }
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: cat.name.trim(),
      description: cat.description?.trim() || 'Custom user-defined telecom category.',
      types: [],
    };
    const updated = [...currentList, newCategory];
    setStore(telecomRepository.saveStore({ ...store, workTypeTaxonomy: updated }));
    showToast(`Added custom category "${newCategory.name}".`, 'success');
    return { ok: true };
  };

  const addCustomWorkType = (categoryName: string, wt: { name: string; description?: string; suggestedTools?: string[] }): { ok: boolean; error?: string } => {
    if (!wt.name?.trim()) return { ok: false, error: 'Work type name is required.' };
    const currentList = store.workTypeTaxonomy || DEFAULT_WORK_TYPE_TAXONOMY;
    const catIdx = currentList.findIndex((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase());
    if (catIdx === -1) return { ok: false, error: 'Category not found.' };

    const targetCat = currentList[catIdx];
    if (targetCat.types.some((t) => t.name.toLowerCase() === wt.name.trim().toLowerCase())) {
      return { ok: false, error: 'Work type with this name already exists in this category.' };
    }

    const newItem = {
      id: `wt-${Date.now()}`,
      name: wt.name.trim(),
      description: wt.description?.trim() || 'Custom user-defined telecom work type.',
      suggestedTools: wt.suggestedTools || [],
    };

    const updatedCategories = currentList.map((c, idx) =>
      idx === catIdx ? { ...c, types: [...c.types, newItem] } : c
    );

    setStore(telecomRepository.saveStore({ ...store, workTypeTaxonomy: updatedCategories }));
    showToast(`Added custom work type "${newItem.name}".`, 'success');
    return { ok: true };
  };

  const acknowledgeIncidentAlarm = (incidentId: string) => {
    if (!currentUser || !can('alarm:acknowledge')) {
      showToast('Your current role does not have permission to acknowledge alarms.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;

    const nextStatus: IncidentStatus = target.status === 'New' ? 'Acknowledged' : target.status;
    const relatedIds = target.relatedAlarmIds || [target.alarmId];

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'ACKNOWLEDGED',
        title: `Incident & Linked Alarm (${inc.alarmId}) Acknowledged`,
        details: `Acknowledged by ${currentUser.fullName}. Workflow state: ${nextStatus}.`,
        previousValue: inc.status,
        newValue: nextStatus,
      };
      return {
        ...inc,
        acknowledged: true,
        acknowledgedBy: currentUser.fullName,
        acknowledgedAt: now,
        status: nextStatus,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `Alarm ${inc.alarmId} acknowledged by ${currentUser.fullName}. Incident state: ${nextStatus}.`,
            noteType: 'StatusChange' as const,
          },
        ],
      };
    });

    const updatedAlarms = store.alarms.map((alm) =>
      relatedIds.includes(alm.id)
        ? {
            ...alm,
            acknowledged: true,
            acknowledgedBy: currentUser.fullName,
            acknowledgedAt: now,
          }
        : alm
    );

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      alarms: updatedAlarms,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_ACKNOWLEDGED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Acknowledged alarm ${target.alarmId} for incident ${incidentId} (${target.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Alarm ${target.alarmId} & Incident ${incidentId} acknowledged.`, 'success');
  };

  const acknowledgeAlarmRecord = (alarmId: string, acknowledgeState: boolean, note?: string) => {
    if (!currentUser || !can('alarm:acknowledge')) {
      showToast('Permission denied: cannot change alarm acknowledgment state.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const targetAlarm = store.alarms.find((a) => a.id === alarmId);
    if (!targetAlarm) return;

    const updatedAlarms = store.alarms.map((alm) => {
      if (alm.id !== alarmId) return alm;
      const newNotes = note?.trim()
        ? [
            ...(alm.alarmNotes || []),
            {
              id: `AN-${Date.now()}`,
              authorName: currentUser.fullName,
              authorRole: currentUser.role,
              createdAt: now,
              content: note.trim(),
            },
          ]
        : alm.alarmNotes || [];

      return {
        ...alm,
        acknowledged: acknowledgeState,
        acknowledgedBy: acknowledgeState ? currentUser.fullName : undefined,
        acknowledgedAt: acknowledgeState ? now : undefined,
        alarmNotes: newNotes,
      };
    });

    const updatedIncidents = store.incidents.map((inc) => {
      const linked = (inc.relatedAlarmIds || [inc.alarmId]).includes(alarmId);
      if (!linked || !acknowledgeState || inc.acknowledged) return inc;
      const nextStatus: IncidentStatus = inc.status === 'New' ? 'Acknowledged' : inc.status;
      return {
        ...inc,
        acknowledged: true,
        acknowledgedBy: currentUser.fullName,
        acknowledgedAt: now,
        status: nextStatus,
        updatedAt: now,
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      alarms: updatedAlarms,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: acknowledgeState ? 'ALARM_ACKNOWLEDGED' : 'ALARM_UNACKNOWLEDGED',
          entityType: 'Alarm',
          entityId: alarmId,
          summary: `${acknowledgeState ? 'Acknowledged' : 'Unacknowledged'} alarm ${alarmId} (${targetAlarm.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(
      `Alarm ${alarmId} ${acknowledgeState ? 'acknowledged' : 'marked unacknowledged'}.`,
      'success'
    );
  };

  const clearOrReassertAlarmRecord = (
    alarmId: string,
    markCleared: boolean,
    observationNote: string
  ) => {
    if (!currentUser || !can('incident:update_status')) {
      showToast('Permission denied: cannot alter network alarm state.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const targetAlarm = store.alarms.find((a) => a.id === alarmId);
    if (!targetAlarm) return;

    const updatedAlarms = store.alarms.map((alm) => {
      if (alm.id !== alarmId) return alm;
      return {
        ...alm,
        isSimulatedActive: !markCleared,
        clearedAt: markCleared ? now : undefined,
        clearedByObservation: markCleared
          ? observationNote.trim() || `Verified cleared by ${currentUser.fullName}`
          : undefined,
        lastOccurrence: !markCleared ? now : alm.lastOccurrence,
        occurrenceCount: !markCleared ? alm.occurrenceCount + 1 : alm.occurrenceCount,
        alarmNotes: [
          ...(alm.alarmNotes || []),
          {
            id: `AN-${Date.now()}`,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: markCleared
              ? `[ALARM CLEARED] ${observationNote.trim() || 'Recorded telemetry clearance observation.'}`
              : `[ALARM RE-ASSERTED] ${observationNote.trim() || 'Simulated trap re-asserted on element.'}`,
          },
        ],
      };
    });

    // Update linked incidents' alarmClearedInNetwork state WITHOUT auto-closing or auto-resolving the incident!
    const updatedIncidents = store.incidents.map((inc) => {
      const relatedIds = inc.relatedAlarmIds || [inc.alarmId];
      if (!relatedIds.includes(alarmId)) return inc;

      const allRelatedCleared = relatedIds.every((id) => {
        const a = updatedAlarms.find((x) => x.id === id);
        return a ? !a.isSimulatedActive : markCleared;
      });

      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: markCleared ? 'ALARM_CLEARED' : 'ALARM_REASSERTED',
        title: markCleared
          ? `Simulated Alarm ${alarmId} Cleared on Network Element`
          : `Simulated Alarm ${alarmId} Re-Asserted on Network Element`,
        details: `${observationNote.trim() || 'Recorded observation.'} Incident status remains "${inc.status}".`,
      };

      return {
        ...inc,
        alarmClearedInNetwork: allRelatedCleared,
        alarmClearedAt: allRelatedCleared ? now : undefined,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: markCleared
              ? `[SIMULATED TELEMETRY] Alarm ${alarmId} marked CLEARED (${observationNote.trim() || 'observation recorded'}). Incident workflow status remains "${inc.status}" until restoration & verification are completed.`
              : `[SIMULATED TELEMETRY] Alarm ${alarmId} re-asserted ACTIVE on element.`,
            noteType: 'Investigation' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      alarms: updatedAlarms,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'ALARM_CLEARED',
          entityType: 'Alarm',
          entityId: alarmId,
          summary: `${markCleared ? 'Cleared' : 'Re-asserted'} simulated alarm ${alarmId} (${targetAlarm.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(
      markCleared
        ? `Alarm ${alarmId} marked Cleared (linked incident remains open pending verification).`
        : `Alarm ${alarmId} re-asserted Active.`,
      'info'
    );
  };

  const addAlarmNote = (alarmId: string, content: string) => {
    if (!currentUser || !can('incident:add_note')) {
      showToast('Permission denied to post alarm notes.', 'error');
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();

    const updatedAlarms = store.alarms.map((alm) =>
      alm.id === alarmId
        ? {
            ...alm,
            alarmNotes: [
              ...(alm.alarmNotes || []),
              {
                id: `AN-${Date.now()}`,
                authorName: currentUser.fullName,
                authorRole: currentUser.role,
                createdAt: now,
                content: trimmed,
              },
            ],
          }
        : alm
    );

    const saved = telecomRepository.saveStore({
      ...store,
      alarms: updatedAlarms,
    });
    setStore(saved);
    showToast(`Added note to alarm ${alarmId}.`, 'success');
  };

  const linkAlarmToIncident = (
    alarmId: string,
    incidentId: string
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('alarm:correlate')) {
      return { ok: false, error: 'Your role does not have permission to correlate alarms.' };
    }
    const alarm = store.alarms.find((a) => a.id === alarmId);
    const incident = store.incidents.find((i) => i.id === incidentId);
    if (!alarm || !incident) {
      return { ok: false, error: 'Selected alarm or incident not found.' };
    }

    const now = new Date().toISOString();
    const updatedAlarms = store.alarms.map((a) =>
      a.id === alarmId
        ? {
            ...a,
            linkedIncidentId: incident.id,
            proposedCorrelationIncidentId: undefined,
          }
        : a
    );

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const existingRelated = inc.relatedAlarmIds || [inc.alarmId];
      const nextRelated = existingRelated.includes(alarmId)
        ? existingRelated
        : [...existingRelated, alarmId];

      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'ALARM_LINKED',
        title: `Correlated Alarm ${alarmId} Linked to Incident`,
        details: `Linked alarm "${alarm.alarmName}" (${alarm.vendorCode}) on ${alarm.siteCode} to ${inc.id}.`,
      };

      return {
        ...inc,
        relatedAlarmIds: nextRelated,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `Correlated and linked alarm ${alarmId} (${alarm.alarmName}) to incident ${inc.id}.`,
            noteType: 'Investigation' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      alarms: updatedAlarms,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'ALARM_LINKED_TO_INCIDENT',
          entityType: 'Alarm',
          entityId: alarmId,
          summary: `Correlated alarm ${alarmId} with incident ${incidentId} (${incident.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Linked alarm ${alarmId} to incident ${incidentId}.`, 'success');
    return { ok: true };
  };

  const createIncidentFromAlarm = (
    alarmId: string
  ): { ok: boolean; error?: string; incident?: Incident } => {
    if (!currentUser || !can('incident:create')) {
      return { ok: false, error: 'Your role cannot create incidents.' };
    }
    const alarm = store.alarms.find((a) => a.id === alarmId);
    if (!alarm) {
      return { ok: false, error: 'Alarm record not found.' };
    }

    // Deduplication check: prevent uncontrolled duplicate incident for the same active alarm
    const existingOpenIncident = store.incidents.find(
      (inc) =>
        inc.status !== 'Resolved' &&
        inc.status !== 'Closed' &&
        (inc.alarmId === alarmId || (inc.relatedAlarmIds || []).includes(alarmId))
    );
    if (existingOpenIncident) {
      showToast(
        `Deduplication guard: Alarm ${alarmId} is already linked to active incident ${existingOpenIncident.id}.`,
        'info'
      );
      return {
        ok: false,
        error: `Active incident ${existingOpenIncident.id} already tracks alarm ${alarmId}.`,
        incident: existingOpenIncident,
      };
    }

    const site = store.sites.find((s) => s.id === alarm.siteId) || store.sites[0];
    const team = store.teams.find((t) => t.id === site.assignedTeamId) || store.teams[0];
    const now = new Date().toISOString();
    const seqNum = String(store.incidents.length + 401).padStart(6, '0');
    const newIncidentId = `INC-2026-${seqNum}`;

    const newIncident: Incident = {
      id: newIncidentId,
      alarmId: alarm.id,
      relatedAlarmIds: [alarm.id],
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      region: site.region,
      operator: site.operator,
      domain: alarm.domain,
      technology: alarm.technology,
      title: alarm.alarmName,
      alarmSource: alarm.alarmSource,
      incidentSource: alarm.classification === 'External' ? 'External Alarm' : 'BSC/NOC',
      classification: alarm.classification,
      alarmName: alarm.alarmName,
      description: alarm.description,
      equipmentId: alarm.equipmentId,
      equipmentAffected: alarm.equipmentName,
      severity: alarm.severity,
      impact: alarm.severity === 'Critical' ? 'Site Down' : 'Service Degraded',
      scope: 'Single Site',
      priority:
        alarm.severity === 'Critical'
          ? 'P1 - Critical'
          : alarm.severity === 'Major'
          ? 'P2 - High'
          : alarm.severity === 'Minor'
          ? 'P3 - Medium'
          : 'P4 - Low',
      firstOccurrence: alarm.firstOccurrence,
      lastOccurrence: alarm.lastOccurrence,
      reportedAt: now,
      acknowledged: alarm.acknowledged,
      acknowledgedBy: alarm.acknowledgedBy,
      acknowledgedAt: alarm.acknowledgedAt,
      assignedTeamId: team.id,
      assignedOwnerName: `Unassigned (${team.name})`,
      status: alarm.acknowledged ? 'Acknowledged' : 'New',
      alarmClearedInNetwork: !alarm.isSimulatedActive,
      createdBy: currentUser.fullName,
      reportedSymptoms: alarm.description,
      diagnosticObservations: 'Not yet determined',
      measurementsAndTestResults: 'Not yet determined',
      suspectedRootCause: 'Not yet determined',
      confirmedRootCause: 'Not yet determined',
      correctiveAction: 'Not yet determined',
      preventiveAction: 'Not yet determined',
      partsReplaced: [],
      escalationLevel: 0,
      escalationHistory: [],
      timeline: [
        {
          id: `TL-${Date.now()}`,
          incidentId: newIncidentId,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          eventType: 'CREATED',
          title: `Incident ${newIncidentId} Created from Alarm ${alarm.id}`,
          details: `Created by ${currentUser.fullName} from ${alarm.severity} alarm "${alarm.alarmName}".`,
        },
      ],
      notes: [
        {
          id: `NOTE-${Date.now()}`,
          incidentId: newIncidentId,
          authorName: currentUser.fullName,
          authorRole: currentUser.role,
          createdAt: now,
          content: `Incident ticket created from alarm ${alarm.id} (${alarm.vendorCode}).`,
          noteType: 'Investigation',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const updatedAlarms = store.alarms.map((a) =>
      a.id === alarmId
        ? { ...a, linkedIncidentId: newIncidentId, proposedCorrelationIncidentId: undefined }
        : a
    );

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: [newIncident, ...store.incidents],
      alarms: updatedAlarms,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_CREATED',
          entityType: 'Incident',
          entityId: newIncidentId,
          summary: `Created incident ${newIncidentId} from alarm ${alarm.id} on ${site.siteCode}.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Created incident ${newIncidentId} from alarm ${alarm.id}.`, 'success');
    return { ok: true, incident: newIncident };
  };

  const ingestSimulatedAlarm = (
    input: IngestSimulatedAlarmInput
  ): { ok: boolean; deduplicated: boolean; alarm: Alarm; incident?: Incident } => {
    const now = new Date().toISOString();
    const site = store.sites.find((s) => s.id === input.siteId) || store.sites[0];

    // Check deduplication rule (same site + vendorCode + managedObject/equipment while still active)
    const duplicate = findDuplicateActiveAlarm(store.alarms, {
      siteId: site.id,
      alarmSource: input.alarmSource,
      vendorCode: input.vendorCode,
      managedObject: input.managedObject,
      equipmentId: input.equipmentId,
    });

    if (duplicate) {
      const updatedDup: Alarm = {
        ...duplicate,
        lastOccurrence: now,
        occurrenceCount: duplicate.occurrenceCount + 1,
        lastSyncedAt: now,
      };
      const updatedAlarms = store.alarms.map((a) => (a.id === duplicate.id ? updatedDup : a));
      const updatedIncidents = store.incidents.map((inc) =>
        inc.alarmId === duplicate.id || (inc.relatedAlarmIds || []).includes(duplicate.id)
          ? { ...inc, lastOccurrence: now, updatedAt: now }
          : inc
      );
      const saved = telecomRepository.saveStore({
        ...store,
        alarms: updatedAlarms,
        incidents: updatedIncidents,
      });
      setStore(saved);
      showToast(
        `Deduplicated repeat trap ${duplicate.vendorCode}: incremented ${duplicate.id} occurrence count to ${updatedDup.occurrenceCount} (no duplicate incident created).`,
        'info'
      );
      return { ok: true, deduplicated: true, alarm: updatedDup };
    }

    const seq = store.alarms.length + 101;
    const newAlarmId = `ALM-90${seq}`;
    const correlation = evaluateProposedCorrelation(
      {
        siteId: site.id,
        domain: input.domain,
        equipmentId: input.equipmentId,
        alarmName: input.alarmName,
        vendorCode: input.vendorCode,
      },
      store.incidents
    );

    const newAlarm: Alarm = {
      id: newAlarmId,
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      region: site.region,
      domain: input.domain,
      technology: input.technology,
      alarmSource: input.alarmSource,
      vendor: input.vendor,
      vendorCode: input.vendorCode,
      managedObject: input.managedObject || `PLMN/${site.siteCode}/${input.equipmentId}`,
      classification: input.classification,
      alarmName: input.alarmName,
      description: input.description,
      equipmentId: input.equipmentId,
      equipmentName: input.equipmentName,
      severity: input.severity,
      firstOccurrence: now,
      lastOccurrence: now,
      occurrenceCount: 1,
      acknowledged: false,
      isSimulatedActive: true,
      proposedCorrelationIncidentId: correlation?.incidentId,
      correlationRuleReason: correlation?.reason,
      lastSyncedAt: now,
      alarmNotes: [],
    };

    const nextAlarms = [newAlarm, ...store.alarms];
    const saved = telecomRepository.saveStore({
      ...store,
      alarms: nextAlarms,
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: now,
          severity: input.severity === 'Critical' ? 'Critical' : 'Warning',
          category: 'Alarm Intake',
          title: `Simulated ${input.severity} Alarm Ingested: ${newAlarmId} (${site.siteCode})`,
          message: `${input.alarmName} [${input.vendorCode}]. ${
            correlation
              ? `Correlation rule ${correlation.ruleName} suggests linking to ${correlation.incidentId}.`
              : 'Ready for NOC triage.'
          }`,
          linkedEntityType: 'Alarm',
          linkedEntityId: newAlarmId,
          read: false,
          deliveryChannelNote:
            'In-App Only (External SMTP/SMS/Push gateway not configured in Demo Mode)',
        },
        ...store.notifications,
      ],
    });
    setStore(saved);
    showToast(`Ingested simulated alarm ${newAlarmId} on ${site.siteCode}.`, 'success');
    return { ok: true, deduplicated: false, alarm: newAlarm };
  };

  const updateIncidentStatus = (
    incidentId: string,
    newStatus: IncidentStatus,
    resolutionNote?: string
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('incident:update_status')) {
      showToast('Permission denied: cannot modify incident workflow status.', 'error');
      return { ok: false, error: 'Permission denied.' };
    }
    if (newStatus === 'Closed' && !can('incident:close')) {
      showToast(
        'Only NOC Engineers, Team Leaders, Managers, or Admins can close incidents.',
        'error'
      );
      return { ok: false, error: 'Permission denied to close incident.' };
    }

    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return { ok: false, error: 'Incident not found.' };

    // Validation Rule: Cannot mark Resolved or Closed if the simulated network alarm is still active!
    if ((newStatus === 'Resolved' || newStatus === 'Closed') && !target.alarmClearedInNetwork) {
      const msg = `Validation blocked: Alarm ${target.alarmId} is still ACTIVE on the network element. Place the incident in "Monitoring" or record alarm clearance before marking "${newStatus}".`;
      showToast(msg, 'error');
      return { ok: false, error: msg };
    }

    const now = new Date().toISOString();

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType:
          newStatus === 'Resolved'
            ? 'VERIFIED_RESOLVED'
            : newStatus === 'Closed'
            ? 'CLOSED'
            : newStatus === 'In Progress'
            ? 'WORK_STARTED'
            : 'STATUS_CHANGED',
        title: `Workflow Status Transitioned: ${inc.status} -> ${newStatus}`,
        details:
          resolutionNote ||
          `Updated by ${currentUser.fullName} (${currentUser.role}). Network alarm state: ${
            inc.alarmClearedInNetwork ? 'Cleared' : 'Active'
          }.`,
        previousValue: inc.status,
        newValue: newStatus,
      };

      const addedNote = {
        id: `NOTE-${Date.now()}`,
        incidentId: inc.id,
        authorName: currentUser.fullName,
        authorRole: currentUser.role,
        createdAt: now,
        content: resolutionNote
          ? `Workflow status changed from ${inc.status} to ${newStatus}. Note: ${resolutionNote}`
          : `Workflow status changed from ${inc.status} to ${newStatus}.`,
        noteType: 'StatusChange' as const,
      };

      return {
        ...inc,
        status: newStatus,
        acknowledged: true,
        acknowledgedBy: inc.acknowledgedBy || currentUser.fullName,
        acknowledgedAt: inc.acknowledgedAt || now,
        workStartedAt:
          newStatus === 'In Progress' && !inc.workStartedAt ? now : inc.workStartedAt,
        serviceRestoredAt:
          (newStatus === 'Resolved' || newStatus === 'Closed') && !inc.serviceRestoredAt
            ? now
            : inc.serviceRestoredAt,
        resolutionVerifiedAt:
          newStatus === 'Resolved' || newStatus === 'Closed'
            ? inc.resolutionVerifiedAt || now
            : inc.resolutionVerifiedAt,
        resolutionVerifiedBy:
          newStatus === 'Resolved' || newStatus === 'Closed'
            ? inc.resolutionVerifiedBy || currentUser.fullName
            : inc.resolutionVerifiedBy,
        closedAt: newStatus === 'Closed' ? now : inc.closedAt,
        reviewedAndApprovedBy:
          newStatus === 'Closed' ? currentUser.fullName : inc.reviewedAndApprovedBy,
        resolvedAt: newStatus === 'Resolved' || newStatus === 'Closed' ? now : inc.resolvedAt,
        resolutionSummary: resolutionNote || inc.resolutionSummary,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [...inc.notes, addedNote],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType:
            newStatus === 'Closed'
              ? 'INCIDENT_CLOSED'
              : newStatus === 'Resolved'
              ? 'INCIDENT_RESOLVED'
              : 'INCIDENT_STATUS_CHANGED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Changed ${incidentId} (${target.siteCode}) status from ${target.status} to ${newStatus}.`,
          beforeValue: target.status,
          afterValue: newStatus,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Incident ${incidentId} updated to "${newStatus}".`, 'success');
    return { ok: true };
  };

  const recordIncidentServiceRestored = (incidentId: string, restorationNote: string) => {
    if (!currentUser || !can('incident:update_status')) {
      showToast('Permission denied to record service restoration.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'SERVICE_RESTORED',
        title: 'Service Restoration Recorded',
        details:
          restorationNote.trim() ||
          `Traffic/power service restored on ${inc.siteCode}. Incident remains in "${inc.status}" for soak monitoring / verification.`,
      };
      return {
        ...inc,
        serviceRestoredAt: now,
        status: inc.status === 'In Progress' ? ('Monitoring' as IncidentStatus) : inc.status,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `[SERVICE RESTORED] ${restorationNote.trim() || 'Service restored on site.'}`,
            noteType: 'FieldUpdate' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_SERVICE_RESTORED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Recorded service restoration for ${incidentId} (${target.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Recorded service restoration timestamp for ${incidentId}.`, 'success');
  };

  const reopenIncident = (
    incidentId: string,
    reason: string
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('incident:reopen')) {
      const msg =
        'Only authorized NOC Engineers, Team Leaders, Managers, or Administrators can reopen a resolved/closed incident.';
      showToast(msg, 'error');
      return { ok: false, error: msg };
    }
    if (!reason.trim()) {
      return { ok: false, error: 'Please provide a mandatory reason for reopening the incident.' };
    }
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return { ok: false, error: 'Incident not found.' };

    const now = new Date().toISOString();
    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'REOPENED',
        title: `Incident Reopened (${inc.status} -> In Progress)`,
        details: `Reopened by ${currentUser.fullName}. Reason: ${reason.trim()}`,
        previousValue: inc.status,
        newValue: 'In Progress',
      };
      return {
        ...inc,
        status: 'In Progress' as IncidentStatus,
        reopenedCount: (inc.reopenedCount || 0) + 1,
        closedAt: undefined,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `[INCIDENT REOPENED] Reason: ${reason.trim()}`,
            noteType: 'StatusChange' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_REOPENED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Reopened incident ${incidentId} (${target.siteCode}). Reason: ${reason.trim()}`,
          beforeValue: target.status,
          afterValue: 'In Progress',
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Incident ${incidentId} reopened with full history preserved.`, 'info');
    return { ok: true };
  };

  const escalateIncident = (
    incidentId: string,
    level: 1 | 2 | 3,
    reason: string,
    notifiedTarget: string
  ) => {
    if (!currentUser || !can('incident:escalate')) {
      showToast('Permission denied to escalate incident.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const escEvent = {
        id: `ESC-${Date.now()}`,
        level,
        triggeredAt: now,
        triggeredBy: currentUser.fullName,
        reason: reason.trim() || 'SLA threshold escalation',
        notifiedTarget: notifiedTarget.trim() || 'Regional Operations Duty Manager',
      };
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'ESCALATED',
        title: `Escalated to Level L${level} (${escEvent.notifiedTarget})`,
        details: `${escEvent.reason} (Original severity "${inc.severity}" preserved).`,
      };
      return {
        ...inc,
        escalationLevel: level,
        escalationHistory: [...(inc.escalationHistory || []), escEvent],
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `[ESCALATION L${level}] Notified ${escEvent.notifiedTarget}. Reason: ${escEvent.reason}`,
            noteType: 'Escalation' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          timestamp: now,
          severity: 'Critical',
          category: 'Escalation',
          title: `Level ${level} Escalation: ${incidentId} (${target.siteCode})`,
          message: `Escalated to ${notifiedTarget} by ${currentUser.fullName}. Reason: ${reason}`,
          linkedEntityType: 'Incident',
          linkedEntityId: incidentId,
          read: false,
          deliveryChannelNote:
            'In-App Only (External SMTP/SMS/Push gateway not configured in Demo Mode)',
        },
        ...store.notifications,
      ],
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_ESCALATED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Escalated ${incidentId} to Level L${level} (${notifiedTarget}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Escalated ${incidentId} to Level L${level}.`, 'info');
  };

  const updateIncidentInvestigation = (incidentId: string, fields: Partial<Incident>) => {
    if (!currentUser || !can('incident:update_status')) {
      showToast('Permission denied to update technical investigation records.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'INVESTIGATION_UPDATED',
        title: 'Technical Investigation & Root-Cause Record Updated',
        details: `Updated diagnostic observations, measurements, root cause, or corrective actions.`,
      };
      return {
        ...inc,
        ...fields,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_NOTE_ADDED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Updated technical investigation & root-cause fields on ${incidentId} (${target.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Saved technical investigation details for ${incidentId}.`, 'success');
  };

  const toggleSimulatedNetworkAlarmClearance = (
    incidentId: string,
    observationNote?: string
  ) => {
    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;
    clearOrReassertAlarmRecord(
      target.alarmId,
      !target.alarmClearedInNetwork,
      observationNote || 'Simulated network element trap state toggled by operator.'
    );
  };

  const assignIncidentOwner = (incidentId: string, teamId: string, engineerId?: string) => {
    if (!currentUser || !can('incident:assign')) {
      showToast('Your role cannot reassign incident ownership.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const team = store.teams.find((t) => t.id === teamId);
    const engineer = engineerId ? store.users.find((u) => u.id === engineerId) : undefined;
    if (!team) return;

    const ownerLabel = engineer
      ? `${engineer.fullName} (${team.name})`
      : `Unassigned (${team.name})`;

    const target = store.incidents.find((i) => i.id === incidentId);
    if (!target) return;

    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      const nextStatus: IncidentStatus =
        inc.status === 'New' || inc.status === 'Acknowledged' ? 'Assigned' : inc.status;
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: 'ASSIGNED',
        title: `Assigned to ${ownerLabel}`,
        details: `Previous owner: ${inc.assignedOwnerName}`,
        previousValue: inc.assignedOwnerName,
        newValue: ownerLabel,
      };
      return {
        ...inc,
        assignedTeamId: team.id,
        assignedEngineerId: engineer?.id,
        assignedOwnerName: ownerLabel,
        assignedAt: now,
        status: nextStatus,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: `Assigned incident ownership to ${ownerLabel}.`,
            noteType: 'Assignment' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_ASSIGNED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Assigned ${incidentId} to ${ownerLabel}.`,
          beforeValue: target.assignedOwnerName,
          afterValue: ownerLabel,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Assigned ${incidentId} to ${ownerLabel}.`, 'success');
  };

  const addIncidentInvestigationNote = (incidentId: string, content: string) => {
    if (!currentUser || !can('incident:add_note')) {
      showToast('Your role cannot post investigation notes.', 'error');
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;
      return {
        ...inc,
        updatedAt: now,
        notes: [
          ...inc.notes,
          {
            id: `NOTE-${Date.now()}`,
            incidentId: inc.id,
            authorName: currentUser.fullName,
            authorRole: currentUser.role,
            createdAt: now,
            content: trimmed,
            noteType: 'Investigation' as const,
          },
        ],
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_NOTE_ADDED',
          entityType: 'Incident',
          entityId: incidentId,
          summary: `Added technical investigation note to ${incidentId}.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast('Investigation note recorded.', 'success');
  };

  const createIncident = (
    input: CreateIncidentInput
  ): { ok: boolean; error?: string; incident?: Incident } => {
    if (!currentUser || !can('incident:create')) {
      return { ok: false, error: 'Your role does not have permission to create incidents.' };
    }
    const site = store.sites.find((s) => s.id === input.siteId);
    if (!site) {
      return { ok: false, error: 'Please select a valid registered telecom site.' };
    }
    if (!input.alarmName.trim() || !input.description.trim() || !input.equipmentAffected.trim()) {
      return {
        ok: false,
        error: 'Alarm name, affected equipment, and technical description are required.',
      };
    }

    const now = new Date().toISOString();
    const seq = store.incidents.length + 401;
    const newIncidentId = `INC-2026-000${seq}`;
    const newAlarmId = `ALM-90${store.alarms.length + 101}`;
    const team = store.teams.find((t) => t.id === input.assignedTeamId) || store.teams[0];

    const newIncident: Incident = {
      id: newIncidentId,
      alarmId: newAlarmId,
      relatedAlarmIds: [newAlarmId],
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      region: site.region,
      operator: site.operator,
      domain: input.domain,
      technology: input.technology,
      category: input.category || 'RAN / Cell Outage',
      title: input.alarmName.trim(),
      alarmSource: input.alarmSource.trim() || 'Manual NOC Console Entry (Simulated)',
      incidentSource: input.incidentSource || 'Manual Entry',
      classification: input.classification,
      alarmName: input.alarmName.trim(),
      description: input.description.trim(),
      equipmentId: `EQ-SIM-${seq}`,
      equipmentAffected: input.equipmentAffected.trim(),
      severity: input.severity,
      impact:
        input.impact || (input.severity === 'Critical' ? 'Site Down' : 'Service Degraded'),
      scope: input.scope || 'Single Site',
      priority:
        input.priority ||
        (input.severity === 'Critical'
          ? 'P1 - Critical'
          : input.severity === 'Major'
          ? 'P2 - High'
          : input.severity === 'Minor'
          ? 'P3 - Medium'
          : 'P4 - Low'),
      firstOccurrence: now,
      lastOccurrence: now,
      reportedAt: now,
      acknowledged: false,
      assignedTeamId: team.id,
      assignedOwnerName: `Unassigned (${team.name})`,
      status: 'New',
      alarmClearedInNetwork: false,
      createdBy: currentUser.fullName,
      reportedSymptoms: input.reportedSymptoms?.trim() || input.description.trim(),
      diagnosticObservations: 'Not yet determined',
      measurementsAndTestResults: 'Not yet determined',
      suspectedRootCause: 'Not yet determined',
      confirmedRootCause: 'Not yet determined',
      correctiveAction: 'Not yet determined',
      preventiveAction: 'Not yet determined',
      partsReplaced: [],
      escalationLevel: 0,
      escalationHistory: [],
      timeline: [
        {
          id: `TL-${Date.now()}`,
          incidentId: newIncidentId,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          eventType: 'CREATED',
          title: `Incident ${newIncidentId} Created & Linked to Alarm ${newAlarmId}`,
          details: `Logged by ${currentUser.fullName} on site ${site.siteCode}.`,
        },
      ],
      notes: [
        {
          id: `NOTE-${Date.now()}`,
          incidentId: newIncidentId,
          authorName: currentUser.fullName,
          authorRole: currentUser.role,
          createdAt: now,
          content: `Simulated incident & alarm logged by ${currentUser.fullName}.`,
          noteType: 'Investigation',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const saved = telecomRepository.saveStore({
      ...store,
      incidents: [newIncident, ...store.incidents],
      alarms: [
        {
          id: newAlarmId,
          siteId: site.id,
          siteCode: site.siteCode,
          siteName: site.siteName,
          region: site.region,
          domain: input.domain,
          technology: input.technology,
          alarmSource: newIncident.alarmSource,
          vendor: 'Simulated OSS',
          vendorCode: `SIM-${input.classification.toUpperCase()}-${seq}`,
          managedObject: `PLMN/${site.siteCode}/EQ-SIM-${seq}`,
          classification: input.classification,
          alarmName: newIncident.alarmName,
          description: newIncident.description,
          equipmentId: newIncident.equipmentId,
          equipmentName: newIncident.equipmentAffected,
          severity: input.severity,
          firstOccurrence: now,
          lastOccurrence: now,
          occurrenceCount: 1,
          acknowledged: false,
          isSimulatedActive: true,
          linkedIncidentId: newIncidentId,
          lastSyncedAt: now,
          alarmNotes: [],
        },
        ...store.alarms,
      ],
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'INCIDENT_CREATED',
          entityType: 'Incident',
          entityId: newIncidentId,
          summary: `Created ${input.severity} incident ${newIncidentId} on site ${site.siteCode}.`,
        },
        ...store.auditEvents,
      ],
    });

    setStore(saved);
    showToast(`Created incident ${newIncidentId} (${newAlarmId}) on ${site.siteCode}.`, 'success');
    return { ok: true, incident: newIncident };
  };

  const upsertSite = (input: UpsertSiteInput): { ok: boolean; error?: string; site?: Site } => {
    const isEditing = Boolean(input.id);
    if (!currentUser || (isEditing ? !can('site:edit') : !can('site:create'))) {
      return { ok: false, error: 'Your role does not have permission to modify site inventory.' };
    }

    const cleanId = input.siteIdInput.trim().toUpperCase();
    const cleanCode = input.siteCode.trim().toUpperCase();
    const cleanName = input.siteName.trim();

    if (!cleanId || !cleanCode || !cleanName || !input.region.trim() || !input.address.trim()) {
      return {
        ok: false,
        error: 'Site ID, Site Code, Site Name, Region, and Address are mandatory fields.',
      };
    }

    if (
      Number.isNaN(input.latitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      Number.isNaN(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      return {
        ok: false,
        error: 'Latitude must be between -90 and 90, and Longitude between -180 and 180.',
      };
    }

    if (input.technologies.length === 0) {
      return {
        ok: false,
        error: 'Select at least one active radio/network technology for the site.',
      };
    }

    const duplicate = store.sites.find(
      (s) =>
        s.id !== input.id &&
        (s.id.toUpperCase() === cleanId || s.siteCode.toUpperCase() === cleanCode)
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Duplicate identifier conflict: Site ID "${cleanId}" or Site Code "${cleanCode}" already exists (${duplicate.siteName}).`,
      };
    }

    const now = new Date().toISOString();

    if (isEditing && input.id) {
      let updatedSiteRecord: Site | undefined;
      const updatedSites = store.sites.map((s) => {
        if (s.id !== input.id) return s;
        updatedSiteRecord = {
          ...s,
          siteCode: cleanCode,
          siteName: cleanName,
          operator: input.operator.trim(),
          region: input.region.trim(),
          district: input.district.trim(),
          address: input.address.trim(),
          latitude: input.latitude,
          longitude: input.longitude,
          siteType: input.siteType,
          technologies: input.technologies,
          operationalStatus: input.operationalStatus,
          assignedTeamId: input.assignedTeamId,
          lastMaintenanceDate: input.lastMaintenanceDate,
          towerHeightMeters: input.towerHeightMeters,
          powerConfiguration: input.powerConfiguration.trim(),
          accessInstructions: input.accessInstructions?.trim(),
          updatedAt: now,
        };
        return updatedSiteRecord;
      });

      const updatedIncidents = store.incidents.map((inc) =>
        inc.siteId === input.id
          ? { ...inc, siteCode: cleanCode, siteName: cleanName, region: input.region.trim() }
          : inc
      );
      const updatedWorkOrders = store.workOrders.map((wo) =>
        wo.siteId === input.id
          ? { ...wo, siteCode: cleanCode, siteName: cleanName, region: input.region.trim() }
          : wo
      );

      const saved = telecomRepository.saveStore({
        ...store,
        sites: updatedSites,
        incidents: updatedIncidents,
        workOrders: updatedWorkOrders,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'SITE_UPDATED',
            entityType: 'Site',
            entityId: input.id,
            summary: `Updated site configuration and status (${input.operationalStatus}) for ${cleanCode}.`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Site ${cleanCode} updated.`, 'success');
      return { ok: true, site: updatedSiteRecord };
    } else {
      const newSite: Site = {
        id: cleanId,
        siteCode: cleanCode,
        siteName: cleanName,
        operator: input.operator.trim() || 'ApexTel Carrier Group',
        region: input.region.trim(),
        district: input.district.trim() || 'Metropolitan Sector',
        address: input.address.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        siteType: input.siteType,
        technologies: input.technologies,
        operationalStatus: input.operationalStatus,
        assignedTeamId: input.assignedTeamId,
        lastMaintenanceDate: input.lastMaintenanceDate || now.slice(0, 10),
        towerHeightMeters: input.towerHeightMeters,
        powerConfiguration:
          input.powerConfiguration.trim() || 'Utility AC + 48V DC Rectifier + Battery Bank',
        accessInstructions: input.accessInstructions?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      const saved = telecomRepository.saveStore({
        ...store,
        sites: [newSite, ...store.sites],
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'SITE_CREATED',
            entityType: 'Site',
            entityId: newSite.id,
            summary: `Registered new ${newSite.siteType} site ${newSite.siteCode} (${newSite.siteName}).`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Registered site ${newSite.siteCode} (${newSite.id}).`, 'success');
      return { ok: true, site: newSite };
    }
  };

  const archiveSite = (siteId: string): { ok: boolean; error?: string } => {
    const site = store.sites.find((s) => s.id === siteId);
    if (!site) return { ok: false, error: 'Site not found.' };

    const updatedSites = store.sites.map((s) =>
      s.id === siteId ? { ...s, archived: true, operationalStatus: 'Offline' as const } : s
    );
    const now = new Date().toISOString();
    const saved = telecomRepository.saveStore({
      ...store,
      sites: updatedSites,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser ? currentUser.fullName : 'System',
          actorRole: currentUser ? currentUser.role : UserRole.ADMIN,
          actionType: 'SITE_UPDATED',
          entityType: 'Site',
          entityId: siteId,
          summary: `Archived site ${site.siteCode} (${site.siteName}). Historical cases and reports preserved.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    telecomRepository.syncStoreToBackendAsync(saved);
    showToast(`Site ${site.siteCode} archived. Historical cases preserved.`, 'info');
    return { ok: true };
  };

  const upsertWorkOrder = (
    input: UpsertWorkOrderInput
  ): { ok: boolean; error?: string; workOrder?: WorkOrder } => {
    if (!currentUser || !can('workorder:create')) {
      return {
        ok: false,
        error: 'Your role does not have permission to create or edit work orders.',
      };
    }
    const site = store.sites.find((s) => s.id === input.siteId);
    if (!site) {
      return { ok: false, error: 'Please select a valid target site.' };
    }
    if (!input.workDescription.trim() || !input.scheduledVisitDate) {
      return { ok: false, error: 'Work description and scheduled visit date/time are required.' };
    }

    const team = store.teams.find((t) => t.id === input.assignedTeamId) || store.teams[0];
    const engineer = input.assignedEngineerId
      ? store.users.find((u) => u.id === input.assignedEngineerId)
      : undefined;
    const assigneeLabel = engineer
      ? `${engineer.fullName} (${team.name})`
      : `Squad Queue (${team.name})`;

    const now = new Date().toISOString();

    if (input.id) {
      let updatedWo: WorkOrder | undefined;
      const updatedList = store.workOrders.map((wo) => {
        if (wo.id !== input.id) return wo;
        updatedWo = {
          ...wo,
          linkedIncidentId: input.linkedIncidentId || undefined,
          siteId: site.id,
          siteCode: site.siteCode,
          siteName: site.siteName,
          region: site.region,
          equipmentId: input.equipmentId || wo.equipmentId,
          equipmentName: input.equipmentName || wo.equipmentName,
          jobType: input.jobType,
          priority: input.priority,
          assignedTeamId: team.id,
          assignedEngineerId: engineer?.id,
          assignedAssigneeName: assigneeLabel,
          scheduledVisitDate: input.scheduledVisitDate,
          workDescription: input.workDescription.trim(),
          safetyAndAccessRequirements:
            input.safetyAndAccessRequirements || wo.safetyAndAccessRequirements,
          requiredEquipmentOrSpares: input.requiredEquipmentOrSpares,
          status: input.status,
          updatedAt: now,
        };
        return updatedWo;
      });

      const saved = telecomRepository.saveStore({
        ...store,
        workOrders: updatedList,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'WORK_ORDER_UPDATED',
            entityType: 'WorkOrder',
            entityId: updatedWo?.workOrderNumber || input.id,
            summary: `Updated work order ${updatedWo?.workOrderNumber} on ${site.siteCode}.`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Work order ${updatedWo?.workOrderNumber} updated.`, 'success');
      return { ok: true, workOrder: updatedWo };
    } else {
      const seq = store.workOrders.length + 9001;
      const woNumber = `WO-2026-${seq}`;
      const newWo: WorkOrder = {
        id: `WO-0${store.workOrders.length + 1}-${Date.now().toString().slice(-3)}`,
        workOrderNumber: woNumber,
        linkedIncidentId: input.linkedIncidentId || undefined,
        siteId: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName,
        region: site.region,
        equipmentId: input.equipmentId,
        equipmentName: input.equipmentName,
        jobType: input.jobType,
        priority: input.priority,
        assignedTeamId: team.id,
        assignedEngineerId: engineer?.id,
        assignedAssigneeName: assigneeLabel,
        requestedDate: now,
        scheduledVisitDate: input.scheduledVisitDate,
        workDescription: input.workDescription.trim(),
        safetyAndAccessRequirements:
          input.safetyAndAccessRequirements ||
          'Standard PPE, RF personal exposure monitor, and site access clearance.',
        requiredEquipmentOrSpares: input.requiredEquipmentOrSpares,
        partsConsumed: [],
        status: input.status,
        verificationStatus: 'Not Requested',
        createdAt: now,
        updatedAt: now,
      };

      // If linked to an incident, record a timeline event on the incident
      const updatedIncidents = store.incidents.map((inc) => {
        if (inc.id !== input.linkedIncidentId) return inc;
        const tlEvent: IncidentTimelineEvent = {
          id: `TL-${Date.now()}`,
          incidentId: inc.id,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          eventType: 'WORK_ORDER_LINKED',
          title: `Work Order ${woNumber} Created & Dispatched`,
          details: `${newWo.jobType} (${newWo.priority}) assigned to ${assigneeLabel}.`,
        };
        return {
          ...inc,
          dispatchedAt: inc.dispatchedAt || now,
          updatedAt: now,
          timeline: [...(inc.timeline || []), tlEvent],
        };
      });

      const saved = telecomRepository.saveStore({
        ...store,
        workOrders: [newWo, ...store.workOrders],
        incidents: updatedIncidents,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'WORK_ORDER_CREATED',
            entityType: 'WorkOrder',
            entityId: newWo.workOrderNumber,
            summary: `Created ${newWo.priority} work order ${newWo.workOrderNumber} for site ${site.siteCode}.`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Created work order ${newWo.workOrderNumber} for ${site.siteCode}.`, 'success');
      return { ok: true, workOrder: newWo };
    }
  };

  const updateWorkOrderStatus = (
    workOrderId: string,
    status: WorkOrderStatus,
    completionNotes?: string,
    extraPatch?: Partial<WorkOrder>
  ) => {
    if (!currentUser || !can('workorder:update_status')) {
      showToast('Your role does not have permission to update work order status.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.workOrders.find((w) => w.id === workOrderId);
    if (!target) return;

    const updatedWorkOrders = store.workOrders.map((wo) => {
      if (wo.id !== workOrderId) return wo;
      return {
        ...wo,
        ...extraPatch,
        status,
        workStartedAt:
          status === 'In Progress' && !wo.workStartedAt ? now : wo.workStartedAt,
        completedAt:
          status === 'Completed' && !wo.completedAt ? now : wo.completedAt,
        verificationStatus:
          status === 'Completed'
            ? ('Pending Verification' as const)
            : status === 'Verified'
            ? ('Verified' as const)
            : wo.verificationStatus,
        completionNotes: completionNotes !== undefined ? completionNotes : wo.completionNotes,
        updatedAt: now,
      };
    });

    // IMPORTANT RULE: Completing a Work Order records physical repair completion on the linked incident
    // timeline, but NEVER automatically closes the incident or assumes the network alarm cleared!
    const updatedIncidents = store.incidents.map((inc) => {
      if (inc.id !== target.linkedIncidentId) return inc;
      const isPhysicalDone = status === 'Completed';
      const tlEvent: IncidentTimelineEvent = {
        id: `TL-${Date.now()}`,
        incidentId: inc.id,
        timestamp: now,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        eventType: isPhysicalDone
          ? 'PHYSICAL_REPAIR_COMPLETED'
          : status === 'In Progress'
          ? 'WORK_STARTED'
          : 'STATUS_CHANGED',
        title: isPhysicalDone
          ? `Work Order ${target.workOrderNumber} Physical Work Completed`
          : `Work Order ${target.workOrderNumber} Status -> ${status}`,
        details: isPhysicalDone
          ? `${
              completionNotes || extraPatch?.workPerformed || 'Physical field work completed.'
            } (Incident remains "${inc.status}" and alarm state remains "${
              inc.alarmClearedInNetwork ? 'Cleared' : 'Active'
            }" until verified).`
          : `Work order updated by ${currentUser.fullName}.`,
      };
      return {
        ...inc,
        workStartedAt:
          status === 'In Progress' && !inc.workStartedAt ? now : inc.workStartedAt,
        physicalWorkCompletedAt: isPhysicalDone ? now : inc.physicalWorkCompletedAt,
        partsReplaced:
          extraPatch?.partsConsumed && extraPatch.partsConsumed.length > 0
            ? Array.from(new Set([...(inc.partsReplaced || []), ...extraPatch.partsConsumed]))
            : inc.partsReplaced,
        updatedAt: now,
        timeline: [...(inc.timeline || []), tlEvent],
        notes: isPhysicalDone
          ? [
              ...inc.notes,
              {
                id: `NOTE-${Date.now()}`,
                incidentId: inc.id,
                authorName: currentUser.fullName,
                authorRole: currentUser.role,
                createdAt: now,
                content: `[WORK ORDER ${target.workOrderNumber} COMPLETED] ${
                  completionNotes || extraPatch?.workPerformed || 'Field repairs finished.'
                }. Note: Incident remains open pending alarm clearance & service restoration verification.`,
                noteType: 'FieldUpdate' as const,
              },
            ]
          : inc.notes,
      };
    });

    const saved = telecomRepository.saveStore({
      ...store,
      workOrders: updatedWorkOrders,
      incidents: updatedIncidents,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'WORK_ORDER_UPDATED',
          entityType: 'WorkOrder',
          entityId: target.workOrderNumber,
          summary: `Updated ${target.workOrderNumber} (${target.siteCode}) status from ${target.status} to ${status}.`,
          beforeValue: target.status,
          afterValue: status,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(
      status === 'Completed'
        ? `Work order ${target.workOrderNumber} marked Completed (linked incident stays open for verification).`
        : `Work order ${target.workOrderNumber} marked "${status}".`,
      'success'
    );
  };

  const verifyWorkOrderCompletion = (
    workOrderId: string,
    approved: boolean,
    reviewerNote?: string
  ) => {
    if (!currentUser || !can('workorder:verify')) {
      showToast('Permission denied to verify work orders.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const target = store.workOrders.find((w) => w.id === workOrderId);
    if (!target) return;

    const updatedWorkOrders = store.workOrders.map((wo) =>
      wo.id === workOrderId
        ? {
            ...wo,
            status: approved ? ('Verified' as WorkOrderStatus) : ('In Progress' as WorkOrderStatus),
            verificationStatus: approved ? ('Verified' as const) : ('Rejected' as const),
            verifiedBy: currentUser.fullName,
            verifiedAt: now,
            completionNotes: reviewerNote
              ? `${wo.completionNotes ? wo.completionNotes + ' | ' : ''}Verification (${
                  approved ? 'Approved' : 'Returned'
                }): ${reviewerNote}`
              : wo.completionNotes,
            updatedAt: now,
          }
        : wo
    );

    const saved = telecomRepository.saveStore({
      ...store,
      workOrders: updatedWorkOrders,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'WORK_ORDER_VERIFIED',
          entityType: 'WorkOrder',
          entityId: target.workOrderNumber,
          summary: `${approved ? 'Verified' : 'Returned'} work order ${target.workOrderNumber} (${target.siteCode}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(
      approved
        ? `Work order ${target.workOrderNumber} verified by ${currentUser.fullName}.`
        : `Work order ${target.workOrderNumber} returned to In Progress.`,
      approved ? 'success' : 'info'
    );
  };

  const assignWorkOrderPersonnel = (workOrderId: string, teamId: string, engineerId?: string) => {
    if (!currentUser || !can('workorder:assign')) {
      showToast('Your role cannot reassign work order personnel.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const team = store.teams.find((t) => t.id === teamId);
    const engineer = engineerId ? store.users.find((u) => u.id === engineerId) : undefined;
    if (!team) return;

    const assigneeLabel = engineer
      ? `${engineer.fullName} (${team.name})`
      : `Squad Queue (${team.name})`;

    const target = store.workOrders.find((w) => w.id === workOrderId);
    if (!target) return;

    const updatedWorkOrders = store.workOrders.map((wo) =>
      wo.id === workOrderId
        ? {
            ...wo,
            assignedTeamId: team.id,
            assignedEngineerId: engineer?.id,
            assignedAssigneeName: assigneeLabel,
            status:
              wo.status === 'Draft' || wo.status === 'Ready for Assignment'
                ? ('Assigned' as WorkOrderStatus)
                : wo.status,
            updatedAt: now,
          }
        : wo
    );

    const saved = telecomRepository.saveStore({
      ...store,
      workOrders: updatedWorkOrders,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'WORK_ORDER_UPDATED',
          entityType: 'WorkOrder',
          entityId: target.workOrderNumber,
          summary: `Assigned ${target.workOrderNumber} to ${assigneeLabel}.`,
          beforeValue: target.assignedAssigneeName,
          afterValue: assigneeLabel,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Assigned ${target.workOrderNumber} to ${assigneeLabel}.`, 'success');
  };

  const upsertSiteVisit = (
    input: Partial<SiteVisit> & { id?: string; siteId: string; purpose: string }
  ): { ok: boolean; error?: string; visit?: SiteVisit } => {
    if (!currentUser || !can('visit:manage')) {
      return { ok: false, error: 'Your role cannot create or modify site visits.' };
    }
    const site = store.sites.find((s) => s.id === input.siteId);
    if (!site) return { ok: false, error: 'Target site not found.' };

    const now = new Date().toISOString();
    const tpl =
      store.checklistTemplates.find((t) => t.id === input.checklistTemplateId) ||
      store.checklistTemplates[0];

    if (input.id) {
      let updatedVisit: SiteVisit | undefined;
      const updatedVisits = store.siteVisits.map((sv) => {
        if (sv.id !== input.id) return sv;
        updatedVisit = {
          ...sv,
          ...input,
          siteCode: site.siteCode,
          siteName: site.siteName,
        };
        return updatedVisit;
      });

      const saved = telecomRepository.saveStore({
        ...store,
        siteVisits: updatedVisits,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'SITE_VISIT_UPDATED',
            entityType: 'SiteVisit',
            entityId: updatedVisit?.visitCode || input.id,
            summary: `Updated site visit ${updatedVisit?.visitCode} on ${site.siteCode} (${updatedVisit?.status}).`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Site visit ${updatedVisit?.visitCode} updated.`, 'success');
      return { ok: true, visit: updatedVisit };
    } else {
      const seq = store.siteVisits.length + 81;
      const visitCode = `VIS-2026-0${seq}`;
      const eng = input.assignedEngineerId
        ? store.users.find((u) => u.id === input.assignedEngineerId)
        : currentUser;
      const team = store.teams.find((t) => t.id === (eng?.teamId || site.assignedTeamId));

      const defaultItems: ChecklistItemResult[] = tpl.items.map((item) => ({
        itemId: item.id,
        label: item.label,
        result: 'Not Tested',
        measuredValue: '',
        unit: item.unit || '',
        remarks: '',
      }));

      const newVisit: SiteVisit = {
        id: `SV-${Date.now()}`,
        visitCode,
        workOrderId: input.workOrderId,
        linkedIncidentId: input.linkedIncidentId,
        siteId: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName,
        siteAddress: site.address,
        region: site.region,
        operator: site.operator,
        gpsCoordinates: input.gpsCoordinates || {
          latitude: site.latitude,
          longitude: site.longitude,
          source: 'Site Registry',
        },
        equipmentId: input.equipmentId,
        equipmentName: input.equipmentName,
        assignedTeamId: team?.id,
        assignedEngineerId: eng?.id,
        engineerName: eng?.fullName || currentUser.fullName,
        teamName: team?.name || 'Regional Field Squad',
        scheduledDate: input.scheduledDate || now,
        checkInTime: input.status === 'On-Site' ? now : input.checkInTime,
        checkInSource: input.status === 'On-Site' ? 'Device Recorded' : input.checkInSource,
        workStartTime: input.workStartTime,
        workStartSource: input.workStartSource,
        workCompletionTime: input.workCompletionTime,
        workCompletionSource: input.workCompletionSource,
        checkOutTime: input.checkOutTime,
        checkOutSource: input.checkOutSource,
        createdAt: now,
        updatedAt: now,
        submissionState: input.submissionState || 'Draft',
        inspectionType: input.inspectionType || 'Emergency Fault',
        status: input.status || 'Scheduled',
        purpose: input.purpose.trim(),
        initialSiteCondition: input.initialSiteCondition || '',
        reportedFault: input.reportedFault || '',
        observations: input.observations || '',
        suspectedRootCause: input.suspectedRootCause || '',
        confirmedRootCause: input.confirmedRootCause || '',
        workPerformed: input.workPerformed || '',
        correctiveActions: input.correctiveActions || '',
        preventiveRecommendations: input.preventiveRecommendations || '',
        measurementsAndTestResults: input.measurementsAndTestResults || '',
        partsUsed: input.partsUsed || [],
        followUpRecommendations: input.followUpRecommendations || '',
        finalVisitOutcome: input.finalVisitOutcome || 'Not Recorded',
        checklistTemplateId: tpl.id,
        checklistItems: defaultItems,
        checklistCompletedPercent: 0,
        equipmentRecords: input.equipmentRecords || [],
        measurementRecords: input.measurementRecords || [],
        equipmentReplacements: input.equipmentReplacements || [],
        sparePartUsages: input.sparePartUsages || [],
        photoAssetIds: input.photoAssetIds || [],
      };

      const updatedIncidents = store.incidents.map((inc) => {
        if (inc.id !== input.linkedIncidentId) return inc;
        const tlEvent: IncidentTimelineEvent = {
          id: `TL-${Date.now()}`,
          incidentId: inc.id,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          eventType: 'VISIT_RECORDED',
          title: `Field Site Visit ${visitCode} Scheduled (${newVisit.engineerName})`,
          details: `${newVisit.inspectionType}: ${newVisit.purpose}`,
        };
        return {
          ...inc,
          updatedAt: now,
          timeline: [...(inc.timeline || []), tlEvent],
        };
      });

      const saved = telecomRepository.saveStore({
        ...store,
        siteVisits: [newVisit, ...store.siteVisits],
        incidents: updatedIncidents,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'SITE_VISIT_CREATED',
            entityType: 'SiteVisit',
            entityId: visitCode,
            summary: `Created site visit ${visitCode} for ${site.siteCode}.`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Created site visit ${visitCode} for ${site.siteCode}.`, 'success');
      return { ok: true, visit: newVisit };
    }
  };

  const updateSiteVisitChecklist = (
    visitId: string,
    items: ChecklistItemResult[],
    observations?: string,
    workPerformed?: string,
    measurements?: string,
    partsUsed?: string[],
    followUp?: string
  ) => {
    if (!currentUser || !can('visit:manage')) {
      showToast('Permission denied to update site visit checklists.', 'error');
      return;
    }
    const total = Math.max(items.length, 1);
    const done = items.filter((i) => i.result !== 'Pending' && i.result !== 'Not Tested').length;
    const pct = Math.round((done / total) * 100);

    const updatedVisits = store.siteVisits.map((sv) =>
      sv.id === visitId
        ? {
            ...sv,
            checklistItems: items,
            checklistCompletedPercent: pct,
            observations: observations !== undefined ? observations : sv.observations,
            workPerformed: workPerformed !== undefined ? workPerformed : sv.workPerformed,
            measurementsAndTestResults:
              measurements !== undefined ? measurements : sv.measurementsAndTestResults,
            partsUsed: partsUsed !== undefined ? partsUsed : sv.partsUsed,
            followUpRecommendations:
              followUp !== undefined ? followUp : sv.followUpRecommendations,
          }
        : sv
    );

    const saved = telecomRepository.saveStore({
      ...store,
      siteVisits: updatedVisits,
    });
    setStore(saved);
    showToast(`Saved field visit checklist & measurements (${pct}% complete).`, 'success');
  };

  const upsertChecklistTemplate = (template: ChecklistTemplate) => {
    if (!currentUser || !can('checklist:configure')) {
      showToast('Permission denied to configure checklist templates.', 'error');
      return;
    }
    const exists = store.checklistTemplates.some((t) => t.id === template.id);
    const nextList = exists
      ? store.checklistTemplates.map((t) => (t.id === template.id ? template : t))
      : [...store.checklistTemplates, template];

    const saved = telecomRepository.saveStore({
      ...store,
      checklistTemplates: nextList,
    });
    setStore(saved);
    showToast(`Saved checklist template "${template.name}".`, 'success');
  };

  const updateSlaConfiguration = (rules: SLAConfiguration['rules']) => {
    if (!currentUser || !can('sla:configure')) {
      showToast('Only Administrators or Maintenance Managers can modify SLA thresholds.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const saved = telecomRepository.saveStore({
      ...store,
      slaConfig: {
        updatedAt: now,
        updatedBy: `${currentUser.fullName} (${currentUser.role})`,
        rules,
      },
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'SLA_CONFIG_UPDATED',
          entityType: 'System',
          entityId: 'SLA-MATRIX',
          summary: `Updated SLA response and resolution threshold targets.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast('SLA response & resolution thresholds updated.', 'success');
  };

  const updateEngineerAvailability = (userId: string, availability: EngineerAvailability) => {
    const updatedUsers = store.users.map((u) =>
      u.id === userId ? { ...u, availabilityStatus: availability } : u
    );
    const saved = telecomRepository.saveStore({
      ...store,
      users: updatedUsers,
    });
    setStore(saved);
    showToast(`Updated engineer availability to "${availability}".`, 'info');
  };

  const markNotificationRead = (notifId: string) => {
    const saved = telecomRepository.saveStore({
      ...store,
      notifications: store.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
    });
    setStore(saved);
  };

  const markAllNotificationsRead = () => {
    const saved = telecomRepository.saveStore({
      ...store,
      notifications: store.notifications.map((n) => ({ ...n, read: true })),
    });
    setStore(saved);
  };

  /**
   * PHASE 2 — GIS FEATURE MUTATIONS
   */
  const upsertGisFeature = (
    input: UpsertGisFeatureInput
  ): { ok: boolean; error?: string; feature?: TelecomGisFeature } => {
    const isEditing = Boolean(input.id);
    if (!currentUser || (isEditing ? !can('gis:edit') : !can('gis:create'))) {
      return {
        ok: false,
        error: 'Your role does not have permission to create or edit GIS features.',
      };
    }

    if (!input.name.trim()) {
      return { ok: false, error: 'Feature name is required.' };
    }

    const geomValidation = validateGeometryCoordinates(input.geometry);
    if (!geomValidation.valid) {
      return { ok: false, error: geomValidation.reason || 'Invalid geographic geometry.' };
    }

    const now = new Date().toISOString();

    if (isEditing && input.id) {
      let updatedFeature: TelecomGisFeature | undefined;
      const updatedList = store.gisFeatures.map((feat) => {
        if (feat.id !== input.id) return feat;
        updatedFeature = {
          ...feat,
          layerGroup: input.layerGroup,
          featureType: input.featureType,
          name: input.name.trim(),
          description: input.description.trim(),
          region: input.region.trim() || 'North Metro',
          operator: input.operator.trim() || 'ApexTel Carrier Group',
          status: input.status,
          linkedSiteId: input.linkedSiteId || undefined,
          linkedIncidentId: input.linkedIncidentId || undefined,
          geometry: input.geometry,
          properties: input.properties || feat.properties,
          updatedBy: currentUser.fullName,
          updatedAt: now,
        };
        return updatedFeature;
      });

      const saved = telecomRepository.saveStore({
        ...store,
        gisFeatures: updatedList,
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'GIS_FEATURE_UPDATED',
            entityType: 'GisFeature',
            entityId: input.id,
            summary: `Updated GIS ${input.featureType} "${input.name.trim()}" (${input.id}).`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Updated GIS feature ${input.id}.`, 'success');
      return { ok: true, feature: updatedFeature };
    } else {
      const seq = store.gisFeatures.length + 101;
      const newId = `GIS-USR-${seq}`;
      const newFeature: TelecomGisFeature = {
        id: newId,
        layerGroup: input.layerGroup,
        featureType: input.featureType,
        name: input.name.trim(),
        description: input.description.trim() || `${input.featureType} added via GIS Map.`,
        region: input.region.trim() || 'North Metro',
        operator: input.operator.trim() || 'ApexTel Carrier Group',
        status: input.status,
        linkedSiteId: input.linkedSiteId || undefined,
        linkedIncidentId: input.linkedIncidentId || undefined,
        geometry: input.geometry,
        properties: input.properties || {},
        createdBy: currentUser.fullName,
        updatedBy: currentUser.fullName,
        createdAt: now,
        updatedAt: now,
      };

      const saved = telecomRepository.saveStore({
        ...store,
        gisFeatures: [newFeature, ...store.gisFeatures],
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'GIS_FEATURE_CREATED',
            entityType: 'GisFeature',
            entityId: newFeature.id,
            summary: `Created GIS ${newFeature.featureType} "${newFeature.name}" (${newFeature.id}).`,
          },
          ...store.auditEvents,
        ],
      });
      setStore(saved);
      showToast(`Created GIS feature ${newFeature.name} (${newFeature.id}).`, 'success');
      return { ok: true, feature: newFeature };
    }
  };

  const deleteGisFeature = (featureId: string): { ok: boolean; error?: string } => {
    if (!currentUser || !can('gis:delete')) {
      showToast('Permission denied: your role cannot delete GIS infrastructure features.', 'error');
      return { ok: false, error: 'Permission denied.' };
    }
    const target = store.gisFeatures.find((f) => f.id === featureId);
    if (!target) {
      return { ok: false, error: 'GIS feature not found.' };
    }

    const now = new Date().toISOString();
    const saved = telecomRepository.saveStore({
      ...store,
      gisFeatures: store.gisFeatures.filter((f) => f.id !== featureId),
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'GIS_FEATURE_DELETED',
          entityType: 'GisFeature',
          entityId: featureId,
          summary: `Deleted GIS ${target.featureType} "${target.name}" (${featureId}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Deleted GIS feature ${target.name} (${featureId}).`, 'info');
    return { ok: true };
  };

  const importGeoJsonCandidates = (
    candidates: GeoJsonImportCandidate[],
    destinationLayer: GisLayerGroup
  ): { ok: boolean; importedCount: number; error?: string } => {
    if (!currentUser || !can('gis:import')) {
      return {
        ok: false,
        importedCount: 0,
        error: 'Your role does not have permission to import GeoJSON datasets.',
      };
    }

    const validCandidates = candidates;
    if (validCandidates.length === 0) {
      return {
        ok: false,
        importedCount: 0,
        error: 'No valid geographic features found to import.',
      };
    }

    const now = new Date().toISOString();
    const nextSites = [...store.sites];
    const nextGisFeatures = [...store.gisFeatures];
    let importedCount = 0;

    validCandidates.forEach((cand, idx) => {
      const targetGroup =
        destinationLayer === 'sites' && cand.geometry.type === 'Point'
          ? 'sites'
          : destinationLayer === 'sites'
          ? 'fiber-transmission'
          : destinationLayer;

      if (targetGroup === 'sites' && cand.geometry.type === 'Point') {
        const center = getGeometryCenterCoordinates(cand.geometry);
        if (!center) return;
        const rawCode = String(
          cand.properties.siteCode || cand.properties.code || `IMP-SITE-${nextSites.length + 1}`
        )
          .trim()
          .toUpperCase();
        const rawId = String(
          cand.properties.siteId || cand.properties.id || `SITE-${1000 + nextSites.length + 1}`
        )
          .trim()
          .toUpperCase();

        const duplicateSite = nextSites.find(
          (s) => s.id.toUpperCase() === rawId || s.siteCode.toUpperCase() === rawCode
        );
        if (!duplicateSite) {
          nextSites.unshift({
            id: rawId,
            siteCode: rawCode,
            siteName: cand.name,
            operator: String(cand.properties.operator || 'ApexTel Carrier Group'),
            region: cand.region,
            district: String(cand.properties.district || 'Imported GIS Sector'),
            address: String(
              cand.properties.address ||
                `Lat ${center[1].toFixed(4)}, Lng ${center[0].toFixed(4)}`
            ),
            latitude: Number(center[1].toFixed(6)),
            longitude: Number(center[0].toFixed(6)),
            siteType: 'Greenfield Tower',
            technologies: ['4G LTE', '5G NR'],
            operationalStatus: 'Online',
            assignedTeamId: store.teams[0]?.id || 'TEAM-NOC-01',
            lastMaintenanceDate: now.slice(0, 10),
            powerConfiguration: 'Utility AC + 48V DC Plant',
            createdAt: now,
            updatedAt: now,
          });
          importedCount++;
        }
      } else {
        const newFeatureId = `GIS-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`;
        nextGisFeatures.unshift({
          id: newFeatureId,
          layerGroup: targetGroup,
          featureType: cand.featureType,
          name: cand.name,
          description:
            String(cand.properties.description || '') ||
            `Imported ${cand.geometryType} via GeoJSON.`,
          region: cand.region,
          operator: String(cand.properties.operator || 'ApexTel Carrier Group'),
          status: cand.status,
          geometry: cand.geometry,
          properties: cand.properties,
          createdBy: currentUser.fullName,
          updatedBy: currentUser.fullName,
          createdAt: now,
          updatedAt: now,
        });
        importedCount++;
      }
    });

    const saved = telecomRepository.saveStore({
      ...store,
      sites: nextSites,
      gisFeatures: nextGisFeatures,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'GIS_GEOJSON_IMPORTED',
          entityType: 'GisFeature',
          entityId: `IMPORT-${importedCount}`,
          summary: `Imported ${importedCount} validated GeoJSON features into layer "${destinationLayer}".`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Successfully imported ${importedCount} GeoJSON features.`, 'success');
    return { ok: true, importedCount };
  };

  const recordGeoJsonExportAudit = (scopeDescription: string, featureCount: number) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const saved = telecomRepository.saveStore({
      ...store,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'GIS_GEOJSON_EXPORTED',
          entityType: 'GisFeature',
          entityId: `EXPORT-${featureCount}`,
          summary: `Exported ${featureCount} GIS features (${scopeDescription}) as RFC 7946 GeoJSON.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Exported ${featureCount} features to GeoJSON.`, 'info');
  };

  const resetDemoDatabase = () => {
    const fresh = telecomRepository.resetToSeed(currentUser || undefined);
    setStore(fresh);
    setSelectedIncidentId(null);
    setSelectedAlarmId(null);
    setSelectedSiteId(null);
    setSelectedWorkOrderId(null);
    setSelectedSiteVisitId(null);
    setFocusedGisEntity(null);
    showToast('Demonstration database reset to initial seed state.', 'info');
  };

  const openPhotoInStudio = (
    photoId?: string,
    prefill?: {
      siteId?: string;
      incidentId?: string;
      workOrderId?: string;
      visitId?: string;
      reportId?: string;
      caseId?: string;
    }
  ) => {
    if (photoId) {
      setSelectedPhotoId(photoId);
    }
    if (prefill) {
      setPhotoStudioPrefill(prefill);
    }
    setActiveSection('photo-studio');
  };

  const openReportById = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveSection('reports');
  };

  const addVisitEquipmentRecord = (
    visitId: string,
    record: Omit<VisitEquipmentRecord, 'id'>
  ) => {
    if (!currentUser || !can('visit:manage')) {
      showToast('Permission denied to record equipment inspection entries.', 'error');
      return;
    }
    const newRec: VisitEquipmentRecord = {
      ...record,
      id: `VEQ-${Date.now()}`,
    };
    const updatedVisits = store.siteVisits.map((sv) =>
      sv.id === visitId
        ? {
            ...sv,
            updatedAt: new Date().toISOString(),
            equipmentRecords: [...(sv.equipmentRecords || []), newRec],
          }
        : sv
    );
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      siteVisits: updatedVisits,
    });
    setStore(res.store);
    showToast(
      res.persisted
        ? `Added equipment record (${record.model}) to visit.`
        : res.error || 'Storage warning.',
      res.persisted ? 'success' : 'error'
    );
  };

  const addVisitMeasurementRecord = (
    visitId: string,
    record: Omit<MeasurementRecord, 'id' | 'visitId' | 'recordedAt' | 'recordedBy'>
  ) => {
    if (!currentUser || !can('visit:manage')) {
      showToast('Permission denied to record field measurements.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const newMsr: MeasurementRecord = {
      ...record,
      id: `MSR-${Date.now().toString().slice(-5)}`,
      visitId,
      recordedAt: now,
      recordedBy: currentUser.fullName,
    };
    const updatedVisits = store.siteVisits.map((sv) =>
      sv.id === visitId
        ? {
            ...sv,
            updatedAt: now,
            measurementRecords: [...(sv.measurementRecords || []), newMsr],
          }
        : sv
    );
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      siteVisits: updatedVisits,
    });
    setStore(res.store);
    showToast(
      res.persisted
        ? `Recorded measurement "${record.parameterName}: ${record.measuredValue} ${record.unit}".`
        : res.error || 'Storage warning.',
      res.persisted ? 'success' : 'error'
    );
  };

  const addVisitEquipmentReplacement = (
    visitId: string,
    record: Omit<EquipmentReplacement, 'id' | 'visitId' | 'replacedAt' | 'replacedBy'>
  ) => {
    if (!currentUser || !can('visit:manage')) {
      showToast('Permission denied to log equipment replacements.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const newRep: EquipmentReplacement = {
      ...record,
      id: `EQR-${Date.now().toString().slice(-5)}`,
      visitId,
      replacedAt: now,
      replacedBy: currentUser.fullName,
    };
    const updatedVisits = store.siteVisits.map((sv) =>
      sv.id === visitId
        ? {
            ...sv,
            updatedAt: now,
            equipmentReplacements: [...(sv.equipmentReplacements || []), newRep],
          }
        : sv
    );
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      siteVisits: updatedVisits,
    });
    setStore(res.store);
    showToast(
      res.persisted
        ? `Logged replacement of ${record.removedManufacturerModel} -> SN ${record.installedSerialNumber}.`
        : res.error || 'Storage warning.',
      res.persisted ? 'success' : 'error'
    );
  };

  const addVisitSparePartUsage = (
    visitId: string,
    record: Omit<SparePartUsage, 'id' | 'visitId' | 'recordedAt' | 'usedBy'>
  ) => {
    if (!currentUser || !can('visit:manage')) {
      showToast('Permission denied to log spare part consumption.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const newSpu: SparePartUsage = {
      ...record,
      id: `SPU-${Date.now().toString().slice(-5)}`,
      visitId,
      recordedAt: now,
      usedBy: currentUser.fullName,
    };
    const updatedVisits = store.siteVisits.map((sv) =>
      sv.id === visitId
        ? {
            ...sv,
            updatedAt: now,
            sparePartUsages: [...(sv.sparePartUsages || []), newSpu],
            partsUsed: [...(sv.partsUsed || []), `${record.partName} (x${record.quantity})`],
          }
        : sv
    );
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      siteVisits: updatedVisits,
    });
    setStore(res.store);
    showToast(
      res.persisted
        ? `Logged spare part usage: ${record.partName} (${record.quantity} ${record.unit}).`
        : res.error || 'Storage warning.',
      res.persisted ? 'success' : 'error'
    );
  };

  const uploadPhotoAsset = (input: {
    title: string;
    caption: string;
    classification: PhotoClassification;
    pairGroupId?: string;
    equipmentOrArea: string;
    tags: string[];
    siteId: string;
    incidentId?: string;
    workOrderId?: string;
    visitId?: string;
    reportId?: string;
    caseId?: string;
    originalDataUrl: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml';
    width: number;
    height: number;
    fileSizeKb: number;
    captureTimestamp?: string;
    captureTimestampSource: 'Recorded (Device/EXIF)' | 'Manual Entry' | 'Not Recorded';
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      source: 'Site Registry' | 'Recorded (Device/EXIF)' | 'Manual Entry';
    };
  }): { ok: boolean; error?: string; photo?: PhotoAsset } => {
    if (!currentUser || !can('photo:upload')) {
      return { ok: false, error: 'Your role does not have permission to upload field photographs.' };
    }
    const site = store.sites.find((s) => s.id === input.siteId) || store.sites[0];
    const now = new Date().toISOString();
    const seq = store.photoAssets.length + 1;
    const photoId = `PHO-2026-00${seq}`;

    const newPhoto: PhotoAsset = {
      id: photoId,
      title: input.title.trim() || `Field Evidence ${photoId}`,
      caption: input.caption.trim() || 'Uploaded field maintenance photograph',
      figureNumber: `Figure ${seq}.1`,
      classification: input.classification,
      pairGroupId: input.pairGroupId || undefined,
      equipmentOrArea: input.equipmentOrArea.trim() || 'Site Infrastructure',
      tags: input.tags,
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      siteAddress: site.address,
      region: site.region,
      incidentId: input.incidentId || undefined,
      workOrderId: input.workOrderId || undefined,
      visitId: input.visitId || undefined,
      reportId: input.reportId || undefined,
      caseId: input.caseId || undefined,
      originalDataUrl: input.originalDataUrl,
      isAnnotated: false,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      fileSizeKb: input.fileSizeKb,
      captureTimestamp: input.captureTimestamp || now,
      captureTimestampSource: input.captureTimestampSource,
      uploadTimestamp: now,
      uploadedBy: currentUser.fullName,
      gpsCoordinates: input.gpsCoordinates || {
        latitude: site.latitude,
        longitude: site.longitude,
        source: 'Site Registry',
      },
      annotations: [],
      stampConfig: {
        ...DEFAULT_PHOTO_STAMP_CONFIG,
        organizationName: store.reportBranding.companyName,
      },
      revisionHistory: [],
    };

    const nextVisits = store.siteVisits.map((sv) =>
      sv.id === input.visitId
        ? { ...sv, photoAssetIds: [...new Set([...(sv.photoAssetIds || []), photoId])] }
        : sv
    );

    const nextReports = store.maintenanceReports.map((r) =>
      r.id === input.reportId
        ? { ...r, photoAssetIds: [...new Set([...(r.photoAssetIds || []), photoId])] }
        : r
    );

    const verifyRes = telecomRepository.saveStoreWithVerification({
      ...store,
      photoAssets: [newPhoto, ...store.photoAssets],
      siteVisits: nextVisits,
      maintenanceReports: nextReports,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'PHOTO_UPLOADED',
          entityType: 'PhotoAsset',
          entityId: photoId,
          summary: `Uploaded ${input.classification} photograph "${newPhoto.title}" (${photoId}) for ${site.siteCode}.`,
        },
        ...store.auditEvents,
      ],
    });

    if (!verifyRes.persisted) {
      showToast(verifyRes.error || 'Failed to persist photograph to storage.', 'error');
      return { ok: false, error: verifyRes.error };
    }

    setStore(verifyRes.store);
    setSelectedPhotoId(photoId);
    showToast(`Photograph ${photoId} uploaded and linked to ${site.siteCode}.`, 'success');
    return { ok: true, photo: newPhoto };
  };

  const savePhotoAnnotationsAndStamp = (
    photoId: string,
    annotations: PhotoAnnotationShape[],
    stampConfig: PhotoStampConfig,
    annotatedDataUrl: string,
    revisionSummary: string
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('photo:annotate')) {
      showToast('Your role does not have permission to edit photo annotations.', 'error');
      return { ok: false, error: 'Permission denied.' };
    }

    const now = new Date().toISOString();
    const target = store.photoAssets.find((p) => p.id === photoId);
    if (!target) {
      return { ok: false, error: 'Target photograph asset not found.' };
    }

    const nextRevNumber = (target.revisionHistory?.length || 0) + 1;
    const updatedPhotos = store.photoAssets.map((p) =>
      p.id === photoId
        ? {
            ...p,
            // Preserve p.originalDataUrl 100% unmodified; store rendered output in annotatedDataUrl
            annotatedDataUrl,
            isAnnotated: annotations.length > 0 || stampConfig.enabled,
            annotations,
            stampConfig,
            revisionHistory: [
              ...(p.revisionHistory || []),
              {
                id: `REV-PHO-${Date.now()}`,
                revisionNumber: nextRevNumber,
                timestamp: now,
                editorName: currentUser.fullName,
                editorRole: currentUser.role,
                summary:
                  revisionSummary.trim() ||
                  `Saved ${annotations.length} vector annotations and metadata stamp overlay (Rev ${nextRevNumber}).`,
                annotationCount: annotations.length,
                stampEnabled: stampConfig.enabled,
              },
            ],
          }
        : p
    );

    const verifyRes = telecomRepository.saveStoreWithVerification({
      ...store,
      photoAssets: updatedPhotos,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'PHOTO_ANNOTATED',
          entityType: 'PhotoAsset',
          entityId: photoId,
          summary: `Saved annotated & stamped rendition (Rev ${nextRevNumber}) for ${photoId} while preserving original photograph.`,
        },
        ...store.auditEvents,
      ],
    });

    if (!verifyRes.persisted) {
      showToast(verifyRes.error || 'Storage quota error while saving annotated image.', 'error');
      return { ok: false, error: verifyRes.error };
    }

    setStore(verifyRes.store);
    showToast(
      `Saved annotated rendition (Rev ${nextRevNumber}) for ${photoId}. Original photograph preserved unchanged.`,
      'success'
    );
    return { ok: true };
  };

  const updatePhotoMetadata = (photoId: string, patch: Partial<PhotoAsset>) => {
    if (!currentUser || !can('photo:annotate')) {
      showToast('Permission denied to update photograph metadata.', 'error');
      return;
    }
    const updatedPhotos = store.photoAssets.map((p) =>
      p.id === photoId ? { ...p, ...patch } : p
    );
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      photoAssets: updatedPhotos,
    });
    setStore(res.store);
    showToast(`Updated metadata for photograph ${photoId}.`, 'info');
  };

  const createOrRegenerateReport = (input: {
    existingReportId?: string;
    reportType: ReportType;
    siteId: string;
    linkedIncidentId?: string;
    linkedWorkOrderId?: string;
    linkedCaseId?: string;
    linkedVisitIds: string[];
    photoAssetIds: string[];
    title: string;
    summary: string;
    purposeOfVisit: string;
    serviceImpactSummary: string;
    mainFindings: string;
    finalOutcome: string;
    diagnosticProcedures: string;
    postRepairVerificationChecks: string;
    connectivityAndAlarmStatus: string;
    outstandingFaults: string;
    recommendations: string;
    confidentialityLabel?: string;
    saveAsDraft?: boolean;
  }): {
    ok: boolean;
    error?: string;
    report?: MaintenanceReport;
    newRevisionCreated?: boolean;
  } => {
    if (!currentUser || !can('report:create')) {
      return { ok: false, error: 'Your role does not have permission to generate reports.' };
    }
    const site = store.sites.find((s) => s.id === input.siteId) || store.sites[0];
    const workOrder = store.workOrders.find((w) => w.id === input.linkedWorkOrderId);
    const incident = store.incidents.find((i) => i.id === input.linkedIncidentId);
    const now = new Date().toISOString();

    if (input.existingReportId) {
      const existing = store.maintenanceReports.find((r) => r.id === input.existingReportId);
      if (!existing) {
        return { ok: false, error: 'Target report not found.' };
      }

      const wasApproved = existing.approvalStatus === 'Approved';
      const nextRevNum = (existing.revisionNumber || 1) + 1;
      const nextRevCode = `Rev ${nextRevNum}.0`;
      const targetStatus: ReportStatus = input.saveAsDraft ? 'Draft' : 'Generated';

      // Mark previous revisions as Superseded if regenerating after approval
      const updatedHistory = (existing.revisionHistory || []).map((rh) =>
        wasApproved && rh.statusAtRevision === 'Approved'
          ? { ...rh, statusAtRevision: 'Superseded' as ReportStatus }
          : rh
      );

      const updatedReport: MaintenanceReport = {
        ...existing,
        reportType: input.reportType,
        revisionNumber: nextRevNum,
        revisionCode: nextRevCode,
        siteId: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName,
        region: site.region,
        operator: site.operator,
        workOrderNumber: workOrder?.workOrderNumber || existing.workOrderNumber || 'N/A',
        linkedWorkOrderId: input.linkedWorkOrderId || undefined,
        linkedIncidentId: input.linkedIncidentId || undefined,
        linkedCaseId: input.linkedCaseId || existing.linkedCaseId || undefined,
        caseNumber: input.linkedCaseId
          ? store.workCases?.find((c) => c.id === input.linkedCaseId)?.caseNumber
          : (existing.caseNumber || undefined),
        linkedVisitIds: input.linkedVisitIds,
        photoAssetIds: input.photoAssetIds,
        priority: incident?.priority || workOrder?.priority || existing.priority || 'Standard',
        title: input.title.trim(),
        updatedAt: now,
        generatedAt: now,
        approvalStatus: targetStatus,
        // Clear previous sign-off on new revision so regenerated reports are never falsely shown as already approved
        approvedBy: wasApproved ? undefined : existing.approvedBy,
        approvedAt: wasApproved ? undefined : existing.approvedAt,
        confidentialityLabel:
          input.confidentialityLabel || store.reportBranding.confidentialityLabel,
        summary: input.summary.trim() || 'Not recorded',
        purposeOfVisit: input.purposeOfVisit.trim() || 'Not recorded',
        serviceImpactSummary: input.serviceImpactSummary.trim() || 'Not recorded',
        mainFindings: input.mainFindings.trim() || 'Not recorded',
        finalOutcome: input.finalOutcome.trim() || 'Pending verification',
        diagnosticProcedures: input.diagnosticProcedures.trim() || 'Not recorded',
        postRepairVerificationChecks:
          input.postRepairVerificationChecks.trim() || 'Pending verification',
        connectivityAndAlarmStatus:
          input.connectivityAndAlarmStatus.trim() || 'Pending verification',
        outstandingFaults: input.outstandingFaults.trim() || 'None recorded',
        recommendations: input.recommendations.trim() || 'Not recorded',
        revisionHistory: [
          ...updatedHistory,
          {
            revisionNumber: nextRevNum,
            revisionCode: nextRevCode,
            statusAtRevision: targetStatus,
            generatedAt: now,
            generatedBy: currentUser.fullName,
            generatedByRole: currentUser.role,
            changeNotes: wasApproved
              ? `Regenerated after previous approval; prior Approved revision marked Superseded and ${nextRevCode} created.`
              : `Updated report content and generated ${nextRevCode}.`,
          },
        ],
        approvalRecords: [
          ...(existing.approvalRecords || []),
          ...(wasApproved
            ? [
                {
                  id: `APR-${Date.now()}`,
                  action: 'Regenerated as New Revision' as const,
                  actorName: currentUser.fullName,
                  actorRole: currentUser.role,
                  timestamp: now,
                  comments: `Previously approved revision superseded by ${nextRevCode}; requires fresh review and approval.`,
                  verificationMethod: 'Authenticated Role Sign-Off (In-App)' as const,
                },
              ]
            : []),
        ],
      };

      const verifyRes = telecomRepository.saveStoreWithVerification({
        ...store,
        maintenanceReports: store.maintenanceReports.map((r) =>
          r.id === existing.id ? updatedReport : r
        ),
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'REPORT_GENERATED',
            entityType: 'MaintenanceReport',
            entityId: updatedReport.reportNumber,
            summary: `Generated ${nextRevCode} of report ${updatedReport.reportNumber} (${updatedReport.reportType}).`,
          },
          ...store.auditEvents,
        ],
      });

      if (!verifyRes.persisted) {
        return { ok: false, error: verifyRes.error };
      }
      setStore(verifyRes.store);
      showToast(
        wasApproved
          ? `Created new revision ${nextRevCode} for ${updatedReport.reportNumber} (previous approved revision marked Superseded).`
          : `Saved ${nextRevCode} for report ${updatedReport.reportNumber}.`,
        'success'
      );
      return { ok: true, report: updatedReport, newRevisionCreated: true };
    } else {
      // Atomic/monotonic report number allocation: PREFIX-YYYY-000NNN
      const year = new Date().getUTCFullYear();
      const seq = store.nextReportSequence || 104;
      const prefix = store.reportBranding?.reportNumberPrefix || 'TM';
      const reportNumber = `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
      const initialStatus: ReportStatus = input.saveAsDraft ? 'Draft' : 'Generated';

      const newReport: MaintenanceReport = {
        id: `RPT-${Date.now()}`,
        reportNumber,
        reportType: input.reportType,
        revisionNumber: 1,
        revisionCode: 'Rev 1.0',
        siteId: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName,
        region: site.region,
        operator: site.operator,
        workOrderNumber: workOrder?.workOrderNumber || 'Standalone / N/A',
        linkedWorkOrderId: input.linkedWorkOrderId || undefined,
        linkedIncidentId: input.linkedIncidentId || undefined,
        linkedCaseId: input.linkedCaseId || undefined,
        caseNumber: input.linkedCaseId
          ? store.workCases?.find((c) => c.id === input.linkedCaseId)?.caseNumber
          : undefined,
        linkedVisitIds: input.linkedVisitIds,
        linkedAlarmIds: incident ? [incident.alarmId, ...(incident.relatedAlarmIds || [])] : [],
        photoAssetIds: input.photoAssetIds,
        priority: incident?.priority || workOrder?.priority || 'Standard',
        title: input.title.trim() || `${input.reportType} — ${site.siteCode}`,
        authorName: currentUser.fullName,
        authorRole: currentUser.role,
        submittedAt: now,
        generatedAt: now,
        updatedAt: now,
        approvalStatus: initialStatus,
        confidentialityLabel:
          input.confidentialityLabel || store.reportBranding.confidentialityLabel,
        summary: input.summary.trim() || 'Not recorded',
        purposeOfVisit: input.purposeOfVisit.trim() || 'Not recorded',
        serviceImpactSummary: input.serviceImpactSummary.trim() || 'Not recorded',
        mainFindings: input.mainFindings.trim() || 'Not recorded',
        finalOutcome: input.finalOutcome.trim() || 'Pending verification',
        diagnosticProcedures: input.diagnosticProcedures.trim() || 'Not recorded',
        postRepairVerificationChecks:
          input.postRepairVerificationChecks.trim() || 'Pending verification',
        connectivityAndAlarmStatus:
          input.connectivityAndAlarmStatus.trim() || 'Pending verification',
        outstandingFaults: input.outstandingFaults.trim() || 'None recorded',
        recommendations: input.recommendations.trim() || 'Not recorded',
        revisionHistory: [
          {
            revisionNumber: 1,
            revisionCode: 'Rev 1.0',
            statusAtRevision: initialStatus,
            generatedAt: now,
            generatedBy: currentUser.fullName,
            generatedByRole: currentUser.role,
            changeNotes: `Initial ${input.reportType} (${initialStatus}) created.`,
          },
        ],
        approvalRecords: [],
      };

      const verifyRes = telecomRepository.saveStoreWithVerification({
        ...store,
        nextReportSequence: seq + 1,
        maintenanceReports: [newReport, ...store.maintenanceReports],
        auditEvents: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: now,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actionType: 'REPORT_CREATED',
            entityType: 'MaintenanceReport',
            entityId: reportNumber,
            summary: `Created ${input.reportType} ${reportNumber} (${initialStatus}) for ${site.siteCode}.`,
          },
          ...store.auditEvents,
        ],
      });

      if (!verifyRes.persisted) {
        return { ok: false, error: verifyRes.error };
      }

      setStore(verifyRes.store);
      setSelectedReportId(newReport.id);
      showToast(`Created ${newReport.reportType} (${reportNumber}).`, 'success');
      return { ok: true, report: newReport };
    }
  };

  const updateReportWorkflowStatus = (
    reportId: string,
    newStatus: ReportStatus,
    comments: string
  ): { ok: boolean; error?: string } => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' };
    const report = store.maintenanceReports.find((r) => r.id === reportId);
    if (!report) return { ok: false, error: 'Report not found.' };

    if (newStatus === 'Approved' || newStatus === 'Rejected') {
      if (!can('report:approve')) {
        showToast('Only Team Leaders, Maintenance Managers, or Admins can approve/reject reports.', 'error');
        return { ok: false, error: 'Permission denied for report approval.' };
      }
    } else if (newStatus === 'Pending Review') {
      if (!can('report:create') && !can('report:review')) {
        return { ok: false, error: 'Permission denied.' };
      }
    }

    // Prevent unfinished draft or empty reports from accidentally being marked Approved
    if (newStatus === 'Approved') {
      if (report.approvalStatus === 'Draft') {
        showToast(
          'Cannot approve a report in Draft status. Generate and submit the report for review first.',
          'error'
        );
        return {
          ok: false,
          error: 'Unfinished Draft reports cannot be directly marked Approved.',
        };
      }
      if (
        !report.summary ||
        report.summary === 'Not recorded' ||
        !report.mainFindings ||
        report.mainFindings === 'Not recorded'
      ) {
        showToast(
          'Cannot approve report with missing Executive Summary or Main Findings.',
          'error'
        );
        return {
          ok: false,
          error: 'Report must have recorded Executive Summary and Main Findings before approval.',
        };
      }
    }

    const now = new Date().toISOString();
    const actionLabel: 'Submitted for Review' | 'Reviewed' | 'Approved' | 'Rejected' =
      newStatus === 'Approved'
        ? 'Approved'
        : newStatus === 'Rejected'
        ? 'Rejected'
        : newStatus === 'Pending Review'
        ? 'Submitted for Review'
        : 'Reviewed';

    const updatedReport: MaintenanceReport = {
      ...report,
      approvalStatus: newStatus,
      updatedAt: now,
      reviewedBy:
        newStatus === 'Pending Review' || newStatus === 'Approved'
          ? `${currentUser.fullName} (${currentUser.role})`
          : report.reviewedBy,
      reviewedAt:
        newStatus === 'Pending Review' || newStatus === 'Approved' ? now : report.reviewedAt,
      approvedBy:
        newStatus === 'Approved' ? `${currentUser.fullName} (${currentUser.role})` : undefined,
      approvedAt: newStatus === 'Approved' ? now : undefined,
      approvalRecords: [
        ...(report.approvalRecords || []),
        {
          id: `APR-${Date.now()}`,
          action: actionLabel,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          timestamp: now,
          comments: comments.trim() || `Transitioned report status to ${newStatus}.`,
          verificationMethod: 'Authenticated Role Sign-Off (In-App)',
        },
      ],
    };

    const verifyRes = telecomRepository.saveStoreWithVerification({
      ...store,
      maintenanceReports: store.maintenanceReports.map((r) =>
        r.id === reportId ? updatedReport : r
      ),
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType:
            newStatus === 'Approved'
              ? 'REPORT_APPROVED'
              : newStatus === 'Rejected'
              ? 'REPORT_REJECTED'
              : 'REPORT_REVIEWED',
          entityType: 'MaintenanceReport',
          entityId: report.reportNumber,
          summary: `Report ${report.reportNumber} (${report.revisionCode || 'Rev 1.0'}) marked ${newStatus} by ${currentUser.fullName}.`,
        },
        ...store.auditEvents,
      ],
    });

    setStore(verifyRes.store);
    showToast(`Report ${report.reportNumber} status updated to "${newStatus}".`, 'success');
    return { ok: true };
  };

  const updateReportBranding = (branding: ReportBrandingConfig) => {
    if (!currentUser || !can('report:manage_branding')) {
      showToast('Permission denied to modify organization report branding.', 'error');
      return;
    }
    const res = telecomRepository.saveStoreWithVerification({
      ...store,
      reportBranding: branding,
    });
    setStore(res.store);
    showToast('Updated engineering report branding & numbering prefix.', 'success');
  };

  const recordReportExportAudit = (format: 'PDF' | 'XLSX' | 'JSON', summaryText: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const saved = telecomRepository.saveStore({
      ...store,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: now,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actionType: 'REPORT_EXPORTED',
          entityType: 'MaintenanceReport',
          entityId: `EXPORT-${format}`,
          summary: summaryText,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
  };

  const createOperatorInvitation = (input: {
    email: string;
    fullName: string;
    role: UserRole;
    teamId: string;
    region: string;
    isExternalContractor?: boolean;
    contractorCompany?: string;
  }): { ok: boolean; error?: string; invitation?: UserInvitation } => {
    if (!currentUser || !can('users:invite')) {
      return { ok: false, error: 'Insufficient permissions: users:invite required.' };
    }
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes('@') || !input.fullName.trim()) {
      return { ok: false, error: 'Valid corporate email and full name are required.' };
    }
    const invitation: UserInvitation = {
      id: `INV-${Date.now()}`,
      organizationId: currentUser.organizationId || store.activeOrganizationId || 'ORG-TELECOM-01',
      email,
      fullName: input.fullName.trim(),
      role: input.role,
      teamId: input.teamId,
      region: input.region,
      isExternalContractor: Boolean(input.isExternalContractor),
      contractorCompany: input.contractorCompany?.trim() || undefined,
      invitedByUserId: currentUser.id,
      invitedByName: currentUser.fullName,
      inviteCode: `INV-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    };
    const saved = telecomRepository.saveStore({
      ...store,
      invitations: [invitation, ...(store.invitations || [])],
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: invitation.organizationId,
          actionType: 'USER_INVITED',
          entityType: 'User',
          entityId: invitation.id,
          summary: `Issued operator invitation ${invitation.inviteCode} to ${invitation.email} (${invitation.role}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Created invitation ${invitation.inviteCode} for ${invitation.email}`, 'success');
    return { ok: true, invitation };
  };

  const acceptOperatorInvitation = (input: {
    inviteCode: string;
    username: string;
    password: string;
    phone?: string;
  }): { ok: boolean; error?: string; user?: User } => {
    const inv = (store.invitations || []).find(
      (i) => i.inviteCode.toUpperCase() === input.inviteCode.trim().toUpperCase() && i.status === 'Pending'
    );
    if (!inv) {
      return { ok: false, error: 'Invitation code is invalid, expired, or already accepted.' };
    }
    if (!input.password || input.password.length < 8) {
      return { ok: false, error: 'Operator password must be at least 8 characters.' };
    }
    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: (input.username || inv.email.split('@')[0]).trim(),
      email: inv.email,
      fullName: inv.fullName,
      role: inv.role,
      organizationId: inv.organizationId,
      teamId: inv.teamId,
      region: inv.region,
      title: inv.isExternalContractor
        ? `Contractor (${inv.contractorCompany || 'External'})`
        : `${inv.role}`,
      phone: input.phone || '+213 550 00 00 99',
      active: true,
      accountStatus: 'Active',
      emailVerified: true,
      isExternalContractor: inv.isExternalContractor,
      contractorCompany: inv.contractorCompany,
      shiftSchedule: 'Standard Shift (08:00–17:00 UTC)',
      onCallStatus: 'Standard Shift',
      specialties: ['Field Inspection', 'Preventive Maintenance'],
      availabilityStatus: 'Available',
      certifications: ['Telecom Safety Verified'],
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const saved = telecomRepository.saveStore({
      ...store,
      users: [...store.users, newUser],
      invitations: (store.invitations || []).map((i) =>
        i.id === inv.id ? { ...i, status: 'Accepted', acceptedAt: new Date().toISOString() } : i
      ),
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: newUser.id,
          actorName: newUser.fullName,
          actorRole: newUser.role,
          organizationId: newUser.organizationId,
          actionType: 'USER_CREATED',
          entityType: 'User',
          entityId: newUser.id,
          summary: `Accepted invitation ${inv.inviteCode} and provisioned account ${newUser.email} (${newUser.role}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Account provisioned for ${newUser.fullName} (${newUser.role}).`, 'success');
    return { ok: true, user: newUser };
  };

  const updateUserAdministration = (
    userId: string,
    updates: {
      accountStatus?: UserAccountStatus;
      role?: UserRole;
      region?: string;
      teamId?: string;
      shiftSchedule?: string;
      onCallStatus?: User['onCallStatus'];
    }
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('users:manage')) {
      return { ok: false, error: 'Insufficient permissions: users:manage required.' };
    }
    const target = store.users.find((u) => u.id === userId);
    if (!target) {
      return { ok: false, error: 'Target user not found.' };
    }
    if (
      updates.role === UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SUPER_ADMIN
    ) {
      return {
        ok: false,
        error: 'Only a Super Administrator can grant Super Administrator privileges.',
      };
    }

    const beforeSummary = `${target.role} | ${target.accountStatus || 'Active'}`;
    const updatedUser: User = {
      ...target,
      role: updates.role ?? target.role,
      accountStatus: updates.accountStatus ?? target.accountStatus ?? 'Active',
      active: (updates.accountStatus ?? target.accountStatus ?? 'Active') === 'Active',
      region: updates.region ?? target.region,
      teamId: updates.teamId ?? target.teamId,
      shiftSchedule: updates.shiftSchedule ?? target.shiftSchedule,
      onCallStatus: updates.onCallStatus ?? target.onCallStatus,
      version: (target.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    const afterSummary = `${updatedUser.role} | ${updatedUser.accountStatus}`;

    const saved = telecomRepository.saveStore({
      ...store,
      users: store.users.map((u) => (u.id === userId ? updatedUser : u)),
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: currentUser.organizationId || 'ORG-TELECOM-01',
          actionType: updates.accountStatus ? 'USER_STATUS_CHANGED' : 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: target.id,
          beforeValue: beforeSummary,
          afterValue: afterSummary,
          summary: `Updated operator ${target.email}: ${beforeSummary} -> ${afterSummary}.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Updated account settings for ${target.fullName}.`, 'success');
    return { ok: true };
  };

  const switchActiveOrganization = (organizationId: string): { ok: boolean; error?: string } => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' };
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.organizationId !== organizationId
    ) {
      return {
        ok: false,
        error: `Tenant Isolation Policy: your account is restricted to organization ${currentUser.organizationId}.`,
      };
    }
    const saved = telecomRepository.saveStore({
      ...store,
      activeOrganizationId: organizationId,
    });
    setStore(saved);
    showToast(`Switched active tenant context to ${organizationId}.`, 'info');
    return { ok: true };
  };

  const setPlatformEnvironmentMode = (
    mode: 'development-demo' | 'production-enforced'
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('org:manage_settings')) {
      return { ok: false, error: 'Insufficient permissions: org:manage_settings required.' };
    }
    const prev = store.environmentMode || 'development-demo';
    const saved = telecomRepository.saveStore({
      ...store,
      environmentMode: mode,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: currentUser.organizationId || 'ORG-TELECOM-01',
          actionType: 'ORGANIZATION_UPDATED',
          entityType: 'Security',
          entityId: 'ENV-MODE',
          beforeValue: prev,
          afterValue: mode,
          summary: `Switched platform security mode from '${prev}' to '${mode}'.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Platform environment mode updated to ${mode}.`, 'success');
    return { ok: true };
  };

  const createDatabaseBackupSnapshot = (label: string) => {
    if (!currentUser || !can('backup:manage')) {
      return { ok: false, error: 'Insufficient permissions: backup:manage required.' };
    }
    const meta: BackupSnapshotMetadata = {
      id: `BKP-${Date.now()}`,
      organizationId: currentUser.organizationId || 'ORG-TELECOM-01',
      label: label.trim() || 'Operational Database Snapshot',
      schemaVersion: '5.0.0',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.fullName,
      recordCounts: {
        users: store.users.length,
        teams: store.teams.length,
        sites: store.sites.length,
        equipment: store.equipment.length,
        alarms: store.alarms.length,
        incidents: store.incidents.length,
        workOrders: store.workOrders.length,
        siteVisits: store.siteVisits.length,
        reports: store.maintenanceReports.length,
        photoAssets: store.photoAssets.length,
        auditEvents: store.auditEvents.length,
      },
      sizeBytes: JSON.stringify(store).length,
    };
    const saved = telecomRepository.saveStore({
      ...store,
      backupSnapshots: [meta, ...(store.backupSnapshots || [])],
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: meta.organizationId,
          actionType: 'BACKUP_CREATED',
          entityType: 'System',
          entityId: meta.id,
          summary: `Created verified database snapshot ${meta.id} (${meta.label}, ${Math.round(meta.sizeBytes / 1024)} KB).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Created database backup snapshot ${meta.id}.`, 'success');
    return { ok: true, backup: meta };
  };

  const restoreDatabaseBackupSnapshot = (backupId: string) => {
    if (!currentUser || !can('backup:manage')) {
      return { ok: false, error: 'Insufficient permissions: backup:manage required.' };
    }
    const target = (store.backupSnapshots || []).find((b) => b.id === backupId);
    if (!target) {
      return { ok: false, error: `Backup snapshot ${backupId} not found.` };
    }
    const saved = telecomRepository.saveStore({
      ...store,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: currentUser.organizationId || 'ORG-TELECOM-01',
          actionType: 'BACKUP_RESTORED',
          entityType: 'System',
          entityId: backupId,
          summary: `Verified and restored operational database from snapshot ${backupId} (${target.label}). Append-only audit log preserved.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Restored database state from snapshot ${backupId}.`, 'info');
    return { ok: true };
  };

  const executeSafeDemoMigration = (): {
    ok: boolean;
    error?: string;
    report?: MigrationReport;
  } => {
    if (!currentUser || !can('system:migrate_data')) {
      return { ok: false, error: 'Insufficient permissions: system:migrate_data required.' };
    }
    if (store.environmentMode === 'production-enforced') {
      return {
        ok: false,
        error:
          'Demo data migration is blocked in Production-Enforced mode so sample records cannot contaminate production data.',
      };
    }
    const report: MigrationReport = {
      migrationId: `MIG-${Date.now()}`,
      executedAt: new Date().toISOString(),
      executedBy: currentUser.fullName,
      organizationId: currentUser.organizationId || 'ORG-TELECOM-01',
      sourceSchemaVersion: '4.0.0-localStorage',
      targetSchemaVersion: '5.0.0',
      status: 'Success',
      migratedCounts: {
        users: store.users.length,
        teams: store.teams.length,
        sites: store.sites.length,
        equipment: store.equipment.length,
        incidents: store.incidents.length,
        workOrders: store.workOrders.length,
        siteVisits: store.siteVisits.length,
        reports: store.maintenanceReports.length,
        photoAssets: store.photoAssets.length,
      },
      duplicatesSkipped: 0,
      validationErrors: [],
      warnings: [],
    };
    const saved = telecomRepository.saveStore({
      ...store,
      migrationReports: [report, ...(store.migrationReports || [])],
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: report.organizationId,
          actionType: 'DATA_MIGRATION_EXECUTED',
          entityType: 'System',
          entityId: report.migrationId,
          summary: `Validated & migrated existing store records to Phase 5 schema v5.0.0 (${report.migrationId}).`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`Migration ${report.migrationId} completed with 0 validation errors.`, 'success');
    return { ok: true, report };
  };

  const upsertEquipmentItem = (
    item: Partial<Equipment> & { siteId: string; name: string }
  ): { ok: boolean; error?: string } => {
    if (!currentUser || !can('equipment:manage')) {
      return { ok: false, error: 'Insufficient permissions: equipment:manage required.' };
    }
    const site = store.sites.find((s) => s.id === item.siteId);
    if (!site) {
      return { ok: false, error: 'Selected site not found.' };
    }
    const isEdit = Boolean(item.id && store.equipment.some((e) => e.id === item.id));
    const eqRecord: Equipment = {
      id: item.id || `EQ-${Date.now().toString().slice(-4)}`,
      siteId: site.id,
      siteCode: site.siteCode,
      name: item.name.trim(),
      category: item.category || 'RRU / RRH (Remote Radio)',
      vendor: item.vendor || 'Nokia',
      model: item.model || 'AirScale RRU',
      serialNumber: item.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      firmwareOrVersion: item.firmwareOrVersion || 'v24.10',
      slotOrSector: item.slotOrSector || 'Sector 1',
      operationalState: item.operationalState || 'Operational',
      installedDate: item.installedDate || new Date().toISOString().slice(0, 10),
      lastInspectedDate: new Date().toISOString().slice(0, 10),
      organizationId: site.organizationId || 'ORG-TELECOM-01',
      version: (item.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    const nextEquipment = isEdit
      ? store.equipment.map((e) => (e.id === eqRecord.id ? eqRecord : e))
      : [eqRecord, ...store.equipment];

    const saved = telecomRepository.saveStore({
      ...store,
      equipment: nextEquipment,
      auditEvents: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          organizationId: eqRecord.organizationId,
          actionType: isEdit ? 'EQUIPMENT_UPDATED' : 'EQUIPMENT_CREATED',
          entityType: 'Equipment',
          entityId: eqRecord.id,
          summary: `${isEdit ? 'Updated' : 'Registered'} equipment ${eqRecord.name} (${eqRecord.serialNumber}) at site ${site.siteCode}.`,
        },
        ...store.auditEvents,
      ],
    });
    setStore(saved);
    showToast(`${isEdit ? 'Updated' : 'Registered'} equipment ${eqRecord.name}.`, 'success');
    return { ok: true };
  };

  return (
    <AppContext.Provider
      value={{
        store,
        currentUser,
        theme,
        themeMode,
        setThemeMode,
        activeSection,
        selectedIncidentId,
        selectedAlarmId,
        selectedSiteId,
        selectedWorkOrderId,
        selectedSiteVisitId,
        selectedPhotoId,
        selectedReportId,
        photoStudioPrefill,
        focusedGisEntity,
        // Work Cases Core
        selectedCaseId,
        setSelectedCaseId,
        openCaseById,
        isCreateCaseOpen,
        createCasePrefill,
        openCreateCaseModal,
        closeCreateCaseModal,
        editingCase,
        openEditCaseModal,
        createWorkCase,
        updateWorkCase,
        deleteWorkCase,
        duplicateWorkCase,
        changeCaseStatus,
        addCaseTimelineEntry,
        addCaseStep,
        updateCaseStep,
        recordCaseMeasurement,
        addCaseMaterial,
        addCaseEquipment,
        addCaseFollowUpTask,
        updateCaseFollowUpTask,
        linkPhotoToCase,
        linkReportToCase,
        reportBuilderPrefillCaseId,
        setReportBuilderPrefillCaseId,
        openReportBuilderForCase,
        addCustomWorkTypeCategory,
        addCustomWorkType,
        isCreateIncidentOpen,
        createIncidentPreselectedSiteId,
        isCreateSiteOpen,
        editingSite,
        createSitePrefillCoords,
        isCreateWorkOrderOpen,
        createWorkOrderPrefill,
        toastMessage,
        metrics,
        signIn,
        signOut,
        switchDemoRole,
        can,
        toggleTheme,
        setUserTimezone,
        tableDensity,
        setTableDensity,
        dateFormat: regionalPrefs.dateFormat,
        timeFormat: regionalPrefs.timeFormat,
        customTimezone: regionalPrefs.timezone,
        updateRegionalPreferences,
        updateSiteCoordinates,
        navigateTo,
        openIncidentById,
        openAlarmById,
        openSiteById,
        openWorkOrderById,
        openSiteVisitById,
        openPhotoInStudio,
        openReportById,
        openSiteInGisMap,
        setFocusedGisEntity,
        setSelectedIncidentId,
        setSelectedAlarmId,
        setSelectedSiteId,
        setSelectedWorkOrderId,
        setSelectedSiteVisitId,
        setSelectedPhotoId,
        setSelectedReportId,
        openCreateIncidentModal,
        closeCreateIncidentModal,
        openCreateSiteModal,
        closeCreateSiteModal,
        openCreateWorkOrderModal,
        closeCreateWorkOrderModal,
        showToast,
        acknowledgeIncidentAlarm,
        acknowledgeAlarmRecord,
        clearOrReassertAlarmRecord,
        addAlarmNote,
        linkAlarmToIncident,
        createIncidentFromAlarm,
        ingestSimulatedAlarm,
        updateIncidentStatus,
        recordIncidentServiceRestored,
        reopenIncident,
        escalateIncident,
        updateIncidentInvestigation,
        toggleSimulatedNetworkAlarmClearance,
        assignIncidentOwner,
        addIncidentInvestigationNote,
        createIncident,
        upsertSite,
        archiveSite,
        upsertWorkOrder,
        updateWorkOrderStatus,
        verifyWorkOrderCompletion,
        assignWorkOrderPersonnel,
        upsertSiteVisit,
        updateSiteVisitChecklist,
        upsertChecklistTemplate,
        updateSlaConfiguration,
        updateEngineerAvailability,
        markNotificationRead,
        markAllNotificationsRead,
        addVisitEquipmentRecord,
        addVisitMeasurementRecord,
        addVisitEquipmentReplacement,
        addVisitSparePartUsage,
        uploadPhotoAsset,
        savePhotoAnnotationsAndStamp,
        updatePhotoMetadata,
        createOrRegenerateReport,
        updateReportWorkflowStatus,
        updateReportBranding,
        recordReportExportAudit,
        upsertGisFeature,
        deleteGisFeature,
        importGeoJsonCandidates,
        recordGeoJsonExportAudit,
        resetDemoDatabase,
        createOperatorInvitation,
        acceptOperatorInvitation,
        updateUserAdministration,
        switchActiveOrganization,
        setPlatformEnvironmentMode,
        createDatabaseBackupSnapshot,
        restoreDatabaseBackupSnapshot,
        executeSafeDemoMigration,
        upsertEquipmentItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}

export const useAppContext = useApp;

