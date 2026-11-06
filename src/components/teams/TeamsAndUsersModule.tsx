import React, { useMemo, useState } from 'react';
import {
  Award,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getRolePermissions,
  PermissionAction,
  ROLE_DESCRIPTIONS,
} from '../../security/permissions';
import {
  EngineerAvailability,
  UserAccountStatus,
  UserRole,
} from '../../types/models';

const AVAILABILITY_OPTIONS: EngineerAvailability[] = [
  'Available',
  'On-Site',
  'Busy / Dispatched',
  'Off-Shift',
];

const KEY_MATRIX_ACTIONS: PermissionAction[] = [
  'org:manage_global',
  'org:manage_settings',
  'users:manage',
  'users:invite',
  'alarm:acknowledge',
  'incident:create',
  'incident:verify_resolve',
  'incident:close',
  'workorder:assign',
  'visit:manage',
  'photo:upload',
  'photo:annotate',
  'report:approve',
  'audit:view',
  'backup:manage',
];

export const TeamsAndUsersModule: React.FC = () => {
  const {
    store,
    currentUser,
    can,
    updateEngineerAvailability,
    createOperatorInvitation,
    updateUserAdministration,
  } = useApp();

  const canViewContact = can('user:view_contact_details');
  const canManageUsers = can('users:manage');
  const canInviteUsers = can('users:invite');

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'invitations' | 'rbac-matrix'>(
    'directory'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserAccountStatus>('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'AVAILABLE_CAPACITY' | 'HIGH_LOAD'>(
    'ALL'
  );

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.FIELD_ENGINEER);
  const [inviteTeamId, setInviteTeamId] = useState(store.teams[0]?.id || 'TEAM-NOC-01');
  const [inviteRegion, setInviteRegion] = useState('North Metro');
  const [inviteContractor, setInviteContractor] = useState(false);
  const [inviteContractorCompany, setInviteContractorCompany] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const activeOrgId = store.activeOrganizationId || currentUser?.organizationId || 'ORG-TELECOM-01';
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  // Enforce tenant scoping on visible users and teams
  const tenantScopedUsers = useMemo(
    () =>
      store.users.filter(
        (u) => isSuperAdmin || (u.organizationId || 'ORG-TELECOM-01') === activeOrgId
      ),
    [store.users, isSuperAdmin, activeOrgId]
  );

  const tenantScopedTeams = useMemo(
    () =>
      store.teams.filter(
        (t) => isSuperAdmin || (t.organizationId || 'ORG-TELECOM-01') === activeOrgId
      ),
    [store.teams, isSuperAdmin, activeOrgId]
  );

  const engineerWorkloads = useMemo(() => {
    const map: Record<string, { incidents: number; workOrders: number }> = {};
    tenantScopedUsers.forEach((u) => {
      const incCount = store.incidents.filter(
        (i) => i.assignedEngineerId === u.id && i.status !== 'Closed' && i.status !== 'Resolved'
      ).length;
      const woCount = store.workOrders.filter(
        (w) =>
          w.assignedEngineerId === u.id &&
          w.status !== 'Completed' &&
          w.status !== 'Verified' &&
          w.status !== 'Cancelled'
      ).length;
      map[u.id] = { incidents: incCount, workOrders: woCount };
    });
    return map;
  }, [tenantScopedUsers, store.incidents, store.workOrders]);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    tenantScopedUsers.forEach((u) => {
      (u.specialties || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [tenantScopedUsers]);

  const filteredEngineers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tenantScopedUsers.filter((u) => {
      if (regionFilter !== 'ALL' && u.region !== regionFilter) return false;
      if (
        availabilityFilter !== 'ALL' &&
        (u.availabilityStatus || 'Available') !== availabilityFilter
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && (u.accountStatus || 'Active') !== statusFilter) {
        return false;
      }
      if (skillFilter !== 'ALL' && !(u.specialties || []).includes(skillFilter)) {
        return false;
      }

      const load = engineerWorkloads[u.id] || { incidents: 0, workOrders: 0 };
      const totalLoad = load.incidents + load.workOrders;
      if (workloadFilter === 'AVAILABLE_CAPACITY' && totalLoad >= 2) return false;
      if (workloadFilter === 'HIGH_LOAD' && totalLoad < 2) return false;

      if (q) {
        const hay = [
          u.id,
          u.fullName,
          u.email,
          u.role,
          u.title,
          u.region,
          u.organizationId || '',
          u.contractorCompany || '',
          ...(u.specialties || []),
          ...(u.certifications || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    tenantScopedUsers,
    searchQuery,
    regionFilter,
    availabilityFilter,
    statusFilter,
    skillFilter,
    workloadFilter,
    engineerWorkloads,
  ]);

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const res = createOperatorInvitation({
      email: inviteEmail,
      fullName: inviteName,
      role: inviteRole,
      teamId: inviteTeamId,
      region: inviteRegion,
      isExternalContractor: inviteContractor,
      contractorCompany: inviteContractorCompany,
    });
    if (!res.ok) {
      setInviteError(res.error || 'Failed to issue invitation.');
      return;
    }
    setInviteEmail('');
    setInviteName('');
    setInviteOpen(false);
    setActiveSubTab('invitations');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <Users className="w-3.5 h-3.5" />
            <span>
              PHASE 5 MULTI-TENANT TEAMS, USER ADMINISTRATION, INVITATIONS &amp; 7-ROLE RBAC
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Engineering Teams, Personnel &amp; Access Governance ({tenantScopedUsers.length}{' '}
            Personnel · {tenantScopedTeams.length} Squads)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Manage regional maintenance squads, shift schedules, external contractor accounts,
            invitation provisioning, and 7-role RBAC enforcement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canInviteUsers && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Issue Operator Invitation</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'directory'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          1. Squads &amp; Personnel Directory ({tenantScopedUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('invitations')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'invitations'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          2. Approved Invitations ({(store.invitations || []).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('rbac-matrix')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'rbac-matrix'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          3. 7-Role Server RBAC Matrix
        </button>
      </div>

      {activeSubTab === 'directory' && (
        <>
          {/* RBAC & Tenant Isolation Banner */}
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sky-900 dark:text-sky-200">
                  Active Role: {currentUser?.role} · Tenant Scope: {activeOrgId} · Contact Privacy:{' '}
                  {canViewContact ? 'Authorized (Full Visibility)' : 'Restricted (Masked)'}
                </p>
                <p className="text-sky-800 dark:text-sky-300/90 mt-0.5">
                  Server-side RBAC enforces least privilege. Suspending an operator immediately
                  revokes their active session tokens on the backend.
                </p>
              </div>
            </div>
          </div>

          {/* Regional Engineering Squads */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Regional Engineering &amp; NOC Squads ({tenantScopedTeams.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {tenantScopedTeams.map((team) => {
                const activeWos = store.workOrders.filter(
                  (w) =>
                    w.assignedTeamId === team.id &&
                    w.status !== 'Completed' &&
                    w.status !== 'Verified' &&
                    w.status !== 'Cancelled'
                ).length;
                const activeIncs = store.incidents.filter(
                  (i) =>
                    i.assignedTeamId === team.id &&
                    i.status !== 'Resolved' &&
                    i.status !== 'Closed'
                ).length;
                const teamMembers = tenantScopedUsers.filter((u) => u.teamId === team.id);
                const leader = tenantScopedUsers.find((u) => u.id === team.leadUserId);

                return (
                  <div
                    key={team.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between text-xs space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {team.code}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{team.region}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {team.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{team.specialization}</p>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Team Leader:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {leader?.fullName || 'Assigned Lead'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Incidents / WOs:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {activeIncs} INC · {activeWos} WO
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Personnel:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {teamMembers.length} members
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dispatch Hotline:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {canViewContact ? team.onCallPhone : '[Restricted]'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engineer Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Name, Email, Certification, Specialty, Role..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by Region"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="ALL">All Regions</option>
                  <option value="National (All Regions)">National (All Regions)</option>
                  <option value="North Metro">North Metro</option>
                  <option value="Central">Central</option>
                  <option value="South Corridor">South Corridor</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by Account Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | UserAccountStatus)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="ALL">All Account Statuses</option>
                  <option value="Active">Active Accounts</option>
                  <option value="Suspended">Suspended Accounts</option>
                  <option value="Inactive">Inactive Accounts</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by Specialty"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="ALL">All Specialties</option>
                  {allSpecialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by Workload"
                  value={workloadFilter}
                  onChange={(e) =>
                    setWorkloadFilter(
                      e.target.value as 'ALL' | 'AVAILABLE_CAPACITY' | 'HIGH_LOAD'
                    )
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="ALL">All Workloads</option>
                  <option value="AVAILABLE_CAPACITY">Available Capacity (&lt;2 tasks)</option>
                  <option value="HIGH_LOAD">High Load (2+ active tasks)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Personnel Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredEngineers.map((u) => {
              const team = store.teams.find((t) => t.id === u.teamId);
              const load = engineerWorkloads[u.id] || { incidents: 0, workOrders: 0 };
              const status = u.accountStatus || (u.active === false ? 'Suspended' : 'Active');

              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-xl bg-white dark:bg-slate-900 border ${
                    status === 'Suspended'
                      ? 'border-red-300 dark:border-red-900/70'
                      : 'border-slate-200 dark:border-slate-800'
                  } flex flex-col justify-between text-xs space-y-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {u.id}
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {u.role}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.organizationId || 'ORG-TELECOM-01'}
                        </span>
                        {u.isExternalContractor && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            CONTRACTOR: {u.contractorCompany || 'External'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {u.fullName}
                      </h3>
                      <p className="text-slate-500">
                        {u.title} · {team?.name || u.teamId} ({u.region})
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          status === 'Active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                      <select
                        aria-label={`Availability for ${u.fullName}`}
                        value={u.availabilityStatus || 'Available'}
                        onChange={(e) =>
                          updateEngineerAvailability(
                            u.id,
                            e.target.value as EngineerAvailability
                          )
                        }
                        className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      >
                        {AVAILABILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contact, Shift & Workload Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono truncate">
                        {canViewContact ? u.email : '[Restricted Email]'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">
                        {canViewContact ? (
                          u.phone
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Lock className="w-3 h-3" /> Restricted by Role
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {u.shiftSchedule || 'Standard Shift'} ({u.onCallStatus || 'Standard'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-bold">
                        Workload: {load.incidents} INC · {load.workOrders} WO
                      </span>
                    </div>
                  </div>

                  {/* Specialties & Certifications */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Specialties:</span>
                      {(u.specialties || ['RAN Maintenance']).map((sp) => (
                        <span
                          key={sp}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                        >
                          {sp}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {(u.certifications || ['RF Safety Certified']).map((cert) => (
                        <span
                          key={cert}
                          className="text-[11px] text-slate-600 dark:text-slate-400 font-medium"
                        >
                          {cert} ·
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Administrator Role & Account Status Controls */}
                  {canManageUsers && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-500">Role:</label>
                        <select
                          aria-label={`Role for ${u.fullName}`}
                          value={u.role}
                          onChange={(e) =>
                            updateUserAdministration(u.id, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="px-2 py-1 text-[11px] rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        >
                          {Object.values(UserRole).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {status === 'Active' ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateUserAdministration(u.id, { accountStatus: 'Suspended' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Suspend &amp; Revoke Session</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              updateUserAdministration(u.id, { accountStatus: 'Active' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reactivate Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeSubTab === 'invitations' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Administrator-Issued Operator Invitations
              </h2>
              <p className="text-slate-500 mt-0.5">
                All new operator and contractor accounts must be provisioned via an authorized
                invitation code.
              </p>
            </div>
            {canInviteUsers && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                + New Invitation
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  <th className="py-2.5 px-3">Invite Code</th>
                  <th className="py-2.5 px-3">Invitee</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Tenant / Squad</th>
                  <th className="py-2.5 px-3">Contractor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(store.invitations || []).map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {inv.inviteCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">{inv.email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{inv.role}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {inv.organizationId} · {inv.teamId} ({inv.region})
                    </td>
                    <td className="py-2.5 px-3">
                      {inv.isExternalContractor
                        ? `Yes (${inv.contractorCompany || 'External'})`
                        : 'Internal Staff'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">{inv.status}</td>
                    <td className="py-2.5 px-3 text-slate-500">{inv.invitedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'rbac-matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Server-Enforced 7-Role RBAC Permission Matrix
            </h2>
            <p className="text-slate-500 mt-0.5">
              Every action below is validated on the Express backend before database or file storage
              mutations execute.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  <th className="py-2 px-2.5">Permission Action</th>
                  {Object.values(UserRole).map((role) => (
                    <th key={role} className="py-2 px-2.5">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {KEY_MATRIX_ACTIONS.map((action) => (
                  <tr key={action}>
                    <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {action}
                    </td>
                    {Object.values(UserRole).map((role) => {
                      const allowed = getRolePermissions(role).includes(action);
                      return (
                        <td key={role} className="py-2 px-2.5">
                          {allowed ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ALLOW
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">DENY</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invitation Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Issue Authorized Operator Invitation
              </h3>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleCreateInvite} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Nadia Benali"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. n.benali@telecomops360.demo"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Assigned RBAC Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Assigned Region</label>
                  <select
                    value={inviteRegion}
                    onChange={(e) => setInviteRegion(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="North Metro">North Metro</option>
                    <option value="Central">Central</option>
                    <option value="South Corridor">South Corridor</option>
                    <option value="National (All Regions)">National (All Regions)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Assigned Engineering Squad</label>
                <select
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {tenantScopedTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="inv-contractor"
                  type="checkbox"
                  checked={inviteContractor}
                  onChange={(e) => setInviteContractor(e.target.checked)}
                />
                <label htmlFor="inv-contractor" className="font-semibold">
                  External Subcontractor Account (Restricted Scope)
                </label>
              </div>
              {inviteContractor && (
                <div>
                  <label className="block font-semibold mb-1">Contractor Company Name</label>
                  <input
                    type="text"
                    value={inviteContractorCompany}
                    onChange={(e) => setInviteContractorCompany(e.target.value)}
                    placeholder="e.g. MedTower Rigging Services"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  Generate Invitation Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
