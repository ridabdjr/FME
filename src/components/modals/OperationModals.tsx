import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AlarmClassification,
  AlarmSeverity,
  NetworkDomain,
  NetworkTechnology,
  SiteOperationalStatus,
  SiteType,
  WorkOrderJobType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../types/models';

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

const ALL_DOMAINS: NetworkDomain[] = [
  'RAN / Radio',
  'BSS / BSC',
  'Transmission / MW',
  'Fiber Optics',
  'Power / AC-DC / Gen',
  'Environmental / Site Access',
];

export const CreateIncidentModal: React.FC = () => {
  const {
    store,
    isCreateIncidentOpen,
    createIncidentPreselectedSiteId,
    closeCreateIncidentModal,
    createIncident,
  } = useApp();

  const [siteId, setSiteId] = useState('');
  const [domain, setDomain] = useState<NetworkDomain>('RAN / Radio');
  const [technology, setTechnology] = useState<NetworkTechnology>('4G LTE');
  const [classification, setClassification] = useState<AlarmClassification>('Internal');
  const [severity, setSeverity] = useState<AlarmSeverity>('Major');
  const [alarmSource, setAlarmSource] = useState('Nokia NetAct / Simulated OSS');
  const [alarmName, setAlarmName] = useState('');
  const [equipmentAffected, setEquipmentAffected] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateIncidentOpen) {
      const initialSite =
        createIncidentPreselectedSiteId || (store.sites[0] ? store.sites[0].id : '');
      setSiteId(initialSite);
      const foundSite = store.sites.find((s) => s.id === initialSite);
      setAssignedTeamId(foundSite?.assignedTeamId || store.teams[0]?.id || '');
      setAlarmName('');
      setEquipmentAffected('');
      setDescription('');
      setError(null);
    }
  }, [isCreateIncidentOpen, createIncidentPreselectedSiteId, store.sites, store.teams]);

  if (!isCreateIncidentOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = createIncident({
      siteId,
      domain,
      technology,
      alarmSource,
      classification,
      alarmName,
      description,
      equipmentAffected,
      severity,
      assignedTeamId,
    });
    if (!res.ok) {
      setError(res.error || 'Failed to create incident.');
      return;
    }
    closeCreateIncidentModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-create-incident-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="modal-create-incident-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Log New Incident &amp; Simulated Network Alarm
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Creates a simulated BSS/RAN/Power alarm entry and opens a linked NOC incident ticket.
            </p>
          </div>
          <button
            type="button"
            onClick={closeCreateIncidentModal}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Telecom Site *
              </label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  const found = store.sites.find((s) => s.id === e.target.value);
                  if (found) setAssignedTeamId(found.assignedTeamId);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {store.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} — {s.siteName} ({s.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alarm Severity *
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AlarmSeverity)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Critical">Critical (Service Affecting Outage)</option>
                <option value="Major">Major (Degraded KPI / Hardware Fault)</option>
                <option value="Minor">Minor (Non-Service Affecting Fault)</option>
                <option value="Warning">Warning (Threshold Advisory)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Network Domain *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as NetworkDomain)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {ALL_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Technology Layer *
              </label>
              <select
                value={technology}
                onChange={(e) => setTechnology(e.target.value as NetworkTechnology)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {ALL_TECHNOLOGIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alarm Classification *
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as AlarmClassification)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Internal">Internal (Telecom Radio / Core / TX Hardware)</option>
                <option value="External">External (AC Utility / DG / Rectifier / Env / Door)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alarm Source / NMS System *
              </label>
              <input
                type="text"
                value={alarmSource}
                onChange={(e) => setAlarmSource(e.target.value)}
                placeholder="e.g. Ericsson ENM / Dry-Contact DI-02"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alarm Name / Specific Problem *
              </label>
              <input
                type="text"
                value={alarmName}
                onChange={(e) => setAlarmName(e.target.value)}
                placeholder="e.g. Sector 3 RRU Optical CPRI Link Loss"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Equipment Affected *
              </label>
              <input
                type="text"
                value={equipmentAffected}
                onChange={(e) => setEquipmentAffected(e.target.value)}
                placeholder="e.g. Ericsson RRU 4480 B1/B3 Sector 3"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Operations Team *
            </label>
            <select
              value={assignedTeamId}
              onChange={(e) => setAssignedTeamId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              {store.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name} ({t.region})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Technical Alarm Description &amp; Impact *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide symptom details, affected sectors/carriers, and initial diagnostic telemetry..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={closeCreateIncidentModal}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              Create Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const UpsertSiteModal: React.FC = () => {
  const {
    store,
    isCreateSiteOpen,
    editingSite,
    createSitePrefillCoords,
    closeCreateSiteModal,
    upsertSite,
  } = useApp();

  const [siteIdInput, setSiteIdInput] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [operator, setOperator] = useState('ApexTel Carrier Group');
  const [region, setRegion] = useState('North Metro');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('34.0650');
  const [longitude, setLongitude] = useState('-118.3500');
  const [siteType, setSiteType] = useState<SiteType>('Greenfield Tower');
  const [technologies, setTechnologies] = useState<NetworkTechnology[]>(['4G LTE', '5G NR']);
  const [operationalStatus, setOperationalStatus] = useState<SiteOperationalStatus>('Online');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState('2026-10-27');
  const [towerHeightMeters, setTowerHeightMeters] = useState('45');
  const [powerConfiguration, setPowerConfiguration] = useState(
    'Utility AC + 48V Eltek Rectifier + 2x150Ah LiFePO4'
  );
  const [accessInstructions, setAccessInstructions] = useState('');
  const [hardwareVendor, setHardwareVendor] = useState('Nokia Networks');
  const [equipmentModel, setEquipmentModel] = useState('AirScale System Module / BBU');
  const [cabinetRackId, setCabinetRackId] = useState('RACK-01');
  const [associatedBscHub, setAssociatedBscHub] = useState('BSC-CORE-01 (Central Aggregation)');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateSiteOpen) {
      setError(null);
      if (editingSite) {
        setSiteIdInput(editingSite.id);
        setSiteCode(editingSite.siteCode);
        setSiteName(editingSite.siteName);
        setOperator(editingSite.operator);
        setRegion(editingSite.region);
        setDistrict(editingSite.district);
        setAddress(editingSite.address);
        setLatitude(String(editingSite.latitude));
        setLongitude(String(editingSite.longitude));
        setSiteType(editingSite.siteType);
        setTechnologies(editingSite.technologies);
        setOperationalStatus(editingSite.operationalStatus);
        setAssignedTeamId(editingSite.assignedTeamId);
        setLastMaintenanceDate(editingSite.lastMaintenanceDate);
        setTowerHeightMeters(
          editingSite.towerHeightMeters ? String(editingSite.towerHeightMeters) : ''
        );
        setPowerConfiguration(editingSite.powerConfiguration);
        setAccessInstructions(editingSite.accessInstructions || '');
      } else {
        const nextNum = 1000 + store.sites.length + 1;
        setSiteIdInput(`SITE-${nextNum}`);
        setSiteCode(`NTH-MTR-0${store.sites.length + 11}`);
        setSiteName(createSitePrefillCoords?.siteName || '');
        setOperator('ApexTel Carrier Group');
        setRegion(createSitePrefillCoords?.region || 'North Metro');
        setDistrict('');
        setAddress(createSitePrefillCoords?.address || '');
        setLatitude(
          createSitePrefillCoords ? createSitePrefillCoords.latitude.toFixed(5) : '34.0725'
        );
        setLongitude(
          createSitePrefillCoords ? createSitePrefillCoords.longitude.toFixed(5) : '-118.3810'
        );
        setSiteType(createSitePrefillCoords?.siteType || 'Greenfield Tower');
        setTechnologies(['2G GSM', '4G LTE', '5G NR', 'DC Power/Gen']);
        setOperationalStatus('Online');
        setAssignedTeamId(store.teams[1]?.id || store.teams[0]?.id || '');
        setLastMaintenanceDate('2026-10-27');
        setTowerHeightMeters('45');
        setPowerConfiguration('Utility AC + 48V Rectifier + 2x150Ah Battery Bank');
        setAccessInstructions('');
      }
    }
  }, [
    isCreateSiteOpen,
    editingSite,
    createSitePrefillCoords,
    store.sites.length,
    store.teams,
  ]);

  if (!isCreateSiteOpen) return null;

  const toggleTechnology = (tech: NetworkTechnology) => {
    setTechnologies((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = upsertSite({
      id: editingSite?.id,
      siteIdInput,
      siteCode,
      siteName,
      operator,
      region,
      district,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      siteType,
      technologies,
      operationalStatus,
      assignedTeamId,
      lastMaintenanceDate,
      towerHeightMeters: towerHeightMeters ? parseFloat(towerHeightMeters) : undefined,
      powerConfiguration,
      accessInstructions,
    });
    if (!res.ok) {
      setError(res.error || 'Could not save site record.');
      return;
    }
    closeCreateSiteModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-site-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="modal-site-title" className="text-base font-bold text-slate-900 dark:text-white">
              {editingSite ? `Edit Site ${editingSite.siteCode}` : 'Register New Telecom Site'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validates unique Site ID and Site Code across the regional inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={closeCreateSiteModal}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site ID *
              </label>
              <input
                type="text"
                disabled={Boolean(editingSite)}
                value={siteIdInput}
                onChange={(e) => setSiteIdInput(e.target.value)}
                placeholder="SITE-1009"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site Code *
              </label>
              <input
                type="text"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                placeholder="e.g. NTH-MTR-019"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status *
              </label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as SiteOperationalStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Online">Online</option>
                <option value="Degraded">Degraded</option>
                <option value="Offline">Offline</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Planned">Planned</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site Name *
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Westside Industrial Macro Tower"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operator / TowerCo *
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Region *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="North Metro">North Metro</option>
                <option value="Central">Central</option>
                <option value="South Corridor">South Corridor</option>
                <option value="Highland">Highland</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                District / Sub-Area *
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Port Logistics Sector"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site Structure Type *
              </label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value as SiteType)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Greenfield Tower">Greenfield Tower</option>
                <option value="Mobile Tower">Mobile Tower</option>
                <option value="BTS">BTS (Base Transceiver Station)</option>
                <option value="BSC">BSC (Base Station Controller Hub)</option>
                <option value="Rooftop">Rooftop</option>
                <option value="Rooftop Site">Rooftop Site</option>
                <option value="Indoor IBS/DAS">Indoor IBS/DAS</option>
                <option value="Core/BSC Hub">Core/BSC Hub</option>
                <option value="Data Center">Data Center</option>
                <option value="Fiber Cabinet">Fiber Cabinet / FDT</option>
                <option value="Manhole">Manhole / Chamber</option>
                <option value="Customer Premises">Customer Premises</option>
                <option value="Electrical Installation">Electrical Installation / Power Plant</option>
                <option value="Office">Office / NOC Facility</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Dedicated Hardware & Configuration Box for BTS & BSC Node Types */}
          {(siteType === 'BTS' || siteType === 'BSC') && (
            <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-sky-900 dark:text-sky-300">
                  {siteType === 'BTS' ? 'BTS RAN Hardware Attributes' : 'BSC Core Aggregation Hub Attributes'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                  Hardware Profile
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hardware Vendor
                  </label>
                  <select
                    value={hardwareVendor}
                    onChange={(e) => setHardwareVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Nokia Networks">Nokia Networks (AirScale / Flexi)</option>
                    <option value="Ericsson">Ericsson (Radio System / RBS 6000)</option>
                    <option value="Huawei Technologies">Huawei Technologies (SingleRAN / BBU3900)</option>
                    <option value="ZTE Telecom">ZTE Telecom (Uni-RAN)</option>
                    <option value="Samsung Networks">Samsung Networks</option>
                    <option value="Other / Multi-Vendor">Other / Multi-Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Equipment Frame / Model
                  </label>
                  <input
                    type="text"
                    value={equipmentModel}
                    onChange={(e) => setEquipmentModel(e.target.value)}
                    placeholder="e.g. AirScale Subrack ABIA/ABIO"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cabinet / Rack Position
                  </label>
                  <input
                    type="text"
                    value={cabinetRackId}
                    onChange={(e) => setCabinetRackId(e.target.value)}
                    placeholder="e.g. Bay-01 / Pos-04"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {siteType === 'BTS' ? 'Associated BSC Controller Hub' : 'Core Network Ring Uplink'}
                  </label>
                  <input
                    type="text"
                    value={associatedBscHub}
                    onChange={(e) => setAssociatedBscHub(e.target.value)}
                    placeholder="e.g. BSC-CORE-01 (Central Aggregation)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Latitude (WGS84) *
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard?.readText();
                      if (text) {
                        const match = text.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
                        if (match) {
                          setLatitude(match[1]);
                          setLongitude(match[3]);
                        }
                      }
                    } catch {}
                  }}
                  className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-mono cursor-pointer"
                  title="Paste Lat,Lng coordinates from clipboard"
                >
                  Paste Coords
                </button>
              </div>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude (WGS84) *
              </label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Field Squad *
              </label>
              <select
                value={assignedTeamId}
                onChange={(e) => setAssignedTeamId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {store.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Physical Street Address / Access Coordinates *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot 42 Industrial Park Rd, North Metro"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Installed Radio &amp; Backhaul Technologies *
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TECHNOLOGIES.map((tech) => {
                const active = technologies.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTechnology(tech)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {tech}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Power &amp; Backup Configuration
              </label>
              <input
                type="text"
                value={powerConfiguration}
                onChange={(e) => setPowerConfiguration(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Preventive Maintenance Date
              </label>
              <input
                type="date"
                value={lastMaintenanceDate}
                onChange={(e) => setLastMaintenanceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={closeCreateSiteModal}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              {editingSite ? 'Save Site Changes' : 'Register Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const UpsertWorkOrderModal: React.FC = () => {
  const {
    store,
    isCreateWorkOrderOpen,
    createWorkOrderPrefill,
    closeCreateWorkOrderModal,
    upsertWorkOrder,
  } = useApp();

  const [siteId, setSiteId] = useState('');
  const [linkedIncidentId, setLinkedIncidentId] = useState('');
  const [jobType, setJobType] = useState<WorkOrderJobType>('Corrective Maintenance');
  const [priority, setPriority] = useState<WorkOrderPriority>('P2 - High');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [assignedEngineerId, setAssignedEngineerId] = useState('');
  const [scheduledVisitDate, setScheduledVisitDate] = useState('2026-10-28T09:00');
  const [workDescription, setWorkDescription] = useState('');
  const [sparePartInput, setSparePartInput] = useState('');
  const [sparesList, setSparesList] = useState<string[]>([
    'Standard Field RF & Multimeter Toolkit',
  ]);
  const [status, setStatus] = useState<WorkOrderStatus>('Dispatched');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateWorkOrderOpen) {
      setError(null);
      const targetIncident = createWorkOrderPrefill?.incidentId
        ? store.incidents.find((i) => i.id === createWorkOrderPrefill.incidentId)
        : undefined;

      const defaultSiteId =
        createWorkOrderPrefill?.siteId ||
        targetIncident?.siteId ||
        store.sites[0]?.id ||
        '';

      setSiteId(defaultSiteId);
      setLinkedIncidentId(targetIncident?.id || '');
      if (targetIncident) {
        setJobType(
          targetIncident.severity === 'Critical' ? 'Emergency Repair' : 'Corrective Maintenance'
        );
        setPriority(targetIncident.severity === 'Critical' ? 'P1 - Immediate' : 'P2 - High');
        setAssignedTeamId(targetIncident.assignedTeamId);
        setAssignedEngineerId(targetIncident.assignedEngineerId || '');
        setWorkDescription(
          `Field remediation for ${targetIncident.id} (${targetIncident.alarmName}) affecting ${targetIncident.equipmentAffected}.`
        );
      } else {
        const siteObj = store.sites.find((s) => s.id === defaultSiteId);
        setAssignedTeamId(siteObj?.assignedTeamId || store.teams[0]?.id || '');
        setAssignedEngineerId('');
        setWorkDescription('');
      }
    }
  }, [isCreateWorkOrderOpen, createWorkOrderPrefill, store.incidents, store.sites, store.teams]);

  if (!isCreateWorkOrderOpen) return null;

  const siteIncidents = store.incidents.filter((i) => i.siteId === siteId);

  const handleAddSpare = () => {
    if (!sparePartInput.trim()) return;
    setSparesList((prev) => [...prev, sparePartInput.trim()]);
    setSparePartInput('');
  };

  const handleRemoveSpare = (idx: number) => {
    setSparesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = upsertWorkOrder({
      siteId,
      linkedIncidentId: linkedIncidentId || undefined,
      jobType,
      priority,
      assignedTeamId,
      assignedEngineerId: assignedEngineerId || undefined,
      scheduledVisitDate: new Date(scheduledVisitDate).toISOString(),
      workDescription,
      requiredEquipmentOrSpares: sparesList,
      status,
    });
    if (!res.ok) {
      setError(res.error || 'Could not create work order.');
      return;
    }
    closeCreateWorkOrderModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-wo-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="modal-wo-title" className="text-base font-bold text-slate-900 dark:text-white">
              Create Field Maintenance Work Order
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Links field engineering dispatch directly to a telecom site and active incident.
            </p>
          </div>
          <button
            type="button"
            onClick={closeCreateWorkOrderModal}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Site *
              </label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setLinkedIncidentId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {store.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} — {s.siteName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Linked Incident (Optional)
              </label>
              <select
                value={linkedIncidentId}
                onChange={(e) => setLinkedIncidentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Standalone Preventive / Site Task --</option>
                {siteIncidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} [{inc.severity}] — {inc.alarmName.slice(0, 42)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maintenance Job Type *
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as WorkOrderJobType)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Corrective Maintenance">Corrective Maintenance</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Emergency Repair">Emergency Repair</option>
                <option value="Inspection">Inspection</option>
                <option value="Installation">Installation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dispatch Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="P1 - Immediate">P1 - Immediate (SLA &lt; 2h)</option>
                <option value="P2 - High">P2 - High (SLA &lt; 6h)</option>
                <option value="P3 - Medium">P3 - Medium (Next Business Day)</option>
                <option value="P4 - Scheduled">P4 - Scheduled Window</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Team *
              </label>
              <select
                value={assignedTeamId}
                onChange={(e) => setAssignedTeamId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {store.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Lead Engineer
              </label>
              <select
                value={assignedEngineerId}
                onChange={(e) => setAssignedEngineerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Assign to Squad Queue --</option>
                {store.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scheduled Site Visit Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                value={scheduledVisitDate}
                onChange={(e) => setScheduledVisitDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Work Order Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkOrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="Draft">Draft</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Progress">In Progress</option>
                <option value="Awaiting Parts">Awaiting Parts</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Scope of Work &amp; Field Instructions *
            </label>
            <textarea
              rows={3}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Detail required troubleshooting procedures, RF/power isolation steps, and safety requirements..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Required Test Instruments &amp; Spare Parts
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={sparePartInput}
                onChange={(e) => setSparePartInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpare();
                  }
                }}
                placeholder="e.g. 25G SFP28 Transceiver or Eltek 48V Rectifier Module"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddSpare}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
            <ul className="space-y-1">
              {sparesList.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 text-xs rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpare(idx)}
                    className="text-slate-400 hover:text-red-500"
                    aria-label="Remove spare part"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={closeCreateWorkOrderModal}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              Dispatch Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
