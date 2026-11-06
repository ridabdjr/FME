import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  ClipboardList,
  Edit3,
  ExternalLink,
  MapPin,
  Navigation,
  Plus,
  RadioTower,
  Search,
  Server,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NetworkTechnology, SiteOperationalStatus, SiteType } from '../../types/models';
import {
  IncidentStatusIndicator,
  SeverityIndicator,
  SiteStatusIndicator,
  WorkOrderStatusIndicator,
} from '../common/StatusIndicators';

export const SitesModule: React.FC = () => {
  const {
    store,
    selectedSiteId,
    setSelectedSiteId,
    can,
    navigateTo,
    openCreateCaseModal,
    openCaseById,
    openCreateSiteModal,
    openCreateIncidentModal,
    openCreateWorkOrderModal,
    openIncidentById,
    openWorkOrderById,
    openSiteInGisMap,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SiteOperationalStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | SiteType>('ALL');
  const [techFilter, setTechFilter] = useState<'ALL' | NetworkTechnology>('ALL');
  const [sortBy, setSortBy] = useState<'siteCode' | 'status' | 'incidents' | 'lastMaintenance'>(
    'siteCode'
  );
  const [sortAsc, setSortAsc] = useState(true);

  const selectedSite = useMemo(
    () => store.sites.find((s) => s.id === selectedSiteId) || null,
    [store.sites, selectedSiteId]
  );

  const enrichedSites = useMemo(() => {
    return store.sites.map((site) => {
      const equipmentList = store.equipment.filter((eq) => eq.siteId === site.id);
      const activeIncidents = store.incidents.filter(
        (inc) => inc.siteId === site.id && inc.status !== 'Resolved' && inc.status !== 'Closed'
      );
      const assignedTeam = store.teams.find((t) => t.id === site.assignedTeamId);
      return {
        site,
        equipmentCount: equipmentList.length,
        activeIncidentCount: activeIncidents.length,
        assignedTeamName: assignedTeam ? `${assignedTeam.code} (${assignedTeam.name})` : 'Unassigned',
      };
    });
  }, [store.sites, store.equipment, store.incidents, store.teams]);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = enrichedSites.filter(({ site, assignedTeamName }) => {
      if (regionFilter !== 'ALL' && site.region !== regionFilter) return false;
      if (statusFilter !== 'ALL' && site.operationalStatus !== statusFilter) return false;
      if (typeFilter !== 'ALL' && site.siteType !== typeFilter) return false;
      if (techFilter !== 'ALL' && !site.technologies.includes(techFilter)) return false;

      if (q) {
        const hay = [
          site.id,
          site.siteCode,
          site.siteName,
          site.operator,
          site.region,
          site.district,
          site.address,
          site.siteType,
          site.technologies.join(' '),
          assignedTeamName,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'siteCode') {
        cmp = a.site.siteCode.localeCompare(b.site.siteCode);
      } else if (sortBy === 'status') {
        cmp = a.site.operationalStatus.localeCompare(b.site.operationalStatus);
      } else if (sortBy === 'incidents') {
        cmp = a.activeIncidentCount - b.activeIncidentCount;
      } else if (sortBy === 'lastMaintenance') {
        cmp = a.site.lastMaintenanceDate.localeCompare(b.site.lastMaintenanceDate);
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [enrichedSites, searchQuery, regionFilter, statusFilter, typeFilter, techFilter, sortBy, sortAsc]);

  const toggleSort = (field: 'siteCode' | 'status' | 'incidents' | 'lastMaintenance') => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(field === 'siteCode');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <RadioTower className="w-3.5 h-3.5" />
            <span>REGIONAL INFRASTRUCTURE &amp; CELL SITE REGISTER</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Telecom Sites Inventory ({store.sites.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Complete register of Greenfield Towers, Rooftop Macros, Indoor DAS, and Core/BSC Hubs
            with associated equipment and active incident counts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openCreateSiteModal()}
            disabled={!can('site:create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register New Site</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Site ID, Code, Name, Operator, District, Address..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Regions</option>
              <option value="North Metro">North Metro</option>
              <option value="Central">Central</option>
              <option value="South Corridor">South Corridor</option>
              <option value="Highland">Highland</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Operational Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | SiteOperationalStatus)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Degraded">Degraded</option>
              <option value="Offline">Offline</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Planned">Planned</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Site Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | SiteType)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Site Types</option>
              <option value="Greenfield Tower">Greenfield Tower</option>
              <option value="Rooftop">Rooftop</option>
              <option value="Indoor IBS/DAS">Indoor IBS/DAS</option>
              <option value="Core/BSC Hub">Core/BSC Hub</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Technology"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value as 'ALL' | NetworkTechnology)}
              className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Technologies</option>
              <option value="2G GSM">2G GSM</option>
              <option value="3G UMTS">3G UMTS</option>
              <option value="4G LTE">4G LTE</option>
              <option value="5G NR">5G NR</option>
              <option value="BSC/Core">BSC/Core</option>
              <option value="Microwave TX">Microwave TX</option>
              <option value="Fiber DWDM">Fiber DWDM</option>
              <option value="DC Power/Gen">DC Power/Gen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Site Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('siteCode')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Site Code &amp; ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3">Site Name &amp; Operator</th>
                <th className="py-3 px-3">Region, District &amp; Address</th>
                <th className="py-3 px-3 whitespace-nowrap">Coordinates (Lat/Lng)</th>
                <th className="py-3 px-3">Type &amp; Technologies</th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Equipment</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('incidents')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Active Inc.</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('lastMaintenance')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Last PM &amp; Squad</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No telecom sites match your search or filter selection.
                  </td>
                </tr>
              ) : (
                filteredSites.map(({ site, equipmentCount, activeIncidentCount, assignedTeamName }) => (
                  <tr
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                        {site.siteCode}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">{site.id}</div>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {site.siteName}
                      </div>
                      <div className="text-[11px] text-slate-500">{site.operator}</div>
                    </td>

                    <td className="py-3 px-3 max-w-xs align-top">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {site.region} · {site.district}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{site.address}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums align-top">
                      <div>{site.latitude.toFixed(4)}° N</div>
                      <div>{site.longitude.toFixed(4)}° E</div>
                    </td>

                    <td className="py-3 px-3 max-w-xs align-top">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {site.siteType}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {site.technologies.join(' · ')}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <SiteStatusIndicator status={site.operationalStatus} />
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums align-top">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {equipmentCount}
                      </span>{' '}
                      <span className="text-[11px] text-slate-500">units</span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums align-top">
                      {activeIncidentCount > 0 ? (
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {activeIncidentCount} open
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        PM: {site.lastMaintenanceDate}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {assignedTeamName}
                      </div>
                    </td>

                    <td
                      className="py-3 px-3 text-right whitespace-nowrap align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {can('site:edit') && (
                          <button
                            type="button"
                            onClick={() => openCreateSiteModal(site)}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedSiteId(site.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Site Details Drawer */}
      {selectedSite && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-label="Site Technical Details"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                    {selectedSite.siteCode}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-xs text-slate-500">{selectedSite.id}</span>
                  <span className="text-slate-400">·</span>
                  <SiteStatusIndicator status={selectedSite.operationalStatus} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedSite.siteName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {can('site:edit') && (
                  <button
                    type="button"
                    onClick={() => openCreateSiteModal(selectedSite)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Site</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSiteId(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close site details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Quick Site Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    {selectedSite.region} · {selectedSite.district} ({selectedSite.latitude.toFixed(4)}
                    , {selectedSite.longitude.toFixed(4)})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateCaseModal({ siteId: selectedSite.id })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>+ Create Work Case</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Directions</span>
                  </a>

                  {can('incident:create') && (
                    <button
                      type="button"
                      onClick={() => openCreateIncidentModal(selectedSite.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Alarm</span>
                    </button>
                  )}
                  {can('workorder:create') && (
                    <button
                      type="button"
                      onClick={() => openCreateWorkOrderModal({ siteId: selectedSite.id })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Create Work Order</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedSite.id;
                      setSelectedSiteId(null);
                      openSiteInGisMap(id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                    <span>View on GIS Map</span>
                  </button>
                </div>
              </div>

              {/* Site Engineering Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Operator &amp; Structure</span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {selectedSite.operator} · {selectedSite.siteType}
                  </span>
                  {selectedSite.towerHeightMeters && (
                    <span className="font-mono text-[11px] text-slate-500">
                      Structure Height: {selectedSite.towerHeightMeters}m AGL
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">
                    Assigned Maintenance Team &amp; Last PM
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {store.teams.find((t) => t.id === selectedSite.assignedTeamId)?.name ||
                      'Unassigned'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Last PM: {selectedSite.lastMaintenanceDate}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                  <span className="text-[11px] text-slate-500 block">
                    Radio, Core &amp; Transmission Technologies
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {selectedSite.technologies.join(' · ')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                  <span className="text-[11px] text-slate-500 block">
                    AC/DC Power Plant &amp; Standby Backup Configuration
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {selectedSite.powerConfiguration}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                  <span className="text-[11px] text-slate-500 block">
                    Address &amp; Site Access Instructions
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                    {selectedSite.address}
                  </span>
                  {selectedSite.accessInstructions && (
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {can('site:view_sensitive_access')
                        ? selectedSite.accessInstructions
                        : '[Restricted Security/Vault Access Instructions Masked for Read-Only Auditor Role]'}
                    </p>
                  )}
                </div>
              </div>

              {/* Installed Equipment at this Site */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-sky-500" />
                  <span>
                    Associated Site Equipment (
                    {store.equipment.filter((e) => e.siteId === selectedSite.id).length})
                  </span>
                </h3>
                <div className="space-y-2">
                  {store.equipment.filter((e) => e.siteId === selectedSite.id).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No granular equipment hardware units registered for this site yet.
                    </p>
                  ) : (
                    store.equipment
                      .filter((e) => e.siteId === selectedSite.id)
                      .map((eq) => (
                        <div
                          key={eq.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {eq.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {eq.category} · {eq.vendor} {eq.model} · S/N: {eq.serialNumber}
                            </div>
                          </div>
                          <span
                            className={`font-mono text-xs font-semibold ${
                              eq.operationalState === 'Operational'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : eq.operationalState === 'Faulty'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {eq.operationalState}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Site Incidents */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Site Incidents (
                  {store.incidents.filter((i) => i.siteId === selectedSite.id).length})
                </h3>
                <div className="space-y-2">
                  {store.incidents.filter((i) => i.siteId === selectedSite.id).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No active or historical incidents logged for this site.
                    </p>
                  ) : (
                    store.incidents
                      .filter((i) => i.siteId === selectedSite.id)
                      .map((inc) => (
                        <div
                          key={inc.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSiteId(null);
                                  openIncidentById(inc.id);
                                }}
                                className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{inc.id}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <SeverityIndicator severity={inc.severity} />
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 truncate mt-0.5">
                              {inc.alarmName}
                            </p>
                          </div>
                          <IncidentStatusIndicator status={inc.status} />
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Site Work Orders */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Site Work Orders (
                  {store.workOrders.filter((w) => w.siteId === selectedSite.id).length})
                </h3>
                <div className="space-y-2">
                  {store.workOrders.filter((w) => w.siteId === selectedSite.id).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No work orders dispatched to this site yet.
                    </p>
                  ) : (
                    store.workOrders
                      .filter((w) => w.siteId === selectedSite.id)
                      .map((wo) => (
                        <div
                          key={wo.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSiteId(null);
                                openWorkOrderById(wo.id);
                              }}
                              className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{wo.workOrderNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <span className="ml-2 text-slate-600 dark:text-slate-400">
                              {wo.jobType} · {wo.priority}
                            </span>
                          </div>
                          <WorkOrderStatusIndicator status={wo.status} />
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Site Work Cases (Personal Case Engine) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Work Cases &amp; Interventions (
                    {(store.workCases || []).filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode).length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => openCreateCaseModal({ siteId: selectedSite.id })}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Case</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(store.workCases || []).filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No personal work cases recorded for this site yet.
                    </p>
                  ) : (
                    (store.workCases || [])
                      .filter((c) => c.siteId === selectedSite.id || c.siteCode === selectedSite.siteCode)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSiteId(null);
                                openCaseById(c.id);
                                navigateTo('cases');
                              }}
                              className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{c.caseNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <span className="ml-2 text-slate-700 dark:text-slate-300 font-medium">
                              {c.title}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {(c.workTypeCategory || c.category || '').replace('_', ' ')} · {c.scheduledDate}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
