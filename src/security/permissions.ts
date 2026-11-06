import { UserRole } from '../types/models';

/**
 * Centralized Role-Based Access Control (RBAC) Matrix for TelecomOps 360 (Phase 5).
 *
 * SECURITY ARCHITECTURE:
 * This matrix is shared between the React frontend (for role-aware UI navigation and controls)
 * and the Express/Node backend (`server.ts` & `server/backendEngine.ts`), where every API
 * endpoint enforces both RBAC permissions and strict multi-tenant `organizationId` isolation
 * before executing any read or write operation.
 */

export type PermissionAction =
  | 'org:manage_global'
  | 'org:manage_settings'
  | 'alarm:acknowledge'
  | 'alarm:correlate'
  | 'alarm:ingest'
  | 'incident:create'
  | 'incident:assign'
  | 'incident:update_status'
  | 'incident:add_note'
  | 'incident:verify_resolve'
  | 'incident:close'
  | 'incident:reopen'
  | 'incident:escalate'
  | 'sla:configure'
  | 'site:create'
  | 'site:edit'
  | 'site:archive'
  | 'site:delete'
  | 'site:view_sensitive_access'
  | 'equipment:manage'
  | 'workorder:create'
  | 'workorder:assign'
  | 'workorder:update_status'
  | 'workorder:verify'
  | 'visit:manage'
  | 'checklist:configure'
  | 'photo:upload'
  | 'photo:annotate'
  | 'photo:delete'
  | 'report:create'
  | 'report:export_batch'
  | 'report:review'
  | 'report:approve'
  | 'report:delete'
  | 'attachment:download_restricted'
  | 'report:manage_branding'
  | 'user:view_contact_details'
  | 'gis:view'
  | 'gis:create'
  | 'gis:edit'
  | 'gis:delete'
  | 'gis:import'
  | 'gis:export'
  | 'users:manage'
  | 'users:invite'
  | 'users:suspend'
  | 'teams:manage'
  | 'audit:view'
  | 'integration:manage'
  | 'backup:manage'
  | 'system:migrate_data'
  | 'system:reset_demo';

const ALL_PERMISSIONS: PermissionAction[] = [
  'org:manage_global',
  'org:manage_settings',
  'alarm:acknowledge',
  'alarm:correlate',
  'alarm:ingest',
  'incident:create',
  'incident:assign',
  'incident:update_status',
  'incident:add_note',
  'incident:verify_resolve',
  'incident:close',
  'incident:reopen',
  'incident:escalate',
  'sla:configure',
  'site:create',
  'site:edit',
  'site:archive',
  'site:delete',
  'site:view_sensitive_access',
  'equipment:manage',
  'workorder:create',
  'workorder:assign',
  'workorder:update_status',
  'workorder:verify',
  'visit:manage',
  'checklist:configure',
  'photo:upload',
  'photo:annotate',
  'photo:delete',
  'report:create',
  'report:export_batch',
  'report:review',
  'report:approve',
  'report:delete',
  'attachment:download_restricted',
  'report:manage_branding',
  'user:view_contact_details',
  'gis:view',
  'gis:create',
  'gis:edit',
  'gis:delete',
  'gis:import',
  'gis:export',
  'users:manage',
  'users:invite',
  'users:suspend',
  'teams:manage',
  'audit:view',
  'integration:manage',
  'backup:manage',
  'system:migrate_data',
  'system:reset_demo',
];

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  [UserRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [UserRole.ADMIN]: ALL_PERMISSIONS.filter((p) => p !== 'org:manage_global'),
  [UserRole.MAINTENANCE_MANAGER]: [
    'alarm:acknowledge',
    'alarm:correlate',
    'alarm:ingest',
    'incident:create',
    'incident:assign',
    'incident:update_status',
    'incident:add_note',
    'incident:verify_resolve',
    'incident:close',
    'incident:reopen',
    'incident:escalate',
    'sla:configure',
    'site:create',
    'site:edit',
    'site:archive',
    'site:view_sensitive_access',
    'equipment:manage',
    'workorder:create',
    'workorder:assign',
    'workorder:update_status',
    'workorder:verify',
    'visit:manage',
    'checklist:configure',
    'photo:upload',
    'photo:annotate',
    'report:create',
    'report:export_batch',
    'report:review',
    'report:approve',
    'attachment:download_restricted',
    'report:manage_branding',
    'user:view_contact_details',
    'gis:view',
    'gis:create',
    'gis:edit',
    'gis:delete',
    'gis:import',
    'gis:export',
    'teams:manage',
    'audit:view',
    'system:reset_demo',
  ],
  [UserRole.NOC_ENGINEER]: [
    'alarm:acknowledge',
    'alarm:correlate',
    'alarm:ingest',
    'incident:create',
    'incident:assign',
    'incident:update_status',
    'incident:add_note',
    'incident:verify_resolve',
    'incident:close',
    'incident:reopen',
    'incident:escalate',
    'site:view_sensitive_access',
    'workorder:create',
    'workorder:assign',
    'workorder:verify',
    'visit:manage',
    'photo:upload',
    'photo:annotate',
    'report:create',
    'report:export_batch',
    'report:review',
    'attachment:download_restricted',
    'user:view_contact_details',
    'gis:view',
    'gis:create',
    'gis:edit',
    'gis:export',
    'system:reset_demo',
  ],
  [UserRole.TEAM_LEADER]: [
    'alarm:acknowledge',
    'alarm:correlate',
    'incident:create',
    'incident:assign',
    'incident:update_status',
    'incident:add_note',
    'incident:verify_resolve',
    'incident:close',
    'incident:reopen',
    'incident:escalate',
    'site:create',
    'site:edit',
    'site:view_sensitive_access',
    'equipment:manage',
    'workorder:create',
    'workorder:assign',
    'workorder:update_status',
    'workorder:verify',
    'visit:manage',
    'checklist:configure',
    'photo:upload',
    'photo:annotate',
    'report:create',
    'report:export_batch',
    'report:review',
    'report:approve',
    'attachment:download_restricted',
    'user:view_contact_details',
    'gis:view',
    'gis:create',
    'gis:edit',
    'gis:delete',
    'gis:import',
    'gis:export',
    'teams:manage',
    'system:reset_demo',
  ],
  [UserRole.FIELD_ENGINEER]: [
    'alarm:acknowledge',
    'incident:update_status',
    'incident:add_note',
    'site:view_sensitive_access',
    'workorder:update_status',
    'visit:manage',
    'photo:upload',
    'photo:annotate',
    'report:create',
    'attachment:download_restricted',
    'user:view_contact_details',
    'gis:view',
    'gis:create',
    'gis:edit',
    'gis:export',
  ],
  [UserRole.AUDITOR]: [
    'gis:view',
    'gis:export',
    'report:export_batch',
    'audit:view',
  ],
};

/**
 * Normalizes legacy Phase 1-4 role strings to Phase 5 7-role enum values.
 */
export function normalizeUserRole(rawRole?: string | UserRole): UserRole {
  if (!rawRole) return UserRole.FIELD_ENGINEER;
  const r = String(rawRole).trim();
  if (r === UserRole.SUPER_ADMIN || r === 'Super Administrator') return UserRole.SUPER_ADMIN;
  if (r === UserRole.ADMIN || r === 'Administrator' || r === 'Organization Administrator') {
    return UserRole.ADMIN;
  }
  if (
    r === UserRole.MAINTENANCE_MANAGER ||
    r === 'Maintenance Manager' ||
    r === 'Operations Manager'
  ) {
    return UserRole.MAINTENANCE_MANAGER;
  }
  if (r === UserRole.NOC_ENGINEER) return UserRole.NOC_ENGINEER;
  if (r === UserRole.TEAM_LEADER) return UserRole.TEAM_LEADER;
  if (r === UserRole.FIELD_ENGINEER) return UserRole.FIELD_ENGINEER;
  if (r === UserRole.AUDITOR || r === 'Read-only Auditor' || r === 'Read-Only Auditor') {
    return UserRole.AUDITOR;
  }
  return UserRole.FIELD_ENGINEER;
}

export function hasPermission(role: UserRole | string, action: PermissionAction): boolean {
  const normalized = normalizeUserRole(role);
  const allowed = ROLE_PERMISSIONS[normalized];
  return allowed ? allowed.includes(action) : false;
}

export function getRolePermissions(role: UserRole | string): PermissionAction[] {
  const normalized = normalizeUserRole(role);
  return ROLE_PERMISSIONS[normalized] || [];
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:
    'Global platform authority across all telecom organizations, tenant boundaries, security policies, OSS/NMS integrations, database backups, and system administration.',
  [UserRole.ADMIN]:
    'Manages the organization’s users, invitations, teams, sites, equipment, SLA targets, GIS layers, report branding, and organization-scoped RBAC permissions.',
  [UserRole.MAINTENANCE_MANAGER]:
    'Monitors operational SLA performance, manages regional assignments, reviews escalations, configures checklists, and approves final engineering reports.',
  [UserRole.NOC_ENGINEER]:
    'Monitors BSS/BSC/RAN alarms, correlates events, investigates incidents, verifies service restoration, dispatches work orders, and reviews technical reports.',
  [UserRole.FIELD_ENGINEER]:
    'Views assigned work, conducts site visits, completes technical checklists, uploads & annotates field photographs, records calibrated measurements, and submits reports.',
  [UserRole.TEAM_LEADER]:
    'Assigns field tasks, monitors regional squad activity and on-call shifts, reviews completed work orders, and approves technical submissions.',
  [UserRole.AUDITOR]:
    'Read-only inspection of permitted operational records, approved engineering reports, and immutable audit history without modifying operational data.',
};
