import {
  Alarm,
  Equipment,
  Incident,
  IntegrationConnector,
  MaintenanceReport,
  OperatorProject,
  Organization,
  PhotoAsset,
  Site,
  SiteVisit,
  Team,
  TelecomGisFeature,
  User,
  UserInvitation,
  UserRole,
  WorkOrder,
} from '../types/models';
import { normalizeUserRole } from '../security/permissions';

export const PRIMARY_ORG_ID = 'ORG-TELECOM-01';
export const SECONDARY_ORG_ID = 'ORG-CONTRACTOR-02';

export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: PRIMARY_ORG_ID,
    code: 'NCO-ALPHA',
    name: 'National Carrier Operations Group — Alpha',
    tier: 'Primary Telecom Operator',
    primaryOperatorName: 'National Telecom Carrier',
    allowedRegions: ['National (All Regions)', 'North Metro', 'Central', 'South Corridor'],
    dataRetentionDays: 365,
    auditRetentionDays: 730,
    requireEmailVerification: true,
    sessionTimeoutMinutes: 480,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-28T08:00:00Z',
  },
  {
    id: SECONDARY_ORG_ID,
    code: 'APEX-TWR',
    name: 'Apex Tower Maintenance Contractors — Tenant B',
    tier: 'Regional Field Contractor',
    primaryOperatorName: 'Apex Managed Services',
    allowedRegions: ['South Corridor', 'West Industrial'],
    dataRetentionDays: 180,
    auditRetentionDays: 365,
    requireEmailVerification: true,
    sessionTimeoutMinutes: 240,
    status: 'Active',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-10-28T08:00:00Z',
  },
];

export const DEMO_OPERATOR_PROJECTS: OperatorProject[] = [
  {
    id: 'PRJ-CARRIER-5G',
    organizationId: PRIMARY_ORG_ID,
    code: 'RAN-5G-CORE',
    name: 'Metro 5G NR & BSC/Core Availability Program',
    operatorName: 'National Telecom Carrier',
    regions: ['North Metro', 'Central'],
    status: 'Active',
    slaProfileId: 'SLA-CARRIER-TIER1',
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'PRJ-RURAL-TX',
    organizationId: PRIMARY_ORG_ID,
    code: 'TX-FBR-BACKHAUL',
    name: 'Backbone Microwave & DWDM Optical Ring Maintenance',
    operatorName: 'National Telecom Carrier',
    regions: ['Central', 'South Corridor'],
    status: 'Active',
    slaProfileId: 'SLA-CARRIER-TIER1',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'PRJ-APEX-SOUTH',
    organizationId: SECONDARY_ORG_ID,
    code: 'APEX-PWR-GEN',
    name: 'Apex Southern Tower Electromechanical Contract',
    operatorName: 'Apex Managed Services',
    regions: ['South Corridor'],
    status: 'Active',
    slaProfileId: 'SLA-CONTRACTOR-STD',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

export const DEMO_INTEGRATION_CONNECTORS: IntegrationConnector[] = [
  {
    id: 'INT-NOKIA-NETACT',
    organizationId: PRIMARY_ORG_ID,
    name: 'Nokia NetAct OSS Core & Radio Alarm Feed',
    vendor: 'Nokia',
    protocol: '3GPP CORBA / REST Northbound API (TLS 1.3)',
    mode: 'Simulated / Development Fallback',
    status: 'Healthy (Simulated)',
    endpointHint: 'https://netact-northbound.carrier.internal:8443/api/v2/alarms',
    deduplicationWindowMinutes: 15,
    lastSyncAt: '2026-10-28T12:45:00Z',
    eventsProcessedCount: 1428,
    errorCount: 0,
  },
  {
    id: 'INT-HUAWEI-NCE',
    organizationId: PRIMARY_ORG_ID,
    name: 'Huawei iMaster NCE / U2020 RAN & Microwave Telemetry',
    vendor: 'Huawei',
    protocol: 'RESTCONF / SNMPv3 Trap Receiver',
    mode: 'Simulated / Development Fallback',
    status: 'Healthy (Simulated)',
    endpointHint: 'https://nce-nms.carrier.internal:31943/restconf/data',
    deduplicationWindowMinutes: 10,
    lastSyncAt: '2026-10-28T12:44:00Z',
    eventsProcessedCount: 984,
    errorCount: 0,
  },
  {
    id: 'INT-ERICSSON-ENM',
    organizationId: PRIMARY_ORG_ID,
    name: 'Ericsson Network Manager (ENM) LTE/5G Node Faults',
    vendor: 'Ericsson',
    protocol: 'VES Event Listener / Kafka Bridge',
    mode: 'Simulated / Development Fallback',
    status: 'Healthy (Simulated)',
    endpointHint: 'https://enm-ves.carrier.internal:8080/eventListener/v7',
    deduplicationWindowMinutes: 15,
    lastSyncAt: '2026-10-28T12:40:00Z',
    eventsProcessedCount: 612,
    errorCount: 0,
  },
  {
    id: 'INT-RTU-DRYCONTACT',
    organizationId: PRIMARY_ORG_ID,
    name: 'Site Environmental & Rectifier Dry-Contact RTU Gateway',
    vendor: 'Dry-Contact RTU',
    protocol: 'Modbus TCP / SNMPv3 Polling',
    mode: 'Simulated / Development Fallback',
    status: 'Healthy (Simulated)',
    endpointHint: 'rtu-collector.carrier.internal:502',
    deduplicationWindowMinutes: 5,
    lastSyncAt: '2026-10-28T12:46:00Z',
    eventsProcessedCount: 2190,
    errorCount: 0,
  },
  {
    id: 'INT-SMTP-RELAY',
    organizationId: PRIMARY_ORG_ID,
    name: 'Corporate SMTP Email Notification & Password Reset Relay',
    vendor: 'SMTP Email',
    protocol: 'SMTP over TLS (Port 587)',
    mode: 'Simulated / Development Fallback',
    status: 'Awaiting Server Credentials',
    endpointHint: 'Configure SMTP_HOST & SMTP_SECRET in server environment',
    deduplicationWindowMinutes: 1,
    eventsProcessedCount: 42,
    errorCount: 0,
  },
  {
    id: 'INT-SMS-GATEWAY',
    organizationId: PRIMARY_ORG_ID,
    name: 'Field Dispatch & P1 SLA Escalation SMS Gateway',
    vendor: 'SMS Gateway',
    protocol: 'SMPP / HTTPS Webhook',
    mode: 'Simulated / Development Fallback',
    status: 'Awaiting Server Credentials',
    endpointHint: 'Configure SMS_PROVIDER_API_KEY in server environment',
    deduplicationWindowMinutes: 1,
    eventsProcessedCount: 19,
    errorCount: 0,
  },
];

export const DEMO_USER_INVITATIONS: UserInvitation[] = [
  {
    id: 'INV-2026-001',
    organizationId: PRIMARY_ORG_ID,
    email: 'n.benali@telecomops360.demo',
    fullName: 'Nadia Benali',
    role: UserRole.NOC_ENGINEER,
    teamId: 'TEAM-NOC-01',
    region: 'North Metro',
    isExternalContractor: false,
    invitedByUserId: 'USR-001',
    invitedByName: 'Karim Mansour',
    inviteCode: 'INV-NCO-8842-ALPHA',
    status: 'Pending',
    createdAt: '2026-10-26T10:00:00Z',
    expiresAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'INV-2026-002',
    organizationId: PRIMARY_ORG_ID,
    email: 'r.contractor@subcontract-rf.demo',
    fullName: 'Rami Haddad (RF Rigging Contractor)',
    role: UserRole.FIELD_ENGINEER,
    teamId: 'TEAM-FLD-NTH',
    region: 'North Metro',
    isExternalContractor: true,
    contractorCompany: 'MedTower Rigging Services',
    invitedByUserId: 'USR-001',
    invitedByName: 'Karim Mansour',
    inviteCode: 'INV-EXT-3910-RIG',
    status: 'Pending',
    createdAt: '2026-10-27T14:30:00Z',
    expiresAt: '2026-11-10T14:30:00Z',
  },
];

export const PHASE5_EXTRA_USERS: User[] = [
  {
    id: 'USR-000',
    username: 's.admin',
    email: 's.admin@telecomops360.demo',
    fullName: 'Dr. Amine Touati',
    role: UserRole.SUPER_ADMIN,
    organizationId: PRIMARY_ORG_ID,
    projectIds: ['PRJ-CARRIER-5G', 'PRJ-RURAL-TX', 'PRJ-APEX-SOUTH'],
    allowedRegions: ['National (All Regions)', 'North Metro', 'Central', 'South Corridor'],
    teamId: 'TEAM-NOC-01',
    region: 'National (All Regions)',
    title: 'Principal Global Platform & Security Architect',
    phone: '+213 550 00 00 01',
    active: true,
    accountStatus: 'Active',
    emailVerified: true,
    isExternalContractor: false,
    shiftSchedule: 'Global Executive On-Call (00:00–23:59 UTC)',
    onCallStatus: 'Primary On-Call',
    lastLoginAt: '2026-10-28T11:30:00Z',
    specialties: ['Platform Security', 'Multi-Tenant Architecture', 'BSS/RAN Governance'],
    availabilityStatus: 'Available',
    certifications: ['CISSP', 'CCIE Service Provider', '3GPP Security Lead'],
    version: 1,
    updatedAt: '2026-10-28T11:30:00Z',
  },
  {
    id: 'USR-201',
    username: 'm.contractor',
    email: 'm.contractor@apextower.demo',
    fullName: 'Malik Ouali (Apex Tenant B)',
    role: UserRole.FIELD_ENGINEER,
    organizationId: SECONDARY_ORG_ID,
    projectIds: ['PRJ-APEX-SOUTH'],
    allowedRegions: ['South Corridor'],
    teamId: 'TEAM-FLD-STH',
    region: 'South Corridor',
    title: 'External Contractor Field Engineer',
    phone: '+213 559 88 77 66',
    active: true,
    accountStatus: 'Active',
    emailVerified: true,
    isExternalContractor: true,
    contractorCompany: 'Apex Tower Maintenance Contractors',
    shiftSchedule: 'Day Shift (07:00–19:00 UTC)',
    onCallStatus: 'Standard Shift',
    lastLoginAt: '2026-10-28T09:15:00Z',
    specialties: ['Diesel Generator ATS', 'DC Rectifier Systems'],
    availabilityStatus: 'Available',
    certifications: ['Cummins DG Certified', 'Working at Heights L2'],
    version: 1,
    updatedAt: '2026-10-28T09:15:00Z',
  },
];

export const TENANT_B_DEMO_SITE: Site = {
  id: 'SITE-2001',
  siteCode: 'APX-STH-901',
  siteName: 'Apex Isolated Contractor Depot Tower',
  operator: 'Apex Managed Services',
  region: 'South Corridor',
  district: 'Southern Industrial Zone',
  address: 'Route Nationale 1, PK 42, Southern Industrial Sector',
  latitude: 35.8912,
  longitude: 3.1145,
  siteType: 'Greenfield Tower',
  technologies: ['4G LTE', 'DC Power/Gen'],
  operationalStatus: 'Online',
  assignedTeamId: 'TEAM-FLD-STH',
  lastMaintenanceDate: '2026-10-15',
  towerHeightMeters: 45,
  powerConfiguration: 'Dual Cummins 35kVA DG + Eltek 48V DC',
  accessInstructions: 'TENANT-B RESTRICTED KEY VAULT #9901',
  organizationId: SECONDARY_ORG_ID,
  projectId: 'PRJ-APEX-SOUTH',
  version: 1,
  createdAt: '2026-03-10T08:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
};

export const TENANT_B_DEMO_INCIDENT: Incident = {
  id: 'INC-2026-000901',
  alarmId: 'ALM-99901',
  relatedAlarmIds: ['ALM-99901'],
  siteId: 'SITE-2001',
  siteCode: 'APX-STH-901',
  siteName: 'Apex Isolated Contractor Depot Tower',
  region: 'South Corridor',
  operator: 'Apex Managed Services',
  domain: 'Power / AC-DC / Gen',
  technology: 'DC Power/Gen',
  category: 'Diesel Generator / ATS',
  title: 'Tenant B Isolated Generator Low Fuel Warning',
  alarmSource: 'Apex RTU Telemetry',
  incidentSource: 'External Alarm',
  classification: 'External',
  alarmName: 'DG-01 Fuel Tank Below 25%',
  description: 'Isolated Tenant B incident record used to verify cross-organization tenant isolation.',
  equipmentId: 'EQ-2001',
  equipmentAffected: 'Cummins C35D5 Generator',
  severity: 'Minor',
  impact: 'Power Failure',
  scope: 'Single Site',
  priority: 'P3 - Medium',
  firstOccurrence: '2026-10-28T06:00:00Z',
  lastOccurrence: '2026-10-28T06:00:00Z',
  reportedAt: '2026-10-28T06:00:00Z',
  acknowledged: true,
  acknowledgedBy: 'Malik Ouali (Apex Tenant B)',
  acknowledgedAt: '2026-10-28T06:10:00Z',
  assignedTeamId: 'TEAM-FLD-STH',
  assignedEngineerId: 'USR-201',
  assignedOwnerName: 'Malik Ouali (Apex Tenant B)',
  status: 'In Progress',
  alarmClearedInNetwork: false,
  notes: [],
  organizationId: SECONDARY_ORG_ID,
  version: 1,
  createdAt: '2026-10-28T06:00:00Z',
  updatedAt: '2026-10-28T06:10:00Z',
};

export function enrichUsersWithPhase5(users: User[]): User[] {
  const normalized: User[] = users.map((u, idx) => ({
    ...u,
    role: normalizeUserRole(u.role),
    organizationId: u.organizationId || PRIMARY_ORG_ID,
    projectIds: u.projectIds || ['PRJ-CARRIER-5G', 'PRJ-RURAL-TX'],
    allowedRegions:
      u.allowedRegions ||
      (u.region === 'National (All Regions)'
        ? ['National (All Regions)', 'North Metro', 'Central', 'South Corridor']
        : [u.region]),
    accountStatus: u.accountStatus || (u.active === false ? 'Suspended' : 'Active'),
    emailVerified: u.emailVerified ?? true,
    isExternalContractor: u.isExternalContractor ?? false,
    shiftSchedule:
      u.shiftSchedule ||
      (idx % 2 === 0 ? 'Shift A (06:00–18:00 UTC)' : 'Shift B (18:00–06:00 UTC)'),
    onCallStatus:
      u.onCallStatus || (idx < 3 ? 'Primary On-Call' : 'Standard Shift'),
    version: u.version || 1,
    updatedAt: u.updatedAt || '2026-10-28T08:00:00Z',
  }));

  for (const extra of PHASE5_EXTRA_USERS) {
    if (!normalized.some((u) => u.id === extra.id || u.email === extra.email)) {
      normalized.push(structuredClone(extra));
    }
  }
  return normalized;
}

export function enrichEntitiesWithTenantAndVersion<
  T extends { id: string; organizationId?: string; version?: number }
>(items: T[], defaultOrgId = PRIMARY_ORG_ID): T[] {
  return items.map((item) => ({
    ...item,
    organizationId: item.organizationId || defaultOrgId,
    version: typeof item.version === 'number' && item.version >= 1 ? item.version : 1,
  }));
}

export function ensureTenantBIsolationFixtures(params: {
  sites: Site[];
  incidents: Incident[];
  teams: Team[];
  equipment: Equipment[];
  alarms: Alarm[];
  workOrders: WorkOrder[];
  siteVisits: SiteVisit[];
  maintenanceReports: MaintenanceReport[];
  photoAssets: PhotoAsset[];
  gisFeatures: TelecomGisFeature[];
}) {
  const sites = enrichEntitiesWithTenantAndVersion(params.sites);
  if (!sites.some((s) => s.id === TENANT_B_DEMO_SITE.id)) {
    sites.push(structuredClone(TENANT_B_DEMO_SITE));
  }

  const incidents = enrichEntitiesWithTenantAndVersion(params.incidents);
  if (!incidents.some((i) => i.id === TENANT_B_DEMO_INCIDENT.id)) {
    incidents.push(structuredClone(TENANT_B_DEMO_INCIDENT));
  }

  return {
    sites,
    incidents,
    teams: enrichEntitiesWithTenantAndVersion(params.teams),
    equipment: enrichEntitiesWithTenantAndVersion(params.equipment),
    alarms: enrichEntitiesWithTenantAndVersion(params.alarms),
    workOrders: enrichEntitiesWithTenantAndVersion(params.workOrders),
    siteVisits: enrichEntitiesWithTenantAndVersion(params.siteVisits),
    maintenanceReports: enrichEntitiesWithTenantAndVersion(params.maintenanceReports),
    photoAssets: enrichEntitiesWithTenantAndVersion(params.photoAssets),
    gisFeatures: enrichEntitiesWithTenantAndVersion(params.gisFeatures),
  };
}
