import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  GitMerge,
  Link2,
  MapPin,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AlarmClassification,
  AlarmSeverity,
  NetworkDomain,
  NetworkTechnology,
} from '../../types/models';
import {
  formatUtcTimestamp,
  IncidentStatusIndicator,
  SeverityIndicator,
} from '../common/StatusIndicators';

const SEVERITY_ORDER: Record<AlarmSeverity, number> = {
  Critical: 4,
  Major: 3,
  Minor: 2,
  Warning: 1,
};

const ALL_DOMAINS: NetworkDomain[] = [
  'RAN / Radio',
  'BSS / BSC',
  'Transmission / MW',
  'Fiber Optics',
  'Power / AC-DC / Gen',
  'Environmental / Site Access',
];

const ALL_TECHNOLOGIES: NetworkTechnology[] = [
  '2G GSM',
  '3G UMTS',
  '4G LTE',
  '5G NR',
  'BSC/Core',
  'Microwave TX',
  'Fiber DWDM',
  'DC Power/Gen',
];

export const AlarmCenterModule: React.FC = () => {
  const {
    store,
    selectedAlarmId,
    setSelectedAlarmId,
    can,
    acknowledgeAlarmRecord,
    clearOrReassertAlarmRecord,
    linkAlarmToIncident,
    createIncidentFromAlarm,
    ingestSimulatedAlarm,
    openIncidentById,
    openSiteById,
    openSiteInGisMap,
  } = useApp();

  const tz = store.userTimezone || 'UTC';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'Active' | 'Cleared'>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [ackFilter, setAckFilter] = useState<'ALL' | 'ACK' | 'UNACK'>('ALL');
  const [linkFilter, setLinkFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED' | 'CORRELATED'>('ALL');

  const [sortField, setSortField] = useState<
    'severity' | 'lastOccurrence' | 'occurrenceCount' | 'siteCode'
  >('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Detail Drawer Local State
  const [clearObservationInput, setClearObservationInput] = useState('');
  const [selectedLinkIncidentId, setSelectedLinkIncidentId] = useState('');

  // Simulated Alarm Ingestion Modal (Deduplication & Correlation Tester)
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [simSiteId, setSimSiteId] = useState(store.sites[0]?.id || 'SITE-1001');
  const [simVendor, setSimVendor] = useState('Nokia');
  const [simAlarmSource, setSimAlarmSource] = useState('Nokia NetAct / Simulated OSS');
  const [simVendorCode, setSimVendorCode] = useState('BTS-FAULT-7653 (Cell Faulty)');
  const [simManagedObject, setSimManagedObject] = useState('PLMN-PLMN/MRBTS-1001/LNCEL-1');
  const [simDomain, setSimDomain] = useState<NetworkDomain>('RAN / Radio');
  const [simTech, setSimTech] = useState<NetworkTechnology>('5G NR');
  const [simClass, setSimClass] = useState<AlarmClassification>('Internal');
  const [simSeverity, setSimSeverity] = useState<AlarmSeverity>('Critical');
  const [simAlarmName, setSimAlarmName] = useState('5G NR gNodeB Sector 1 & 2 Cell Out of Service');
  const [simEquipId, setSimEquipId] = useState('EQ-1001-BBU');
  const [simEquipName, setSimEquipName] = useState('Nokia AirScale 5G Baseband & AWHQN');
  const [simDescription, setSimDescription] = useState(
    'Simulated trap: CPRI optical link loss between AirScale BBU and Sector 1/2 AWHQN.'
  );
  const [simAutoCreateIncident, setSimAutoCreateIncident] = useState(false);

  const selectedAlarm = useMemo(
    () => store.alarms.find((a) => a.id === selectedAlarmId) || null,
    [store.alarms, selectedAlarmId]
  );

  React.useEffect(() => {
    if (selectedAlarm) {
      setClearObservationInput(selectedAlarm.clearedByObservation || '');
      setSelectedLinkIncidentId(
        selectedAlarm.linkedIncidentId ||
          selectedAlarm.proposedCorrelationIncidentId ||
          store.incidents.find((i) => i.siteId === selectedAlarm.siteId && i.status !== 'Closed')
            ?.id ||
          store.incidents[0]?.id ||
          ''
      );
    }
  }, [selectedAlarm, store.incidents]);

  const filteredAlarms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = store.alarms.filter((alm) => {
      if (severityFilter !== 'ALL' && alm.severity !== severityFilter) return false;
      if (stateFilter === 'Active' && !alm.isSimulatedActive) return false;
      if (stateFilter === 'Cleared' && alm.isSimulatedActive) return false;
      if (classificationFilter !== 'ALL' && alm.classification !== classificationFilter)
        return false;
      if (domainFilter !== 'ALL' && alm.domain !== domainFilter) return false;
      if (ackFilter === 'ACK' && !alm.acknowledged) return false;
      if (ackFilter === 'UNACK' && alm.acknowledged) return false;
      if (linkFilter === 'LINKED' && !alm.linkedIncidentId) return false;
      if (linkFilter === 'UNLINKED' && alm.linkedIncidentId) return false;
      if (linkFilter === 'CORRELATED' && !alm.proposedCorrelationIncidentId) return false;

      if (q) {
        const hay = [
          alm.id,
          alm.vendor || '',
          alm.vendorCode,
          alm.managedObject || '',
          alm.alarmSource,
          alm.siteCode,
          alm.siteId,
          alm.alarmName,
          alm.equipmentName,
          alm.linkedIncidentId || '',
          alm.description,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'severity') {
        cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      } else if (sortField === 'lastOccurrence') {
        cmp = new Date(a.lastOccurrence).getTime() - new Date(b.lastOccurrence).getTime();
      } else if (sortField === 'occurrenceCount') {
        cmp = a.occurrenceCount - b.occurrenceCount;
      } else if (sortField === 'siteCode') {
        cmp = a.siteCode.localeCompare(b.siteCode);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    store.alarms,
    searchQuery,
    severityFilter,
    stateFilter,
    classificationFilter,
    domainFilter,
    ackFilter,
    linkFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAlarms.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAlarms = filteredAlarms.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (field: 'severity' | 'lastOccurrence' | 'occurrenceCount' | 'siteCode') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Preset helper for testing Deduplication or Rule-Based Correlation
  const applySimulationPreset = (preset: 'duplicate' | 'power_correlation' | 'new_fiber') => {
    if (preset === 'duplicate') {
      const existing = store.alarms.find((a) => a.isSimulatedActive) || store.alarms[0];
      if (existing) {
        setSimSiteId(existing.siteId);
        setSimVendor(existing.vendor || 'Nokia');
        setSimAlarmSource(existing.alarmSource);
        setSimVendorCode(existing.vendorCode);
        setSimManagedObject(
          existing.managedObject || `MO/${existing.siteCode}/${existing.equipmentId}`
        );
        setSimDomain(existing.domain);
        setSimTech(existing.technology);
        setSimClass(existing.classification);
        setSimSeverity(existing.severity);
        setSimAlarmName(existing.alarmName);
        setSimEquipId(existing.equipmentId);
        setSimEquipName(existing.equipmentName);
        setSimDescription(existing.description);
        setSimAutoCreateIncident(false);
      }
    } else if (preset === 'power_correlation') {
      setSimSiteId('SITE-1002');
      setSimVendor('Ericsson');
      setSimAlarmSource('Ericsson ENM OSS');
      setSimVendorCode('ERI-CELL-DOWN-4402');
      setSimManagedObject('SubNetwork=CNT,MeContext=CNT-FIN-004,EUtranCellFDD=3');
      setSimDomain('RAN / Radio');
      setSimTech('4G LTE');
      setSimClass('Internal');
      setSimSeverity('Major');
      setSimAlarmName('LTE Sector 3 Secondary Cell Undervoltage Shutdown');
      setSimEquipId('EQ-1002-RRU3');
      setSimEquipName('Ericsson Radio 4415 B3');
      setSimDescription(
        'Secondary cell powered down following DC bus voltage drop below 44.0V LLVD threshold.'
      );
      setSimAutoCreateIncident(false);
    } else {
      setSimSiteId('SITE-1003');
      setSimVendor('Ciena');
      setSimAlarmSource('Ciena MCP Optical NMS');
      setSimVendorCode('OPT-OSNR-DEG-118');
      setSimManagedObject('DWDM-CH34-100G-SPAN2');
      setSimDomain('Fiber Optics');
      setSimTech('Fiber DWDM');
      setSimClass('Internal');
      setSimSeverity('Major');
      setSimAlarmName('DWDM Lambda Ch-34 Optical SNR Degradation');
      setSimEquipId('EQ-1003-DWDM');
      setSimEquipName('Ciena 6500 ROADM Degree-2');
      setSimDescription(
        'Pre-FEC BER degraded from 1.2E-9 to 4.8E-5 on South Corridor Metro Fiber Ring.'
      );
      setSimAutoCreateIncident(false);
    }
  };

  const handleIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = ingestSimulatedAlarm({
      siteId: simSiteId,
      vendor: simVendor,
      alarmSource: simAlarmSource,
      vendorCode: simVendorCode,
      managedObject: simManagedObject,
      domain: simDomain,
      technology: simTech,
      classification: simClass,
      severity: simSeverity,
      alarmName: simAlarmName,
      equipmentId: simEquipId,
      equipmentName: simEquipName,
      description: simDescription,
      autoCreateIncident: simAutoCreateIncident,
    });
    if (res.ok && res.alarm) {
      setIngestModalOpen(false);
      setSelectedAlarmId(res.alarm.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <Radio className="w-3.5 h-3.5" />
            <span>
              MULTI-DOMAIN BSS / RAN / TX / POWER / EXTERNAL ALARM SURVEILLANCE · SIMULATED DEMO
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            NOC Alarm Center ({store.alarms.length} Simulated Alarms)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Supports 2G/3G/4G/5G radio, BTS/BSC, BBU/RRU, Microwave, Fiber, Power &amp;
            Environmental alarms with repeat-trap deduplication, transparent rule-based correlation,
            and independent network clearance vs. incident resolution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIngestModalOpen(true)}
            disabled={!can('incident:create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Simulate / Ingest Alarm Trap</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Active NE Alarms</span>
          <span className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
            {store.alarms.filter((a) => a.isSimulatedActive).length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Unacknowledged</span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {store.alarms.filter((a) => a.isSimulatedActive && !a.acknowledged).length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Critical Active</span>
          <span className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
            {store.alarms.filter((a) => a.isSimulatedActive && a.severity === 'Critical').length}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Deduplicated Traps</span>
          <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
            {store.alarms.reduce((acc, a) => acc + Math.max(0, a.occurrenceCount - 1), 0)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Proposed Correlations</span>
          <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {
              store.alarms.filter(
                (a) => a.proposedCorrelationIncidentId && !a.linkedIncidentId
              ).length
            }
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">Cleared Alarms</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {store.alarms.filter((a) => !a.isSimulatedActive).length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Alarm ID, Vendor Code, Managed Object, Site, Incident..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Severity"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
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
              aria-label="Filter by Alarm State"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value as 'ALL' | 'Active' | 'Cleared');
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">Active &amp; Cleared</option>
              <option value="Active">Active Traps Only</option>
              <option value="Cleared">Cleared Only</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Acknowledgment"
              value={ackFilter}
              onChange={(e) => {
                setAckFilter(e.target.value as 'ALL' | 'ACK' | 'UNACK');
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All Ack States</option>
              <option value="UNACK">Unacknowledged Only</option>
              <option value="ACK">Acknowledged Only</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Incident Link"
              value={linkFilter}
              onChange={(e) => {
                setLinkFilter(
                  e.target.value as 'ALL' | 'LINKED' | 'UNLINKED' | 'CORRELATED'
                );
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">All Correlation States</option>
              <option value="LINKED">Linked to Incident</option>
              <option value="UNLINKED">Unlinked Alarms</option>
              <option value="CORRELATED">Has Correlation Suggestion</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Domain:</span>
            </span>
            {(['ALL', ...ALL_DOMAINS] as const).map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => {
                  setDomainFilter(dom);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  domainFilter === dom
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {dom === 'ALL' ? 'All Domains' : dom}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={classificationFilter}
              onChange={(e) => {
                setClassificationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            >
              <option value="ALL">Internal &amp; External</option>
              <option value="Internal">Internal (RAN/BSC/TX/Fiber)</option>
              <option value="External">External (Power/DG/Env)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {paginatedAlarms.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
            No simulated alarms match the active filters.
          </div>
        ) : (
          paginatedAlarms.map((alm) => {
            const isSelected = selectedAlarmId === alm.id;
            return (
              <div
                key={alm.id}
                onClick={() => setSelectedAlarmId(alm.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">{alm.id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">{alm.vendor}</span>
                  </div>
                  <SeverityIndicator severity={alm.severity} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{alm.alarmName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{alm.managedObject}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Site: <strong className="text-slate-900 dark:text-white font-mono">{alm.siteCode}</strong></span>
                  <span>Occurrences: <strong className="font-mono">{alm.occurrenceCount}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alarm Table (>= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 whitespace-nowrap">Alarm ID &amp; Vendor Code</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('severity')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Severity &amp; State</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('siteCode')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Site &amp; Domain</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3">Alarm Name &amp; Managed Object</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('occurrenceCount')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Occurrences (1st / Last)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Acknowledgment</th>
                <th className="py-3 px-3 whitespace-nowrap">Linked Incident / Correlation</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {paginatedAlarms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No simulated alarms match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedAlarms.map((alm) => {
                  const isSelected = selectedAlarmId === alm.id;
                  const linkedInc = alm.linkedIncidentId
                    ? store.incidents.find((i) => i.id === alm.linkedIncidentId)
                    : undefined;

                  return (
                    <tr
                      key={alm.id}
                      onClick={() => setSelectedAlarmId(alm.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/70 dark:bg-sky-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {alm.id}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {alm.vendor || 'OEM'} · {alm.vendorCode}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <SeverityIndicator severity={alm.severity} />
                        <div className="font-mono text-[11px] mt-1">
                          {alm.isSimulatedActive ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              ● ACTIVE TRAP
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ CLEARED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {alm.siteCode}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {alm.domain}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {alm.technology} · {alm.classification}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-sm align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {alm.alarmName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                          MO: {alm.managedObject || alm.equipmentName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Equip: {alm.equipmentName} ({alm.alarmSource})
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] tabular-nums align-top">
                        <div className="font-bold text-slate-900 dark:text-white">
                          Count: {alm.occurrenceCount}x
                        </div>
                        <div className="text-slate-500">
                          1st: {formatUtcTimestamp(alm.firstOccurrence, tz)}
                        </div>
                        <div className="text-slate-500">
                          Lst: {formatUtcTimestamp(alm.lastOccurrence, tz)}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        {alm.acknowledged ? (
                          <div className="text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">
                              Ack by {alm.acknowledgedBy}
                            </span>
                            {alm.acknowledgedAt && (
                              <span className="font-mono text-[10px] text-slate-500">
                                {formatUtcTimestamp(alm.acknowledgedAt, tz)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                            Unacknowledged
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        {linkedInc ? (
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openIncidentById(linkedInc.id);
                              }}
                              className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{linkedInc.id}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <div className="mt-0.5">
                              <IncidentStatusIndicator status={linkedInc.status} />
                            </div>
                          </div>
                        ) : alm.proposedCorrelationIncidentId ? (
                          <div className="text-[11px]">
                            <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Suggest: {alm.proposedCorrelationIncidentId}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Rule-based correlation match
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unlinked</span>
                        )}
                      </td>

                      <td
                        className="py-3 px-3 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {can('alarm:acknowledge') && (
                            <button
                              type="button"
                              onClick={() => acknowledgeAlarmRecord(alm.id, !alm.acknowledged)}
                              className={`px-2 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                                alm.acknowledged
                                  ? 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white'
                              }`}
                            >
                              {alm.acknowledged ? 'Unack' : 'Ack'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedAlarmId(alm.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <strong className="font-mono text-slate-800 dark:text-slate-200">
              {filteredAlarms.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="font-mono text-slate-800 dark:text-slate-200">
              {Math.min(safePage * pageSize, filteredAlarms.length)}
            </strong>{' '}
            of{' '}
            <strong className="font-mono text-slate-800 dark:text-slate-200">
              {filteredAlarms.length}
            </strong>{' '}
            alarms
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alarm Detail & Correlation Drawer */}
      {selectedAlarm && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-label="Alarm Details and Correlation"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                    {selectedAlarm.id}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-xs text-slate-500">
                    {selectedAlarm.vendor || 'OEM'} ({selectedAlarm.vendorCode})
                  </span>
                  <span className="text-slate-400">·</span>
                  <SeverityIndicator severity={selectedAlarm.severity} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedAlarm.alarmName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlarmId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Rule-Based Correlation Banner if present */}
              {selectedAlarm.proposedCorrelationIncidentId && (
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <GitMerge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Transparent Rule-Based Correlation Detected</span>
                    </span>
                    <span className="font-mono text-[11px] text-purple-700 dark:text-purple-300">
                      Target: {selectedAlarm.proposedCorrelationIncidentId}
                    </span>
                  </div>
                  <p className="text-purple-800 dark:text-purple-300/90 leading-relaxed">
                    {selectedAlarm.correlationRuleReason ||
                      `This alarm occurred at ${selectedAlarm.siteCode} within the active window of incident ${selectedAlarm.proposedCorrelationIncidentId}.`}
                  </p>
                  {selectedAlarm.linkedIncidentId !==
                    selectedAlarm.proposedCorrelationIncidentId &&
                    can('alarm:correlate') && (
                      <button
                        type="button"
                        onClick={() =>
                          linkAlarmToIncident(
                            selectedAlarm.id,
                            selectedAlarm.proposedCorrelationIncidentId!
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer"
                      >
                        Confirm &amp; Correlate to {selectedAlarm.proposedCorrelationIncidentId}
                      </button>
                    )}
                </div>
              )}

              {/* Alarm State & Acknowledgment Controls */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Network Trap Status &amp; Operator Acknowledgment
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Clearing an alarm on network hardware does not auto-close the linked incident.
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold px-2.5 py-1 rounded ${
                      selectedAlarm.isSimulatedActive
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    NE STATE: {selectedAlarm.isSimulatedActive ? 'ACTIVE' : 'CLEARED'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={!can('alarm:acknowledge')}
                    onClick={() =>
                      acknowledgeAlarmRecord(selectedAlarm.id, !selectedAlarm.acknowledged)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {selectedAlarm.acknowledged
                        ? `Unacknowledge (Ack by ${selectedAlarm.acknowledgedBy})`
                        : 'Acknowledge Alarm'}
                    </span>
                  </button>

                  {selectedAlarm.isSimulatedActive ? (
                    <button
                      type="button"
                      disabled={!can('incident:update_status')}
                      onClick={() =>
                        clearOrReassertAlarmRecord(
                          selectedAlarm.id,
                          true,
                          clearObservationInput || 'NE trap cleared during NOC verification.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Record Alarm Cleared</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!can('incident:update_status')}
                      onClick={() =>
                        clearOrReassertAlarmRecord(
                          selectedAlarm.id,
                          false,
                          'Simulated trap re-asserted on element.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Simulate Alarm Re-Assertion</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Alarm Clear Observation / Verification Note
                  </label>
                  <input
                    type="text"
                    value={clearObservationInput}
                    onChange={(e) => setClearObservationInput(e.target.value)}
                    placeholder="e.g. Optical RX power restored to -9.4 dBm; trap cleared on NetAct..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Incident Linking & Creation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-sky-500" />
                    <span>Incident Association &amp; Correlation</span>
                  </span>
                  {selectedAlarm.linkedIncidentId && (
                    <button
                      type="button"
                      onClick={() => {
                        const incId = selectedAlarm.linkedIncidentId!;
                        setSelectedAlarmId(null);
                        openIncidentById(incId);
                      }}
                      className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open {selectedAlarm.linkedIncidentId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Link Alarm to Existing Incident
                    </label>
                    <select
                      value={selectedLinkIncidentId}
                      onChange={(e) => setSelectedLinkIncidentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      {store.incidents.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          {inc.id} [{inc.siteCode}] — {inc.title || inc.alarmName} ({inc.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      disabled={!can('alarm:correlate') || !selectedLinkIncidentId}
                      onClick={() => linkAlarmToIncident(selectedAlarm.id, selectedLinkIncidentId)}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-semibold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Link to Incident
                    </button>
                  </div>
                </div>

                {!selectedAlarm.linkedIncidentId && can('incident:create') && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Need a dedicated incident ticket for this alarm?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const res = createIncidentFromAlarm(selectedAlarm.id);
                        if (res.ok && res.incident) {
                          setSelectedAlarmId(null);
                          openIncidentById(res.incident.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Incident from Alarm</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Technical Telemetry Attributes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Site &amp; GIS Location</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const sId = selectedAlarm.siteId;
                        setSelectedAlarmId(null);
                        openSiteById(sId);
                      }}
                      className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {selectedAlarm.siteCode} ({selectedAlarm.siteId})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sId = selectedAlarm.siteId;
                        setSelectedAlarmId(null);
                        openSiteInGisMap(sId);
                      }}
                      className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>GIS</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    Managed Object &amp; Equipment
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5 truncate">
                    {selectedAlarm.managedObject || selectedAlarm.equipmentId}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {selectedAlarm.equipmentName}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    First / Last Occurrence &amp; Deduplication Count
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {selectedAlarm.occurrenceCount} Occurrences
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 block">
                    1st: {formatUtcTimestamp(selectedAlarm.firstOccurrence, tz)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 block">
                    Lst: {formatUtcTimestamp(selectedAlarm.lastOccurrence, tz)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Clearance Record</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {selectedAlarm.clearedAt
                      ? formatUtcTimestamp(selectedAlarm.clearedAt, tz)
                      : 'Still Active on Element'}
                  </span>
                  {selectedAlarm.clearedByObservation && (
                    <span className="text-[11px] text-slate-500 block">
                      Note: {selectedAlarm.clearedByObservation}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Raw Diagnostic Trap Description
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedAlarm.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulate / Ingest Alarm Modal (Deduplication & Rule Correlation Tester) */}
      {ingestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  <span>Simulate / Ingest Network Alarm Trap</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Tests Phase 3 repeat-alarm deduplication and rule-based correlation against active
                  incidents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIngestModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="p-6 space-y-4 text-xs">
              {/* Quick Presets */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Quick Engineering Test Scenarios:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applySimulationPreset('duplicate')}
                    className="px-2.5 py-1.5 rounded bg-sky-600 text-white font-semibold cursor-pointer"
                  >
                    1. Test Repeat Trap Deduplication (Same Site + Code + MO)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySimulationPreset('power_correlation')}
                    className="px-2.5 py-1.5 rounded bg-purple-600 text-white font-semibold cursor-pointer"
                  >
                    2. Test Power → Cell Outage Correlation (CNT-FIN-004)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySimulationPreset('new_fiber')}
                    className="px-2.5 py-1.5 rounded bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    3. New DWDM Optical Degradation Trap
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Site *
                  </label>
                  <select
                    value={simSiteId}
                    onChange={(e) => setSimSiteId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {store.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteCode} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    value={simVendor}
                    onChange={(e) => setSimVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity *
                  </label>
                  <select
                    value={simSeverity}
                    onChange={(e) => setSimSeverity(e.target.value as AlarmSeverity)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Warning">Warning</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Alarm Code *
                  </label>
                  <input
                    type="text"
                    value={simVendorCode}
                    onChange={(e) => setSimVendorCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Managed Object (MO) *
                  </label>
                  <input
                    type="text"
                    value={simManagedObject}
                    onChange={(e) => setSimManagedObject(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Domain
                  </label>
                  <select
                    value={simDomain}
                    onChange={(e) => setSimDomain(e.target.value as NetworkDomain)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {ALL_DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Technology
                  </label>
                  <select
                    value={simTech}
                    onChange={(e) => setSimTech(e.target.value as NetworkTechnology)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {ALL_TECHNOLOGIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classification
                  </label>
                  <select
                    value={simClass}
                    onChange={(e) => setSimClass(e.target.value as AlarmClassification)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alarm Name *
                  </label>
                  <input
                    type="text"
                    value={simAlarmName}
                    onChange={(e) => setSimAlarmName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    value={simEquipName}
                    onChange={(e) => setSimEquipName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trap Description
                </label>
                <textarea
                  rows={2}
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simAutoCreateIncident}
                  onChange={(e) => setSimAutoCreateIncident(e.target.checked)}
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Automatically open a new Incident if not deduplicated or correlated
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIngestModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                >
                  Ingest Simulated Trap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
