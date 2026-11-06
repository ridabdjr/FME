/**
 * TelecomOps 360 — Core Domain, GIS & Incident/Maintenance Data Architecture (Phases 1, 2 & 3)
 * Typed models supporting RAN, BSS, BSC, TX/Microwave, Fiber, Power, Environmental,
 * NOC Alarm Management, Full 8-State Incident Lifecycle, SLA & Escalations, Work Orders,
 * Team Dispatch, Site Visits & Checklists, Geospatial Infrastructure Mapping (GeoJSON), and Audit Trails.
 */

import type { Geometry } from 'geojson';

export enum UserRole {
  SUPER_ADMIN = 'Super Administrator',
  ADMIN = 'Organization Administrator',
  MAINTENANCE_MANAGER = 'Operations Manager',
  NOC_ENGINEER = 'NOC/BSC Engineer',
  FIELD_ENGINEER = 'Field Engineer',
  TEAM_LEADER = 'Team Leader',
  AUDITOR = 'Read-Only Auditor',
}

export type EngineerAvailability = 'Available' | 'On-Site' | 'Busy / Dispatched' | 'Off-Shift';

export type UserAccountStatus = 'Active' | 'Inactive' | 'Suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string;
  projectIds?: string[];
  allowedRegions?: string[];
  teamId: string;
  region: string;
  title: string;
  phone: string;
  active: boolean;
  accountStatus?: UserAccountStatus;
  emailVerified?: boolean;
  isExternalContractor?: boolean;
  contractorCompany?: string;
  shiftSchedule?: string;
  onCallStatus?: 'Primary On-Call' | 'Backup On-Call' | 'Standard Shift' | 'Off-Duty';
  lastLoginAt?: string;
  specialties?: string[];
  availabilityStatus?: EngineerAvailability;
  certifications?: string[];
  preferredLanguage?: 'en' | 'fr' | 'ar';
  preferredTheme?: 'light' | 'dark' | 'system';
  tableDensity?: 'compact' | 'comfortable' | 'spacious';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '24h' | '12h';
  customTimezone?: string;
  version?: number;
  updatedAt?: string;
}

export interface EngineerProfile {
  userId: string;
  fullName: string;
  role: UserRole;
  teamId: string;
  teamName: string;
  region: string;
  specialties: string[];
  certifications: string[];
  availabilityStatus: EngineerAvailability;
}

export interface Team {
  id: string;
  code: string;
  name: string;
  organizationId?: string;
  projectId?: string;
  region: string;
  specialization:
    | 'NOC/BSC Core'
    | 'RAN & Tower Field Ops'
    | 'Power & Electromechanical'
    | 'Transmission & Fiber';
  specializations?: string[];
  leadUserId: string;
  memberIds: string[];
  onCallPhone: string;
  shiftSchedule?: string;
  availabilityStatus?: 'Available' | 'High Load' | 'On-Call Only';
  version?: number;
}

export type SiteType =
  | 'Greenfield Tower'
  | 'Rooftop'
  | 'Indoor IBS/DAS'
  | 'Core/BSC Hub'
  | 'BTS'
  | 'BSC'
  | 'Mobile Tower'
  | 'Rooftop Site'
  | 'Data Center'
  | 'Fiber Cabinet'
  | 'Manhole'
  | 'Customer Premises'
  | 'Electrical Installation'
  | 'Office'
  | 'Other';

export type SiteOperationalStatus = 'Online' | 'Degraded' | 'Offline' | 'Maintenance' | 'Planned';

export type NetworkTechnology =
  | '2G GSM'
  | '3G UMTS'
  | '4G LTE'
  | '5G NR'
  | 'BSC/Core'
  | 'Microwave TX'
  | 'Fiber DWDM'
  | 'DC Power/Gen';

export interface Site {
  id: string; // e.g., SITE-1001
  siteCode: string; // e.g., NTH-MTR-001
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
  organizationId?: string;
  projectId?: string;
  archived?: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentCategory =
  | 'BSC / Core Node'
  | 'BTS / eNodeB / gNodeB'
  | 'BBU (Baseband Unit)'
  | 'RRU / RRH (Remote Radio)'
  | 'Antenna / Feeder / RET'
  | 'Microwave IDU/ODU'
  | 'Fiber OLT / DWDM Mux'
  | 'Rectifier & DC Power'
  | 'Battery Bank (VRLA/LiFePO4)'
  | 'Diesel Generator / ATS'
  | 'Grounding & Env Sensor';

export interface Equipment {
  id: string;
  siteId: string;
  siteCode: string;
  name: string;
  category: EquipmentCategory;
  vendor: string;
  model: string;
  serialNumber: string;
  firmwareOrVersion?: string;
  slotOrSector?: string;
  operationalState: 'Operational' | 'Faulty' | 'Warning' | 'Standby' | 'Decommissioned';
  installedDate: string;
  lastInspectedDate: string;
  organizationId?: string;
  version?: number;
  updatedAt?: string;
}

export type AlarmSeverity = 'Critical' | 'Major' | 'Minor' | 'Warning';

export type AlarmClassification = 'Internal' | 'External';

export type NetworkDomain =
  | 'RAN / Radio'
  | 'BSS / BSC'
  | 'Transmission / MW'
  | 'Fiber Optics'
  | 'Power / AC-DC / Gen'
  | 'Environmental / Site Access';

export interface AlarmNote {
  id: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  content: string;
}

export interface Alarm {
  id: string; // e.g., ALM-90101
  siteId: string;
  siteCode: string;
  siteName: string;
  region: string;
  domain: NetworkDomain;
  technology: NetworkTechnology;
  alarmSource: string; // e.g., "Nokia NetAct OSS-Core-01", "Dry-Contact DI-01"
  vendor?: string; // e.g., "Nokia", "Ericsson", "Huawei", "Cummins", "Eltek", "Vertiv"
  vendorCode: string; // e.g., "EXT-PWR-LLVD-OPEN"
  managedObject?: string; // e.g., "PLMN-PLMN/BSC-02/BCF-18/BTS-2"
  classification: AlarmClassification;
  alarmName: string;
  description: string;
  equipmentId: string;
  equipmentName: string;
  severity: AlarmSeverity;
  firstOccurrence: string;
  lastOccurrence: string;
  occurrenceCount: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  isSimulatedActive: boolean; // True = Active on NE, False = Cleared on NE
  clearedAt?: string;
  clearedByObservation?: string;
  linkedIncidentId?: string;
  proposedCorrelationIncidentId?: string;
  correlationRuleReason?: string;
  lastSyncedAt?: string;
  alarmNotes?: AlarmNote[];
  organizationId?: string;
  version?: number;
}

export type IncidentStatus =
  | 'New'
  | 'Acknowledged'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Parts or Access'
  | 'Monitoring'
  | 'Resolved'
  | 'Closed';

export type IncidentCategory =
  | 'RAN / Cell Outage'
  | 'BSC / Core Signalling'
  | 'AC/DC Power & Rectifier'
  | 'Diesel Generator / ATS'
  | 'Microwave Backhaul'
  | 'Fiber Optic / DWDM'
  | 'Environmental / HVAC'
  | 'Site Access / Security';

export type IncidentSourceType =
  | 'BSC/NOC'
  | 'External Alarm'
  | 'Field Engineer'
  | 'Customer Report'
  | 'Manual Entry';

export type IncidentImpact =
  | 'Site Down'
  | 'Service Degraded'
  | 'Equipment Failure'
  | 'Power Failure'
  | 'Transmission Failure'
  | 'Environmental Issue'
  | 'Other';

export type IncidentScope =
  | 'Single Site'
  | 'Multiple Sites'
  | 'Transmission Path'
  | 'Wider Network Impact';

export type IncidentPriority = 'P1 - Critical' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  content: string;
  noteType: 'Investigation' | 'StatusChange' | 'Assignment' | 'FieldUpdate' | 'Escalation';
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  eventType:
    | 'CREATED'
    | 'ALARM_LINKED'
    | 'ACKNOWLEDGED'
    | 'ASSIGNED'
    | 'STATUS_CHANGED'
    | 'WORK_STARTED'
    | 'PHYSICAL_REPAIR_COMPLETED'
    | 'SERVICE_RESTORED'
    | 'ALARM_CLEARED'
    | 'ALARM_REASSERTED'
    | 'VERIFIED_RESOLVED'
    | 'CLOSED'
    | 'REOPENED'
    | 'ESCALATED'
    | 'WORK_ORDER_LINKED'
    | 'VISIT_RECORDED'
    | 'INVESTIGATION_UPDATED';
  title: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface EscalationEvent {
  id: string;
  level: 1 | 2 | 3;
  triggeredAt: string;
  triggeredBy: string;
  reason: string;
  notifiedTarget: string;
}

export interface Incident {
  id: string; // e.g., INC-2026-000401
  alarmId: string; // Primary alarm ID
  relatedAlarmIds?: string[]; // Supports multiple associated alarms
  siteId: string;
  siteIdRef?: string;
  siteCode: string;
  siteName: string;
  region: string;
  operator?: string;
  domain: NetworkDomain;
  technology: NetworkTechnology;
  category?: IncidentCategory;
  title?: string;
  alarmSource: string;
  incidentSource?: IncidentSourceType;
  classification: AlarmClassification;
  alarmName: string;
  description: string;
  equipmentId: string;
  equipmentAffected: string;
  severity: AlarmSeverity;
  impact?: IncidentImpact;
  scope?: IncidentScope;
  priority?: IncidentPriority;
  firstOccurrence: string;
  lastOccurrence: string;
  reportedAt?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  assignedTeamId: string;
  assignedEngineerId?: string;
  assignedOwnerName: string;
  assignedAt?: string;
  dispatchedAt?: string;
  status: IncidentStatus;
  // Explicitly separated operational milestones:
  workStartedAt?: string;
  physicalWorkCompletedAt?: string;
  serviceRestoredAt?: string;
  alarmClearedInNetwork: boolean;
  alarmClearedAt?: string;
  resolutionVerifiedAt?: string;
  resolutionVerifiedBy?: string;
  closedAt?: string;
  reviewedAndApprovedBy?: string;
  createdBy?: string;
  reopenedCount?: number;
  // Technical investigation fields (unknown values allowed and marked not yet determined)
  reportedSymptoms?: string;
  diagnosticObservations?: string;
  measurementsAndTestResults?: string;
  suspectedRootCause?: string;
  confirmedRootCause?: string;
  rootCauseCategory?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  partsReplaced?: string[];
  engineerNotes?: string;
  resolutionSummary?: string;
  resolvedAt?: string;
  attachmentIds?: string[];
  escalationLevel?: 0 | 1 | 2 | 3;
  escalationHistory?: EscalationEvent[];
  timeline?: IncidentTimelineEvent[];
  notes: IncidentNote[];
  organizationId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SLAThresholdRule {
  severity: AlarmSeverity;
  timeToAcknowledgeMins: number;
  timeToAssignMins: number;
  timeToDispatchMins: number;
  timeToRestoreMins: number;
  timeToResolveMins: number;
}

export interface SLAConfiguration {
  updatedAt: string;
  updatedBy: string;
  rules: Record<AlarmSeverity, SLAThresholdRule>;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info';
  category: 'SLA Breach' | 'Escalation' | 'Alarm Intake' | 'Work Order' | 'Incident Lifecycle';
  title: string;
  message: string;
  linkedEntityType?: 'Incident' | 'Alarm' | 'WorkOrder' | 'Site' | 'WorkCase';
  linkedEntityId?: string;
  read: boolean;
  deliveryChannelNote: string; // e.g., "In-App Only (External SMTP/SMS gateway not configured)"
}

export type WorkOrderJobType =
  | 'Corrective Maintenance'
  | 'Preventive Maintenance'
  | 'Inspection'
  | 'Emergency Repair'
  | 'Installation';

export type WorkOrderPriority = 'P1 - Immediate' | 'P2 - High' | 'P3 - Medium' | 'P4 - Scheduled';

export type WorkOrderStatus =
  | 'Draft'
  | 'Ready for Assignment'
  | 'Assigned'
  | 'Scheduled'
  | 'Dispatched'
  | 'In Progress'
  | 'Waiting for Access'
  | 'Waiting for Parts'
  | 'Awaiting Parts'
  | 'Completed'
  | 'Verified'
  | 'Cancelled';

export type WorkOrderVerificationStatus =
  | 'Not Requested'
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected';

export interface WorkOrder {
  id: string;
  workOrderNumber: string; // e.g., WO-2026-9001
  linkedIncidentId?: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  region: string;
  equipmentId?: string;
  equipmentName?: string;
  jobType: WorkOrderJobType;
  priority: WorkOrderPriority;
  assignedTeamId: string;
  assignedEngineerId?: string;
  assignedAssigneeName: string;
  requestedDate?: string;
  scheduledVisitDate: string;
  workStartedAt?: string;
  completedAt?: string;
  workDescription: string;
  safetyAndAccessRequirements?: string;
  requiredEquipmentOrSpares: string[];
  partsConsumed?: string[];
  workPerformed?: string;
  status: WorkOrderStatus;
  completionNotes?: string;
  verificationStatus?: WorkOrderVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  cancellationOrPostponementReason?: string;
  organizationId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type ChecklistDomainType =
  | 'Radio & Antenna Equipment'
  | 'Transmission & Microwave'
  | 'Power Systems (AC/DC/DG/Batteries)'
  | 'Fiber & Optical Infrastructure'
  | 'Environmental & External Alarms';

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  expectedStandard: string;
  requiresMeasurement: boolean;
  unit?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  domainType: ChecklistDomainType;
  description: string;
  items: ChecklistTemplateItem[];
  updatedAt: string;
}

export type ChecklistResultStatus =
  | 'Pass'
  | 'Fail'
  | 'Not Applicable'
  | 'Not Tested'
  | 'Adjusted'
  | 'N/A'
  | 'Pending';

export interface ChecklistItemResult {
  itemId: string;
  label: string;
  result: ChecklistResultStatus;
  measuredValue?: string;
  unit?: string;
  remarks?: string;
  evidencePhotoIds?: string[];
}

export interface VisitEquipmentRecord {
  id: string;
  equipmentId?: string;
  equipmentCategory: EquipmentCategory;
  manufacturer: string;
  model: string;
  equipmentIdentifier: string;
  serialNumber: string;
  originalCondition: 'Operational' | 'Degraded' | 'Faulty / Down' | 'Damaged' | 'Not Recorded';
  faultSymptoms: string;
  diagnosticObservations: string;
  replacementParts: string;
  removedEquipmentDetails: string;
  installedEquipmentDetails: string;
  testAndVerificationResults: string;
}

export interface MeasurementRecord {
  id: string;
  visitId: string;
  siteId: string;
  siteCode: string;
  incidentId?: string;
  workOrderId?: string;
  parameterName: string; // e.g., "-48V DC Float Bus Voltage", "Sector 1 VSWR", "Optical Rx Power"
  equipmentOrSector: string;
  measuredValue: string;
  unit: string; // e.g., "VDC", "dBm", "Ohm", "ratio", "°C"
  referenceRange: string;
  status: 'Within Range' | 'Out of Range' | 'Critical' | 'Informational';
  testInstrument: string; // e.g., "Anritsu Site Master S331L", "Fluke 87V", "EXFO FTB-1 OTDR"
  recordedAt: string;
  recordedBy: string;
}

export interface EquipmentReplacement {
  id: string;
  visitId: string;
  workOrderId?: string;
  incidentId?: string;
  siteId: string;
  siteCode: string;
  equipmentCategory: EquipmentCategory;
  sectorOrSlot: string;
  removedManufacturerModel: string;
  removedPartNumber: string;
  removedSerialNumber: string;
  faultReason: string;
  installedManufacturerModel: string;
  installedPartNumber: string;
  installedSerialNumber: string;
  firmwareVersion: string;
  verifiedOperational: boolean;
  replacedBy: string;
  replacedAt: string;
}

export interface SparePartUsage {
  id: string;
  visitId: string;
  workOrderId?: string;
  incidentId?: string;
  siteId: string;
  siteCode: string;
  partNumber: string;
  partName: string;
  category: string;
  quantity: number;
  unit: string;
  serialOrBatchNumber?: string;
  warehouseSource: string;
  usedBy: string;
  recordedAt: string;
}

export type TimestampRecordSource =
  | 'Scheduled'
  | 'Device Recorded'
  | 'Manual Entry'
  | 'Server Recorded';

export type VisitFinalOutcome =
  | 'Resolved / Restored'
  | 'Temporary Mitigation'
  | 'Further Visit Required'
  | 'Pending Parts / Access'
  | 'Routine Inspection Pass'
  | 'Not Recorded';

export interface SiteVisit {
  id: string;
  visitCode: string;
  workOrderId?: string;
  linkedIncidentId?: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  siteAddress?: string;
  region?: string;
  operator?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    source: 'Site Registry' | 'Device GPS' | 'Manual Entry';
  };
  equipmentId?: string;
  equipmentName?: string;
  assignedTeamId?: string;
  teamName: string;
  assignedEngineerId?: string;
  engineerName: string;
  scheduledDate: string;
  checkInTime?: string; // Actual arrival
  checkInSource?: TimestampRecordSource;
  workStartTime?: string;
  workStartSource?: TimestampRecordSource;
  workCompletionTime?: string;
  workCompletionSource?: TimestampRecordSource;
  checkOutTime?: string; // Actual departure
  checkOutSource?: TimestampRecordSource;
  createdAt?: string;
  updatedAt?: string;
  submissionState?: 'Draft' | 'Submitted';
  inspectionType?:
    | 'Emergency Fault'
    | 'Routine Preventive'
    | 'RF & Antenna Audit'
    | 'Power & Battery Test'
    | 'Microwave Alignment'
    | 'Post-Repair Verification'
    | 'Tower Structural Inspection'
    | 'Fiber & Optical Maintenance';
  status: 'Scheduled' | 'On-Site' | 'Completed' | 'Deferred';
  purpose: string; // Reason for visit
  initialSiteCondition?: string;
  reportedFault?: string;
  observations?: string; // Inspection findings
  suspectedRootCause?: string;
  confirmedRootCause?: string;
  workPerformed?: string;
  correctiveActions?: string;
  preventiveRecommendations?: string;
  measurementsAndTestResults?: string;
  equipmentReplaced?: string;
  partsUsed?: string[];
  followUpRecommendations?: string;
  finalVisitOutcome?: VisitFinalOutcome;
  checklistTemplateId?: string;
  checklistItems?: ChecklistItemResult[];
  checklistCompletedPercent: number;
  equipmentRecords?: VisitEquipmentRecord[];
  measurementRecords?: MeasurementRecord[];
  equipmentReplacements?: EquipmentReplacement[];
  sparePartUsages?: SparePartUsage[];
  photoAssetIds?: string[];
  attachmentRefs?: string[];
  organizationId?: string;
  version?: number;
}

export type PhotoClassification =
  | 'Before'
  | 'During'
  | 'After'
  | 'Inspection'
  | 'Equipment'
  | 'Damage'
  | 'Measurement'
  | 'Test Result'
  | 'Site Overview'
  | 'Other';

export type PhotoAnnotationTool =
  | 'select'
  | 'arrow'
  | 'line'
  | 'rect'
  | 'circle'
  | 'freehand'
  | 'text';

export interface PhotoAnnotationShape {
  id: string;
  tool: Exclude<PhotoAnnotationTool, 'select'>;
  color: string;
  strokeWidth: number;
  x: number;
  y: number;
  points?: number[]; // For arrow, line, freehand
  width?: number; // For rect
  height?: number; // For rect
  radius?: number; // For circle
  text?: string; // For text label
  fontSize?: number;
}

export type StampPosition =
  | 'bottom-bar'
  | 'top-bar'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export type StampLayoutStyle = 'compact-strip' | 'two-column-grid' | 'corner-badge';

export type StampFontSize = 'small' | 'medium' | 'large';

export type StampFieldKey =
  | 'organizationName'
  | 'reportReference'
  | 'caseId'
  | 'workType'
  | 'casePriority'
  | 'shortCaption'
  | 'incidentId'
  | 'workOrderId'
  | 'siteId'
  | 'siteCode'
  | 'siteName'
  | 'siteAddress'
  | 'region'
  | 'equipmentInfo'
  | 'photoTitle'
  | 'incidentDescription'
  | 'workPerformed'
  | 'priority'
  | 'visitDate'
  | 'captureTimestamp'
  | 'uploadTimestamp'
  | 'workStartTime'
  | 'completionTime'
  | 'closureTime'
  | 'engineerName'
  | 'coordinates'
  | 'classification'
  | 'customText1'
  | 'customText2';

export interface PhotoStampConfig {
  enabled: boolean;
  position: StampPosition;
  layoutStyle: StampLayoutStyle;
  fontSize: StampFontSize;
  backgroundOpacity: number; // 0.65 - 0.95
  visibleFields: StampFieldKey[];
  organizationName: string;
  reportReference?: string;
  customText1?: string;
  customText2?: string;
}

export interface PhotoRevision {
  id: string;
  revisionNumber: number;
  timestamp: string;
  editorName: string;
  editorRole: UserRole;
  summary: string;
  annotationCount: number;
  stampEnabled: boolean;
}

export interface PhotoAsset {
  id: string; // e.g., PHO-2026-001
  title: string;
  caption: string;
  figureNumber?: string; // e.g., "Figure 1.1"
  classification: PhotoClassification;
  pairGroupId?: string; // Links Before & After photo pairs together
  equipmentOrArea: string;
  tags: string[];
  siteId: string;
  siteCode: string;
  siteName: string;
  siteAddress?: string;
  region?: string;
  incidentId?: string;
  workOrderId?: string;
  visitId?: string;
  reportId?: string;
  caseId?: string;
  originalDataUrl: string; // Unchanged original photograph
  annotatedDataUrl?: string; // Separate rendered annotated + stamped image
  isAnnotated: boolean;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml';
  width: number;
  height: number;
  fileSizeKb: number;
  captureTimestamp?: string;
  captureTimestampSource: 'Recorded (Device/EXIF)' | 'Manual Entry' | 'Not Recorded';
  uploadTimestamp: string;
  uploadedBy: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    source: 'Site Registry' | 'Recorded (Device/EXIF)' | 'Manual Entry';
  };
  annotations: PhotoAnnotationShape[];
  stampConfig: PhotoStampConfig;
  revisionHistory: PhotoRevision[];
  organizationId?: string;
  version?: number;
}

export interface Attachment {
  id: string;
  parentType: 'Incident' | 'WorkOrder' | 'SiteVisit' | 'MaintenanceReport';
  parentId: string;
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf' | 'text/csv' | 'application/json';
  fileSizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
  category:
    | 'Before Photo'
    | 'During Photo'
    | 'After Photo'
    | 'Inspection Photo'
    | 'Alarm Log'
    | 'Test Measurement'
    | 'Single Line Diagram';
  restrictedAccess?: boolean;
}

/**
 * PHASE 4 — 16 PROFESSIONAL ENGINEERING REPORT TYPES & DOCUMENT CONTROL
 */
export type ReportType =
  | 'Incident Investigation Report'
  | 'Corrective Maintenance Report'
  | 'Preventive Maintenance Report'
  | 'Site Visit Report'
  | 'Tower Inspection Report'
  | 'Equipment Replacement Report'
  | 'BSC/NOC Alarm Report'
  | 'External Alarm Investigation Report'
  | 'Transmission and Microwave Maintenance Report'
  | 'Fiber and Optical Maintenance Report'
  | 'Power System Maintenance Report'
  | 'Site Acceptance or Verification Report'
  | 'Daily Engineering Activity Report'
  | 'Weekly and Monthly Maintenance Summary'
  | 'Team Performance Report'
  | 'Custom Report';

export type ReportStatus =
  | 'Draft'
  | 'Generated'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Superseded';

export type PdfVariantMode =
  | 'full-with-photos'
  | 'full-without-photos'
  | 'compact-with-photos'
  | 'compact-without-photos';

export interface ReportBrandingConfig {
  companyName: string;
  departmentName: string;
  logoText: string;
  confidentialityLabel:
    | 'INTERNAL ENGINEERING USE ONLY'
    | 'CONFIDENTIAL — CARRIER OPERATIONS'
    | 'CUSTOMER DELIVERABLE'
    | 'PUBLIC';
  reportNumberPrefix: string; // e.g., "TM" -> TM-2026-000001
  accentColorHex: string;
}

export interface ReportRevision {
  revisionNumber: number; // e.g., 1, 2, 3
  revisionCode: string; // e.g., "Rev 1.0", "Rev 2.0"
  statusAtRevision: ReportStatus;
  generatedAt: string;
  generatedBy: string;
  generatedByRole: UserRole;
  changeNotes: string;
}

export interface ReportApprovalRecord {
  id: string;
  action: 'Submitted for Review' | 'Reviewed' | 'Approved' | 'Rejected' | 'Regenerated as New Revision';
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  comments: string;
  verificationMethod: 'Authenticated Role Sign-Off (In-App)' | 'Pending External Digital Signature';
}

export interface MaintenanceReport {
  id: string;
  reportNumber: string; // e.g., TM-2026-000001
  reportType?: ReportType;
  revisionNumber?: number;
  revisionCode?: string; // e.g., "Rev 1.0"
  siteId: string;
  siteCode: string;
  siteName?: string;
  region?: string;
  operator?: string;
  workOrderNumber: string;
  linkedWorkOrderId?: string;
  linkedIncidentId?: string;
  linkedCaseId?: string;
  caseNumber?: string;
  linkedVisitIds?: string[];
  linkedAlarmIds?: string[];
  photoAssetIds?: string[];
  priority?: IncidentPriority | WorkOrderPriority | string;
  title: string;
  authorName: string; // Prepared by
  authorRole?: UserRole;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt: string;
  generatedAt?: string;
  updatedAt?: string;
  approvalStatus: ReportStatus;
  confidentialityLabel?: string;
  // Structured Engineering Sections
  summary: string; // Executive summary
  purposeOfVisit?: string;
  serviceImpactSummary?: string;
  mainFindings?: string;
  finalOutcome?: string;
  diagnosticProcedures?: string;
  postRepairVerificationChecks?: string;
  connectivityAndAlarmStatus?: string;
  outstandingFaults?: string;
  recommendations?: string;
  revisionHistory?: ReportRevision[];
  approvalRecords?: ReportApprovalRecord[];
  organizationId?: string;
  version?: number;
}

/**
 * PHASE 2 — TELECOM GIS LAYER & FEATURE MODELS
 */
export type GisLayerGroup =
  | 'sites'
  | 'fiber-transmission'
  | 'equipment-infra'
  | 'operations-maintenance';

export type GisFeatureType =
  | 'Fiber Route'
  | 'Underground Duct'
  | 'Microwave Link'
  | 'Manhole / Handhole'
  | 'Fiber Distribution Cabinet (FDT)'
  | 'Optical Splitter / FAT'
  | 'Outdoor Telecom Cabinet'
  | 'Power / Rectifier / DG Pad'
  | 'Battery & Env Sensor Node'
  | 'Infrastructure Area / Compound'
  | 'Maintenance / Incident Marker';

export interface TelecomGisFeature {
  id: string; // e.g., GIS-FBR-001
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
  properties: Record<string, string | number | boolean>;
  createdBy: string;
  updatedBy: string;
  organizationId?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type BasemapStyleId = 'dark' | 'light' | 'street' | 'satellite';

export type GisToolMode =
  | 'select'
  | 'add-site'
  | 'add-bts'
  | 'add-bsc'
  | 'draw-point'
  | 'draw-line'
  | 'draw-polygon'
  | 'edit-geometry'
  | 'measure-distance'
  | 'measure-route'
  | 'measure-area';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorRole: UserRole;
  organizationId?: string;
  teamId?: string;
  actionType:
    | 'AUTH_SIGN_IN'
    | 'AUTH_SIGN_OUT'
    | 'AUTH_FAILED_SIGN_IN'
    | 'AUTH_PASSWORD_RESET_REQUESTED'
    | 'AUTH_PASSWORD_CHANGED'
    | 'AUTH_UNAUTHORIZED_ATTEMPT'
    | 'USER_CREATED'
    | 'USER_INVITED'
    | 'USER_STATUS_CHANGED'
    | 'USER_ROLE_CHANGED'
    | 'USER_PROFILE_UPDATED'
    | 'ORGANIZATION_CREATED'
    | 'ORGANIZATION_UPDATED'
    | 'TEAM_CREATED'
    | 'TEAM_UPDATED'
    | 'ALARM_ACKNOWLEDGED'
    | 'ALARM_UNACKNOWLEDGED'
    | 'ALARM_CLEARED'
    | 'ALARM_INGESTED'
    | 'ALARM_LINKED_TO_INCIDENT'
    | 'INCIDENT_CREATED'
    | 'INCIDENT_ACKNOWLEDGED'
    | 'INCIDENT_STATUS_CHANGED'
    | 'INCIDENT_ASSIGNED'
    | 'INCIDENT_SEVERITY_CHANGED'
    | 'INCIDENT_SERVICE_RESTORED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_CLOSED'
    | 'INCIDENT_REOPENED'
    | 'INCIDENT_ESCALATED'
    | 'INCIDENT_NOTE_ADDED'
    | 'SITE_CREATED'
    | 'SITE_UPDATED'
    | 'SITE_ARCHIVED'
    | 'EQUIPMENT_CREATED'
    | 'EQUIPMENT_UPDATED'
    | 'WORK_ORDER_CREATED'
    | 'WORK_ORDER_UPDATED'
    | 'WORK_ORDER_VERIFIED'
    | 'SITE_VISIT_CREATED'
    | 'SITE_VISIT_UPDATED'
    | 'PHOTO_UPLOADED'
    | 'PHOTO_ANNOTATED'
    | 'PHOTO_DELETED'
    | 'REPORT_CREATED'
    | 'REPORT_GENERATED'
    | 'REPORT_REVIEWED'
    | 'REPORT_APPROVED'
    | 'REPORT_REJECTED'
    | 'REPORT_EXPORTED'
    | 'SLA_CONFIG_UPDATED'
    | 'GIS_FEATURE_CREATED'
    | 'GIS_FEATURE_UPDATED'
    | 'GIS_FEATURE_DELETED'
    | 'GIS_GEOJSON_IMPORTED'
    | 'GIS_GEOJSON_EXPORTED'
    | 'DATA_MIGRATION_EXECUTED'
    | 'BACKUP_CREATED'
    | 'BACKUP_RESTORED'
    | 'DEMO_DATA_RESET'
    | 'WORK_CASE_CREATED'
    | 'WORK_CASE_UPDATED'
    | 'WORK_CASE_DELETED'
    | 'WORK_CASE_STATUS_CHANGED';
  entityType:
    | 'Incident'
    | 'Alarm'
    | 'Site'
    | 'Equipment'
    | 'WorkOrder'
    | 'SiteVisit'
    | 'PhotoAsset'
    | 'MaintenanceReport'
    | 'GisFeature'
    | 'User'
    | 'Team'
    | 'Organization'
    | 'Security'
    | 'System'
    | 'WorkCase';
  entityId: string;
  summary: string;
  beforeValue?: string;
  afterValue?: string;
}

/**
 * PHASE 5 — MULTI-TENANT ORGANIZATIONS, PROJECTS, INVITATIONS, INTEGRATIONS, BACKUPS & MIGRATION
 */
export interface Organization {
  id: string; // e.g., ORG-TELECOM-01
  code: string; // e.g., NCO-ALPHA
  name: string;
  tier: 'Primary Telecom Operator' | 'Regional Field Contractor' | 'Infrastructure TowerCo';
  primaryOperatorName: string;
  allowedRegions: string[];
  dataRetentionDays: number;
  auditRetentionDays: number;
  requireEmailVerification: boolean;
  sessionTimeoutMinutes: number;
  status: 'Active' | 'Suspended';
  createdAt: string;
  updatedAt: string;
}

export interface OperatorProject {
  id: string; // e.g., PRJ-CARRIER-5G
  organizationId: string;
  code: string;
  name: string;
  operatorName: string;
  regions: string[];
  status: 'Active' | 'Planned' | 'Archived';
  slaProfileId?: string;
  createdAt: string;
}

export interface UserInvitation {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string;
  region: string;
  isExternalContractor: boolean;
  contractorCompany?: string;
  invitedByUserId: string;
  invitedByName: string;
  inviteCode: string;
  status: 'Pending' | 'Accepted' | 'Revoked' | 'Expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface IntegrationConnector {
  id: string;
  organizationId: string;
  name: string;
  vendor: 'Huawei' | 'Nokia' | 'Ericsson' | 'Dry-Contact RTU' | 'SMTP Email' | 'SMS Gateway';
  protocol: string;
  mode: 'Simulated / Development Fallback' | 'Configured & Active' | 'Disabled';
  status: 'Healthy (Simulated)' | 'Healthy (Connected)' | 'Awaiting Server Credentials' | 'Degraded';
  endpointHint: string;
  deduplicationWindowMinutes: number;
  lastSyncAt?: string;
  eventsProcessedCount: number;
  errorCount: number;
  lastErrorMessage?: string;
}

export interface BackupSnapshotMetadata {
  id: string;
  organizationId: string;
  label: string;
  schemaVersion: string;
  createdAt: string;
  createdBy: string;
  recordCounts: {
    users: number;
    teams: number;
    sites: number;
    equipment: number;
    alarms: number;
    incidents: number;
    workOrders: number;
    siteVisits: number;
    reports: number;
    photoAssets: number;
    auditEvents: number;
  };
  sizeBytes: number;
}

export interface MigrationReport {
  migrationId: string;
  executedAt: string;
  executedBy: string;
  organizationId: string;
  sourceSchemaVersion: string;
  targetSchemaVersion: string;
  status: 'Success' | 'Completed with Warnings' | 'Failed';
  migratedCounts: Record<string, number>;
  duplicatesSkipped: number;
  validationErrors: string[];
  warnings: string[];
}

export interface BackendHealthStatus {
  status: 'online' | 'degraded' | 'offline';
  environmentMode: 'development-demo' | 'production-enforced';
  schemaVersion: string;
  serverTimeUtc: string;
  storageEngine: string;
  activeOrganizationId: string;
  tenantIsolationEnforced: boolean;
  rbacEnforced: boolean;
  uptimeSeconds: number;
}

export type NavigationSectionId =
  | 'overview'
  | 'cases'
  | 'gis-map'
  | 'incidents'
  | 'alarms'
  | 'work-orders'
  | 'site-visits'
  | 'photo-studio'
  | 'sites'
  | 'teams-users'
  | 'equipment'
  | 'reports'
  | 'analytics'
  | 'settings';

// ==========================================
// WORK CASES & PERSONAL CASE MANAGEMENT
// ==========================================

export type CasePriority =
  | 'Low'
  | 'Normal'
  | 'High'
  | 'Critical'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type CaseStatus =
  | 'Draft'
  | 'Planned'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Verified'
  | 'Closed'
  | 'Cancelled'
  | 'draft'
  | 'planned'
  | 'dispatched'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'verified'
  | 'closed'
  | 'cancelled';

export interface WorkCaseStep {
  id: string;
  stepNumber?: number;
  orderIndex?: number;
  title?: string;
  description: string;
  result?: string;
  remarks?: string;
  status:
    | 'Pending'
    | 'In Progress'
    | 'Completed'
    | 'Skipped'
    | 'Failed'
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'skipped'
    | 'failed';
  isCompleted?: boolean;
  estimatedMinutes?: number;
  completedAt?: string;
  doneBy?: string;
}

export type WorkCaseEventType =
  | 'Status Change'
  | 'Site Arrival'
  | 'Work Started'
  | 'Work Paused'
  | 'Work Resumed'
  | 'Measurement Taken'
  | 'Photo Added'
  | 'Report Linked'
  | 'Step Completed'
  | 'Spare Part Used'
  | 'Finding Noted'
  | 'Verification'
  | 'Departure'
  | 'Case Closed'
  | 'Comment / Note';

export interface WorkCaseTimelineEntry {
  id: string;
  timestamp?: string; // ISO 8601
  eventType?: WorkCaseEventType;
  type?: string; // alias
  title: string;
  description: string;
  authorName?: string;
  author?: string; // alias
  photoIds?: string[];
  isManualEntry?: boolean;
}

export interface WorkCaseMeasurement {
  id: string;
  parameterName?: string; // e.g. "Optical Rx Power", "VSWR Sector 1", "Float Bus Voltage -48V", "Ground Resistance"
  parameter?: string; // alias
  value: string;
  unit: string; // e.g. "dBm", "ratio", "VDC", "Ohm", "Mbps", "°C"
  minThreshold?: string;
  thresholdMin?: string; // alias
  maxThreshold?: string;
  thresholdMax?: string; // alias
  status:
    | 'Pass'
    | 'Fail'
    | 'Within Range'
    | 'Out of Range'
    | 'Informational'
    | 'pass'
    | 'fail'
    | 'marginal'
    | 'info';
  testInstrument?: string; // e.g. "EXFO FTB-1 OTDR", "Anritsu Site Master", "Fluke 87V"
  testEquipment?: string; // alias
  timestamp: string;
  recordedBy?: string;
  performedBy?: string; // alias
  notes?: string;
}

export interface WorkCaseMaterial {
  id: string;
  partNumber?: string;
  partName?: string;
  name?: string; // alias
  quantity: number;
  unit: string; // e.g. "pcs", "meters", "rolls", "kits"
  serialNumber?: string;
  supplierOrWarehouse?: string;
  recordedAt?: string;
  notes?: string;
}

export interface WorkCaseEquipmentItem {
  id: string;
  equipmentId?: string; // linked to Site Equipment if existing
  name: string;
  category?: EquipmentCategory;
  type?: string; // alias
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  assetId?: string;
  installationLocation?: string; // e.g., "Rack 2, RU 14", "Tower Leg B, 32m"
  initialCondition?: string;
  finalCondition?: string;
  firmwareVersion?: string; // alias
  action?: 'inspected' | 'installed' | 'replaced' | 'repaired' | 'removed';
  status?: string;
}

export interface WorkCaseFollowUpTask {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignee?: string; // alias
  dueDate?: string;
  priority: CasePriority;
  status:
    | 'Open'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled'
    | 'pending'
    | 'open'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  createdAt?: string;
  completedAt?: string;
}

export interface WorkCaseFieldTimestamps {
  plannedDate?: string;
  actualArrival?: string;
  workStart?: string;
  workPause?: string;
  workResume?: string;
  workCompletion?: string;
  verification?: string;
  departure?: string;
  caseClosure?: string;
  estimatedDurationHours?: number;
  actualDurationHours?: number;
  isActualCalculated?: boolean;
}

export interface WorkCaseActivityLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
}

export interface WorkCase {
  id: string; // e.g., "CASE-2026-0001"
  caseNumber: string; // e.g., "CASE-2026-0001"
  title: string;
  summary: string;
  description: string;
  category: string; // e.g., "Radio Access Network & Towers", "Fiber Optics & Fixed Access", etc.
  workType: string; // e.g., "BTS / Site Inspection", "OTDR Testing", "Microwave Link Installation or Alignment"
  priority: CasePriority;
  status: CaseStatus;
  tags: string[];

  // Site & Location Linkage
  siteId: string;
  siteCode: string;
  siteName: string;
  siteType: SiteType;
  address: string;
  city?: string;
  region: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  accessInstructions?: string;
  safetyNotes?: string;
  customerOrProject?: string;

  // Flexible aliases
  workTypeCategory?: string;
  scheduledDate?: string;
  assignedEngineer?: string;
  operator?: string;
  timeTracking?: {
    estimatedHours: number;
    actualHours?: number;
  };
  fieldTimestamps?: {
    arrivedAt?: string;
    departedAt?: string;
  };
  siteAddress?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    accuracyMeters?: number;
  };
  weatherCondition?: {
    condition: string;
    temperatureC: number;
    windSpeedKmh: number;
  };
  requiredTools?: string[];
  recommendations?: string;
  correctiveAction?: string;
  linkedIncidentId?: string;
  linkedAlarmIds?: string[];

  // Work Details
  reasonForWork: string;
  reportedProblem?: string;
  initialObservations?: string;
  technicalFindings?: string;
  rootCause?: string;
  correctiveActions?: string;
  preventiveRecommendations?: string;
  remainingIssues?: string;
  finalResult?: string;
  verificationMethod?: string;
  postServiceStatus?: string;
  equipmentStatusAfter?: string;
  serviceStatusAfter?: string;
  customerConfirmation?: string;
  supervisorConfirmation?: string;
  toolsUsed: string[];

  // Detailed lists
  steps: WorkCaseStep[];
  measurements: WorkCaseMeasurement[];
  materials: WorkCaseMaterial[];
  equipment: WorkCaseEquipmentItem[];
  followUpTasks: WorkCaseFollowUpTask[];
  photoIds: string[]; // references PhotoAsset IDs
  reportIds: string[]; // references MaintenanceReport IDs

  // Timestamps & Duration
  timestamps: WorkCaseFieldTimestamps;
  timeline: WorkCaseTimelineEntry[];
  activityHistory: WorkCaseActivityLog[];

  // Ownership & Future Team-Readiness
  createdBy: string;
  createdByName: string;
  ownerId?: string;
  responsibleEngineer: string;
  assignedTo?: string;
  teamId?: string;
  organizationId?: string;
  contractorCompany?: string;
  relatedCaseId?: string;
  relatedIncidentId?: string;
  relatedWorkOrderId?: string;

  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkTypeItem {
  id: string;
  name: string;
  description: string;
  suggestedTools?: string[];
  suggestedChecklist?: string[];
}

export interface WorkTypeCategory {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  types: WorkTypeItem[];
}



