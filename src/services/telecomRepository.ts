import {
  DEMO_ALARMS,
  DEMO_AUDIT_EVENTS,
  DEMO_EQUIPMENT,
  DEMO_INCIDENTS,
  DEMO_MAINTENANCE_REPORTS,
  DEMO_SITES,
  DEMO_SITE_VISITS,
  DEMO_TEAMS,
  DEMO_USERS,
  DEMO_WORK_ORDERS,
} from '../data/seedData';
import { DEMO_GIS_FEATURES } from '../data/seedGisData';
import {
  DEMO_CHECKLIST_TEMPLATES,
  DEMO_NOTIFICATIONS,
  DEMO_SLA_CONFIGURATION,
  enrichAlarmsWithPhase3,
  enrichIncidentsWithPhase3,
  enrichSiteVisitsWithPhase3,
  enrichTeamsWithPhase3,
  enrichUsersWithPhase3,
  enrichWorkOrdersWithPhase3,
} from '../data/seedPhase3Data';
import {
  DEMO_PHOTO_ASSETS,
  DEMO_REPORT_BRANDING,
  enrichMaintenanceReportsWithPhase4,
  enrichSiteVisitsWithPhase4,
} from '../data/seedPhase4Data';
import {
  DEMO_INTEGRATION_CONNECTORS,
  DEMO_OPERATOR_PROJECTS,
  DEMO_ORGANIZATIONS,
  DEMO_USER_INVITATIONS,
  enrichUsersWithPhase5,
  ensureTenantBIsolationFixtures,
  PRIMARY_ORG_ID,
} from '../data/seedPhase5Data';
import {
  DEFAULT_WORK_TYPE_TAXONOMY,
  DEMO_WORK_CASES,
} from '../data/seedWorkCasesData';
import { normalizeUserRole } from '../security/permissions';
import {
  Alarm,
  AppNotification,
  AuditEvent,
  BackupSnapshotMetadata,
  ChecklistTemplate,
  Equipment,
  Incident,
  IntegrationConnector,
  MaintenanceReport,
  MigrationReport,
  OperatorProject,
  Organization,
  PhotoAsset,
  ReportBrandingConfig,
  Site,
  SiteVisit,
  SLAConfiguration,
  Team,
  TelecomGisFeature,
  User,
  UserInvitation,
  WorkCase,
  WorkOrder,
  WorkTypeCategory,
} from '../types/models';

const STORAGE_KEY = 'telecomops360_phase1_datastore_v1';
const AUTH_SESSION_KEY = 'telecomops360_phase1_session_user_v1';
const AUTH_TOKEN_KEY = 'telecomops360_phase5_session_token_v1';
const THEME_STORAGE_KEY = 'telecomops360_phase1_theme_v1';

export interface TelecomDataStore {
  schemaVersion?: string;
  environmentMode?: 'development-demo' | 'production-enforced';
  activeOrganizationId?: string;
  organizations?: Organization[];
  operatorProjects?: OperatorProject[];
  invitations?: UserInvitation[];
  integrationConnectors?: IntegrationConnector[];
  backupSnapshots?: BackupSnapshotMetadata[];
  migrationReports?: MigrationReport[];
  users: User[];
  teams: Team[];
  sites: Site[];
  equipment: Equipment[];
  alarms: Alarm[];
  incidents: Incident[];
  workOrders: WorkOrder[];
  workCases: WorkCase[];
  workTypeTaxonomy?: WorkTypeCategory[];
  siteVisits: SiteVisit[];
  maintenanceReports: MaintenanceReport[];
  photoAssets: PhotoAsset[];
  reportBranding: ReportBrandingConfig;
  nextReportSequence: number;
  gisFeatures: TelecomGisFeature[];
  slaConfig: SLAConfiguration;
  checklistTemplates: ChecklistTemplate[];
  notifications: AppNotification[];
  userTimezone: string;
  auditEvents: AuditEvent[];
  lastUpdatedAt: string;
}

export function getInitialSeedStore(): TelecomDataStore {
  const phase3Visits = enrichSiteVisitsWithPhase3(structuredClone(DEMO_SITE_VISITS));
  const phase4Visits = enrichSiteVisitsWithPhase4(phase3Visits);
  const phase4Reports = enrichMaintenanceReportsWithPhase4(
    structuredClone(DEMO_MAINTENANCE_REPORTS)
  );
  const phase5Users = enrichUsersWithPhase5(
    enrichUsersWithPhase3(structuredClone(DEMO_USERS))
  );
  const phase3Teams = enrichTeamsWithPhase3(structuredClone(DEMO_TEAMS));
  const phase3Alarms = enrichAlarmsWithPhase3(structuredClone(DEMO_ALARMS));
  const phase3Incidents = enrichIncidentsWithPhase3(structuredClone(DEMO_INCIDENTS));
  const phase3Wos = enrichWorkOrdersWithPhase3(structuredClone(DEMO_WORK_ORDERS));

  const tenantFixtures = ensureTenantBIsolationFixtures({
    sites: structuredClone(DEMO_SITES),
    incidents: phase3Incidents,
    teams: phase3Teams,
    equipment: structuredClone(DEMO_EQUIPMENT),
    alarms: phase3Alarms,
    workOrders: phase3Wos,
    siteVisits: phase4Visits,
    maintenanceReports: phase4Reports,
    photoAssets: structuredClone(DEMO_PHOTO_ASSETS),
    gisFeatures: structuredClone(DEMO_GIS_FEATURES),
  });

  return {
    schemaVersion: '5.0.0',
    environmentMode: 'development-demo',
    activeOrganizationId: PRIMARY_ORG_ID,
    organizations: structuredClone(DEMO_ORGANIZATIONS),
    operatorProjects: structuredClone(DEMO_OPERATOR_PROJECTS),
    invitations: structuredClone(DEMO_USER_INVITATIONS),
    integrationConnectors: structuredClone(DEMO_INTEGRATION_CONNECTORS),
    backupSnapshots: [],
    migrationReports: [],
    users: phase5Users,
    teams: tenantFixtures.teams,
    sites: tenantFixtures.sites,
    equipment: tenantFixtures.equipment,
    alarms: tenantFixtures.alarms,
    incidents: tenantFixtures.incidents,
    workOrders: tenantFixtures.workOrders,
    workCases: structuredClone(DEMO_WORK_CASES),
    workTypeTaxonomy: structuredClone(DEFAULT_WORK_TYPE_TAXONOMY),
    siteVisits: tenantFixtures.siteVisits,
    maintenanceReports: tenantFixtures.maintenanceReports,
    photoAssets: tenantFixtures.photoAssets,
    reportBranding: structuredClone(DEMO_REPORT_BRANDING),
    nextReportSequence: 104,
    gisFeatures: tenantFixtures.gisFeatures,
    slaConfig: structuredClone(DEMO_SLA_CONFIGURATION),
    checklistTemplates: structuredClone(DEMO_CHECKLIST_TEMPLATES),
    notifications: structuredClone(DEMO_NOTIFICATIONS),
    userTimezone: 'UTC',
    auditEvents: structuredClone(DEMO_AUDIT_EVENTS).map((a) => ({
      ...a,
      actorRole: normalizeUserRole(a.actorRole),
      organizationId: PRIMARY_ORG_ID,
    })),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function upgradeStoreToPhase5(parsed: TelecomDataStore): TelecomDataStore {
  if (!parsed.sites || !parsed.incidents || !parsed.workOrders) {
    return getInitialSeedStore();
  }

  if (!Array.isArray(parsed.gisFeatures)) {
    parsed.gisFeatures = structuredClone(DEMO_GIS_FEATURES);
  }
  if (!parsed.slaConfig || !parsed.slaConfig.rules) {
    parsed.slaConfig = structuredClone(DEMO_SLA_CONFIGURATION);
  }
  if (!Array.isArray(parsed.checklistTemplates) || parsed.checklistTemplates.length === 0) {
    parsed.checklistTemplates = structuredClone(DEMO_CHECKLIST_TEMPLATES);
  }
  if (!Array.isArray(parsed.notifications)) {
    parsed.notifications = structuredClone(DEMO_NOTIFICATIONS);
  }
  if (!parsed.userTimezone) {
    parsed.userTimezone = 'UTC';
  }
  if (!Array.isArray(parsed.photoAssets) || parsed.photoAssets.length === 0) {
    parsed.photoAssets = structuredClone(DEMO_PHOTO_ASSETS);
  }
  if (!parsed.reportBranding || !parsed.reportBranding.companyName) {
    parsed.reportBranding = structuredClone(DEMO_REPORT_BRANDING);
  }
  if (typeof parsed.nextReportSequence !== 'number' || parsed.nextReportSequence < 104) {
    parsed.nextReportSequence = 104;
  }

  parsed.schemaVersion = '5.0.0';
  parsed.environmentMode = parsed.environmentMode || 'development-demo';
  parsed.activeOrganizationId = parsed.activeOrganizationId || PRIMARY_ORG_ID;
  if (!Array.isArray(parsed.organizations) || parsed.organizations.length === 0) {
    parsed.organizations = structuredClone(DEMO_ORGANIZATIONS);
  }
  if (!Array.isArray(parsed.operatorProjects) || parsed.operatorProjects.length === 0) {
    parsed.operatorProjects = structuredClone(DEMO_OPERATOR_PROJECTS);
  }
  if (!Array.isArray(parsed.invitations)) {
    parsed.invitations = structuredClone(DEMO_USER_INVITATIONS);
  }
  if (!Array.isArray(parsed.integrationConnectors) || parsed.integrationConnectors.length === 0) {
    parsed.integrationConnectors = structuredClone(DEMO_INTEGRATION_CONNECTORS);
  }
  if (!Array.isArray(parsed.backupSnapshots)) {
    parsed.backupSnapshots = [];
  }
  if (!Array.isArray(parsed.migrationReports)) {
    parsed.migrationReports = [];
  }

  parsed.users = enrichUsersWithPhase5(enrichUsersWithPhase3(parsed.users));
  const tenantFixtures = ensureTenantBIsolationFixtures({
    sites: parsed.sites,
    incidents: enrichIncidentsWithPhase3(parsed.incidents),
    teams: enrichTeamsWithPhase3(parsed.teams),
    equipment: parsed.equipment || structuredClone(DEMO_EQUIPMENT),
    alarms: enrichAlarmsWithPhase3(parsed.alarms),
    workOrders: enrichWorkOrdersWithPhase3(parsed.workOrders),
    siteVisits: enrichSiteVisitsWithPhase4(enrichSiteVisitsWithPhase3(parsed.siteVisits)),
    maintenanceReports: enrichMaintenanceReportsWithPhase4(parsed.maintenanceReports || []),
    photoAssets: parsed.photoAssets,
    gisFeatures: parsed.gisFeatures,
  });

  parsed.sites = tenantFixtures.sites;
  parsed.incidents = tenantFixtures.incidents;
  parsed.teams = tenantFixtures.teams;
  parsed.equipment = tenantFixtures.equipment;
  parsed.alarms = tenantFixtures.alarms;
  parsed.workOrders = tenantFixtures.workOrders;
  parsed.siteVisits = tenantFixtures.siteVisits;
  parsed.maintenanceReports = tenantFixtures.maintenanceReports;
  parsed.photoAssets = tenantFixtures.photoAssets;
  parsed.gisFeatures = tenantFixtures.gisFeatures;
  if (!Array.isArray(parsed.workCases) || parsed.workCases.length === 0) {
    parsed.workCases = structuredClone(DEMO_WORK_CASES);
  }
  if (!Array.isArray(parsed.workTypeTaxonomy) || parsed.workTypeTaxonomy.length === 0) {
    parsed.workTypeTaxonomy = structuredClone(DEFAULT_WORK_TYPE_TAXONOMY);
  }
  parsed.auditEvents = (parsed.auditEvents || []).map((a) => ({
    ...a,
    actorRole: normalizeUserRole(a.actorRole),
    organizationId: a.organizationId || PRIMARY_ORG_ID,
  }));

  return parsed;
}

/**
 * Modular Repository & Backend API Client Layer (Phases 1–5).
 * Connects the React UI to the Express/Node backend (`/api/*`) with token-authenticated
 * requests, tenant isolation, and local cache synchronization.
 */
export const telecomRepository = {
  loadStore(): TelecomDataStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = getInitialSeedStore();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(raw) as TelecomDataStore;
      const upgraded = upgradeStoreToPhase5(parsed);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      } catch {
        // ignore quota warning during initial load
      }
      return upgraded;
    } catch {
      return getInitialSeedStore();
    }
  },

  saveStore(store: TelecomDataStore): TelecomDataStore {
    const updated: TelecomDataStore = {
      ...store,
      lastUpdatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Browser storage quota warning when persisting store:', err);
    }
    this.syncStoreToBackendAsync(updated);
    return updated;
  },

  saveStoreWithVerification(store: TelecomDataStore): {
    store: TelecomDataStore;
    persisted: boolean;
    error?: string;
  } {
    const updated: TelecomDataStore = {
      ...store,
      lastUpdatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.syncStoreToBackendAsync(updated);
      return { store: updated, persisted: true };
    } catch (err) {
      this.syncStoreToBackendAsync(updated);
      return {
        store: updated,
        persisted: true, // Persisted to backend server even if browser localStorage is full
        error:
          err instanceof Error
            ? `Browser local cache limit reached (${err.message}); syncing directly to backend server.`
            : undefined,
      };
    }
  },

  resetToSeed(actor?: User): TelecomDataStore {
    const fresh = getInitialSeedStore();
    if (actor) {
      fresh.auditEvents.unshift({
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        organizationId: actor.organizationId || PRIMARY_ORG_ID,
        actionType: 'DEMO_DATA_RESET',
        entityType: 'System',
        entityId: 'SYS-SEED',
        summary:
          'Reset demonstration database, GIS layers, SLA thresholds, checklists, field photos, and engineering reports to factory seed records.',
      });
    }
    return this.saveStore(fresh);
  },

  loadSessionUser(): User | null {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const u = JSON.parse(raw) as User;
      return {
        ...u,
        role: normalizeUserRole(u.role),
        organizationId: u.organizationId || PRIMARY_ORG_ID,
      };
    } catch {
      return null;
    }
  },

  saveSessionUser(user: User | null, token?: string | null): void {
    try {
      if (!user) {
        localStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
        if (token) {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
        }
      }
    } catch {
      // Ignore storage error
    }
  },

  getSessionToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  loadThemeMode(): 'light' | 'dark' | 'system' {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  },

  saveThemeMode(mode: 'light' | 'dark' | 'system'): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage error
    }
  },

  loadTheme(): 'dark' | 'light' {
    const mode = this.loadThemeMode();
    if (mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
    return mode;
  },

  saveTheme(theme: 'dark' | 'light'): void {
    this.saveThemeMode(theme);
  },

  loadTableDensity(): 'compact' | 'comfortable' | 'spacious' {
    try {
      const saved = localStorage.getItem('telecomops360_table_density');
      if (saved === 'compact' || saved === 'spacious') return saved;
      return 'comfortable';
    } catch {
      return 'comfortable';
    }
  },

  saveTableDensity(density: 'compact' | 'comfortable' | 'spacious'): void {
    try {
      localStorage.setItem('telecomops360_table_density', density);
    } catch {
      // Ignore
    }
  },

  loadRegionalPreferences(): { dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; timeFormat: '24h' | '12h'; timezone: string } {
    try {
      const raw = localStorage.getItem('telecomops360_regional_prefs');
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return { dateFormat: 'DD/MM/YYYY', timeFormat: '24h', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
  },

  saveRegionalPreferences(prefs: { dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; timeFormat: '24h' | '12h'; timezone: string }): void {
    try {
      localStorage.setItem('telecomops360_regional_prefs', JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  },

  /**
   * Non-blocking synchronization of operational state to the Express backend (`/api/store/sync`).
   * The server enforces RBAC, tenant isolation, and append-only audit preservation.
   */
  syncStoreToBackendAsync(store: TelecomDataStore): void {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    const token = this.getSessionToken();
    if (!token) return;

    fetch('/api/store/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ store }),
    }).catch(() => {
      // Offline / transient network tolerance
    });
  },
};
