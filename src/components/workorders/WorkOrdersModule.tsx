import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileJson,
  Kanban,
  List,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportValidatedJsonPackage } from '../../services/reportExportService';
import {
  WorkOrderJobType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../types/models';
import {
  formatUtcTimestamp,
  WorkOrderPriorityIndicator,
  WorkOrderStatusIndicator,
} from '../common/StatusIndicators';

const ALL_WO_STATUSES: WorkOrderStatus[] = [
  'Draft',
  'Ready for Assignment',
  'Assigned',
  'Scheduled',
  'Dispatched',
  'In Progress',
  'Waiting for Access',
  'Waiting for Parts',
  'Completed',
  'Verified',
  'Cancelled',
];

const KANBAN_COLUMNS: { title: string; statuses: WorkOrderStatus[] }[] = [
  {
    title: '1. Intake & Assignment',
    statuses: ['Draft', 'Ready for Assignment', 'Assigned', 'Scheduled'],
  },
  {
    title: '2. Dispatched & Active',
    statuses: ['Dispatched', 'In Progress'],
  },
  {
    title: '3. Hold (Access / Parts)',
    statuses: ['Waiting for Access', 'Waiting for Parts', 'Awaiting Parts'],
  },
  {
    title: '4. Completed & Verified',
    statuses: ['Completed', 'Verified', 'Cancelled'],
  },
];

export const WorkOrdersModule: React.FC = () => {
  const {
    store,
    selectedWorkOrderId,
    setSelectedWorkOrderId,
    can,
    openCreateWorkOrderModal,
    updateWorkOrderStatus,
    verifyWorkOrderCompletion,
    assignWorkOrderPersonnel,
    openSiteById,
    openSiteInGisMap,
    openIncidentById,
    openSiteVisitById,
    openPhotoInStudio,
    recordReportExportAudit,
    navigateTo,
  } = useApp();

  const tz = store.userTimezone || 'UTC';

  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkOrderStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | WorkOrderPriority>('ALL');
  const [jobTypeFilter, setJobTypeFilter] = useState<'ALL' | WorkOrderJobType>('ALL');
  const [sortBy, setSortBy] = useState<'scheduled' | 'priority' | 'updatedAt'>('scheduled');
  const [sortAsc, setSortAsc] = useState(true);

  // Drawer local state
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignEngineerId, setAssignEngineerId] = useState('');
  const [completionNotesInput, setCompletionNotesInput] = useState('');
  const [workPerformedInput, setWorkPerformedInput] = useState('');
  const [partsConsumedInput, setPartsConsumedInput] = useState('');
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [verifyNotesInput, setVerifyNotesInput] = useState('');

  const selectedWorkOrder = useMemo(
    () => store.workOrders.find((w) => w.id === selectedWorkOrderId) || null,
    [store.workOrders, selectedWorkOrderId]
  );

  React.useEffect(() => {
    if (selectedWorkOrder) {
      setAssignTeamId(selectedWorkOrder.assignedTeamId);
      setAssignEngineerId(selectedWorkOrder.assignedEngineerId || '');
      setCompletionNotesInput(selectedWorkOrder.completionNotes || '');
      setWorkPerformedInput(selectedWorkOrder.workPerformed || '');
      setPartsConsumedInput((selectedWorkOrder.partsConsumed || []).join(', '));
      setCancellationReasonInput(selectedWorkOrder.cancellationOrPostponementReason || '');
      setVerifyNotesInput('');
    }
  }, [selectedWorkOrder]);

  const filteredWorkOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = store.workOrders.filter((wo) => {
      if (statusFilter !== 'ALL' && wo.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && wo.priority !== priorityFilter) return false;
      if (jobTypeFilter !== 'ALL' && wo.jobType !== jobTypeFilter) return false;

      if (q) {
        const hay = [
          wo.workOrderNumber,
          wo.linkedIncidentId || '',
          wo.siteCode,
          wo.siteName,
          wo.region,
          wo.jobType,
          wo.priority,
          wo.assignedAssigneeName,
          wo.workDescription,
          wo.requiredEquipmentOrSpares.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'scheduled') {
        cmp = new Date(a.scheduledVisitDate).getTime() - new Date(b.scheduledVisitDate).getTime();
      } else if (sortBy === 'priority') {
        cmp = a.priority.localeCompare(b.priority);
      } else if (sortBy === 'updatedAt') {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [store.workOrders, searchQuery, statusFilter, priorityFilter, jobTypeFilter, sortBy, sortAsc]);

  const toggleSort = (field: 'scheduled' | 'priority' | 'updatedAt') => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(field !== 'updatedAt');
    }
  };

  const handleStatusTransition = (targetStatus: WorkOrderStatus) => {
    if (!selectedWorkOrder) return;
    const parsedParts = partsConsumedInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    updateWorkOrderStatus(selectedWorkOrder.id, targetStatus, completionNotesInput || undefined, {
      workPerformed: workPerformedInput || undefined,
      partsConsumed: parsedParts,
      cancellationOrPostponementReason:
        targetStatus === 'Cancelled'
          ? cancellationReasonInput || 'Cancelled by field operations supervisor'
          : undefined,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>PHASE 3 FIELD ENGINEERING DISPATCH, KANBAN BOARD &amp; VERIFICATION</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Work Orders &amp; Team Dispatch ({store.workOrders.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Full 10-state field maintenance workflow. Completing physical work records field
            execution and consumed spares without automatically closing the linked NOC incident.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* View Toggle: List vs Kanban Board */}
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateWorkOrderModal()}
            disabled={!can('workorder:create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search WO Number, Incident ID, Site Code, Engineer, Spares..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Work Order Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | WorkOrderStatus)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Statuses</option>
              {ALL_WO_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | WorkOrderPriority)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1 - Immediate">P1 - Immediate</option>
              <option value="P2 - High">P2 - High</option>
              <option value="P3 - Medium">P3 - Medium</option>
              <option value="P4 - Scheduled">P4 - Scheduled</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter by Job Type"
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value as 'ALL' | WorkOrderJobType)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Maintenance Job Types</option>
              <option value="Corrective Maintenance">Corrective Maintenance</option>
              <option value="Preventive Maintenance">Preventive Maintenance</option>
              <option value="Emergency Repair">Emergency Repair</option>
              <option value="Inspection">Inspection</option>
              <option value="Installation">Installation</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Mode: List Table vs Kanban Board */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3 whitespace-nowrap">Work Order &amp; Incident</th>
                  <th className="py-3 px-3 whitespace-nowrap">Site Info</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('priority')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <span>Priority &amp; Job Type</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3">Scope, Safety &amp; Required Spares</th>
                  <th className="py-3 px-3 whitespace-nowrap">Assigned Engineer / Team</th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('scheduled')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <span>Scheduled / Updated</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Status &amp; Verification</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No work orders match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => setSelectedWorkOrderId(wo.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {wo.workOrderNumber}
                        </div>
                        {wo.linkedIncidentId ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openIncidentById(wo.linkedIncidentId!);
                            }}
                            className="font-mono text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <span>{wo.linkedIncidentId}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-400 block">
                            Standalone PM
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSiteById(wo.siteId);
                          }}
                          className="font-mono font-semibold text-slate-900 dark:text-white hover:text-sky-500 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{wo.siteCode}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {wo.siteName}
                        </div>
                        <div className="text-[11px] text-slate-400">{wo.region}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <WorkOrderPriorityIndicator priority={wo.priority} />
                        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                          {wo.jobType}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-sm align-top">
                        <div className="text-slate-900 dark:text-slate-100 line-clamp-2 font-medium">
                          {wo.workDescription}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                          Spares ({wo.requiredEquipmentOrSpares.length}):{' '}
                          {wo.requiredEquipmentOrSpares.join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[190px]">
                          {wo.assignedAssigneeName}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] tabular-nums align-top">
                        <div className="text-slate-800 dark:text-slate-200">
                          Visit: {formatUtcTimestamp(wo.scheduledVisitDate, tz)}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Upd: {formatUtcTimestamp(wo.updatedAt, tz)}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <WorkOrderStatusIndicator status={wo.status} />
                        {wo.verificationStatus === 'Pending Verification' && (
                          <span className="block text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                            Awaiting Supervisor Sign-Off
                          </span>
                        )}
                        {wo.verifiedBy && (
                          <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Verified by {wo.verifiedBy}
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3 px-3 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedWorkOrderId(wo.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = filteredWorkOrders.filter((w) => col.statuses.includes(w.status));
            return (
              <div
                key={col.title}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {col.title}
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                    {colOrders.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {colOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No work orders in this stage
                    </div>
                  ) : (
                    colOrders.map((wo) => (
                      <div
                        key={wo.id}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors cursor-pointer space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {wo.workOrderNumber}
                          </span>
                          <WorkOrderPriorityIndicator priority={wo.priority} />
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {wo.workDescription}
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>{wo.siteCode}</span>
                          <WorkOrderStatusIndicator status={wo.status} />
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[140px]">{wo.assignedAssigneeName}</span>
                          {wo.linkedIncidentId && (
                            <span className="font-mono text-amber-600 dark:text-amber-400">
                              {wo.linkedIncidentId}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Work Order Detail & Status Management Drawer */}
      {selectedWorkOrder && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-label="Work Order Details"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                    {selectedWorkOrder.workOrderNumber}
                  </span>
                  <span className="text-slate-400">·</span>
                  <WorkOrderPriorityIndicator priority={selectedWorkOrder.priority} />
                  <span className="text-slate-400">·</span>
                  <WorkOrderStatusIndicator status={selectedWorkOrder.status} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedWorkOrder.jobType} — {selectedWorkOrder.siteCode}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const woId = selectedWorkOrder.id;
                    const linkedPhoto = (store.photoAssets || []).find(
                      (p) => p.workOrderId === woId || p.siteId === selectedWorkOrder.siteId
                    );
                    setSelectedWorkOrderId(null);
                    openPhotoInStudio(linkedPhoto?.id, {
                      siteId: selectedWorkOrder.siteId,
                      incidentId: selectedWorkOrder.linkedIncidentId || undefined,
                      workOrderId: woId,
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const linkedPhotos = (store.photoAssets || []).filter(
                      (p) => p.workOrderId === selectedWorkOrder.id
                    );
                    exportValidatedJsonPackage(
                      'single-workorder',
                      { workOrderId: selectedWorkOrder.id },
                      {
                        workOrders: [selectedWorkOrder],
                        photoAssets: linkedPhotos,
                      },
                      can('attachment:download_restricted'),
                      `${selectedWorkOrder.workOrderNumber}_DataPackage.json`
                    );
                    recordReportExportAudit(
                      'JSON',
                      `Exported validated JSON package for Work Order ${selectedWorkOrder.workOrderNumber}`
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWorkOrderId(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close work order panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Linked Site & Incident Navigation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Target Telecom Site</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const sId = selectedWorkOrder.siteId;
                        setSelectedWorkOrderId(null);
                        openSiteById(sId);
                      }}
                      className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {selectedWorkOrder.siteCode} ({selectedWorkOrder.siteId})
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sId = selectedWorkOrder.siteId;
                        setSelectedWorkOrderId(null);
                        openSiteInGisMap(sId);
                      }}
                      className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>GIS</span>
                    </button>
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {selectedWorkOrder.siteName} · {selectedWorkOrder.region}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Linked NOC Incident</span>
                  {selectedWorkOrder.linkedIncidentId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const incId = selectedWorkOrder.linkedIncidentId!;
                          setSelectedWorkOrderId(null);
                          openIncidentById(incId);
                        }}
                        className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <span>{selectedWorkOrder.linkedIncidentId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Completing this WO will not auto-close the incident
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500 block mt-1">
                      Standalone scheduled work order (no active alarm ticket)
                    </span>
                  )}
                </div>
              </div>

              {/* 10-State Work Order Lifecycle Progression */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-sky-500" />
                    <span>Work Order Lifecycle &amp; Field Execution</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Scheduled: {formatUtcTimestamp(selectedWorkOrder.scheduledVisitDate, tz)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALL_WO_STATUSES.map((st) => {
                    const active = selectedWorkOrder.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={!can('workorder:update_status')}
                        onClick={() => handleStatusTransition(st)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                          active
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-sky-500'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>

                {/* Field Execution Log Inputs */}
                <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Work Performed (Technical Execution Summary)
                    </label>
                    <textarea
                      rows={2}
                      value={workPerformedInput}
                      disabled={!can('workorder:update_status')}
                      onChange={(e) => setWorkPerformedInput(e.target.value)}
                      placeholder="Document physical remediation, swap procedures, torque checks, and optical/RF readings..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Spare Parts Consumed (Comma-separated part numbers / S/N)
                    </label>
                    <input
                      type="text"
                      value={partsConsumedInput}
                      disabled={!can('workorder:update_status')}
                      onChange={(e) => setPartsConsumedInput(e.target.value)}
                      placeholder="e.g. Nokia 25G SFP28 (S/N NK-88412), Weatherproofing Kit"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Handover / Completion Notes or Cancellation Reason
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={completionNotesInput}
                        disabled={!can('workorder:update_status')}
                        onChange={(e) => setCompletionNotesInput(e.target.value)}
                        placeholder="Record handover notes or reason if cancelling..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        disabled={!can('workorder:update_status')}
                        onClick={() => handleStatusTransition(selectedWorkOrder.status)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        Save Progress
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supervisor Verification & Sign-Off */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Quality Verification &amp; Supervisor Sign-Off</span>
                  </span>
                  {selectedWorkOrder.verifiedAt && (
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                      Verified by {selectedWorkOrder.verifiedBy} at{' '}
                      {formatUtcTimestamp(selectedWorkOrder.verifiedAt, tz)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyNotesInput}
                    onChange={(e) => setVerifyNotesInput(e.target.value)}
                    placeholder="Supervisor verification notes (e.g. Post-swap KPIs & checklist verified)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800"
                  />
                  <button
                    type="button"
                    disabled={!can('workorder:verify')}
                    onClick={() =>
                      verifyWorkOrderCompletion(selectedWorkOrder.id, true, verifyNotesInput)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify &amp; Approve</span>
                  </button>
                </div>
              </div>

              {/* Assign Responsible Personnel (with Availability & Specialty Display) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-500" />
                  <span>Assign Responsible Team &amp; Field Engineer</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-slate-500 mb-1">Squad</label>
                    <select
                      value={assignTeamId}
                      disabled={!can('workorder:assign')}
                      onChange={(e) => setAssignTeamId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      {store.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Engineer (with Availability)
                    </label>
                    <select
                      value={assignEngineerId}
                      disabled={!can('workorder:assign')}
                      onChange={(e) => setAssignEngineerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">-- Squad Queue --</option>
                      {store.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} [{u.availabilityStatus || 'Available'}] — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={!can('workorder:assign')}
                      onClick={() =>
                        assignWorkOrderPersonnel(
                          selectedWorkOrder.id,
                          assignTeamId,
                          assignEngineerId || undefined
                        )
                      }
                      className="w-full py-1.5 px-3 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>

              {/* Linked Site Visits */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-sky-500" />
                    <span>Linked Field Site Visits &amp; Checklists</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorkOrderId(null);
                      navigateTo('site-visits');
                    }}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Open Site Visits Module →
                  </button>
                </div>

                {store.siteVisits.filter((v) => v.workOrderId === selectedWorkOrder.id).length ===
                0 ? (
                  <p className="text-slate-500">
                    No site visits recorded for this work order yet. Open Site Visits to schedule or
                    check in.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {store.siteVisits
                      .filter((v) => v.workOrderId === selectedWorkOrder.id)
                      .map((sv) => (
                        <div
                          key={sv.id}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorkOrderId(null);
                                openSiteVisitById(sv.id);
                              }}
                              className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                            >
                              {sv.visitCode}
                            </button>
                            <span className="ml-2 text-slate-600 dark:text-slate-300">
                              {sv.engineerName} · {sv.status} ({sv.checklistCompletedPercent}%
                              checklist)
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {formatUtcTimestamp(sv.scheduledDate, tz)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Scope, Safety & Required Spares */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    Technical Scope of Work
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedWorkOrder.workDescription}
                  </p>
                </div>

                {selectedWorkOrder.safetyAndAccessRequirements && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Site Access &amp; Safety Requirements
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedWorkOrder.safetyAndAccessRequirements}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block mb-2">
                    Required Equipment, Instruments &amp; Spare Parts (
                    {selectedWorkOrder.requiredEquipmentOrSpares.length})
                  </span>
                  <ul className="space-y-1.5">
                    {selectedWorkOrder.requiredEquipmentOrSpares.map((part, idx) => (
                      <li
                        key={idx}
                        className="px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300"
                      >
                        {idx + 1}. {part}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>Created: {formatUtcTimestamp(selectedWorkOrder.createdAt, tz)}</span>
                  <span>Last Updated: {formatUtcTimestamp(selectedWorkOrder.updatedAt, tz)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
