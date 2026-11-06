import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  History,
  MapPin,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportValidatedJsonPackage } from '../../services/reportExportService';
import {
  evaluateIncidentSla,
  formatDurationMins,
} from '../../services/slaAndCorrelationService';
import {
  AlarmSeverity,
  Incident,
  IncidentCategory,
  IncidentImpact,
  IncidentPriority,
  IncidentScope,
  IncidentStatus,
  SLAConfiguration,
} from '../../types/models';
import {
  formatUtcTimestamp,
  IncidentStatusIndicator,
  SeverityIndicator,
  SlaStatusIndicator,
  WorkOrderStatusIndicator,
} from '../common/StatusIndicators';

const ALL_INCIDENT_STATUSES: IncidentStatus[] = [
  'New',
  'Acknowledged',
  'Assigned',
  'In Progress',
  'Pending Parts or Access',
  'Monitoring',
  'Resolved',
  'Closed',
];

const SEVERITY_RANK: Record<AlarmSeverity, number> = {
  Critical: 4,
  Major: 3,
  Minor: 2,
  Warning: 1,
};

export const IncidentManagementModule: React.FC = () => {
  const {
    store,
    selectedIncidentId,
    setSelectedIncidentId,
    can,
    acknowledgeIncidentAlarm,
    updateIncidentStatus,
    recordIncidentServiceRestored,
    reopenIncident,
    escalateIncident,
    updateIncidentInvestigation,
    toggleSimulatedNetworkAlarmClearance,
    assignIncidentOwner,
    addIncidentInvestigationNote,
    openCreateIncidentModal,
    openCreateWorkOrderModal,
    openAlarmById,
    openSiteById,
    openWorkOrderById,
    openSiteVisitById,
    openSiteInGisMap,
    openPhotoInStudio,
    recordReportExportAudit,
    updateSlaConfiguration,
  } = useApp();

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'BREACHED' | 'AT_RISK'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'severity' | 'reportedAt' | 'sla' | 'status'>('severity');
  const [sortDesc, setSortDesc] = useState(true);

  // Detail Drawer Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'investigation' | 'related' | 'timeline'
  >('overview');

  // Assignment & Notes state
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignEngineerId, setAssignEngineerId] = useState('');
  const [noteInput, setNoteInput] = useState('');

  // Technical Investigation Form State
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<IncidentCategory>('RAN / Cell Outage');
  const [impactInput, setImpactInput] = useState<IncidentImpact>('Service Degraded');
  const [scopeInput, setScopeInput] = useState<IncidentScope>('Single Site');
  const [priorityInput, setPriorityInput] = useState<IncidentPriority>('P2 - High');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [diagObsInput, setDiagObsInput] = useState('');
  const [measurementsInput, setMeasurementsInput] = useState('');
  const [suspectedRcInput, setSuspectedRcInput] = useState('');
  const [confirmedRcInput, setConfirmedRcInput] = useState('');
  const [correctiveActionInput, setCorrectiveActionInput] = useState('');
  const [preventiveActionInput, setPreventiveActionInput] = useState('');
  const [partsReplacedList, setPartsReplacedList] = useState<string[]>([]);
  const [newPartInput, setNewPartInput] = useState('');

  // Consequential Action Modals (Resolve/Close, Reopen, Service Restore, Escalate, SLA Config)
  const [pendingTransition, setPendingTransition] = useState<{
    incident: Incident;
    targetStatus: IncidentStatus;
  } | null>(null);
  const [transitionNote, setTransitionNote] = useState('');

  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreNote, setRestoreNote] = useState('');

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateLevel, setEscalateLevel] = useState<1 | 2 | 3>(1);
  const [escalateTarget, setEscalateTarget] = useState(
    'Elena Rostova-Alvarez (Regional Team Leader)'
  );
  const [escalateReason, setEscalateReason] = useState('');

  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaDraft, setSlaDraft] = useState<SLAConfiguration['rules']>(() =>
    structuredClone(store.slaConfig.rules)
  );

  const selectedIncident = useMemo(
    () => store.incidents.find((i) => i.id === selectedIncidentId) || null,
    [store.incidents, selectedIncidentId]
  );

  useEffect(() => {
    if (selectedIncident) {
      setAssignTeamId(selectedIncident.assignedTeamId);
      setAssignEngineerId(selectedIncident.assignedEngineerId || '');
      setTitleInput(selectedIncident.title || selectedIncident.alarmName);
      setCategoryInput(selectedIncident.category || 'RAN / Cell Outage');
      setImpactInput(selectedIncident.impact || 'Service Degraded');
      setScopeInput(selectedIncident.scope || 'Single Site');
      setPriorityInput(selectedIncident.priority || 'P2 - High');
      setSymptomsInput(selectedIncident.reportedSymptoms || selectedIncident.description);
      setDiagObsInput(selectedIncident.diagnosticObservations || 'Not yet determined');
      setMeasurementsInput(selectedIncident.measurementsAndTestResults || 'Not yet determined');
      setSuspectedRcInput(selectedIncident.suspectedRootCause || 'Not yet determined');
      setConfirmedRcInput(selectedIncident.confirmedRootCause || 'Not yet determined');
      setCorrectiveActionInput(selectedIncident.correctiveAction || 'Not yet determined');
      setPreventiveActionInput(selectedIncident.preventiveAction || 'Not yet determined');
      setPartsReplacedList(selectedIncident.partsReplaced || []);
    }
  }, [selectedIncident]);

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = store.incidents.filter((inc) => {
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (regionFilter !== 'ALL' && inc.region !== regionFilter) return false;

      const sla = evaluateIncidentSla(inc, store.slaConfig);
      if (slaFilter === 'BREACHED' && !sla.anyBreached) return false;
      if (slaFilter === 'AT_RISK' && !sla.atRisk && !sla.anyBreached) return false;

      if (q) {
        const hay = [
          inc.id,
          inc.alarmId,
          ...(inc.relatedAlarmIds || []),
          inc.siteId,
          inc.siteCode,
          inc.siteName,
          inc.region,
          inc.title || '',
          inc.alarmName,
          inc.description,
          inc.equipmentAffected,
          inc.assignedOwnerName,
          inc.suspectedRootCause || '',
          inc.confirmedRootCause || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'severity') {
        cmp = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      } else if (sortBy === 'reportedAt') {
        cmp =
          new Date(a.reportedAt || a.firstOccurrence).getTime() -
          new Date(b.reportedAt || b.firstOccurrence).getTime();
      } else if (sortBy === 'sla') {
        const slaA = evaluateIncidentSla(a, store.slaConfig);
        const slaB = evaluateIncidentSla(b, store.slaConfig);
        cmp = slaB.restoreRemainingMins - slaA.restoreRemainingMins;
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [
    store.incidents,
    store.slaConfig,
    searchQuery,
    severityFilter,
    statusFilter,
    slaFilter,
    regionFilter,
    sortBy,
    sortDesc,
  ]);

  const handleSort = (field: 'severity' | 'reportedAt' | 'sla' | 'status') => {
    if (sortBy === field) {
      setSortDesc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  const handleRequestStatusTransition = (incident: Incident, targetStatus: IncidentStatus) => {
    if (targetStatus === incident.status) return;
    if (targetStatus === 'Resolved' || targetStatus === 'Closed') {
      setTransitionNote(incident.resolutionSummary || incident.correctiveAction || '');
      setPendingTransition({ incident, targetStatus });
      return;
    }
    updateIncidentStatus(incident.id, targetStatus);
  };

  const handleConfirmTransition = () => {
    if (!pendingTransition) return;
    const res = updateIncidentStatus(
      pendingTransition.incident.id,
      pendingTransition.targetStatus,
      transitionNote.trim() || undefined
    );
    if (res.ok) {
      setPendingTransition(null);
      setTransitionNote('');
    }
  };

  const handleSaveTechnicalInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    updateIncidentInvestigation(selectedIncident.id, {
      title: titleInput.trim() || selectedIncident.alarmName,
      category: categoryInput,
      impact: impactInput,
      scope: scopeInput,
      priority: priorityInput,
      reportedSymptoms: symptomsInput.trim() || 'Not yet determined',
      diagnosticObservations: diagObsInput.trim() || 'Not yet determined',
      measurementsAndTestResults: measurementsInput.trim() || 'Not yet determined',
      suspectedRootCause: suspectedRcInput.trim() || 'Not yet determined',
      confirmedRootCause: confirmedRcInput.trim() || 'Not yet determined',
      correctiveAction: correctiveActionInput.trim() || 'Not yet determined',
      preventiveAction: preventiveActionInput.trim() || 'Not yet determined',
      partsReplaced: partsReplacedList,
    });
  };

  const selectedSla = useMemo(
    () => (selectedIncident ? evaluateIncidentSla(selectedIncident, store.slaConfig) : null),
    [selectedIncident, store.slaConfig]
  );

  const selectedSite = useMemo(
    () =>
      selectedIncident
        ? store.sites.find((s) => s.id === selectedIncident.siteId) || null
        : null,
    [selectedIncident, store.sites]
  );

  const relatedAlarmsList = useMemo(() => {
    if (!selectedIncident) return [];
    const ids = selectedIncident.relatedAlarmIds || [selectedIncident.alarmId];
    return store.alarms.filter((a) => ids.includes(a.id) || a.linkedIncidentId === selectedIncident.id);
  }, [selectedIncident, store.alarms]);

  const relatedWorkOrders = useMemo(
    () =>
      selectedIncident
        ? store.workOrders.filter((w) => w.linkedIncidentId === selectedIncident.id)
        : [],
    [selectedIncident, store.workOrders]
  );

  const relatedVisits = useMemo(
    () =>
      selectedIncident
        ? store.siteVisits.filter(
            (v) =>
              v.linkedIncidentId === selectedIncident.id ||
              relatedWorkOrders.some((w) => w.id === v.workOrderId)
          )
        : [],
    [selectedIncident, store.siteVisits, relatedWorkOrders]
  );

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <Activity className="w-3.5 h-3.5" />
            <span>PHASE 3 · TELECOM INCIDENT LIFECYCLE, ROOT-CAUSE &amp; SLA GOVERNANCE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Incident Management Center ({store.incidents.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Controlled 8-state incident lifecycle separating physical repair completion, service
            restoration, network element alarm clearance, and final verification/closure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSlaDraft(structuredClone(store.slaConfig.rules));
              setSlaModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-sky-500" />
            <span>SLA Thresholds &amp; Rules</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateIncidentModal()}
            disabled={!can('incident:create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Incident</span>
          </button>
        </div>
      </div>

      {/* Live Incident & SLA KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Open Incidents</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
            {
              store.incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed')
                .length
            }
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">SLA Breached</span>
          <span className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-0.5 block">
            {
              store.incidents.filter(
                (i) =>
                  i.status !== 'Resolved' &&
                  i.status !== 'Closed' &&
                  evaluateIncidentSla(i, store.slaConfig).anyBreached
              ).length
            }
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Awaiting Assignment</span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
            {
              store.incidents.filter(
                (i) =>
                  i.status !== 'Resolved' &&
                  i.status !== 'Closed' &&
                  !i.assignedEngineerId
              ).length
            }
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Pending Parts / Access</span>
          <span className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-0.5 block">
            {store.incidents.filter((i) => i.status === 'Pending Parts or Access').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Under Monitoring</span>
          <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5 block">
            {store.incidents.filter((i) => i.status === 'Monitoring').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Resolved / Closed</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {
              store.incidents.filter((i) => i.status === 'Resolved' || i.status === 'Closed')
                .length
            }
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Incident ID, Alarm ID, Site Code, Root Cause, Owner..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
              <option value="Warning">Warning</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Lifecycle Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All 8 Lifecycle States</option>
              {ALL_INCIDENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by SLA State"
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as 'ALL' | 'BREACHED' | 'AT_RISK')}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All SLA States</option>
              <option value="BREACHED">SLA Breached Only</option>
              <option value="AT_RISK">SLA Breached or At Risk</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All Regions</option>
              <option value="North Metro">North Metro</option>
              <option value="Central">Central</option>
              <option value="South Corridor">South Corridor</option>
              <option value="Highland">Highland</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
            No incidents match the current filter criteria.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncidentId(inc.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">{inc.id}</span>
                  <IncidentStatusIndicator status={inc.status} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{inc.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{inc.category} · {inc.suspectedRootCause}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Site: <strong className="text-slate-900 dark:text-white font-mono">{inc.siteCode}</strong></span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{inc.severity}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Incidents Table (>= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 whitespace-nowrap">Incident ID &amp; Alarms</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('severity')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Severity &amp; Impact</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Site &amp; Scope</th>
                <th className="py-3 px-3">Incident Title, Category &amp; Suspected Root Cause</th>
                <th className="py-3 px-3 whitespace-nowrap">Assigned Team / Engineer</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('sla')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>SLA &amp; Escalation</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Lifecycle vs NE Alarm</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No incidents match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const sla = evaluateIncidentSla(inc, store.slaConfig);
                  const alarmCount = (inc.relatedAlarmIds || [inc.alarmId]).length;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {inc.id}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {inc.alarmId}
                          {alarmCount > 1 ? ` (+${alarmCount - 1} linked)` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <SeverityIndicator severity={inc.severity} />
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                          {inc.impact || 'Service Degraded'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {inc.siteCode}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {inc.siteName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {inc.scope || 'Single Site'} · {inc.region}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-sm align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {inc.title || inc.alarmName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {inc.category || inc.domain} · Equip: {inc.equipmentAffected}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          RC: {inc.suspectedRootCause || 'Not yet determined'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[180px]">
                          {inc.assignedOwnerName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Src: {inc.incidentSource || 'BSC/NOC'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <SlaStatusIndicator state={sla.overallState} />
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          Restore: {formatDurationMins(sla.restoreElapsedMins)} /{' '}
                          {formatDurationMins(sla.rule.timeToRestoreMins)}
                        </div>
                        {(inc.escalationLevel || 0) > 0 && (
                          <div className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400">
                            Escalation Level L{inc.escalationLevel}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <IncidentStatusIndicator status={inc.status} />
                        <div className="text-[11px] font-mono mt-1">
                          {inc.alarmClearedInNetwork ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              NE Alarm: Cleared
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              NE Alarm: Active
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className="py-3 px-3 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSiteInGisMap(inc.siteId)}
                            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Center GIS MAP on Incident Site"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(inc.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Tabbed Incident Workspace Drawer */}
      {selectedIncident && selectedSla && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/65"
          role="dialog"
          aria-modal="true"
          aria-label="Incident Management Workspace"
        >
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                    {selectedIncident.id}
                  </span>
                  <span>·</span>
                  <SeverityIndicator severity={selectedIncident.severity} />
                  <span>·</span>
                  <IncidentStatusIndicator status={selectedIncident.status} />
                  <span>·</span>
                  <SlaStatusIndicator state={selectedSla.overallState} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedIncident.title || selectedIncident.alarmName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Site: <strong className="font-mono">{selectedIncident.siteCode}</strong> (
                  {selectedIncident.siteName}) · Impact: {selectedIncident.impact || 'Service Degraded'}{' '}
                  · Scope: {selectedIncident.scope || 'Single Site'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const incId = selectedIncident.id;
                    const linkedPhoto = (store.photoAssets || []).find(
                      (p) => p.incidentId === incId || p.siteId === selectedIncident.siteId
                    );
                    setSelectedIncidentId(null);
                    openPhotoInStudio(linkedPhoto?.id, {
                      siteId: selectedIncident.siteId,
                      incidentId: incId,
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
                      (p) => p.incidentId === selectedIncident.id
                    );
                    exportValidatedJsonPackage(
                      'single-incident',
                      { incidentId: selectedIncident.id },
                      {
                        incidents: [selectedIncident],
                        workOrders: relatedWorkOrders,
                        siteVisits: relatedVisits,
                        photoAssets: linkedPhotos,
                      },
                      can('attachment:download_restricted'),
                      `${selectedIncident.id}_DataPackage.json`
                    );
                    recordReportExportAudit(
                      'JSON',
                      `Exported validated JSON package for Incident ${selectedIncident.id}`
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sId = selectedIncident.siteId;
                    setSelectedIncidentId(null);
                    openSiteInGisMap(sId);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>GIS MAP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIncidentId(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close incident workspace"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'overview', label: '1. Lifecycle, SLA & Ownership' },
                  { id: 'investigation', label: '2. Technical Investigation & Root Cause' },
                  {
                    id: 'related',
                    label: `3. Alarms (${relatedAlarmsList.length}), Work Orders (${relatedWorkOrders.length}) & Visits (${relatedVisits.length})`,
                  },
                  {
                    id: 'timeline',
                    label: `4. Timeline (${(selectedIncident.timeline || []).length}) & Escalations`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {activeTab === 'overview' && (
                <>
                  {/* Controlled 8-State Workflow & Separated Operational Milestones */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Controlled 8-State Incident Lifecycle
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Work completion, service restoration, alarm clearance, and incident
                          closure are tracked as distinct operational milestones.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!selectedIncident.acknowledged && can('alarm:acknowledge') && (
                          <button
                            type="button"
                            onClick={() => acknowledgeIncidentAlarm(selectedIncident.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                          >
                            Acknowledge Incident
                          </button>
                        )}
                        {!selectedIncident.serviceRestoredAt &&
                          selectedIncident.status !== 'Closed' &&
                          can('incident:update_status') && (
                            <button
                              type="button"
                              onClick={() => {
                                setRestoreNote('');
                                setRestoreModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                            >
                              Record Service Restored
                            </button>
                          )}
                        {(selectedIncident.status === 'Resolved' ||
                          selectedIncident.status === 'Closed') &&
                          can('incident:reopen') && (
                            <button
                              type="button"
                              onClick={() => {
                                setReopenReason('');
                                setReopenModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen Incident</span>
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      {ALL_INCIDENT_STATUSES.map((st, idx) => {
                        const active = selectedIncident.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={!can('incident:update_status')}
                            onClick={() => handleRequestStatusTransition(selectedIncident, st)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                              active
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-sky-500'
                            }`}
                          >
                            {idx + 1}. {st}
                          </button>
                        );
                      })}
                    </div>

                    {/* Separated Operational Timestamps Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">1. Reported At</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {formatUtcTimestamp(
                            selectedIncident.reportedAt || selectedIncident.firstOccurrence,
                            store.userTimezone
                          )}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          2. Acknowledged At
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {selectedIncident.acknowledgedAt
                            ? formatUtcTimestamp(selectedIncident.acknowledgedAt, store.userTimezone)
                            : 'Not yet acknowledged'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">3. Work Started At</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {selectedIncident.workStartedAt
                            ? formatUtcTimestamp(selectedIncident.workStartedAt, store.userTimezone)
                            : 'Not yet started'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          4. Physical Repair Done
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {selectedIncident.physicalWorkCompletedAt
                            ? formatUtcTimestamp(
                                selectedIncident.physicalWorkCompletedAt,
                                store.userTimezone
                              )
                            : 'In progress / Pending'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          5. Service Restored At
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedIncident.serviceRestoredAt
                            ? formatUtcTimestamp(
                                selectedIncident.serviceRestoredAt,
                                store.userTimezone
                              )
                            : 'Not yet restored'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          6. NE Alarm Cleared At
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`font-mono text-[11px] font-semibold ${
                              selectedIncident.alarmClearedInNetwork
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {selectedIncident.alarmClearedInNetwork
                              ? formatUtcTimestamp(
                                  selectedIncident.alarmClearedAt || selectedIncident.updatedAt,
                                  store.userTimezone
                                )
                              : 'ACTIVE ON NE'}
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          7. Resolution Verified
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {selectedIncident.resolutionVerifiedAt
                            ? `${formatUtcTimestamp(
                                selectedIncident.resolutionVerifiedAt,
                                store.userTimezone
                              )}`
                            : 'Pending verification'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          8. Closed &amp; Approved
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                          {selectedIncident.closedAt
                            ? `${formatUtcTimestamp(
                                selectedIncident.closedAt,
                                store.userTimezone
                              )} (${selectedIncident.reviewedAndApprovedBy || 'Approved'})`
                            : 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live SLA Tracking & Escalation Panel */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-sky-500" />
                          <span>
                            SLA Compliance Matrix ({selectedIncident.severity} Policy Targets)
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Calculated dynamically from recorded incident timestamps. Severity is
                          never silently altered on breach.
                        </p>
                      </div>

                      {can('incident:escalate') && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextLvl = Math.min(
                              3,
                              (selectedIncident.escalationLevel || 0) + 1
                            ) as 1 | 2 | 3;
                            setEscalateLevel(nextLvl);
                            setEscalateReason('');
                            setEscalateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>
                            Escalate Incident (Current: L{selectedIncident.escalationLevel || 0})
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Time to Acknowledge</span>
                          <span
                            className={`font-mono font-bold ${
                              selectedSla.ackBreached
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatDurationMins(selectedSla.ackElapsedMins)} /{' '}
                            {formatDurationMins(selectedSla.rule.timeToAcknowledgeMins)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Time to Restore</span>
                          <span
                            className={`font-mono font-bold ${
                              selectedSla.restoreBreached
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {formatDurationMins(selectedSla.restoreElapsedMins)} /{' '}
                            {formatDurationMins(selectedSla.rule.timeToRestoreMins)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Time to Resolve</span>
                          <span
                            className={`font-mono font-bold ${
                              selectedSla.resolveBreached
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatDurationMins(selectedSla.resolveElapsedMins)} /{' '}
                            {formatDurationMins(selectedSla.rule.timeToResolveMins)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Team Assignment */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-sky-500" />
                        <span>Assigned Team &amp; Responsible Engineer</span>
                      </h3>
                      <span className="font-mono text-[11px] text-slate-500">
                        Created by: {selectedIncident.createdBy || 'NOC Intake'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Assigned Squad
                        </label>
                        <select
                          value={assignTeamId}
                          disabled={!can('incident:assign')}
                          onChange={(e) => setAssignTeamId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          {store.teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.code} — {t.name} ({t.availabilityStatus || 'Available'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Responsible Engineer
                        </label>
                        <select
                          value={assignEngineerId}
                          disabled={!can('incident:assign')}
                          onChange={(e) => setAssignEngineerId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="">-- Unassigned Squad Queue --</option>
                          {store.users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} ({u.role} · {u.availabilityStatus || 'Available'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          disabled={!can('incident:assign')}
                          onClick={() =>
                            assignIncidentOwner(
                              selectedIncident.id,
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

                  {/* Site & Identification Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">Site &amp; Address</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sId = selectedIncident.siteId;
                          setSelectedIncidentId(null);
                          openSiteById(sId);
                        }}
                        className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <span>
                          {selectedIncident.siteCode} ({selectedIncident.siteId})
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {selectedSite?.address || selectedIncident.siteName}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">
                        Operator &amp; Source
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {selectedSite?.operator || selectedIncident.operator || 'ApexTel Carrier'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Source: {selectedIncident.incidentSource || 'BSC/NOC'} (
                        {selectedIncident.alarmSource})
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 block">
                        Affected Managed Equipment
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {selectedIncident.equipmentAffected}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        ID: {selectedIncident.equipmentId} · {selectedIncident.technology}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'investigation' && (
                <form onSubmit={handleSaveTechnicalInvestigation} className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Classification, Diagnostic Measurements &amp; Root-Cause Analysis
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Unknown values are explicitly preserved as &ldquo;Not yet
                          determined&rdquo;.
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={!can('incident:update_status')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Investigation Record</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Incident Title
                        </label>
                        <input
                          type="text"
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Incident Category
                        </label>
                        <select
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value as IncidentCategory)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="RAN / Cell Outage">RAN / Cell Outage</option>
                          <option value="BSC / Core Signalling">BSC / Core Signalling</option>
                          <option value="AC/DC Power & Rectifier">AC/DC Power &amp; Rectifier</option>
                          <option value="Diesel Generator / ATS">Diesel Generator / ATS</option>
                          <option value="Microwave Backhaul">Microwave Backhaul</option>
                          <option value="Fiber Optic / DWDM">Fiber Optic / DWDM</option>
                          <option value="Environmental / HVAC">Environmental / HVAC</option>
                          <option value="Site Access / Security">Site Access / Security</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Operational Impact
                        </label>
                        <select
                          value={impactInput}
                          onChange={(e) => setImpactInput(e.target.value as IncidentImpact)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="Site Down">Site Down</option>
                          <option value="Service Degraded">Service Degraded</option>
                          <option value="Equipment Failure">Equipment Failure</option>
                          <option value="Power Failure">Power Failure</option>
                          <option value="Transmission Failure">Transmission Failure</option>
                          <option value="Environmental Issue">Environmental Issue</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Network Scope
                        </label>
                        <select
                          value={scopeInput}
                          onChange={(e) => setScopeInput(e.target.value as IncidentScope)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="Single Site">Single Site</option>
                          <option value="Multiple Sites">Multiple Sites</option>
                          <option value="Transmission Path">Transmission Path</option>
                          <option value="Wider Network Impact">Wider Network Impact</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Incident Priority
                        </label>
                        <select
                          value={priorityInput}
                          onChange={(e) => setPriorityInput(e.target.value as IncidentPriority)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="P1 - Critical">P1 - Critical</option>
                          <option value="P2 - High">P2 - High</option>
                          <option value="P3 - Medium">P3 - Medium</option>
                          <option value="P4 - Low">P4 - Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Reported Symptoms
                        </label>
                        <textarea
                          rows={2}
                          value={symptomsInput}
                          onChange={(e) => setSymptomsInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Diagnostic Observations
                        </label>
                        <textarea
                          rows={2}
                          value={diagObsInput}
                          onChange={(e) => setDiagObsInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Measurements &amp; Test Results (VSWR, RSL dBm, DC Voltage, Earth Ohms)
                      </label>
                      <input
                        type="text"
                        value={measurementsInput}
                        onChange={(e) => setMeasurementsInput(e.target.value)}
                        className="w-full px-3 py-1.5 font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Suspected Root Cause
                        </label>
                        <input
                          type="text"
                          value={suspectedRcInput}
                          onChange={(e) => setSuspectedRcInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Confirmed Root Cause
                        </label>
                        <input
                          type="text"
                          value={confirmedRcInput}
                          onChange={(e) => setConfirmedRcInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Corrective Action Performed
                        </label>
                        <textarea
                          rows={2}
                          value={correctiveActionInput}
                          onChange={(e) => setCorrectiveActionInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Preventive Action / Follow-up
                        </label>
                        <textarea
                          rows={2}
                          value={preventiveActionInput}
                          onChange={(e) => setPreventiveActionInput(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    {/* Parts Replaced Manager */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Parts &amp; Hardware Modules Replaced ({partsReplacedList.length})
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newPartInput}
                          onChange={(e) => setNewPartInput(e.target.value)}
                          placeholder="e.g. 24V Cummins Fuel Solenoid (P/N: 3991167)"
                          className="flex-1 px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newPartInput.trim()) return;
                            setPartsReplacedList((prev) => [...prev, newPartInput.trim()]);
                            setNewPartInput('');
                          }}
                          className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-800 font-semibold cursor-pointer"
                        >
                          + Add Part
                        </button>
                      </div>
                      {partsReplacedList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {partsReplacedList.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px]"
                            >
                              <span>{p}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPartsReplacedList((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-red-500 hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              )}

              {activeTab === 'related' && (
                <div className="space-y-5">
                  {/* Associated Alarms */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Correlated &amp; Linked Network Alarms ({relatedAlarmsList.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Multiple related alarms can be associated with a single incident.
                        </p>
                      </div>
                      {can('incident:update_status') && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleSimulatedNetworkAlarmClearance(
                              selectedIncident.id,
                              'Operator verified element trap status from Incident Workspace'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
                        >
                          {selectedIncident.alarmClearedInNetwork
                            ? 'Simulate Re-Assert Alarm'
                            : 'Record NE Alarm Cleared'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {relatedAlarmsList.map((alm) => (
                        <div
                          key={alm.id}
                          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIncidentId(null);
                                  openAlarmById(alm.id);
                                }}
                                className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                              >
                                {alm.id}
                              </button>
                              <span className="font-mono text-[11px] text-slate-500">
                                [{alm.vendorCode}]
                              </span>
                              <SeverityIndicator severity={alm.severity} />
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                              {alm.alarmName}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              MO: {alm.managedObject} · Occurrences: {alm.occurrenceCount}
                            </p>
                          </div>
                          <div className="text-right shrink-0 font-mono text-[11px]">
                            <span
                              className={
                                alm.isSimulatedActive
                                  ? 'text-red-600 dark:text-red-400 font-bold'
                                  : 'text-emerald-600 dark:text-emerald-400 font-bold'
                              }
                            >
                              {alm.isSimulatedActive ? 'ACTIVE ON NE' : 'CLEARED ON NE'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked Work Orders */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Linked Field Work Orders ({relatedWorkOrders.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Completing a work order does not automatically close this incident.
                        </p>
                      </div>
                      {can('workorder:create') && (
                        <button
                          type="button"
                          onClick={() =>
                            openCreateWorkOrderModal({
                              siteId: selectedIncident.siteId,
                              incidentId: selectedIncident.id,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>+ Create Work Order from Incident</span>
                        </button>
                      )}
                    </div>

                    {relatedWorkOrders.length === 0 ? (
                      <p className="text-slate-500 py-2">
                        No work orders dispatched for this incident yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {relatedWorkOrders.map((wo) => (
                          <div
                            key={wo.id}
                            className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedIncidentId(null);
                                    openWorkOrderById(wo.id);
                                  }}
                                  className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                >
                                  {wo.workOrderNumber}
                                </button>
                                <span className="text-slate-500">·</span>
                                <span className="font-semibold">{wo.jobType}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                                {wo.workDescription}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Assignee: {wo.assignedAssigneeName} · Verification:{' '}
                                {wo.verificationStatus || 'Not Requested'}
                              </p>
                            </div>
                            <WorkOrderStatusIndicator status={wo.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Site Visits */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Related Field Site Visits ({relatedVisits.length})
                    </h3>
                    {relatedVisits.length === 0 ? (
                      <p className="text-slate-500 py-1">No site visits recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {relatedVisits.map((sv) => (
                          <div
                            key={sv.id}
                            className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIncidentId(null);
                                  openSiteVisitById(sv.id);
                                }}
                                className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                              >
                                {sv.visitCode}
                              </button>
                              <span className="ml-2 text-slate-700 dark:text-slate-300">
                                {sv.purpose} ({sv.engineerName})
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                              {sv.status} ({sv.checklistCompletedPercent}% checklist)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-5">
                  {/* Chronological Incident Timeline */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <History className="w-4 h-4 text-sky-500" />
                      <span>
                        Chronological Incident Event Timeline (
                        {(selectedIncident.timeline || []).length})
                      </span>
                    </h3>

                    <div className="space-y-3 border-l-2 border-sky-500/40 pl-4 ml-2">
                      {(selectedIncident.timeline || []).map((ev) => (
                        <div key={ev.id} className="relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ev.title}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {formatUtcTimestamp(ev.timestamp, store.userTimezone)}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">{ev.details}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Actor: {ev.actorName} ({ev.actorRole}) · Event:{' '}
                            <span className="font-mono">{ev.eventType}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Investigation Notes Composer */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquarePlus className="w-4 h-4 text-sky-500" />
                      <span>Engineer Investigation Notes ({selectedIncident.notes.length})</span>
                    </h3>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteInput}
                        disabled={!can('incident:add_note')}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add MML dump observation, OTDR reading, or dispatch update..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        disabled={!can('incident:add_note') || !noteInput.trim()}
                        onClick={() => {
                          addIncidentInvestigationNote(selectedIncident.id, noteInput);
                          setNoteInput('');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                      >
                        Post Note
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedIncident.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {n.authorName} ({n.authorRole})
                            </span>
                            <span className="font-mono">
                              {formatUtcTimestamp(n.createdAt, store.userTimezone)}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 mt-1">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resolved / Closed Transition */}
      {pendingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Confirm Transition to &ldquo;{pendingTransition.targetStatus}&rdquo;
            </h3>
            {!pendingTransition.incident.alarmClearedInNetwork && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                Warning: Simulated network alarm {pendingTransition.incident.alarmId} is still
                ACTIVE on the element. You must record alarm clearance before resolving or closing
                this incident.
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resolution &amp; Verification Summary *
              </label>
              <textarea
                rows={3}
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder="Document verified root cause, post-repair test measurements, and service restoration..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingTransition(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                Confirm {pendingTransition.targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Service Restored Modal */}
      {restoreModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Record Service Restoration ({selectedIncident.id})
            </h3>
            <p className="text-slate-500">
              Records the exact timestamp when traffic/power service was restored on{' '}
              <strong className="font-mono">{selectedIncident.siteCode}</strong>, independent of
              incident closure.
            </p>
            <textarea
              rows={3}
              value={restoreNote}
              onChange={(e) => setRestoreNote(e.target.value)}
              placeholder="e.g. All 2G/3G/4G/5G cells back on-air and carrying traffic; monitoring soak period started."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  recordIncidentServiceRestored(selectedIncident.id, restoreNote);
                  setRestoreModalOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                Save Restoration Timestamp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Incident Modal */}
      {reopenModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Reopen Incident {selectedIncident.id}
            </h3>
            <p className="text-slate-500">
              Reopening transitions the incident back to <strong>In Progress</strong> while
              preserving all prior timeline events, notes, and audit history.
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Mandatory reason for reopening (e.g. alarm re-asserted during soak test)..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReopenModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = reopenIncident(selectedIncident.id, reopenReason);
                  if (res.ok) setReopenModalOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Incident Modal */}
      {escalateModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Trigger Incident Escalation ({selectedIncident.id})
            </h3>
            <div>
              <label className="block font-semibold mb-1">Escalation Level</label>
              <select
                value={escalateLevel}
                onChange={(e) => setEscalateLevel(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value={1}>Level 1 — Regional Team Leader</option>
                <option value={2}>Level 2 — Regional Maintenance Manager</option>
                <option value={3}>Level 3 — National NOC Director / Carrier Executive</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Notified Recipient / Duty Officer</label>
              <input
                type="text"
                value={escalateTarget}
                onChange={(e) => setEscalateTarget(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Escalation Reason</label>
              <textarea
                rows={2}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="e.g. SLA restore threshold approaching; spare DG solenoid required urgently."
                className="w-full px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  escalateIncident(
                    selectedIncident.id,
                    escalateLevel,
                    escalateReason,
                    escalateTarget
                  );
                  setEscalateModalOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Record Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLA Threshold Configuration Modal */}
      {slaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  SLA Response &amp; Resolution Threshold Configuration
                </h3>
                <p className="text-slate-500">
                  Last updated by {store.slaConfig.updatedBy} at{' '}
                  {formatUtcTimestamp(store.slaConfig.updatedAt, store.userTimezone)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                    <th className="py-2 px-2">Severity</th>
                    <th className="py-2 px-2">Ack Target (mins)</th>
                    <th className="py-2 px-2">Assign Target (mins)</th>
                    <th className="py-2 px-2">Dispatch Target (mins)</th>
                    <th className="py-2 px-2">Restore Target (mins)</th>
                    <th className="py-2 px-2">Resolve Target (mins)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(['Critical', 'Major', 'Minor', 'Warning'] as const).map((sev) => (
                    <tr key={sev}>
                      <td className="py-2.5 px-2">
                        <SeverityIndicator severity={sev} />
                      </td>
                      {(
                        [
                          'timeToAcknowledgeMins',
                          'timeToAssignMins',
                          'timeToDispatchMins',
                          'timeToRestoreMins',
                          'timeToResolveMins',
                        ] as const
                      ).map((field) => (
                        <td key={field} className="py-2.5 px-2">
                          <input
                            type="number"
                            min={1}
                            disabled={!can('sla:configure')}
                            value={slaDraft[sev][field]}
                            onChange={(e) =>
                              setSlaDraft((prev) => ({
                                ...prev,
                                [sev]: {
                                  ...prev[sev],
                                  [field]: Math.max(1, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-20 px-2 py-1 font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-200">
              <strong>Extensible Notification Service Notice:</strong> External SMTP email, SMS,
              and push gateways are not configured in Demo Mode. SLA breach warnings and
              escalation alerts are delivered via the in-app Notification Center.
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSlaModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Close
              </button>
              {can('sla:configure') && (
                <button
                  type="button"
                  onClick={() => {
                    updateSlaConfiguration(slaDraft);
                    setSlaModalOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  Save SLA Thresholds
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
