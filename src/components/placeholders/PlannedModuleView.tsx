import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Cpu,
  FileText,
  Layers,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRolePermissions, ROLE_DESCRIPTIONS } from '../../security/permissions';
import { NavigationSectionId, UserRole } from '../../types/models';
import { formatUtcTimestamp } from '../common/StatusIndicators';

export const PlannedModuleView: React.FC<{ section: NavigationSectionId }> = ({ section }) => {
  const {
    store,
    currentUser,
    theme,
    toggleTheme,
    switchDemoRole,
    resetDemoDatabase,
    openSiteById,
    openWorkOrderById,
  } = useApp();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (section === 'site-visits') {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 flex items-start gap-3">
          <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Planned Module — Phase 3 Roadmap (Field Visit Checklists, GPS Capture &amp; Photo
              Annotation)
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 mt-0.5">
              Interactive mobile checklists, GPS geofence verification, before/after photo upload,
              and offline sync are scheduled for Phase 3. Below is the Phase 1 read-only schedule of
              seeded site visits feeding the Overview metrics.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Scheduled &amp; Active Site Visits ({store.siteVisits.length})
              </h1>
              <p className="text-xs text-slate-500">
                Read-only Phase 1 schedule linked to Sites and Work Orders
              </p>
            </div>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
              Phase 3 Full Workflow Planned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Visit Code</th>
                  <th className="py-3 px-4">Site</th>
                  <th className="py-3 px-4">Field Engineer &amp; Squad</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {store.siteVisits.map((sv) => (
                  <tr key={sv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {sv.visitCode}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openSiteById(sv.siteId)}
                        className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {sv.siteCode}
                      </button>
                      <div className="text-[11px] text-slate-500">{sv.siteName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {sv.engineerName}
                      </div>
                      <div className="text-[11px] text-slate-500">{sv.teamName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{sv.purpose}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatUtcTimestamp(sv.scheduledDate)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {sv.status} ({sv.checklistCompletedPercent}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'equipment') {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 flex items-start gap-3">
          <Cpu className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Planned Module — Phase 2/3 Hardware Lifecycle &amp; RMA Spare Tracking
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 mt-0.5">
              Full RMA workflows, barcode serial scanning, and firmware audit trails are planned for
              subsequent phases. Below is the Phase 1 seeded Telecom Domain Equipment Inventory
              (BSC, BBU, RRU/RRH, Antennas/RET, Microwave, DWDM, Rectifiers, Batteries, Generators).
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Seeded Telecom Equipment Register ({store.equipment.length} Units)
              </h1>
              <p className="text-xs text-slate-500">
                Multi-vendor hardware models linked to registered sites
              </p>
            </div>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
              Read-Only Inventory Preview
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Equipment ID</th>
                  <th className="py-3 px-4">Site Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor &amp; Model</th>
                  <th className="py-3 px-4">Serial / Firmware</th>
                  <th className="py-3 px-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {store.equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {eq.id}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openSiteById(eq.siteId)}
                        className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {eq.siteCode}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {eq.category}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {eq.vendor} — {eq.model}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {eq.name} ({eq.slotOrSector})
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div>S/N: {eq.serialNumber}</div>
                      <div>FW: {eq.firmwareOrVersion || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={
                          eq.operationalState === 'Operational'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : eq.operationalState === 'Faulty'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {eq.operationalState}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'reports') {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Planned Module — Phase 4 Technical Reporting Engine (PDF, Excel &amp; JSON Exports)
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 mt-0.5">
              Automated generation of PDF site inspection reports with embedded photos, multi-sheet
              Excel workbooks, report versioning, and supervisor sign-off workflows is scheduled for
              Phase 4.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Seeded Field Maintenance Reports ({store.maintenanceReports.length})
          </h1>
          <div className="space-y-3">
            {store.maintenanceReports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      {rep.reportNumber}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {rep.siteCode}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-slate-500">Ref: {rep.workOrderNumber}</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white mt-1">{rep.title}</p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{rep.summary}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 block">
                    {rep.approvalStatus}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    By {rep.authorName}
                  </span>
                  <span className="inline-block mt-2 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono text-slate-500">
                    PDF Export Planned (Phase 4)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'teams-users') {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/70 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sky-900 dark:text-sky-200">
              Role-Based Access Control (RBAC) Preparation &amp; Phase 5 Server Enforcement Notice
            </p>
            <p className="text-sky-800 dark:text-sky-300/90 mt-0.5">
              Frontend role checks in Phase 1 simulate role-aware navigation and action buttons,
              and are <strong>not a security boundary</strong>. In Phase 5, user provisioning and
              RBAC policies will be enforced server-side via Firebase Authentication and Firestore
              Security Rules. You can switch your active demo role below to test permission
              boundaries immediately.
            </p>
          </div>
        </div>

        {/* Interactive Demo Role Switcher */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />
            <span>Operator Directory &amp; Interactive Role Simulator</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Click &ldquo;Assume Role&rdquo; on any seeded operator below to test how UI actions
            respond to that role&apos;s centralized permissions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {store.users.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const perms = getRolePermissions(u.role);
              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border text-xs flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {u.fullName}
                      </span>
                      <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                        {u.role}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {u.title} · {u.region}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                      {ROLE_DESCRIPTIONS[u.role]}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                      Permissions ({perms.length}): {perms.slice(0, 4).join(', ')}
                      {perms.length > 4 ? ` +${perms.length - 4} more` : ''}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    {isCurrent ? (
                      <span className="inline-block w-full text-center py-1.5 rounded bg-sky-600 text-white font-semibold">
                        Active Session Operator
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchDemoRole(u.role)}
                        className="w-full py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        Assume {u.role} Role
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engineering Squads */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            Regional Engineering Squads ({store.teams.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {store.teams.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {t.code}
                  </span>
                  <span className="font-mono text-slate-500">{t.specialization}</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{t.name}</p>
                <p className="text-slate-500 mt-0.5">
                  Region: {t.region} · On-Call Hotline: {t.onCallPhone}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Planned Module — Phase 4 &amp; Phase 6 Advanced SLA Analytics &amp; Root-Cause
              Correlation
            </p>
            <p className="text-amber-800 dark:text-amber-300/90 mt-0.5">
              Multi-region MTTR/MTTA SLA heatmaps, recurring chronic site fault analysis, and
              AI-assisted alarm correlation are planned for Phases 4 and 6.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs space-y-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            TelecomOps 360 — Multi-Phase Architecture Roadmap
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                phase: 'Phase 1 (Current — Active)',
                title: 'Core Console, Auth UI, Overview, Alarm Center, Sites & Work Orders',
                desc: 'Typed telecom data models, simulated BSS/RAN/Power alarms, separate alarm vs incident states, site inventory, work orders, and local persistence.',
              },
              {
                phase: 'Phase 2 (Planned)',
                title: 'Escalation Rules, Alarm Correlation & Complete Work-Order Lifecycle',
                desc: 'Automated parent/child alarm correlation (e.g. Mains AC fail -> LLVD -> Cell down), SLA breach timers, and spare part RMA reservation.',
              },
              {
                phase: 'Phase 3 (Planned)',
                title: 'Field Visit Checklists, GPS Capture & Photo Annotation',
                desc: 'On-site check-in/out with GPS coordinates, VSWR/earth-resistance measurement forms, and before/after photo markup.',
              },
              {
                phase: 'Phase 4 (Planned)',
                title: 'PDF Inspection Reports, Excel Workbooks & Approvals',
                desc: 'Formatted engineering PDF report generator, multi-tab Excel exports, JSON interchange, and manager approval sign-off.',
              },
              {
                phase: 'Phase 5 (Planned)',
                title: 'Firebase Auth, Firestore, Cloud Storage & Server-Side RBAC',
                desc: 'Production cloud persistence, real-time multi-user sync, server-enforced security rules, and immutable audit logs.',
              },
              {
                phase: 'Phase 6 (Planned)',
                title: 'AI-Assisted Troubleshooting & Authorized NMS/OSS Connectors',
                desc: 'Automated MML/syslog analysis, chronic fault root-cause recommendations, and webhook alarm ingestion.',
              },
            ].map((item) => (
              <div
                key={item.phase}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 block">
                  {item.phase}
                </span>
                <p className="font-bold text-slate-900 dark:text-white mt-1">{item.title}</p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Settings Module
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-500" />
            <span>Platform Preferences &amp; Demonstration Data Controls</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure console appearance, active operator role simulation, and local demonstration
            datastore persistence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Theme Control */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="font-bold text-slate-900 dark:text-white">Console Visual Theme</p>
            <p className="text-slate-600 dark:text-slate-400">
              Switch between high-contrast NOC Dark Slate mode and Field Daylight mode.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                Current: {theme === 'dark' ? 'NOC Dark Slate' : 'Daylight Mode'} (Click to Toggle)
              </button>
            </div>
          </div>

          {/* Demo Data Persistence & Factory Reset */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="font-bold text-slate-900 dark:text-white">
              Phase 1 Local Persistence &amp; Seed Reset
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              All created/edited sites, incidents, and work orders are persisted in{' '}
              <code className="font-mono">localStorage</code> across browser refreshes. Resetting
              restores the original 8 sites, 8 incidents, and 5 work orders.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data to Factory Seed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Planned Phase 5/6 Connectors Notice */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs">
          <Layers className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              Planned Phase 5 &amp; Phase 6 Enterprise Integrations
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              Firebase Authentication, Firestore cloud synchronization, vendor alarm code mapping
              dictionaries, and authorized OSS/NMS webhook adapters will be configured here in
              Phases 5 and 6.
            </p>
          </div>
        </div>
      </div>

      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Demonstration Database?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  This will discard custom sites, incidents, notes, and work orders created during
                  your session and restore the initial Phase 1 seed dataset.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemoDatabase();
                  setConfirmResetOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer"
              >
                Confirm Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
